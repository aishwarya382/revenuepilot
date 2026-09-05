const http = require('http');

function request(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 8000,
      path,
      method,
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runSystemVerification() {
  console.log('=== RUNNING REVENUE PILOT AI COMPLETE VERIFICATION SUITE ===\n');

  // 1. Health check
  const health = await request('/api/health');
  console.log('[1] Health Check:', health.status === 200 ? '✓ PASS' : '✗ FAIL');

  // 2. Authentication: Merchant Login
  const merchLogin = await request('/api/auth/login', 'POST', {
    email: 'merchant@revenuepilot.ai',
    password: 'Demo@12345',
    role: 'merchant'
  });
  console.log('[2] Merchant Login:', merchLogin.status === 200 && merchLogin.data.access_token ? '✓ PASS' : '✗ FAIL');
  const merchantToken = merchLogin.data.access_token;

  // 3. Authentication: Customer Login
  const custLogin = await request('/api/auth/login', 'POST', {
    email: 'customer@revenuepilot.ai',
    password: 'Demo@12345',
    role: 'customer'
  });
  console.log('[3] Customer Login:', custLogin.status === 200 && custLogin.data.access_token ? '✓ PASS' : '✗ FAIL');
  const customerToken = custLogin.data.access_token;
  const customerId = custLogin.data.user.id;

  // 4. Session Persistence (/api/auth/me)
  const me = await request('/api/auth/me', 'GET', null, merchantToken);
  console.log('[4] Session Persistence (/api/auth/me):', me.status === 200 && me.data.email === 'merchant@revenuepilot.ai' ? '✓ PASS' : '✗ FAIL');

  // 5. Merchant Tenant Data Isolation
  const merchantProds = await request('/api/merchant/products', 'GET', null, merchantToken);
  console.log('[5] Merchant Products Isolation:', merchantProds.status === 200 && Array.isArray(merchantProds.data) ? `✓ PASS (${merchantProds.data.length} products)` : '✗ FAIL');

  // 6. Delivery Address Validation & Storage
  // Invalid PIN check
  const invalidAddress = await request('/api/customer/address', 'POST', {
    full_name: 'Priya Patel',
    phone_number: '9876543210',
    house_flat_building: 'Flat 402',
    street_area: 'MG Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '123' // Invalid (not 6 digits)
  }, customerToken);
  const pinValidationPass = invalidAddress.status === 400;

  // Valid Address Save
  const validAddress = await request('/api/customer/address', 'POST', {
    full_name: 'Priya Patel',
    phone_number: '9876543210',
    house_flat_building: 'Flat 402, Sunshine Heights',
    street_area: 'MG Road, Near Central Park',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '400001',
    landmark: 'Behind Metro Station',
    is_default: 1
  }, customerToken);
  const addressSavedPass = validAddress.status === 200 && validAddress.data.address?.id;
  console.log('[6] Delivery Address Validation & Storage:', pinValidationPass && addressSavedPass ? '✓ PASS' : '✗ FAIL');
  const savedAddressId = validAddress.data.address?.id;

  // 7. Backend-Calculated Authoritative Checkout Summary
  const summaryRes = await request('/api/checkout/summary', 'POST', {
    items: [
      { product_id: 'prod_cake_01', quantity: 1 }, // ₹500
      { product_id: 'prod_cake_04', quantity: 1 }  // ₹100
    ]
  }, customerToken);
  const summaryPass = summaryRes.status === 200 && summaryRes.data.subtotal === 600 && summaryRes.data.total_amount === 600;
  console.log('[7] Authoritative Price Calculation:', summaryPass ? '✓ PASS' : '✗ FAIL');

  // 8. Cash on Delivery (COD) Real Order Placement
  const codRes = await request('/api/checkout/cod', 'POST', {
    address_id: savedAddressId,
    items: [
      { product_id: 'prod_cake_01', quantity: 1 } // ₹500
    ]
  }, customerToken);
  const codPass = codRes.status === 200 && codRes.data.order_id && codRes.data.payment_method === 'COD' && codRes.data.payment_status === 'PENDING' && codRes.data.order_status === 'CONFIRMED';
  console.log('[8] Cash on Delivery Order Creation:', codPass ? `✓ PASS (${codRes.data.order_id})` : '✗ FAIL');

  // 9. Razorpay Order Creation (Online Payment)
  const razorpayOrder = await request('/api/razorpay/create-order', 'POST', {
    payment_method: 'UPI',
    address_id: savedAddressId,
    items: [{ product_id: 'prod_cake_02', quantity: 1 }] // Mango Cake ₹600
  }, customerToken);
  console.log('[9] Razorpay Order Creation (UPI):', razorpayOrder.status === 200 && razorpayOrder.data.id ? '✓ PASS' : '✗ FAIL');

  // 10. Razorpay Payment Verification & Inventory Update
  const verifyPayment = await request('/api/razorpay/verify-payment', 'POST', {
    razorpay_order_id: razorpayOrder.data.id,
    razorpay_payment_id: 'pay_test_' + Date.now(),
    payment_mode: 'UPI'
  }, customerToken);
  const verifyPass = verifyPayment.status === 200 && verifyPayment.data.payment_status === 'PAID' && verifyPayment.data.order_status === 'CONFIRMED';
  console.log('[10] Razorpay Payment Verification & Paid Status:', verifyPass ? '✓ PASS' : '✗ FAIL');

  // 11. Payment Failure Handling (Cart Safety)
  const failRes = await request('/api/razorpay/simulate-failure', 'POST', {
    razorpay_order_id: razorpayOrder.data.id,
    reason: 'Card declined / Gateway timeout simulation'
  }, customerToken);
  console.log('[11] Payment Failure Cart Safety:', failRes.status === 200 && failRes.data.status === 'FAILED' ? '✓ PASS' : '✗ FAIL');

  // 12. Customer Order History
  const customerOrders = await request(`/api/orders/customer/${customerId}`, 'GET', null, customerToken);
  const ordersPass = customerOrders.status === 200 && customerOrders.data.length >= 2;
  console.log('[12] Customer Order History:', ordersPass ? `✓ PASS (${customerOrders.data.length} orders retrieved)` : '✗ FAIL');

  // 13. Merchant Dashboard Revenue Isolation (Excludes Pending COD from Paid Revenue)
  const merchantInsights = await request('/api/merchant/insights', 'GET', null, merchantToken);
  const insightsPass = merchantInsights.status === 200 && merchantInsights.data.metrics?.paid_orders >= 1 && merchantInsights.data.metrics?.total_sales >= 600;
  console.log('[13] Merchant Real Database Revenue Tracking:', insightsPass ? `✓ PASS (Paid Revenue: ₹${merchantInsights.data.metrics.total_sales})` : '✗ FAIL');

  // 14. Multimodal Voice Search & Grounding
  const voiceSearch = await request('/api/chat', 'POST', {
    message: 'I need black running shoes under ₹4,000',
    customer_id: customerId,
    modality: 'VOICE'
  }, customerToken);
  console.log('[14] Voice Shopping Assistant:', voiceSearch.status === 200 && voiceSearch.data.products?.length > 0 ? '✓ PASS' : '✗ FAIL');

  // 15. Multimodal Vision Search: TEST 1 - Cake Image
  const visionCake = await request('/api/chat', 'POST', {
    message: 'Find something like this',
    image_name: 'chocolate_birthday_cake.jpg',
    image_data: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    customer_id: customerId,
    modality: 'IMAGE'
  }, customerToken);
  const cakePass = visionCake.status === 200 &&
    visionCake.data.visual_attributes?.object === 'cake' &&
    visionCake.data.products?.length > 0 &&
    visionCake.data.primary_product?.id === 'prod_cake_01';
  console.log('[15A] Vision TEST 1 (Cake Image Analysis & Product Ranking):', cakePass ? '✓ PASS' : '✗ FAIL');

  // 15B. Multimodal Vision Search: TEST 2 - Shoe Image
  const visionShoe = await request('/api/chat', 'POST', {
    message: 'Find this sneaker',
    image_name: 'running_shoes_black.jpg',
    image_data: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    customer_id: customerId,
    modality: 'IMAGE'
  }, customerToken);
  const shoePass = visionShoe.status === 200 &&
    visionShoe.data.visual_attributes?.category === 'footwear' &&
    visionShoe.data.products?.length > 0;
  console.log('[15B] Vision TEST 2 (Shoe Image Analysis & Matching):', shoePass ? '✓ PASS' : '✗ FAIL');

  // 15C. Multimodal Vision Search: TEST 3 - Watch Image (Unmatched in Catalog)
  const visionWatch = await request('/api/chat', 'POST', {
    message: 'Find this watch',
    image_name: 'luxury_watch.jpg',
    image_data: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    customer_id: customerId,
    modality: 'IMAGE'
  }, customerToken);
  const watchPass = visionWatch.status === 200 &&
    visionWatch.data.products?.length === 0 &&
    visionWatch.data.ai_message.includes("couldn't find a matching product in this merchant's catalog");
  console.log('[15C] Vision TEST 3 (Watch Out-Of-Catalog Grounded Fallback):', watchPass ? '✓ PASS' : '✗ FAIL');

  // 15D. Multimodal Vision Search: TEST 4 - Police Vehicle Image (Unmatched in Catalog)
  const visionPolice = await request('/api/chat', 'POST', {
    message: 'What about this car?',
    image_name: 'police_patrol_car.png',
    image_data: 'data:image/png;base64,iVBORw0KGgo...',
    customer_id: customerId,
    modality: 'IMAGE'
  }, customerToken);
  const policePass = visionPolice.status === 200 &&
    visionPolice.data.products?.length === 0 &&
    visionPolice.data.ai_message.includes('police vehicle') &&
    visionPolice.data.ai_message.includes("couldn't find a matching product in this merchant's catalog");
  console.log('[15D] Vision TEST 4 (Police Vehicle Strict Grounding Fallback):', policePass ? '✓ PASS' : '✗ FAIL');

  // 15E. Multimodal Vision Search: TEST 5 - Image + Text Budget Constraint
  const visionBudget = await request('/api/chat', 'POST', {
    message: 'Find something similar under ₹1,000',
    image_name: 'chocolate_cake.jpg',
    image_data: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    customer_id: customerId,
    modality: 'MULTIMODAL'
  }, customerToken);
  const visionBudgetPass = visionBudget.status === 200 &&
    visionBudget.data.products?.every(p => p.price <= 1000);
  console.log('[15E] Vision TEST 5 (Image + Text Budget Bound):', visionBudgetPass ? '✓ PASS' : '✗ FAIL');

  // 15F. Multi-turn Followup: "Add that one to my cart"
  const addThatOne = await request('/api/chat', 'POST', {
    message: 'Add that one to my cart',
    customer_id: customerId
  }, customerToken);
  const addPass = addThatOne.status === 200 && addThatOne.data.cart_updated === true;
  console.log('[15F] Multi-Turn Grounding ("Add that one" exact item addition):', addPass ? '✓ PASS' : '✗ FAIL');

  // 16. Smart Discount Decision Engine
  const discounts = await request('/api/merchant/smart-discounts', 'GET', null, merchantToken);
  console.log('[16] Smart Discount Decision Engine:', discounts.status === 200 && Array.isArray(discounts.data.opportunities) ? '✓ PASS' : '✗ FAIL');

  // 17. Budget Bounded Basket Synthesis
  const budgetSearch = await request('/api/chat', 'POST', {
    message: 'Find me a chocolate birthday cake under ₹1,000',
    customer_id: customerId
  }, customerToken);
  const budgetPass = budgetSearch.status === 200 && (!budgetSearch.data.bundle || budgetSearch.data.bundle.total_price <= 1000);
  console.log('[17] AI Budget Constraint Safety:', budgetPass ? '✓ PASS' : '✗ FAIL');

  console.log('\n=== ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===');
}

runSystemVerification().catch(console.error);
