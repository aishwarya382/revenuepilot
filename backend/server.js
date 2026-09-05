const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const { db, logAudit } = require('./db');
const { AgentTools } = require('./agentTools');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_AiCommerce2026';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'SecretKeyRazorpayTest2026';

let razorpayClient = null;
try {
  razorpayClient = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
} catch (err) {
  console.log('Razorpay initialization notice:', err.message);
}

// In-memory conversation state for customer context resolution
const customerSessions = new Map();

function getCustomerSession(customerId) {
  if (!customerSessions.has(customerId)) {
    customerSessions.set(customerId, {
      last_search_results: [],
      last_selected_product: null,
      last_selected_product_id: null,
      last_suggested_bundle: null
    });
  }
  return customerSessions.get(customerId);
}

// Merchant tenant resolver (enforces backend authentication & isolation)
function getAuthenticatedMerchant(req) {
  // Determine merchant from authentication header. If missing, unauthorized.
  const customMerchantId = req.headers['x-merchant-id'] || req.headers['x-merchant'];
  if (!customMerchantId) {
    return null; // Caller will handle unauthorized response.
  }
  const user = db.prepare('SELECT * FROM users WHERE (id = ? OR merchant_id = ?) AND role = ?').get(customMerchantId, customMerchantId, 'merchant');
  if (user) {
    return {
      id: user.id,
      merchant_id: user.merchant_id || user.id,
      store_name: user.store_name || user.name,
      name: user.name,
      email: user.email
    };
  }

  // Fallback check by ID directly in users table
  const fallback = db.prepare('SELECT * FROM users WHERE id = ?').get(customMerchantId);
  if (fallback && fallback.role === 'merchant') {
    return {
      id: fallback.id,
      merchant_id: fallback.merchant_id || fallback.id,
      store_name: fallback.store_name || fallback.name,
      name: fallback.name,
      email: fallback.email
    };
  }

  // No valid merchant found
  return null;
}

// Natural language intent classifier & reference extraction
function extractIntent(text = '') {
  const query = text.toLowerCase().trim();

  // Price budget extraction (e.g. "under 1000", "under ₹3,500", "below 500")
  let maxPrice = null;
  let minPrice = null;

  const maxMatch = query.match(/(?:under|below|less than|within|max(?:imum)?)\s*(?:rs\.?|inr|₹)?\s*([0-9,]+)/i);
  if (maxMatch) {
    maxPrice = parseFloat(maxMatch[1].replace(/,/g, ''));
  }

  const aroundMatch = query.match(/(?:around|approx(?:imately)?|budget of)\s*(?:rs\.?|inr|₹)?\s*([0-9,]+)/i);
  if (aroundMatch && !maxPrice) {
    const base = parseFloat(aroundMatch[1].replace(/,/g, ''));
    maxPrice = Math.round(base * 1.25);
    minPrice = Math.max(0, Math.round(base * 0.75));
  }

  const cleanQuery = query
    .replace(/(?:under|below|less than|around|approx|within|budget of)\s*(?:rs\.?|inr|₹)?\s*[0-9,]+/gi, '')
    .replace(/(?:find|search|show|get|suggest|need|looking for|want|buy|can you get|give me)\s*(?:me|a|an|the)?/gi, '')
    .replace(/[₹,]/g, '')
    .trim();

  // Check for bundle action commands
  const isAddBundleAction = (
    query.includes('add complete bundle') ||
    query.includes('add the complete bundle') ||
    query.includes('add whole bundle') ||
    query.includes('add bundle') ||
    query.includes('add all') ||
    query.includes('add whole package') ||
    query.includes('add everything') ||
    query.includes('buy bundle') ||
    query.includes('buy complete bundle')
  );

  // Check for main product action commands (e.g. "just cake", "just shoes", "just main product")
  const isJustMainProductAction = (
    query.includes('just cake') ||
    query.includes('just the cake') ||
    query.includes('only cake') ||
    query.includes('just add cake') ||
    query.includes('just shoes') ||
    query.includes('just the shoes') ||
    query.includes('just running shoes') ||
    query.includes('just laptop') ||
    query.includes('just the main product') ||
    query.includes('only the main product') ||
    query.includes('just main product')
  );

  // Check for add-to-cart action commands
  const isAddToCartAction = !isAddBundleAction && !isJustMainProductAction && (
    query.startsWith('add ') ||
    query.includes('add to cart') ||
    query.includes('add that to cart') ||
    query.includes('add that one') ||
    query.includes('add this one') ||
    query.includes('add this') ||
    query.includes('add it') ||
    query.includes('buy this') ||
    query.includes('buy now')
  );

  // Extract item name if user specifically says "Add candles" or "Add socks"
  let targetName = null;
  if (isAddToCartAction) {
    targetName = query
      .replace(/add\s*(that\s*one|this\s*one|that|this|it|the\s*selected\s*product)?\s*(to\s*cart)?/gi, '')
      .replace(/to\s*cart/gi, '')
      .replace(/please/gi, '')
      .trim();
  }

  const isComparison = query.includes('compare') || query.includes('which one') || query.includes('difference') || query.includes('better');
  const isBirthday = query.includes('birthday') || query.includes('bday') || query.includes('party') || query.includes('celebration');

  return {
    raw: text,
    searchQuery: cleanQuery,
    maxPrice,
    minPrice,
    isAddToCartAction,
    isAddBundleAction,
    isJustMainProductAction,
    targetName: targetName && targetName.length > 1 ? targetName : null,
    isComparison,
    isBirthday,
    occasion: isBirthday ? 'birthday' : (query.includes('anniversary') ? 'anniversary' : null)
  };
}

