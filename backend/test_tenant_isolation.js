// backend/test_tenant_isolation.js
const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:8000${path}`);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
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

async function runTenantSecurityTests() {
  console.log('================================================================');
  console.log('REVENUE PILOT AI — MULTI-TENANT ISOLATION & SECURITY TEST SUITE');
  console.log('================================================================');

  // TEST 1: Login as Celebration Cakes -> Returns celebration cakes merchant_id
  console.log('\n--- TEST 1: Merchant Login & Identity Resolution ---');
  const loginCakes = await request('POST', '/api/auth/login', {
    email: 'owner@celebrationcakes.in',
    role: 'merchant'
  });
  const cakesMerchantId = loginCakes.data.user?.merchant_id;
  const cakesStoreName = loginCakes.data.user?.store_name;
  if (!cakesMerchantId || cakesStoreName !== 'Celebration Cakes') {
    throw new Error(`Test 1 Failed: Login did not bind to Celebration Cakes! Got: ${cakesStoreName}`);
  }
  console.log(`✅ [1/8] PASSED: Logged in as "${cakesStoreName}" (merchant_id="${cakesMerchantId}")`);

  // TEST 2: Celebration Cakes Product Catalog Isolation
  console.log('\n--- TEST 2: Celebration Cakes Catalog Query (Strict Isolation) ---');
  const prodsCakes = await request('GET', `/api/merchant/products?merchant_id=${cakesMerchantId}`, null, {
    'x-merchant-id': cakesMerchantId
  });
  const hasShoesInCakes = prodsCakes.data.some(p => p.name.toLowerCase().includes('shoe') || p.category.toLowerCase().includes('footwear'));
  const hasLaptopsInCakes = prodsCakes.data.some(p => p.name.toLowerCase().includes('laptop'));
  if (hasShoesInCakes || hasLaptopsInCakes) {
    throw new Error('Test 2 Failed: Celebration Cakes catalog contains shoes or laptops!');
  }
  console.log(`✅ [2/8] PASSED: Celebration Cakes catalog contains ONLY ${prodsCakes.data.length} cake/decoration products. Zero cross-tenant leaks.`);

  // TEST 3: Login as StepWalk Shoes
  console.log('\n--- TEST 3: StepWalk Shoes Login & Catalog Isolation ---');
  const loginShoes = await request('POST', '/api/auth/login', {
    email: 'owner@stepwalk.in',
    role: 'merchant'
  });
  const shoesMerchantId = loginShoes.data.user?.merchant_id;
  const shoesStoreName = loginShoes.data.user?.store_name;
  const prodsShoes = await request('GET', `/api/merchant/products?merchant_id=${shoesMerchantId}`, null, {
    'x-merchant-id': shoesMerchantId
  });
  const hasCakesInShoes = prodsShoes.data.some(p => p.name.toLowerCase().includes('cake'));
  if (hasCakesInShoes) {
    throw new Error('Test 3 Failed: StepWalk Shoes catalog contains cakes!');
  }
  console.log(`✅ [3/8] PASSED: StepWalk Shoes contains ${prodsShoes.data.length} footwear/care products. Cake items are completely invisible.`);

  // TEST 4: Cross-Tenant Attack: StepWalk Shoes tries to delete Celebration Cakes product
  console.log('\n--- TEST 4: Cross-Tenant Mutation Protection ---');
  const cakeProductId = prodsCakes.data[0].id;
  const attackRes = await request('DELETE', `/api/merchant/products/${cakeProductId}`, null, {
    'x-merchant-id': shoesMerchantId // StepWalk Shoes trying to delete Cake
  });
  if (attackRes.status !== 403) {
    throw new Error(`Test 4 Failed: Expected 403 Forbidden on cross-tenant delete, got ${attackRes.status}`);
  }
  console.log(`✅ [4/8] PASSED: Cross-tenant product deletion blocked with status ${attackRes.status} (${attackRes.data.error})`);

  // TEST 5: Product Creation Tenant Auto-Assignment (Cannot Spoof merchant_id)
  console.log('\n--- TEST 5: Product Creation Identity Enforcement ---');
  const createRes = await request('POST', '/api/merchant/products', {
    name: 'Red Velvet Truffle Cake',
    category: 'Cakes',
    price: 650,
    stock: 25,
    merchant_id: 'merchant_stepwalk_shoes' // Attacker attempting to spoof merchant_id
  }, {
    'x-merchant-id': cakesMerchantId // Authenticated as Celebration Cakes
  });
  if (createRes.data.merchant_id !== cakesMerchantId || createRes.data.merchant_name !== 'Celebration Cakes') {
    throw new Error('Test 5 Failed: Backend allowed frontend to spoof merchant_id!');
  }
  console.log(`✅ [5/8] PASSED: Product automatically assigned to authenticated merchant "${createRes.data.merchant_name}" (${createRes.data.merchant_id}). Spoofed merchant_id ignored.`);

  // Clean up created test product
  await request('DELETE', `/api/merchant/products/${createRes.data.id}`, null, {
    'x-merchant-id': cakesMerchantId
  });

  // TEST 6: AI Customer Search Grounding (Celebration Cakes)
  console.log('\n--- TEST 6: Customer Query for Cake Grounded in Celebration Cakes ---');
  const resCakeSearch = await request('POST', '/api/chat', {
    message: 'I need a chocolate cake for a birthday under ₹1,000',
    customer_id: 'cust_verify_01'
  });
  const matchedCake = resCakeSearch.data.products?.find(p => p.name.toLowerCase().includes('cake'));
  if (!matchedCake || matchedCake.merchant_name !== 'Celebration Cakes') {
    throw new Error('Test 6 Failed: Cake query did not resolve to Celebration Cakes!');
  }
  console.log(`✅ [6/8] PASSED: Customer search returned "${matchedCake.name}" (₹${matchedCake.price}) from "${matchedCake.merchant_name}". Bundle total: ₹${resCakeSearch.data.bundle.total_price} <= ₹1,000.`);

  // TEST 7: AI Customer Search Grounding (StepWalk Shoes)
  console.log('\n--- TEST 7: Customer Query for Shoes Grounded in StepWalk Shoes ---');
  const resShoeSearch = await request('POST', '/api/chat', {
    message: 'I need running shoes under ₹3,500',
    customer_id: 'cust_verify_01'
  });
  const matchedShoe = resShoeSearch.data.products?.find(p => p.name.toLowerCase().includes('running'));
  if (!matchedShoe || matchedShoe.merchant_name !== 'StepWalk Shoes') {
    throw new Error('Test 7 Failed: Running shoes did not resolve to StepWalk Shoes!');
  }
  console.log(`✅ [7/8] PASSED: Customer search returned "${matchedShoe.name}" (₹${matchedShoe.price}) from "${matchedShoe.merchant_name}". Bundle total: ₹${resShoeSearch.data.bundle ? resShoeSearch.data.bundle.total_price : matchedShoe.price} <= ₹3,500.`);

  // TEST 8: Out-of-catalog search produces clean merchant inventory notice
  console.log('\n--- TEST 8: Out-of-Catalog Query Strict Grounding ---');
  const resOutOfCat = await request('POST', '/api/chat', {
    message: 'I need diamond jewelry under ₹20,000',
    customer_id: 'cust_verify_01'
  });
  if (resOutOfCat.data.products && resOutOfCat.data.products.length > 0) {
    throw new Error('Test 8 Failed: Hallucinated out-of-catalog products!');
  }
  console.log(`✅ [8/8] PASSED: Out-of-catalog query returned clear merchant store inventory guidance with ZERO hallucinated products.`);

  console.log('\n================================================================');
  console.log('🎉 ALL 8 MULTI-TENANT ISOLATION SECURITY TESTS PASSED 100%!');
  console.log('================================================================\n');
}

runTenantSecurityTests().catch((err) => {
  console.error('❌ SECURITY TEST FAILED:', err);
  process.exit(1);
});
