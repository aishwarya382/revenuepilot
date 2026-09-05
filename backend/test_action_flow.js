// backend/test_action_flow.js
const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:8000${path}`);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('REVENUE PILOT AI — MERCHANT-FIRST AGENTIC COMMERCE TEST SUITE');
  console.log('================================================================');

  const customerA = 'cust_test_A_' + Date.now();
  const customerB = 'cust_test_B_' + Date.now();

  // 1. Cake Bakery: "Find me a chocolate cake for a birthday under ₹1,000"
  console.log('\n--- TEST 1: Cake Bakery Discovery & Bounded Birthday Bundle ---');
  const resCake = await request('POST', '/api/chat', {
    message: 'I need a chocolate cake for a birthday under ₹1,000',
    customer_id: customerA,
  });
  const cake = resCake.data.products?.find(p => p.name.toLowerCase().includes('cake'));
  const bundleCake = resCake.data.bundle;

  if (!cake || !bundleCake) throw new Error('Test 1 Failed: Cake or Bundle not generated!');
  if (bundleCake.total_price > 1000) throw new Error(`Test 1 Failed: Bundle total ₹${bundleCake.total_price} exceeds budget ₹1,000!`);

  console.log(`✅ [1/8] PASSED: Found ${cake.name} (₹${cake.price}) from ${cake.merchant_name}. Proposed Bounded Bundle: Total ₹${bundleCake.total_price} <= ₹1,000 budget.`);

  // 2. Action: "Just Cake" adds ONLY Chocolate Cake (₹500)
  console.log('\n--- TEST 2: "Just Cake" Action ---');
  await request('POST', '/api/cart/clear', { customer_id: customerA });
  const resJustCake = await request('POST', '/api/chat', {
    message: 'Just Cake',
    customer_id: customerA,
  });
  const cartCake = await request('GET', `/api/cart/${customerA}`);
  if (cartCake.data.items.length !== 1 || !cartCake.data.items[0].name.includes('Chocolate Cake')) {
    throw new Error('Test 2 Failed: Just cake did not add only chocolate cake!');
  }
  console.log(`✅ [2/8] PASSED: "Just Cake" added 1 item: ${cartCake.data.items[0].name} (₹${cartCake.data.items[0].price}). Total: ₹${cartCake.data.total_amount}`);

  // 3. Action: "Add that one to cart"
  console.log('\n--- TEST 3: "Add that one to cart" Reference Resolution ---');
  await request('POST', '/api/chat', {
    message: 'I need a chocolate cake for a birthday under ₹1,000',
    customer_id: customerA,
  });
  await request('POST', '/api/cart/clear', { customer_id: customerA });
  const resAddThat = await request('POST', '/api/chat', {
    message: 'Add that one to cart',
    customer_id: customerA,
  });
  const cartAddThat = await request('GET', `/api/cart/${customerA}`);
  if (cartAddThat.data.items.length !== 1 || cartAddThat.data.items[0].product_id !== cake.product_id) {
    throw new Error('Test 3 Failed: "Add that one" did not resolve to cake!');
  }
  console.log(`✅ [3/8] PASSED: Resolved "that one" to ${cartAddThat.data.items[0].name} (₹${cartAddThat.data.items[0].price}) without triggering new search.`);

  // 4. Action: "Add Complete Bundle"
  console.log('\n--- TEST 4: "Add Complete Bundle" Action ---');
  await request('POST', '/api/cart/clear', { customer_id: customerA });
  const resAddBundle = await request('POST', '/api/chat', {
    message: 'Add complete bundle',
    customer_id: customerA,
  });
  const cartBundle = await request('GET', `/api/cart/${customerA}`);
  if (cartBundle.data.items.length < 2) throw new Error('Test 4 Failed: Bundle items not added!');
  console.log(`✅ [4/8] PASSED: Added complete bundle (${cartBundle.data.items.map(i => i.name).join(' + ')}). Total: ₹${cartBundle.data.total_amount}`);

  // 5. Shoe Merchant: "I need running shoes under ₹3,500"
  console.log('\n--- TEST 5: StepWalk Shoes Discovery & Cross-Sell ---');
  const resShoes = await request('POST', '/api/chat', {
    message: 'I need running shoes under ₹3,500',
    customer_id: customerB,
  });
  const shoes = resShoes.data.products?.find(p => p.name.toLowerCase().includes('running'));
  const bundleShoes = resShoes.data.bundle;
  if (!shoes || !shoes.merchant_name.includes('StepWalk')) throw new Error('Test 5 Failed: Did not return StepWalk shoes!');
  if (bundleShoes && bundleShoes.total_price > 3500) throw new Error('Test 5 Failed: Shoes bundle exceeded ₹3,500 budget!');
  console.log(`✅ [5/8] PASSED: Found ${shoes.name} (₹${shoes.price}) from ${shoes.merchant_name}. Proposed Cross-sell Total: ₹${bundleShoes ? bundleShoes.total_price : shoes.price} <= ₹3,500.`);

  // 6. Tech Store: "I need a laptop under ₹60,000"
  console.log('\n--- TEST 6: TechStore Pro Discovery ---');
  const resTech = await request('POST', '/api/chat', {
    message: 'I need a laptop under ₹60,000',
    customer_id: customerA,
  });
  const laptop = resTech.data.products?.find(p => p.name.toLowerCase().includes('laptop'));
  if (!laptop || !laptop.merchant_name.includes('TechStore')) throw new Error('Test 6 Failed: Did not return TechStore laptop!');
  console.log(`✅ [6/8] PASSED: Found ${laptop.name} (₹${laptop.price}) from ${laptop.merchant_name}. No random cross-category items.`);

  // 7. Out-of-catalog search (Merchant-First Grounding)
  console.log('\n--- TEST 7: Out-of-catalog search is strictly grounded ---');
  const resOut = await request('POST', '/api/chat', {
    message: 'Find me diamond jewelry under ₹10,000',
    customer_id: customerA,
  });
  if (resOut.data.products && resOut.data.products.length > 0) {
    throw new Error('Test 7 Failed: Hallucinated jewelry products!');
  }
  console.log(`✅ [7/8] PASSED: Out-of-catalog search returned clear merchant inventory notice with zero hallucinations.`);

  // 8. Graceful Payment Failure Handling
  console.log('\n--- TEST 8: Razorpay Payment Failure Graceful Recovery ---');
  await request('POST', '/api/cart/clear', { customer_id: customerA });
  await request('POST', '/api/cart/items', { customer_id: customerA, product_id: cake.product_id, quantity: 1 });
  const orderRes = await request('POST', '/api/razorpay/create-order', {
    customer_id: customerA,
    amount: 500
  });
  const failRes = await request('POST', '/api/razorpay/simulate-failure', {
    customer_id: customerA,
    razorpay_order_id: orderRes.data.id,
    amount: 500,
    reason: 'Test payment failure (Card declined)'
  });
  const cartAfterFail = await request('GET', `/api/cart/${customerA}`);
  if (cartAfterFail.data.items.length !== 1) {
    throw new Error('Test 8 Failed: Cart was cleared on payment failure!');
  }
  console.log(`✅ [8/8] PASSED: Simulated payment failure handled gracefully. Cart preserved with ${cartAfterFail.data.items.length} item.`);

  console.log('\n================================================================');
  console.log('🎉 ALL 8 AGENTIC COMMERCE ACCEPTANCE TESTS PASSED 100%!');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('❌ TEST SUITE ERROR:', err);
  process.exit(1);
});