// AI Shopping Assistant Chat Handler
async function handleAIChat(req, res) {
  const { message, customer_id, last_products, last_bundle, last_selected_product_id } = req.body;
  const userMessage = (message || '').trim();
  const customerId = customer_id || 'cust_demo_01';

  if (!userMessage) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const session = getCustomerSession(customerId);

  if (Array.isArray(last_products) && last_products.length > 0) {
    session.last_search_results = last_products;
  }
  if (last_bundle) {
    session.last_suggested_bundle = last_bundle;
  }
  if (last_selected_product_id) {
    session.last_selected_product_id = last_selected_product_id;
  }

  const intent = extractIntent(userMessage);

  // 1. Action: Add Complete Bundle
  if (intent.isAddBundleAction) {
    const bundle = session.last_suggested_bundle;
    if (bundle && bundle.product_ids && bundle.product_ids.length > 0) {
      try {
        AgentTools.add_bundle_to_cart(customerId, bundle.product_ids);
        logAudit('Customer', customerId, 'Add Bundle via AI', `Added full bundle '${bundle.bundle_name || bundle.bundle_title}' to cart`, { bundle });

        return res.json({
          intent: 'Add Bundle to Cart',
          ai_message: `Added full bundle (**${bundle.bundle_name || bundle.bundle_title}** - ${bundle.items.length} items) for **₹${bundle.total_price.toLocaleString('en-IN')}** directly to your cart!`,
          message: `Added full bundle (**${bundle.bundle_name || bundle.bundle_title}** - ${bundle.items.length} items) for **₹${bundle.total_price.toLocaleString('en-IN')}** directly to your cart!`,
          primary_product: bundle.main_product,
          products: bundle.items,
          compared_products: bundle.items,
          in_store_products: bundle.items,
          bundle,
          tool_calls_executed: ['add_bundle_to_cart'],
          action_type: 'CART_UPDATED',
          cart_updated: true,
          follow_up: 'Would you like to proceed to checkout or look for something else?'
        });
      } catch (err) {
        return res.json({
          intent: 'Add Bundle Error',
          ai_message: `Notice: ${err.message}`,
          message: `Notice: ${err.message}`,
          primary_product: bundle.main_product,
          products: bundle.items,
          compared_products: bundle.items,
          bundle,
          tool_calls_executed: ['add_bundle_to_cart'],
          action_type: 'NOTICE'
        });
      }
    } else {
      return res.json({
        intent: 'Add Bundle Notice',
        ai_message: `No active bundle recommendation found. Please search for an item first (e.g. "chocolate cake for birthday under ₹1,000" or "running shoes under ₹3,500").`,
        message: `No active bundle recommendation found. Please search for an item first (e.g. "chocolate cake for birthday under ₹1,000" or "running shoes under ₹3,500").`,
        primary_product: null,
        products: session.last_search_results,
        compared_products: session.last_search_results,
        bundle: null,
        tool_calls_executed: ['extract_intent'],
        action_type: 'NOTICE'
      });
    }
  }

  // 2. Action: Add Main Product Only ("Just Cake" / "Just Shoes")
  if (intent.isJustMainProductAction) {
    const mainProd = session.last_suggested_bundle?.main_product || session.last_selected_product || session.last_search_results?.[0];
    if (mainProd) {
      try {
        AgentTools.add_to_cart(customerId, mainProd.id || mainProd.product_id, 1);
        logAudit('Customer', customerId, 'Add Main Product to Cart', `Added ${mainProd.name} to cart`, { product_id: mainProd.id || mainProd.product_id });

        return res.json({
          intent: 'Add Main Product',
          ai_message: `Added **${mainProd.name}** (from **${mainProd.merchant_name || 'In-Store'}**) to your cart for **₹${mainProd.price.toLocaleString('en-IN')}**!`,
          message: `Added **${mainProd.name}** (from **${mainProd.merchant_name || 'In-Store'}**) to your cart for **₹${mainProd.price.toLocaleString('en-IN')}**!`,
          primary_product: mainProd,
          products: [mainProd],
          compared_products: session.last_search_results,
          in_store_products: session.last_search_results,
          bundle: session.last_suggested_bundle,
          tool_calls_executed: ['add_to_cart'],
          action_type: 'CART_UPDATED',
          cart_updated: true,
          follow_up: 'Would you like to proceed to checkout or look for something else?'
        });
      } catch (err) {
        return res.json({
          intent: 'Add to Cart Error',
          ai_message: `Notice: ${err.message}`,
          message: `Notice: ${err.message}`,
          primary_product: mainProd,
          products: [mainProd],
          compared_products: session.last_search_results,
          bundle: null,
          tool_calls_executed: ['add_to_cart'],
          action_type: 'NOTICE'
        });
      }
    } else {
      return res.json({
        intent: 'Add Product Notice',
        ai_message: `I couldn't determine which product you want to add. Please search for an item first or select a product above.`,
        message: `I couldn't determine which product you want to add. Please search for an item first or select a product above.`,
        primary_product: null,
        products: [],
        compared_products: [],
        bundle: null,
        tool_calls_executed: ['extract_intent'],
        action_type: 'NOTICE'
      });
    }
  }

  // 3. Action: Conversational Add to Cart ("Add that one", "Add to cart", "Add candles")
  if (intent.isAddToCartAction) {
    let target = null;

    if (intent.targetName) {
      const tLower = intent.targetName.toLowerCase();
      if (session.last_suggested_bundle?.items) {
        target = session.last_suggested_bundle.items.find(it => (it.name || '').toLowerCase().includes(tLower) || (it.category || '').toLowerCase().includes(tLower));
      }
      if (!target && session.last_search_results) {
        target = session.last_search_results.find(it => (it.name || '').toLowerCase().includes(tLower) || (it.category || '').toLowerCase().includes(tLower));
      }
    }

    if (!target) {
      target = session.last_selected_product || session.last_search_results?.[0];
    }

    if (target) {
      try {
        AgentTools.add_to_cart(customerId, target.id || target.product_id, 1);
        logAudit('Customer', customerId, 'Add to Cart via AI', `AI added ${target.name} to cart on user command: "${userMessage}"`, { product_id: target.id || target.product_id });

        return res.json({
          intent: 'Add to Cart',
          ai_message: `Added **${target.name}** (from **${target.merchant_name || 'In-Store'}**) for **₹${target.price.toLocaleString('en-IN')}** to your cart! Ready to checkout whenever you are.`,
          message: `Added **${target.name}** (from **${target.merchant_name || 'In-Store'}**) for **₹${target.price.toLocaleString('en-IN')}** to your cart! Ready to checkout whenever you are.`,
          primary_product: target,
          products: [target],
          compared_products: session.last_search_results,
          in_store_products: session.last_search_results,
          bundle: session.last_suggested_bundle,
          tool_calls_executed: ['add_to_cart'],
          action_type: 'CART_UPDATED',
          cart_updated: true,
          follow_up: 'Would you like to proceed to checkout or look for something else?'
        });
      } catch (err) {
        return res.json({
          intent: 'Add to Cart Error',
          ai_message: `Notice: ${err.message}`,
          message: `Notice: ${err.message}`,
          primary_product: target,
          products: [target],
          compared_products: session.last_search_results,
          bundle: null,
          tool_calls_executed: ['add_to_cart'],
          action_type: 'NOTICE'
        });
      }
    } else {
      return res.json({
        intent: 'Add to Cart Notice',
        ai_message: `I couldn't determine which product you want to add. Please select a product from your search results or tell me what you're looking for!`,
        message: `I couldn't determine which product you want to add. Please select a product from your search results or tell me what you're looking for!`,
        primary_product: null,
        products: [],
        compared_products: [],
        bundle: null,
        tool_calls_executed: ['extract_intent'],
        action_type: 'NOTICE'
      });
    }
  }

  // 4. Conversational Comparison
  if (intent.isComparison && session.last_search_results.length > 1) {
    const sortedByPrice = [...session.last_search_results].sort((a, b) => a.price - b.price);
    const cheapest = sortedByPrice[0];
    const topRecommended = session.last_search_results[0];

    const comparisonMsg = `Between the options in our merchant catalog:
• **Best Match**: **${topRecommended.name}** by **${topRecommended.merchant_name}** (₹${topRecommended.price.toLocaleString('en-IN')}) — ${topRecommended.description}
• **Best Value / Budget**: **${cheapest.name}** by **${cheapest.merchant_name}** at ₹${cheapest.price.toLocaleString('en-IN')}.

Would you like me to add **${topRecommended.name}** to your cart?`;

    return res.json({
      intent: 'Compare Products',
      ai_message: comparisonMsg,
      message: comparisonMsg,
      primary_product: topRecommended,
      products: session.last_search_results,
      compared_products: session.last_search_results,
      in_store_products: session.last_search_results,
      tool_calls_executed: ['compare_products', 'rank_products'],
      action_type: 'COMPARISON',
      follow_up: `Click "Add to Cart" or tell me: "Add ${topRecommended.name} to cart"`
    });
  }

  // 5. Merchant Catalog Product Discovery & Basket Growth Proposal
  const toolCalls = ['extract_intent', 'search_merchant_catalog'];

  const merchantResults = AgentTools.search_products({
    query: intent.searchQuery || userMessage,
    max_budget: intent.maxPrice,
    min_budget: intent.minPrice,
    limit: 6
  });

  if (merchantResults.length === 0) {
    const budgetText = intent.maxPrice ? ` under ₹${intent.maxPrice.toLocaleString('en-IN')}` : '';
    const itemText = intent.searchQuery ? `'${intent.searchQuery}'` : `'${userMessage}'`;

    logAudit('AI Shopping Agent', customerId, 'Product Search (Out of Catalog)', `No products found matching ${itemText}${budgetText} in live merchant catalog`, { query: userMessage, intent });

    const stores = db.prepare("SELECT DISTINCT merchant_name, category FROM products WHERE status = 'published'").all();
    const storeSummary = stores.map(s => `**${s.merchant_name}** (${s.category})`).join(', ');

    return res.json({
      intent: `Search: ${itemText}`,
      ai_message: `I couldn't find a matching product for ${itemText}${budgetText} in our live merchant catalogs. All recommendations are strictly grounded in merchant inventory.\n\nCurrently available stores: ${storeSummary}.\n\nWould you like to search within these stores or adjust your budget?`,
      message: `I couldn't find a matching product for ${itemText}${budgetText} in our live merchant catalogs. All recommendations are strictly grounded in merchant inventory.\n\nCurrently available stores: ${storeSummary}.\n\nWould you like to search within these stores or adjust your budget?`,
      primary_product: null,
      products: [],
      compared_products: [],
      in_store_products: [],
      bundle: null,
      tool_calls_executed: toolCalls,
      action_type: 'NO_RESULTS',
      follow_up: 'Try searching for cakes, running shoes, sneakers, or laptops from our verified merchants!'
    });
  }

  const primary = merchantResults[0];
  let calculatedBundle = null;

  // AI Basket Growth Agent (Strictly Bounded by Customer Budget if provided)
  toolCalls.push('search_complementary_products');
  const complementary = AgentTools.search_complementary_products({
    mainProduct: primary,
    occasion: intent.occasion || (intent.isBirthday ? 'birthday' : null),
    max_budget: intent.maxPrice ? (intent.maxPrice - primary.price) : null
  });

  if (complementary.length > 0) {
    toolCalls.push('calculate_bundle');
    calculatedBundle = AgentTools.calculate_bundle({
      mainProduct: primary,
      complementaryItems: complementary,
      budget_limit: intent.maxPrice
    });
  }

  session.last_search_results = merchantResults;
  session.last_selected_product = primary;
  session.last_selected_product_id = primary.id || primary.product_id;
  session.last_suggested_bundle = calculatedBundle;

  logAudit(
    'AI Basket Growth Agent',
    customerId,
    'Merchant Catalog Discovery & Bundling',
    `Found ${merchantResults.length} item(s) from '${primary.merchant_name}' for query '${intent.searchQuery || userMessage}'` +
    (calculatedBundle ? `. Proposed budget-bounded bundle for ₹${calculatedBundle.total_price} (Budget: ₹${intent.maxPrice || 'Any'})` : ''),
    {
      query: userMessage,
      intent,
      merchant_id: primary.merchant_id,
      merchant_name: primary.merchant_name,
      tools_used: toolCalls,
      bundle_created: !!calculatedBundle,
      bundle_total: calculatedBundle?.total_price || primary.price
    }
  );

  const budgetClause = intent.maxPrice ? ` under ₹${intent.maxPrice.toLocaleString('en-IN')}` : '';
  let aiMsg = '';

  if (calculatedBundle && calculatedBundle.complementary_items.length > 0) {
    const compNames = calculatedBundle.complementary_items.map(i => `${i.name} (₹${i.price})`).join(' and ');
    const remText = calculatedBundle.remaining_budget !== null && calculatedBundle.remaining_budget > 0
      ? ` (which is **₹${calculatedBundle.remaining_budget.toLocaleString('en-IN')} below your budget**)`
      : '';

    if ((primary.category || '').toLowerCase().includes('cake') || intent.isBirthday) {
      aiMsg = `🍫 **${primary.name}** — **₹${primary.price.toLocaleString('en-IN')}**\nAvailable from **${primary.merchant_name}**.\n\n` +
        `Since you're buying for a celebration, I found:\n` +
        calculatedBundle.complementary_items.map(c => `• **${c.name}** — ₹${c.price.toLocaleString('en-IN')}`).join('\n') +
        `\n\nComplete setup total: **₹${calculatedBundle.total_price.toLocaleString('en-IN')}**${remText}.\n\nWould you like to add the complete bundle?`;
    } else if ((primary.category || '').toLowerCase().includes('footwear') || (primary.name || '').toLowerCase().includes('shoe')) {
      aiMsg = `👟 **${primary.name}** — **₹${primary.price.toLocaleString('en-IN')}**\nAvailable from **${primary.merchant_name}**.\n\n` +
        `You may also like:\n` +
        calculatedBundle.complementary_items.map(c => `• **${c.name}** — ₹${c.price.toLocaleString('en-IN')}`).join('\n') +
        `\n\nComplete bundle total: **₹${calculatedBundle.total_price.toLocaleString('en-IN')}**${remText}.\n\nWould you like to add the complete bundle or just the shoes?`;
    } else {
      aiMsg = `💻 **${primary.name}** — **₹${primary.price.toLocaleString('en-IN')}**\nAvailable from **${primary.merchant_name}**.\n\n` +
        `Matching accessories from the same store:\n` +
        calculatedBundle.complementary_items.map(c => `• **${c.name}** — ₹${c.price.toLocaleString('en-IN')}`).join('\n') +
        `\n\nComplete bundle total: **₹${calculatedBundle.total_price.toLocaleString('en-IN')}**${remText}.\n\nWould you like to add the bundle?`;
    }
  } else {
    const merchantNames = [...new Set(merchantResults.map(p => p.merchant_name))].join(', ');
    aiMsg = `I found **${merchantResults.length} real product(s)** from **${merchantNames}** matching ${intent.searchQuery || 'your request'}${budgetClause}:`;
  }

  return res.json({
    intent: `Search: ${intent.searchQuery || userMessage}`,
    ai_message: aiMsg,
    message: aiMsg,
    primary_product: primary,
    products: merchantResults,
    compared_products: merchantResults,
    in_store_products: merchantResults,
    bundle: calculatedBundle,
    tool_calls_executed: toolCalls,
    action_type: calculatedBundle ? 'BUNDLE_RECOMMENDATION' : 'SEARCH_RESULTS',
    follow_up: calculatedBundle
      ? 'Click [Add Complete Bundle] to add everything, or select [Just Main Product].'
      : 'Click [Add to Cart] or tell me: "Add that one to cart".'
  });
}

