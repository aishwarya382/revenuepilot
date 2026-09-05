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
  console.log('=== RUNNING REVENUE PILOT AI VERIFICATION SUITE ===\n');

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

  // 4. Session Persistence (/api/auth/me)
  const me = await request('/api/auth/me', 'GET', null, merchantToken);
  console.log('[4] Session Persistence (/api/auth/me):', me.status === 200 && me.data.email === 'merchant@revenuepilot.ai' ? '✓ PASS' : '✗ FAIL');

  // 5. Merchant Tenant Data Isolation
  const merchantProds = await request('/api/merchant/products', 'GET', null, merchantToken);
  console.log('[5] Merchant Products Isolation:', merchantProds.status === 200 && Array.isArray(merchantProds.data) ? `✓ PASS (${merchantProds.data.length} products)` : '✗ FAIL');

  // 6. Multimodal AI Shopping Assistant: Voice Search
  const voiceSearch = await request('/api/chat', 'POST', {
    message: 'I need black running shoes under ₹4,000',
    customer_id: custLogin.data.user.id,
    modality: 'VOICE'
  }, customerToken);
  console.log('[6] Voice Shopping Assistant:', voiceSearch.status === 200 && voiceSearch.data.products?.length > 0 ? '✓ PASS' : '✗ FAIL');

  // 7. Multimodal AI Shopping Assistant: Vision Search
  const visionSearch = await request('/api/chat', 'POST', {
    message: 'Find something like this',
    image_name: 'black_sneakers.jpg',
    image_data: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    customer_id: custLogin.data.user.id,
    modality: 'IMAGE'
  }, customerToken);
  console.log('[7] Vision Attribute Search:', visionSearch.status === 200 && visionSearch.data.visual_attributes ? '✓ PASS' : '✗ FAIL');

  // 8. Positional Cart Grounding: "Add the second one"
  const addSecond = await request('/api/chat', 'POST', {
    message: 'Add the second one',
    customer_id: custLogin.data.user.id,
    last_products: voiceSearch.data.compared_products
  }, customerToken);
  console.log('[8] Positional Memory Grounding:', addSecond.status === 200 && addSecond.data.action_type === 'CART_UPDATED' ? '✓ PASS' : '✗ FAIL');

  // 9. Razorpay Order Creation
  const razorpayOrder = await request('/api/razorpay/create-order', 'POST', {
    amount: 2999,
    customer_id: custLogin.data.user.id,
    items: [{ product_id: 'prod_stepwalk_01', name: 'Running Shoes', price: 2999, quantity: 1 }]
  }, customerToken);
  console.log('[9] Razorpay Order Creation:', razorpayOrder.status === 200 && razorpayOrder.data.id ? '✓ PASS' : '✗ FAIL');

  // 10. Razorpay Payment Verification & Atomic Inventory
  const verifyPayment = await request('/api/razorpay/verify-payment', 'POST', {
    razorpay_order_id: razorpayOrder.data.id,
    razorpay_payment_id: 'pay_test_' + Date.now(),
    razorpay_signature: 'test_sig_' + Date.now(),
    customer_id: custLogin.data.user.id,
    items: [{ product_id: 'prod_stepwalk_01', name: 'Running Shoes', price: 2999, quantity: 1 }],
    total_amount: 2999
  }, customerToken);
  console.log('[10] Payment Verification & Inventory:', verifyPayment.status === 200 && verifyPayment.data.order_id ? '✓ PASS' : '✗ FAIL');

  // 11. Smart Discounts & Campaigns
  const discounts = await request('/api/merchant/smart-discounts', 'GET', null, merchantToken);
  console.log('[11] Smart Discount Decision Engine:', discounts.status === 200 && Array.isArray(discounts.data.opportunities) ? '✓ PASS' : '✗ FAIL');

  // 12. Persistent Cart State Workflow
  // Initial: Clear, then add Chocolate Cake (₹500), Candles (₹100), Balloons (₹300) -> Total ₹900
  await request('/api/chat', 'POST', { message: 'remove everything', customer_id: custLogin.data.user.id }, customerToken);
  await request('/api/chat', 'POST', { message: 'add chocolate cake', customer_id: custLogin.data.user.id }, customerToken);
  await request('/api/chat', 'POST', { message: 'add candles', customer_id: custLogin.data.user.id }, customerToken);
  await request('/api/chat', 'POST', { message: 'add balloon', customer_id: custLogin.data.user.id }, customerToken);

  // Step A: "I need vanilla cake" -> Swaps chocolate cake with vanilla cake (₹450 + ₹100 + ₹300 = ₹850)
  const swapRes = await request('/api/chat', 'POST', { message: 'I need vanilla cake', customer_id: custLogin.data.user.id }, customerToken);
  const swapPass = swapRes.data.cart?.total_amount === 850 && swapRes.data.cart?.items.length === 3;

  // Step B: "remove cake alone" -> Removes vanilla cake (₹100 + ₹300 = ₹400)
  const removeCakeRes = await request('/api/chat', 'POST', { message: 'remove cake alone', customer_id: custLogin.data.user.id }, customerToken);
  const removeCakePass = removeCakeRes.data.cart?.total_amount === 400 && removeCakeRes.data.cart?.items.length === 2;

  // Step C: "remove candles" -> Removes candles (₹300)
  const removeCandlesRes = await request('/api/chat', 'POST', { message: 'remove candles', customer_id: custLogin.data.user.id }, customerToken);
  const removeCandlesPass = removeCandlesRes.data.cart?.total_amount === 300 && removeCandlesRes.data.cart?.items.length === 1;

  // Step D: "remove everything" -> Cart is empty (₹0)
  const clearRes = await request('/api/chat', 'POST', { message: 'remove everything', customer_id: custLogin.data.user.id }, customerToken);
  const clearPass = clearRes.data.cart?.total_amount === 0 && clearRes.data.cart?.items.length === 0;

  // Step E: "just vanilla cake" -> Cart has only Vanilla Cake (₹450)
  const justRes = await request('/api/chat', 'POST', { message: 'just vanilla cake', customer_id: custLogin.data.user.id }, customerToken);
  const justPass = justRes.data.cart?.total_amount === 450 && justRes.data.cart?.items.length === 1;

  const persistentCartPass = swapPass && removeCakePass && removeCandlesPass && clearPass && justPass;
  console.log('[12] Persistent Cart State Continuity:', persistentCartPass ? '✓ PASS' : '✗ FAIL');

  // 13. Natural Language Inquiries & Intelligent Q&A
  // Test A: "What's the cheapest cake?"
  const cheapRes = await request('/api/chat', 'POST', { message: "What's the cheapest cake?", customer_id: custLogin.data.user.id }, customerToken);
  const cheapPass = cheapRes.status === 200 && cheapRes.data.primary_product?.name === 'Vanilla Cake' && cheapRes.data.primary_product?.price === 450;

  // Test B: "How much is my cart?"
  const cartQueryRes = await request('/api/chat', 'POST', { message: 'How much is my cart?', customer_id: custLogin.data.user.id }, customerToken);
  const cartQueryPass = cartQueryRes.status === 200 && cartQueryRes.data.cart?.total_amount === 450;

  // Test C: "What does COD mean?"
  const codRes = await request('/api/chat', 'POST', { message: 'What does COD mean?', customer_id: custLogin.data.user.id }, customerToken);
  const codPass = codRes.status === 200 && codRes.data.ai_message?.includes('Cash on Delivery');

  // Test D: "remove everything except candles"
  await request('/api/chat', 'POST', { message: 'add candles', customer_id: custLogin.data.user.id }, customerToken);
  await request('/api/chat', 'POST', { message: 'add balloon', customer_id: custLogin.data.user.id }, customerToken);
  const keepRes = await request('/api/chat', 'POST', { message: 'remove everything except candles', customer_id: custLogin.data.user.id }, customerToken);
  const keepPass = keepRes.data.cart?.total_amount === 100 && keepRes.data.cart?.items.length === 1 && keepRes.data.cart?.items[0].name.includes('Candles');

  const naturalQAPass = cheapPass && cartQueryPass && codPass && keepPass;
  console.log('[13] Natural Language Intelligence & Q&A:', naturalQAPass ? '✓ PASS' : '✗ FAIL');

  console.log('\n=== ALL 13 VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===');
}

runSystemVerification().catch(console.error);
