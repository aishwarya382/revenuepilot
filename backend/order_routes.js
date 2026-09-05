const express = require('express');
const router = express.Router();
const { db, logAudit } = require('./db');
const { emitToCustomer, emitToMerchant } = require('./notifications');
const crypto = require('crypto');
const { getComplementary } = require('./recommendation_engine');


// Helper to create a new order
function createOrder({ customer_id, merchant_id, product_id, product_name, quantity, price_at_order }) {
  const id = `ord_${crypto.randomUUID()}`;
  const total_amount = price_at_order * quantity;
  const created_at = new Date().toISOString();
  const status = 'PENDING_APPROVAL';
  const stmt = db.prepare(`INSERT INTO orders (id, customer_id, merchant_id, product_id, product_name, quantity, price_at_order, total_amount, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  stmt.run(id, customer_id, merchant_id, product_id, product_name, quantity, price_at_order, total_amount, status, created_at);
  // Insert order_items entry
  const itemStmt = db.prepare(`INSERT INTO order_items (id, order_id, product_id, merchant_id, quantity, price) VALUES (?,?,?,?,?,?)`);
  const itemId = `oi_${crypto.randomUUID()}`;
  itemStmt.run(itemId, id, product_id, merchant_id, quantity, price_at_order);
  return { id, total_amount, status, created_at };
}

// POST /api/orders - create order (customer)
router.post('/orders', (req, res) => {
  const { customer_id, merchant_id, product_id, product_name, quantity, price_at_order } = req.body;
  if (!customer_id || !merchant_id || !product_id || !product_name || !quantity || !price_at_order) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }
  const order = createOrder({ customer_id, merchant_id, product_id, product_name, quantity, price_at_order });
  logAudit('Customer', customer_id, 'Create Order', `Order ${order.id} created`, { order });
  emitToCustomer(customer_id, { type: 'order_created', order });
  emitToMerchant(merchant_id, { type: 'order_pending', order });
  res.json({ success: true, order });
});

// GET /api/orders/merchant/:merchantId - merchant view of orders
router.get('/orders/merchant/:merchantId', (req, res) => {
  const { merchantId } = req.params;
  const { status } = req.query;
  let rows = db.prepare(`SELECT * FROM orders WHERE merchant_id = ?`).all(merchantId);
  if (status) rows = rows.filter(o => o.status === status);
  res.json({ orders: rows });
});

// GET /api/orders/customer/:customerId - customer view of own orders
router.get('/orders/customer/:customerId', (req, res) => {
  const { customerId } = req.params;
  const rows = db.prepare(`SELECT * FROM orders WHERE customer_id = ?`).all(customerId);
  res.json({ orders: rows });
});

// PUT /api/orders/:orderId/approve - merchant approves order
router.put('/orders/:orderId/approve', (req, res) => {
  const { orderId } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'Order not pending approval' });
  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(order.product_id);
  if (!prod) return res.status(404).json({ error: 'Product not found' });
  if (prod.stock < order.quantity) return res.status(400).json({ error: 'Insufficient stock' });
  const tx = db.transaction(() => {
    db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(order.quantity, order.product_id);
    db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run('APPROVED', new Date().toISOString(), orderId);
  });
  tx();
  logAudit('Merchant', order.merchant_id, 'Approve Order', `Order ${orderId} approved`, { orderId });
  emitToCustomer(order.customer_id, { type: 'order_updated', orderId, status: 'APPROVED' });
  emitToMerchant(order.merchant_id, { type: 'order_updated', orderId, status: 'APPROVED' });
  res.json({ success: true, status: 'APPROVED' });
});

// PUT /api/orders/:orderId/reject - merchant rejects order
router.put('/orders/:orderId/reject', (req, res) => {
  const { orderId } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'Order not pending approval' });
  db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run('REJECTED', new Date().toISOString(), orderId);
  logAudit('Merchant', order.merchant_id, 'Reject Order', `Order ${orderId} rejected`, { orderId });
  emitToCustomer(order.customer_id, { type: 'order_updated', orderId, status: 'REJECTED' });
  emitToMerchant(order.merchant_id, { type: 'order_updated', orderId, status: 'REJECTED' });
  res.json({ success: true, status: 'REJECTED' });
});

// PUT /api/orders/:orderId/pay - initiate Razorpay payment (customer)
router.put('/orders/:orderId/pay', (req, res) => {
  const { orderId } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'APPROVED') return res.status(400).json({ error: 'Order not approved for payment' });
  if (!global.razorpayClient) return res.status(500).json({ error: 'Razorpay not configured' });
  global.razorpayClient.orders.create({
    amount: Math.round(order.total_amount * 100),
    currency: 'INR',
    receipt: order.id,
    notes: { merchant_id: order.merchant_id, customer_id: order.customer_id }
  }, (err, resp) => {
    if (err) {
      console.error('Razorpay create order error', err);
      return res.status(500).json({ error: 'Payment initiation failed' });
    }
    db.prepare('UPDATE orders SET razorpay_order_id = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(resp.id, 'PAYMENT_PENDING', new Date().toISOString(), orderId);
    logAudit('Customer', order.customer_id, 'Initiate Payment', `Razorpay order ${resp.id} created for order ${orderId}`, { orderId, razorpayOrderId: resp.id });
    emitToCustomer(order.customer_id, { type: 'payment_pending', orderId, razorpay_order_id: resp.id });
    res.json({ success: true, razorpay_order_id: resp.id, order_id: orderId });
  });
});

// PUT /api/orders/:orderId/status - webhook updates
router.put('/orders/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { payment_status, razorpay_payment_id } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  let newStatus = order.status;
  if (payment_status === 'SUCCESS') {
    newStatus = 'PAYMENT_SUCCESS';
    db.prepare('UPDATE orders SET status = ?, payment_status = ?, razorpay_payment_id = ?, updated_at = ? WHERE id = ?')
      .run(newStatus, 'SUCCESS', razorpay_payment_id, new Date().toISOString(), orderId);
    db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
      .run('ORDER_CONFIRMED', new Date().toISOString(), orderId);
  } else if (payment_status === 'FAILED') {
    newStatus = 'PAYMENT_FAILED';
    db.prepare('UPDATE orders SET status = ?, payment_status = ?, updated_at = ? WHERE id = ?')
      .run(newStatus, 'FAILED', new Date().toISOString(), orderId);
  }
  logAudit('System', 'system', 'Payment Update', `Order ${orderId} status set to ${newStatus}`, { orderId, newStatus });
  emitToCustomer(order.customer_id, { type: 'order_updated', orderId, status: newStatus });
  emitToMerchant(order.merchant_id, { type: 'order_updated', orderId, status: newStatus });
  res.json({ success: true, status: newStatus });
});

// GET recommendations for a product
router.get('/recommendations/:productId', (req, res) => {
  const { productId } = req.params;
  const { sessionId, budget, excludeIds } = req.query;
  const excludeArray = excludeIds ? excludeIds.split(',') : [];
  const recommendations = getComplementary(productId, {
    budget: budget ? Number(budget) : undefined,
    excludeIds: excludeArray,
    limit: 5,
  });
  res.json({ recommendations });
});

// Log recommendation acceptance/rejection
router.post('/recommendations/:productId/log', (req, res) => {
  const { productId } = req.params;
  const { sessionId, recommendedProductId, reason, userResponse } = req.body;
  if (!sessionId || !recommendedProductId || !reason || !userResponse) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const stmt = db.prepare(`INSERT INTO recommendation_log (id, session_id, original_product_id, recommended_product_id, reason, user_response) VALUES (?,?,?,?,?,?)`);
  stmt.run(
    `rec_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
    sessionId,
    productId,
    recommendedProductId,
    reason,
    userResponse
  );
  res.json({ success: true });
});

module.exports = router;