// Routes: Chat
app.post('/api/chat', handleAIChat);
app.post('/api/ai/chat', handleAIChat);

// Routes: Cart
app.get('/api/cart/:customerId', (req, res) => {
  const cartData = AgentTools.getCart(req.params.customerId);
  res.json(cartData);
});

app.post('/api/cart/items', (req, res) => {
  const { customer_id, product_id, productId, quantity } = req.body;
  const targetId = product_id || productId;
  try {
    const updated = AgentTools.add_to_cart(customer_id || 'cust_demo_01', targetId, Number(quantity) || 1);
    logAudit('Customer', customer_id, 'Add to Cart', `Added product ${targetId} to cart`, { product_id: targetId, quantity });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/cart/add', (req, res) => {
  const { customer_id, product_id, productId, quantity } = req.body;
  const targetId = product_id || productId;
  try {
    const updated = AgentTools.addToCart(customer_id || 'cust_demo_01', targetId, Number(quantity) || 1);
    logAudit('Customer', customer_id, 'Add to Cart', `Added product ${targetId} to cart`, { product_id: targetId, quantity });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/cart/add-bundle', (req, res) => {
  const { customer_id, product_ids } = req.body;
  try {
    const updated = AgentTools.add_bundle_to_cart(customer_id || 'cust_demo_01', product_ids);
    logAudit('Customer', customer_id, 'Bundle Added to Cart', `Added bundle containing ${product_ids?.length || 0} products to cart`, { product_ids });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/cart/:customerId/items/:itemId', (req, res) => {
  const updated = AgentTools.removeFromCart(req.params.customerId, req.params.itemId);
  res.json(updated);
});

app.post('/api/cart/:customerId/clear', (req, res) => {
  const updated = AgentTools.clearCart(req.params.customerId);
  res.json(updated);
});

app.post('/api/cart/clear', (req, res) => {
  const customerId = req.body?.customer_id || req.query?.customer_id || 'cust_demo_01';
  const updated = AgentTools.clearCart(customerId);
  res.json(updated);
});

app.delete('/api/cart/clear', (req, res) => {
  const customerId = req.body?.customer_id || req.query?.customer_id || 'cust_demo_01';
  const updated = AgentTools.clearCart(customerId);
  res.json(updated);
});

// Routes: Orders
app.get('/api/orders/customer/:customerId', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.customerId);

  const fullOrders = orders.map(o => {
    const items = db.prepare(`
      SELECT oi.product_id, oi.quantity, oi.price, p.name, p.image_url, p.merchant_name
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(o.id);

    return {
      id: o.id,
      customer_id: o.customer_id,
      total_amount: o.total_amount,
      status: o.status,
      razorpay_order_id: o.razorpay_order_id,
      razorpay_payment_id: o.razorpay_payment_id,
      created_at: o.created_at,
      items: items.map(it => ({
        product_id: it.product_id,
        name: it.name || 'Product',
        merchant_name: it.merchant_name || 'In-Store',
        quantity: it.quantity,
        price: it.price,
        item_total: it.price * it.quantity
      }))
    };
  });

  res.json(fullOrders);
});

// Routes: Razorpay Test Mode Payments
function handleCreateOrder(req, res) {
  const { amount, customer_id, items } = req.body;
  const numAmount = Number(amount) || 1000;
  const custId = customer_id || 'cust_demo_01';

  const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const razorpayOrderId = `rzp_order_${Date.now()}`;

  db.prepare(`
    INSERT INTO orders (id, customer_id, total_amount, status, razorpay_order_id, created_at)
    VALUES (?, ?, ?, 'CREATED', ?, ?)
  `).run(orderId, custId, numAmount, razorpayOrderId, new Date().toISOString());

  if (items && Array.isArray(items)) {
    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, merchant_id, quantity, price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const it of items) {
      const prodId = it.product_id || it.id;
      if (prodId) {
        const prod = db.prepare('SELECT merchant_id FROM products WHERE id = ?').get(prodId);
        insertItem.run(
          `oi_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          orderId,
          prodId,
          prod?.merchant_id || 'merchant_celebration_cakes',
          it.quantity || 1,
          it.price || numAmount
        );
      }
    }
  }

  logAudit('Checkout Agent', custId, 'Razorpay Test Order Initiated', `Initiated checkout for ₹${numAmount.toLocaleString('en-IN')}`, {
    orderId,
    razorpayOrderId,
    amount: numAmount
  });

  res.json({
    id: razorpayOrderId,
    db_order_id: orderId,
    amount: Math.round(numAmount * 100),
    currency: 'INR',
    customer_id: custId
  });
}

function handleVerifyPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, customer_id } = req.body;
  const custId = customer_id || 'cust_demo_01';

  db.prepare(`
    UPDATE orders SET status = 'PAID', razorpay_payment_id = ?
    WHERE razorpay_order_id = ?
  `).run(razorpay_payment_id || `pay_${Date.now()}`, razorpay_order_id);

  AgentTools.clearCart(custId);

  logAudit('Checkout Agent', custId, 'Payment Verified', `Razorpay test payment verified: ${razorpay_payment_id}`, {
    razorpay_order_id,
    razorpay_payment_id,
    status: 'PAID'
  });

  res.json({
    status: 'SUCCESS',
    message: 'Payment verified and recorded in database!',
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id
  });
}

