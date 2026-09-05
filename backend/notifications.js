const express = require('express');
const router = express.Router();

// In-memory map of active SSE connections per user ID (customer or merchant)
const clients = {};

function emitToUser(userId, data) {
  const connections = clients[userId];
  if (!connections) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of connections) {
    res.write(payload);
  }
}

function emitToCustomer(customerId, data) {
  emitToUser(customerId, { type: 'customer', ...data });
}

function emitToMerchant(merchantId, data) {
  emitToUser(merchantId, { type: 'merchant', ...data });
}

// SSE endpoint: client connects and holds the connection open
router.get('/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  // Set appropriate headers for Server‑Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Keep connection alive with comment every 15 seconds
  const keepAlive = setInterval(() => {
    res.write(':\n\n');
  }, 15000);

  if (!clients[userId]) clients[userId] = [];
  clients[userId].push(res);

  req.on('close', () => {
    clearInterval(keepAlive);
    const idx = clients[userId].indexOf(res);
    if (idx !== -1) clients[userId].splice(idx, 1);
    if (clients[userId].length === 0) delete clients[userId];
  });
});

module.exports = { router, emitToCustomer, emitToMerchant };