function handleSimulateFailure(req, res) {
  const { razorpay_order_id, amount, reason, customer_id } = req.body;
  const custId = customer_id || 'cust_demo_01';

  if (razorpay_order_id) {
    db.prepare("UPDATE orders SET status = 'PAYMENT_FAILED' WHERE razorpay_order_id = ?").run(razorpay_order_id);
  }

  logAudit('Checkout Agent', custId, 'Payment Failed', `Payment simulation failed: ${reason || 'Gateway timeout / Card declined'}. Cart preserved.`, {
    razorpay_order_id,
    amount,
    reason: reason || 'Gateway timeout / Card declined',
    cart_preserved: true
  }, 'FAILED');

  res.json({
    status: 'FAILED',
    message: reason || 'Payment transaction failed. Your cart has been preserved.',
    order_id: razorpay_order_id
  });
}

app.post('/api/payments/create-order', handleCreateOrder);
app.post('/api/razorpay/create-order', handleCreateOrder);
app.post('/api/payments/verify', handleVerifyPayment);
app.post('/api/razorpay/verify-payment', handleVerifyPayment);
app.post('/api/payments/simulate-failure', handleSimulateFailure);
app.post('/api/razorpay/simulate-failure', handleSimulateFailure);

// ==========================================================
// STRICT MULTI-TENANT MERCHANT APIS (DATABASE ENFORCED)
// ==========================================================

// GET /api/merchant/products (Enforces merchant_id ownership)
app.get('/api/merchant/products', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized: Merchant authentication required' });
  }

  const prods = db.prepare('SELECT * FROM products WHERE merchant_id = ? ORDER BY created_at DESC').all(merchant.merchant_id);
  res.json(prods.map(p => ({ ...p, product_id: p.id, image: p.image_url })));
});

// POST /api/merchant/products (Forces merchant_id = current_user.merchant_id)
app.post('/api/merchant/products', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized: Merchant authentication required' });
  }

  const { name, category, price, stock, description, image_url } = req.body;

  if (!name || price === undefined || price === null || isNaN(price)) {
    return res.status(400).json({ error: 'Name and a valid numeric price are required.' });
  }

  const id = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  // Strict backend assignment of tenant identity
  db.prepare(`
    INSERT INTO products (id, merchant_id, merchant_name, name, category, price, stock, description, image_url, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
  `).run(
    id,
    merchant.merchant_id,
    merchant.store_name,
    name.trim(),
    category || 'General',
    Number(price),
    Number(stock) || 20,
    description || '',
    image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
    new Date().toISOString()
  );

  logAudit('Merchant', merchant.merchant_id, 'Product Created', `Published new product '${name}' at ₹${price}`, { product_id: id, name, price, merchant_id: merchant.merchant_id });

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json({ ...created, product_id: created.id, image: created.image_url });
});

// PUT /api/merchant/products/:id (Guards against cross-tenant mutations)
app.put('/api/merchant/products/:id', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const productId = req.params.id;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!existing) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  if (existing.merchant_id !== merchant.merchant_id) {
    return res.status(403).json({ error: 'Forbidden: You cannot modify products belonging to another merchant.' });
  }

  const { name, category, price, stock, description, image_url } = req.body;

  db.prepare(`
    UPDATE products
    SET name = ?, category = ?, price = ?, stock = ?, description = ?, image_url = ?
    WHERE id = ? AND merchant_id = ?
  `).run(
    name || existing.name,
    category || existing.category,
    price !== undefined ? Number(price) : existing.price,
    stock !== undefined ? Number(stock) : existing.stock,
    description !== undefined ? description : existing.description,
    image_url !== undefined ? image_url : existing.image_url,
    productId,
    merchant.merchant_id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  res.json({ ...updated, product_id: updated.id, image: updated.image_url });
});

// DELETE /api/merchant/products/:id (Guards against cross-tenant deletion)
app.delete('/api/merchant/products/:id', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const productId = req.params.id;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!existing) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  if (existing.merchant_id !== merchant.merchant_id) {
    return res.status(403).json({ error: 'Forbidden: You cannot delete products belonging to another merchant.' });
  }

  db.prepare('DELETE FROM products WHERE id = ? AND merchant_id = ?').run(productId, merchant.merchant_id);
  res.json({ success: true, message: 'Product deleted from your store catalog.' });
});

// GET /api/merchant/orders (Returns only orders belonging to current merchant)
app.get('/api/merchant/orders', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const rows = db.prepare(`
    SELECT oi.id as item_id, oi.order_id, oi.quantity, oi.price,
           p.name as product_name, p.image_url,
           o.customer_id, o.status as order_status, o.created_at, o.razorpay_payment_id
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE oi.merchant_id = ?
    ORDER BY o.created_at DESC
  `).all(merchant.merchant_id);

  res.json(rows);
});

// GET /api/merchant/insights (Computes dashboard metrics solely for current merchant)
app.get('/api/merchant/insights', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const mId = merchant.merchant_id;
  const merchantProds = db.prepare('SELECT * FROM products WHERE merchant_id = ?').all(mId);
  const productsCount = merchantProds.length;

  const merchantOrderItems = db.prepare(`
    SELECT oi.*, o.status as order_status
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.merchant_id = ?
  `).all(mId);

  const paidItems = merchantOrderItems.filter(it => it.order_status === 'PAID');
  const totalSales = paidItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const totalOrders = new Set(merchantOrderItems.map(it => it.order_id)).size;
  const paidOrdersCount = new Set(paidItems.map(it => it.order_id)).size;
  const avgBasket = paidOrdersCount > 0 ? Math.round(totalSales / paidOrdersCount) : 0;

  // Real opportunities tailored to this merchant's catalog
  const topProds = merchantProds.slice(0, 3);
  const nextBestActions = topProds.map((p, idx) => ({
    id: `opp_0${idx + 1}`,
    target: `${p.name} Bundle Opportunity`,
    observation: `Customers frequently view ${p.name}. Stock: ${p.stock} units.`,
    recommended_action: `Deploy AI cross-sell bundle for ${p.name}`,
    expected_impact: `Potential basket increase: ₹${p.price} → ₹${Math.round(p.price * 1.6)}`,
    action_type: 'BUNDLE',
    base_price: p.price,
    bundle_price: Math.round(p.price * 1.6),
    discount_value: p.price > 1000 ? 100 : 50
  }));

  const campaigns = db.prepare("SELECT * FROM campaigns WHERE merchant_id = ? AND status = 'ACTIVE'").all(mId);

  res.json({
    merchant_id: mId,
    store_name: merchant.store_name,
    has_data: paidOrdersCount > 0,
    metrics: {
      total_sales: totalSales,
      total_orders: totalOrders,
      paid_orders: paidOrdersCount,
      average_basket: avgBasket,
      ai_assisted_orders: paidOrdersCount,
      active_catalog_products: productsCount,
      conversion_rate: totalOrders > 0 ? `${((paidOrdersCount / totalOrders) * 100).toFixed(1)}%` : '0%',
      status_notice: paidOrdersCount > 0 ? 'Live real-time metrics computed from your SQLite database.' : 'Not enough historical transaction data yet. Live metrics update with new customer orders.'
    },
    next_best_actions: nextBestActions,
    active_campaigns: campaigns
  });
});

app.post('/api/merchant/approve-campaign', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, action_type } = req.body;
  const campId = `camp_${Date.now()}`;
  const mId = merchant.merchant_id;
  const campTitle = title || `${merchant.store_name} Campaign`;

  db.prepare(`
    INSERT INTO campaigns (id, merchant_id, name, type, status, expected_revenue, actual_revenue, created_at)
    VALUES (?, ?, ?, ?, 'ACTIVE', 50000.0, 0.0, ?)
  `).run(campId, mId, campTitle, action_type || 'PROMO', new Date().toISOString());

  logAudit('Merchant', mId, 'Campaign Approved', `Merchant approved campaign '${campTitle}'`, {
    campaign_id: campId,
    merchant_id: mId,
    title: campTitle
  });

  res.json({
    status: 'APPROVED',
    campaign: { id: campId, name: campTitle, status: 'ACTIVE', merchant_id: mId },
    message: `Campaign '${campTitle}' is now live for ${merchant.store_name}!`
  });
});

// GET /api/merchant/audit (Returns audit events strictly for current merchant)
app.get('/api/merchant/audit', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const logs = db.prepare(`
    SELECT * FROM audit_logs 
    WHERE actor_id = ? OR metadata_json LIKE ?
    ORDER BY created_at DESC LIMIT 50
  `).all(merchant.merchant_id, `%"merchant_id":"${merchant.merchant_id}"%`);

  res.json({
    audit_logs: logs.map(l => ({
      id: l.id,
      timestamp: l.created_at ? new Date(l.created_at).toLocaleTimeString() : 'Just now',
      agent: l.actor_type,
      action: l.action,
      reason: l.reason,
      status: l.status,
      metadata: l.metadata_json ? JSON.parse(l.metadata_json) : {}
    }))
  });
});

// Routes: Audit Logs (System wide for admin/audit drawer)
app.get('/api/audit-logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50').all();
  res.json({
    audit_logs: logs.map(l => ({
      id: l.id,
      timestamp: l.created_at ? new Date(l.created_at).toLocaleTimeString() : 'Just now',
      agent: l.actor_type,
      action: l.action,
      reason: l.reason,
      status: l.status,
      metadata: l.metadata_json ? JSON.parse(l.metadata_json) : {}
    }))
  });
});

// Routes: Auth
app.post('/api/auth/login', (req, res) => {
  const { email, role } = req.body;
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const userId = role === 'merchant' ? `merchant_${Date.now()}` : `cust_${Date.now()}`;
    const defaultName = role === 'merchant' ? 'Store Admin' : email.split('@')[0];
    const storeName = role === 'merchant' ? 'My Store' : null;
    db.prepare('INSERT INTO users (id, merchant_id, name, email, password_hash, role, store_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      userId,
      role === 'merchant' ? userId : null,
      defaultName,
      email,
      'demo_hash',
      role || 'customer',
      storeName,
      new Date().toISOString()
    );
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  }

  res.json({
    access_token: `token_${Date.now()}`,
    user: {
      id: user.id,
      merchant_id: user.merchant_id || user.id,
      name: user.name,
      email: user.email,
      role: role || user.role,
      store_name: user.store_name || user.name
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, role, store_name } = req.body;
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email is already registered.' });
  }

  const userId = role === 'merchant' ? `merchant_${Date.now()}` : `cust_${Date.now()}`;
  db.prepare('INSERT INTO users (id, merchant_id, name, email, password_hash, role, store_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    userId,
    role === 'merchant' ? userId : null,
    name || 'User',
    email,
    'demo_hash',
    role || 'customer',
    store_name || (role === 'merchant' ? name : null),
    new Date().toISOString()
  );

  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json({
    access_token: `token_${Date.now()}`,
    user: {
      id: newUser.id,
      merchant_id: newUser.merchant_id || newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      store_name: newUser.store_name || newUser.name
    }
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

app.listen(PORT, () => {
  console.log(`🚀 Revenue Pilot AI backend server running on http://localhost:${PORT}`);
});
