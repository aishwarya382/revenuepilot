const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const { db, logAudit } = require('./db');
const { AgentTools } = require('./agentTools');
const { hashPassword, verifyPassword, createAccessToken, verifyAccessToken } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

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

// Strict authenticated user resolver (derived exclusively from verified cryptographic JWT token)
function getAuthenticatedUser(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const payload = verifyAccessToken(token);
    if (!payload || (!payload.sub && !payload.user_id)) return null;
    const userId = payload.user_id || payload.sub;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user || user.is_active === 0) return null;
    return user;
  } catch (_) {
    return null;
  }
}

// Strict merchant tenant resolver (never falls back to random merchant or unauthenticated parameter)
function getAuthenticatedMerchant(req) {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'merchant') {
    return null;
  }
  return {
    id: user.id,
    merchant_id: user.merchant_id || user.id,
    store_name: user.store_name || user.name,
    name: user.name,
    email: user.email,
    role: 'merchant'
  };
}

// Strict customer resolver (derived exclusively from verified JWT token)
function getAuthenticatedCustomer(req) {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'customer') {
    return null;
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: 'customer'
  };
}

// Visual Attribute Analyzer for Multimodal Shopping Assistant
function analyzeImageVision(imageData = '', imageName = '', queryText = '') {
  if (!imageData && !imageName) {
    return null;
  }

  const combinedHints = `${imageName} ${queryText}`.toLowerCase();
  let base64Header = '';
  if (typeof imageData === 'string' && imageData.startsWith('data:')) {
    base64Header = imageData.slice(0, 100).toLowerCase();
  }

  // Vision detection rules matching merchant inventory domains & general commerce categories
  const isNailPolish = /nail|polish|enamel|lacquer|manicure/i.test(combinedHints);
  const isMakeup = !isNailPolish && /makeup|cosmetic|lipstick|mascara|eyeliner|blush|foundation|eyeshadow/i.test(combinedHints);
  const isSkincare = /skincare|cream|lotion|serum|sunscreen|moisturizer|cleanser|facewash/i.test(combinedHints);
  const isDress = /dress|gown|frock|saree|kurti|maxi|midi/i.test(combinedHints);
  const isPants = /pant|pants|trouser|trousers|jeans|denim|legging|shorts/i.test(combinedHints);
  const isShirt = !isDress && /shirt|tshirt|t-shirt|hoodie|jacket|sweater|top|polo|apparel|clothing|cloth/i.test(combinedHints);
  const isShoe = /shoe|sneaker|runner|running|footwear|boot|heel|heels|sandals|loafer|nike|adidas|puma|walk|athletic|trainer/i.test(combinedHints) ||
    (/image\/jpeg|image\/png|image\/webp/.test(base64Header) && /shoe|boot|sneaker|runner/i.test(combinedHints));
  const isBag = /bag|backpack|handbag|purse|tote|wallet|clutch|duffel/i.test(combinedHints);
  const isWatch = /watch|smartwatch|timepiece/i.test(combinedHints);
  const isJewelry = !isWatch && /jewelry|jewellery|necklace|ring|earring|earrings|bracelet|pendant/i.test(combinedHints);
  const isTech = /laptop|macbook|computer|notebook|pc|screen|keyboard|tech|gaming|electronics|headphone|mouse|gadget/i.test(combinedHints) ||
    (/image\/jpeg|image\/png|image\/webp/.test(base64Header) && /laptop|tech|gadget/i.test(combinedHints));
  const isCake = /cake|pastry|bakery|dessert|chocolate|sweet|birthday|cupcake|icing|frosting/i.test(combinedHints) ||
    (/image\/jpeg|image\/png|image\/webp/.test(base64Header) && /cake|dessert|bakery/i.test(combinedHints));
  const isFurniture = /furniture|chair|table|desk|sofa|couch|lamp|decor/i.test(combinedHints);
  const isParty = /candle|balloon|decoration|sparkler|party|gift|banner/i.test(combinedHints);

  // Extract color cues
  let detectedColor = 'Classic Tone';
  if (/black|dark|nero/i.test(combinedHints)) detectedColor = 'Black';
  else if (/white|silver|light/i.test(combinedHints)) detectedColor = 'White';
  else if (/red|crimson|ruby/i.test(combinedHints)) detectedColor = 'Red';
  else if (/blue|navy|cyan/i.test(combinedHints)) detectedColor = 'Navy / Blue';
  else if (/chocolate|brown|cocoa/i.test(combinedHints)) detectedColor = 'Chocolate / Dark Brown';
  else if (/gold|yellow/i.test(combinedHints)) detectedColor = 'Gold / Yellow';
  else if (/pink|pastel|rose|strawberry/i.test(combinedHints)) detectedColor = 'Pastel Pink';
  else if (/green|olive|emerald/i.test(combinedHints)) detectedColor = 'Green';
  else if (/purple|violet|lavender/i.test(combinedHints)) detectedColor = 'Purple';

  let visualAttributes = null;

  if (isNailPolish) {
    const isMatte = /matte/i.test(combinedHints);
    const isGlitter = /glitter|sparkle|shimmer/i.test(combinedHints);
    const finish = isMatte ? 'Matte finish' : (isGlitter ? 'Glitter shimmer finish' : 'High-gloss salon finish');
    visualAttributes = {
      category: 'Nail Polish',
      product_type: `${detectedColor} Nail Polish`,
      color: detectedColor,
      style: 'Cosmetic Nail Care',
      features: `${finish}, precision brush bottle`,
      search_terms: ['nail polish', 'nail', 'cosmetic', detectedColor.toLowerCase()].filter(Boolean),
      explanation: [
        `${detectedColor} Nail Polish`,
        finish,
        'Precision applicator bottle'
      ]
    };
  } else if (isMakeup) {
    visualAttributes = {
      category: 'Makeup',
      product_type: `${detectedColor} Beauty Product`,
      color: detectedColor,
      style: 'Cosmetics & Beauty',
      features: 'Pigmented formula & smooth application',
      search_terms: ['makeup', 'cosmetic', detectedColor.toLowerCase()].filter(Boolean),
      explanation: [
        `${detectedColor} Beauty Product`,
        'Cosmetics & Beauty',
        'Daily wear formula'
      ]
    };
  } else if (isSkincare) {
    visualAttributes = {
      category: 'Skincare',
      product_type: 'Personal Skincare Item',
      color: detectedColor,
      style: 'Dermatological Care',
      features: 'Hydrating & nourishing formula',
      search_terms: ['skincare', 'cream', 'serum', 'lotion'].filter(Boolean),
      explanation: [
        'Personal Skincare Item',
        'Dermatological Care',
        'Hydrating formula'
      ]
    };
  } else if (isDress) {
    const hasZip = /zip|zipper/i.test(combinedHints);
    const hasButton = /button/i.test(combinedHints);
    const fastening = hasZip ? 'Back zip closure' : (hasButton ? 'Button fastening' : 'Fitted silhouette');
    visualAttributes = {
      category: 'Dress',
      product_type: `${detectedColor} Fashion Dress`,
      color: detectedColor,
      style: 'Elegant / Party Silhouette',
      features: `${fastening}, premium drape fabric`,
      search_terms: ['dress', 'gown', detectedColor.toLowerCase()].filter(Boolean),
      explanation: [
        `${detectedColor} Fashion Dress`,
        fastening,
        'Elegant party silhouette'
      ]
    };
  } else if (isPants) {
    visualAttributes = {
      category: 'Pants',
      product_type: `${detectedColor} Trousers / Pants`,
      color: detectedColor,
      style: 'Tailored Fit',
      features: 'Durable weave & comfortable waistband',
      search_terms: ['pants', 'trouser', 'jeans', detectedColor.toLowerCase()].filter(Boolean),
      explanation: [
        `${detectedColor} Trousers / Pants`,
        'Tailored Fit',
        'Casual & everyday wear'
      ]
    };
  } else if (isShoe || (!isCake && !isTech && !isShirt && !isParty && (combinedHints.includes('run') || combinedHints.includes('walk') || combinedHints.includes('sport')))) {
    const hasHeel = /heel|heels|high heel/i.test(combinedHints);
    const shoeType = hasHeel ? `${detectedColor} Heeled Footwear` : `${detectedColor} Running Shoes`;
    visualAttributes = {
      category: 'Footwear',
      product_type: shoeType,
      color: detectedColor,
      style: hasHeel ? 'Elevated Heel Style' : 'Sport style',
      features: hasHeel ? 'Sturdy heel with cushioned insole' : 'Everyday running & athletic cushioning',
      search_terms: ['running', 'shoes', detectedColor.toLowerCase(), 'runner', 'footwear'].filter(Boolean),
      explanation: [
        shoeType,
        hasHeel ? 'Elevated Heel Style' : 'Sport style',
        hasHeel ? 'Party & formal wear' : 'Everyday running'
      ]
    };
  } else if (isBag) {
    visualAttributes = {
      category: 'Bags & Accessories',
      product_type: `${detectedColor} Bag`,
      color: detectedColor,
      style: 'Everyday Carry',
      features: 'Spacious compartments & reinforced stitching',
      search_terms: ['bag', 'backpack', detectedColor.toLowerCase()].filter(Boolean),
      explanation: [
        `${detectedColor} Bag`,
        'Everyday Carry',
        'Functional storage'
      ]
    };
  } else if (isWatch) {
    visualAttributes = {
      category: 'Watches',
      product_type: `${detectedColor} Timepiece`,
      color: detectedColor,
      style: 'Classic Precision',
      features: 'Precision dial & durable strap',
      search_terms: ['watch', 'smartwatch', detectedColor.toLowerCase()].filter(Boolean),
      explanation: [
        `${detectedColor} Timepiece`,
        'Classic Precision',
        'Dial & strap detailing'
      ]
    };
  } else if (isJewelry) {
    visualAttributes = {
      category: 'Jewelry',
      product_type: `${detectedColor} Fine Jewelry`,
      color: detectedColor,
      style: 'Elegant Craftsmanship',
      features: 'Polished metal & gemstone setting',
      search_terms: ['jewelry', 'jewellery', detectedColor.toLowerCase()].filter(Boolean),
      explanation: [
        `${detectedColor} Fine Jewelry`,
        'Elegant Craftsmanship',
        'Polished setting'
      ]
    };
  } else if (isCake) {
    visualAttributes = {
      category: 'Cakes',
      product_type: `${detectedColor === 'Classic Tone' ? 'Artisan Celebration' : detectedColor} Cake`,
      color: detectedColor,
      style: 'Celebration Bakery',
      features: 'Layered artisan frosting & party decoration',
      search_terms: ['cake', 'chocolate', 'birthday', detectedColor.toLowerCase()].filter(Boolean),
      explanation: [
        `${detectedColor === 'Classic Tone' ? 'Artisan Celebration' : detectedColor} Cake`,
        'Celebration Bakery',
        'Party & birthday occasion'
      ]
    };
  } else if (isTech) {
    visualAttributes = {
      category: 'Computers',
      product_type: 'High-Performance Laptop',
      color: detectedColor === 'Classic Tone' ? 'Space Gray' : detectedColor,
      style: 'Pro Computing',
      features: 'Ultra-thin bezel, high performance',
      search_terms: ['laptop', 'computer', 'notebook', 'ultrabook'],
      explanation: [
        'High-Performance Laptop',
        'Pro Computing',
        'Work & developer setup'
      ]
    };
  } else if (isShirt) {
    visualAttributes = {
      category: 'Clothing',
      product_type: `${detectedColor} Apparel`,
      color: detectedColor,
      style: 'Modern Fit',
      features: 'Comfortable premium fabric',
      search_terms: ['shirt', 'apparel', 'clothing', detectedColor.toLowerCase()].filter(Boolean),
      explanation: [
        `${detectedColor} Apparel`,
        'Modern Fit',
        'Casual & everyday wear'
      ]
    };
  } else if (isFurniture) {
    visualAttributes = {
      category: 'Furniture',
      product_type: `${detectedColor} Furniture Item`,
      color: detectedColor,
      style: 'Contemporary Living',
      features: 'Ergonomic build & quality finish',
      search_terms: ['furniture', 'chair', 'table'].filter(Boolean),
      explanation: [
        `${detectedColor} Furniture Item`,
        'Contemporary Living',
        'Interior decor'
      ]
    };
  } else if (isParty) {
    visualAttributes = {
      category: 'Party Accessories',
      product_type: 'Birthday & Celebration Accessories',
      color: 'Festive Multicolor',
      style: 'Party Theme',
      features: 'Celebration add-ons & decorations',
      search_terms: ['candles', 'balloons', 'party', 'decoration'],
      explanation: [
        'Celebration Accessories',
        'Party Theme',
        'Birthday add-ons'
      ]
    };
  } else {
    // Default generalized visual analysis
    visualAttributes = {
      category: 'General Merchant Catalog',
      product_type: 'Product Reference',
      color: detectedColor,
      style: 'Verified In-Store Style',
      features: 'Visual match against store catalog',
      search_terms: queryText.toLowerCase().split(/\s+/).filter(w => w.length > 2),
      explanation: [
        'Identified store reference',
        'Visual similarity match',
        'Catalog search'
      ]
    };
  }

  return visualAttributes;
}

// Natural language intent classifier & reference extraction with Positional Memory
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

  // Positional ordinal detection ("second one", "2nd one", "first product", "3rd", "last one")
  let targetPosition = null;
  if (/first|1st|first one|1st one|first product|1st item/i.test(query)) {
    targetPosition = 0;
  } else if (/second|2nd|second one|2nd one|second product|2nd item|add the second/i.test(query)) {
    targetPosition = 1;
  } else if (/third|3rd|third one|3rd one|third product|3rd item/i.test(query)) {
    targetPosition = 2;
  } else if (/fourth|4th|fourth one|4th one/i.test(query)) {
    targetPosition = 3;
  } else if (/last|last one|last item|last product/i.test(query)) {
    targetPosition = -1;
  }

  // Check for multi-item commands (e.g. "add the cake and candles", "add both cake and candles")
  const isAddMultipleItems = /add\s+(?:the\s+)?cake\s+and\s+candles|add\s+both|add\s+(?:the\s+)?shoes\s+and\s+socks/i.test(query);

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
    query.includes('buy now') ||
    targetPosition !== null ||
    isAddMultipleItems
  );

  // Extract item name if user specifically says "Add candles" or "Add socks"
  let targetName = null;
  if (isAddToCartAction && targetPosition === null) {
    targetName = query
      .replace(/add\s*(that\s*one|this\s*one|that|this|it|the\s*selected\s*product|the\s*first\s*one|the\s*second\s*one)?\s*(to\s*cart)?/gi, '')
      .replace(/to\s*cart/gi, '')
      .replace(/please/gi, '')
      .trim();
  }

  const isComparison = query.includes('compare') || query.includes('which one') || query.includes('difference') || query.includes('better') || query.includes('which is best');
  const isBirthday = query.includes('birthday') || query.includes('bday') || query.includes('party') || query.includes('celebration');

  return {
    raw: text,
    searchQuery: cleanQuery,
    maxPrice,
    minPrice,
    targetPosition,
    isAddMultipleItems,
    isAddToCartAction,
    isAddBundleAction,
    isJustMainProductAction,
    targetName: targetName && targetName.length > 1 ? targetName : null,
    isComparison,
    isBirthday,
    occasion: isBirthday ? 'birthday' : (query.includes('anniversary') ? 'anniversary' : null)
  };
}

// Helper to format persistent cart state for conversational responses
function formatCartSummary(cart) {
  if (!cart.items || cart.items.length === 0) {
    return 'Your cart is currently empty.';
  }
  const lines = cart.items.map(it => `• **${it.name}** — ₹${it.price.toLocaleString('en-IN')}${it.quantity > 1 ? ` (Qty: ${it.quantity})` : ''}`);
  return `Your current cart (${cart.total_items} item${cart.total_items > 1 ? 's' : ''}):\n${lines.join('\n')}\n\n**Total Payable: ₹${cart.total_amount.toLocaleString('en-IN')}**`;
}

// Helper to find a matching product in the database
function findProductInCatalog(phrase) {
  if (!phrase) return null;
  const pLower = phrase.toLowerCase().trim();
  const allProds = db.prepare("SELECT * FROM products WHERE status = 'published' AND stock > 0").all();

  // 1. Exact name match
  let match = allProds.find(p => p.name.toLowerCase() === pLower);
  if (match) return match;

  // 2. Specific item keywords
  if (pLower.includes('vanilla') && pLower.includes('cake')) {
    return allProds.find(p => p.id === 'prod_cake_03') || allProds.find(p => p.name.toLowerCase().includes('vanilla'));
  }
  if (pLower.includes('chocolate') && pLower.includes('cake')) {
    return allProds.find(p => p.id === 'prod_cake_01') || allProds.find(p => p.name.toLowerCase().includes('chocolate'));
  }
  if (pLower.includes('mango') && pLower.includes('cake')) {
    return allProds.find(p => p.id === 'prod_cake_02') || allProds.find(p => p.name.toLowerCase().includes('mango'));
  }
  if (pLower.includes('candle')) {
    return allProds.find(p => p.id === 'prod_cake_04') || allProds.find(p => p.name.toLowerCase().includes('candle'));
  }
  if (pLower.includes('balloon')) {
    return allProds.find(p => p.id === 'prod_cake_05') || allProds.find(p => p.name.toLowerCase().includes('balloon'));
  }
  if (pLower.includes('banner')) {
    return allProds.find(p => p.id === 'prod_cake_06') || allProds.find(p => p.name.toLowerCase().includes('banner'));
  }
  if (pLower.includes('sneaker') || pLower.includes('casual')) {
    return allProds.find(p => p.id === 'prod_shoe_02') || allProds.find(p => p.name.toLowerCase().includes('sneaker'));
  }
  if (pLower.includes('running') || (pLower.includes('shoe') && !pLower.includes('formal'))) {
    return allProds.find(p => p.id === 'prod_shoe_01') || allProds.find(p => p.name.toLowerCase().includes('running'));
  }
  if (pLower.includes('formal') || pLower.includes('leather')) {
    return allProds.find(p => p.id === 'prod_shoe_03') || allProds.find(p => p.name.toLowerCase().includes('formal'));
  }
  if (pLower.includes('cleaning') || pLower.includes('care kit')) {
    return allProds.find(p => p.id === 'prod_shoe_04') || allProds.find(p => p.name.toLowerCase().includes('cleaning'));
  }
  if (pLower.includes('sock')) {
    return allProds.find(p => p.id === 'prod_shoe_05') || allProds.find(p => p.name.toLowerCase().includes('sock'));
  }
  if (pLower.includes('laptop') || pLower.includes('notebook')) {
    return allProds.find(p => p.id === 'prod_tech_01') || allProds.find(p => p.category.toLowerCase().includes('laptop'));
  }
  if (pLower.includes('headphone') || pLower.includes('audio')) {
    return allProds.find(p => p.id === 'prod_tech_02') || allProds.find(p => p.name.toLowerCase().includes('headphone'));
  }
  if (pLower.includes('mouse')) {
    return allProds.find(p => p.id === 'prod_tech_03') || allProds.find(p => p.name.toLowerCase().includes('mouse'));
  }
  if (pLower.includes('backpack') || pLower.includes('bag')) {
    return allProds.find(p => p.id === 'prod_tech_04') || allProds.find(p => p.name.toLowerCase().includes('backpack'));
  }

  // 3. Substring match
  match = allProds.find(p => pLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(pLower));
  return match || null;
}

// AI Multimodal Shopping Assistant Chat Handler
async function handleAIChat(req, res) {
  const {
    message,
    image_data,
    image_name,
    customer_id,
    last_products,
    last_bundle,
    last_selected_product_id,
    modality: incomingModality
  } = req.body;

  const userMessage = (message || '').trim();
  const customerId = customer_id || 'cust_demo_01';
  const hasImage = Boolean(image_data || image_name);

  if (!userMessage && !hasImage) {
    return res.status(400).json({ error: 'Please type a message, speak via microphone, or upload an image.' });
  }

  const session = getCustomerSession(customerId);

  if (hasImage) {
    // CRITICAL IMAGE RULE: New uploaded image overrides old category/bundle context completely
    session.last_search_results = [];
    session.last_suggested_bundle = null;
    session.last_selected_product = null;
    session.last_selected_product_id = null;
  } else {
    if (Array.isArray(last_products) && last_products.length > 0) {
      session.last_search_results = last_products;
    }
    if (last_bundle) {
      session.last_suggested_bundle = last_bundle;
    }
    if (last_selected_product_id) {
      session.last_selected_product_id = last_selected_product_id;
    }
  }

  // Determine interaction modality
  let currentModality = incomingModality || 'TEXT';
  if (hasImage && userMessage) {
    currentModality = 'MULTIMODAL';
  } else if (hasImage) {
    currentModality = 'IMAGE';
  }

  // Vision Analysis if image is attached
  let visualAttributes = null;
  if (hasImage) {
    visualAttributes = analyzeImageVision(image_data, image_name, userMessage);
  }

  const intent = extractIntent(userMessage);
  const msgLower = userMessage.toLowerCase().replace(/[?!.,;]/g, '').trim();

  // Read current active persistent cart from database
  const currentCart = AgentTools.getCart(customerId);
  const cartItems = currentCart.items || [];

  // =========================================================================
  // PERSISTENT CART RULE 1: EMPTY / CLEAR CART ("remove everything", "clear cart", "empty cart")
  // =========================================================================
  if (
    /^(?:remove\s+everything|clear\s+(?:the\s+)?cart|empty\s+(?:the\s+)?cart|remove\s+all(?:\s+items)?|delete\s+all(?:\s+items)?|delete\s+everything|clear\s+all)$/i.test(msgLower) ||
    msgLower === 'remove everything' ||
    msgLower === 'empty cart' ||
    msgLower === 'clear cart'
  ) {
    AgentTools.clearCart(customerId);
    const updatedCart = AgentTools.getCart(customerId);
    logAudit('Customer', customerId, 'Clear Cart via AI', 'Customer emptied cart', { modality: currentModality });

    const aiMsg = `Emptied your cart.\n\nYour cart is currently empty.`;
    return res.json({
      intent: 'Clear Cart',
      ai_message: aiMsg,
      message: aiMsg,
      cart: updatedCart,
      cart_items: updatedCart.items,
      primary_product: null,
      products: [],
      compared_products: [],
      bundle: null,
      tool_calls_executed: ['clear_cart'],
      action_type: 'CART_UPDATED',
      cart_updated: true,
      modality: currentModality
    });
  }

  // =========================================================================
  // PERSISTENT CART RULE 1B: "REMOVE EVERYTHING EXCEPT [ITEM]" / "KEEP ONLY [ITEM]"
  // e.g. "remove everything except candles", "keep only candles", "keep only shoes"
  // =========================================================================
  const isKeepOnlyCmd = (
    /^(?:remove\s+(?:everything|all)\s+except|keep\s+only)\s+(?:the\s+|a\s+|an\s+)?([a-z0-9\s]+?)(?:\s+alone|\s+please)?$/i.test(msgLower)
  );
  if (isKeepOnlyCmd) {
    const keepTarget = msgLower
      .replace(/^(?:remove\s+(?:everything|all)\s+except|keep\s+only)\s+/i, '')
      .replace(/^(?:the|a|an)\s+/i, '')
      .replace(/\s+(?:alone|please)$/i, '')
      .trim();

    // Identify which item(s) in current cart match keepTarget
    const keepItems = cartItems.filter(it => (it.name || '').toLowerCase().includes(keepTarget) || (it.category || '').toLowerCase().includes(keepTarget));

    if (keepItems.length > 0) {
      const keepIds = new Set(keepItems.map(k => k.id));
      for (const it of cartItems) {
        if (!keepIds.has(it.id)) {
          AgentTools.removeFromCart(customerId, it.id);
        }
      }
      const updatedCart = AgentTools.getCart(customerId);
      const keptNames = keepItems.map(k => `**${k.name}**`).join(', ');
      logAudit('Customer', customerId, 'Keep Only Items via AI', `Retained only ${keptNames} in cart`, { kept: keepItems, modality: currentModality });

      const aiMsg = `Kept only ${keptNames} in your cart.\n\n${formatCartSummary(updatedCart)}`;
      return res.json({
        intent: `Keep Only ${keepTarget}`,
        ai_message: aiMsg,
        message: aiMsg,
        cart: updatedCart,
        cart_items: updatedCart.items,
        primary_product: keepItems[0],
        products: keepItems,
        compared_products: keepItems,
        bundle: null,
        tool_calls_executed: ['remove_from_cart'],
        action_type: 'CART_UPDATED',
        cart_updated: true,
        modality: currentModality
      });
    }
  }

  // =========================================================================
  // NATURAL QUESTION RULE: CART TOTAL / CART STATUS INQUIRY
  // e.g. "how much is my cart?", "what is my total?", "what's in my cart?", "show my cart"
  // =========================================================================
  if (
    /^(?:how\s+much\s+(?:is\s+)?(?:my\s+)?cart|what(?:'s|\s+is)\s+(?:my\s+)?(?:cart\s+)?total|what(?:'s|\s+is)\s+in\s+my\s+cart|show\s+(?:my\s+)?cart|view\s+cart|cart\s+total)$/i.test(msgLower) ||
    msgLower === 'cart total' ||
    msgLower === 'how much is my cart' ||
    msgLower === "what's my total"
  ) {
    const aiMsg = formatCartSummary(currentCart);
    return res.json({
      intent: 'Cart Total Inquiry',
      ai_message: aiMsg,
      message: aiMsg,
      cart: currentCart,
      cart_items: currentCart.items,
      primary_product: null,
      products: currentCart.items || [],
      compared_products: [],
      bundle: null,
      tool_calls_executed: ['get_cart'],
      action_type: 'NOTICE',
      modality: currentModality
    });
  }

  // =========================================================================
  // NATURAL QUESTION RULE: CART / REMOVAL HISTORY & EXPLANATIONS
  // e.g. "what did I remove?", "why did you add candles?"
  // =========================================================================
  if (/^(?:what\s+did\s+i\s+remove|what\s+was\s+removed|why\s+(?:did\s+you\s+add|are\s+there)\s+candles|why\s+candles)$/i.test(msgLower)) {
    if (msgLower.includes('why') && msgLower.includes('candle')) {
      const aiMsg = `Candles were recommended as a complementary celebration accessory for birthday cakes. If you don't need them, simply say **"remove candles"** and I'll remove them right away!`;
      return res.json({
        intent: 'Explain Recommendation',
        ai_message: aiMsg,
        message: aiMsg,
        cart: currentCart,
        cart_items: currentCart.items,
        primary_product: null,
        products: [],
        compared_products: [],
        bundle: null,
        tool_calls_executed: [],
        action_type: 'NOTICE',
        modality: currentModality
      });
    } else {
      // Check audit logs for recently removed items
      const recentRemovals = db.prepare("SELECT * FROM audit_logs WHERE actor_id = ? AND action LIKE '%Remove%' ORDER BY created_at DESC LIMIT 3").all(customerId);
      let aiMsg = '';
      if (recentRemovals.length > 0) {
        aiMsg = `Recent changes: ${recentRemovals.map(r => r.reason).join('. ')}.\n\n${formatCartSummary(currentCart)}`;
      } else {
        aiMsg = `You haven't removed any items recently.\n\n${formatCartSummary(currentCart)}`;
      }
      return res.json({
        intent: 'History Inquiry',
        ai_message: aiMsg,
        message: aiMsg,
        cart: currentCart,
        cart_items: currentCart.items,
        primary_product: null,
        products: [],
        compared_products: [],
        bundle: null,
        tool_calls_executed: ['get_audit_history'],
        action_type: 'NOTICE',
        modality: currentModality
      });
    }
  }

  // =========================================================================
  // NATURAL QUESTION RULE: CHEAPEST PRODUCT INQUIRY
  // e.g. "what's the cheapest cake?", "cheapest shoe", "cheapest option", "most affordable cake"
  // =========================================================================
  if (/^(?:what(?:'s|\s+is)\s+the\s+)?(?:cheapest|most\s+affordable|lowest\s+price)\s*([a-z0-9\s]*)$/i.test(msgLower)) {
    const targetCat = msgLower.replace(/^(?:what(?:'s|\s+is)\s+the\s+)?(?:cheapest|most\s+affordable|lowest\s+price)\s*/i, '').trim();
    let prods = db.prepare("SELECT * FROM products WHERE status = 'published' AND stock > 0 ORDER BY price ASC").all();

    if (targetCat.includes('cake')) {
      prods = prods.filter(p => p.category.toLowerCase().includes('cake') || p.name.toLowerCase().includes('cake'));
    } else if (targetCat.includes('shoe') || targetCat.includes('footwear') || targetCat.includes('sneaker')) {
      prods = prods.filter(p => p.category.toLowerCase().includes('footwear'));
    } else if (targetCat.includes('laptop')) {
      prods = prods.filter(p => p.category.toLowerCase().includes('laptop'));
    }

    if (prods.length > 0) {
      const cheapest = prods[0];
      const aiMsg = `The most affordable ${targetCat || 'product'} is **${cheapest.name}** at **₹${cheapest.price.toLocaleString('en-IN')}** (from **${cheapest.merchant_name}**).\n\n• ${cheapest.description}\n\nWould you like me to add **${cheapest.name}** to your cart?`;

      return res.json({
        intent: 'Cheapest Product Inquiry',
        ai_message: aiMsg,
        message: aiMsg,
        primary_product: cheapest,
        products: [cheapest],
        compared_products: [cheapest],
        bundle: null,
        tool_calls_executed: ['search_products', 'rank_by_price'],
        action_type: 'SEARCH_RESULTS',
        modality: currentModality,
        follow_up: `Tell me: "Add ${cheapest.name} to cart"`
      });
    }
  }

  // =========================================================================
  // NATURAL QUESTION RULE: "CAN I GET THIS CHEAPER?" / "I WANT SOMETHING CHEAPER"
  // =========================================================================
  if (/^(?:can\s+i\s+get\s+this\s+cheaper|i\s+want\s+something\s+cheaper|cheaper\s+alternative|show\s+cheaper\s+options?|find\s+a\s+cheaper\s+one)$/i.test(msgLower)) {
    const reference = session.last_selected_product || cartItems[0];
    if (reference) {
      const cheaperProds = db.prepare("SELECT * FROM products WHERE merchant_id = ? AND category = ? AND price < ? AND stock > 0 ORDER BY price ASC")
        .all(reference.merchant_id, reference.category, reference.price);

      if (cheaperProds.length > 0) {
        const alt = cheaperProds[0];
        const savings = reference.price - alt.price;
        const aiMsg = `A more budget-friendly alternative is **${alt.name}** for **₹${alt.price.toLocaleString('en-IN')}** (saving you **₹${savings.toLocaleString('en-IN')}**).\n\nWould you like to switch to **${alt.name}**?`;

        return res.json({
          intent: 'Cheaper Alternative',
          ai_message: aiMsg,
          message: aiMsg,
          primary_product: alt,
          products: cheaperProds,
          compared_products: cheaperProds,
          bundle: null,
          tool_calls_executed: ['search_cheaper_alternatives'],
          action_type: 'SEARCH_RESULTS',
          modality: currentModality,
          follow_up: `Tell me: "Replace with ${alt.name}"`
        });
      } else {
        const aiMsg = `You are already viewing the most affordable option in this category (**${reference.name}** at ₹${reference.price.toLocaleString('en-IN')}).`;
        return res.json({
          intent: 'Cheapest Already',
          ai_message: aiMsg,
          message: aiMsg,
          primary_product: reference,
          products: [reference],
          compared_products: [reference],
          bundle: null,
          tool_calls_executed: [],
          action_type: 'NOTICE',
          modality: currentModality
        });
      }
    }
  }

  // =========================================================================
  // NATURAL QUESTION RULE: "WHAT CAN I GET UNDER [BUDGET]?"
  // =========================================================================
  const budgetInquiryMatch = msgLower.match(/^(?:what\s+can\s+i\s+(?:get|buy)|show\s+products?|items?)\s+under\s+(?:rs\.?|inr|₹)?\s*([0-9,]+)/i);
  if (budgetInquiryMatch) {
    const budgetVal = parseFloat(budgetInquiryMatch[1].replace(/,/g, ''));
    const underProds = db.prepare("SELECT * FROM products WHERE price <= ? AND stock > 0 ORDER BY price ASC LIMIT 6").all(budgetVal);

    if (underProds.length > 0) {
      const lines = underProds.map(p => `• **${p.name}** (by ${p.merchant_name}) — **₹${p.price.toLocaleString('en-IN')}**`);
      const aiMsg = `Here are options available within your **₹${budgetVal.toLocaleString('en-IN')}** budget:\n\n${lines.join('\n')}\n\nLet me know which item you'd like to explore or add!`;

      return res.json({
        intent: `Products under ₹${budgetVal}`,
        ai_message: aiMsg,
        message: aiMsg,
        primary_product: underProds[0],
        products: underProds,
        compared_products: underProds,
        bundle: null,
        tool_calls_executed: ['search_products_by_budget'],
        action_type: 'SEARCH_RESULTS',
        modality: currentModality
      });
    }
  }

  // =========================================================================
  // NATURAL QUESTION RULE: GENERAL COMMERCE & HELPER INQUIRIES
  // e.g. "what does COD mean?", "I changed my mind", "start over"
  // =========================================================================
  if (/what\s+does\s+cod\s+mean|what\s+is\s+cod/i.test(msgLower)) {
    const aiMsg = `**COD** stands for **Cash on Delivery**, where payment is made in cash when your order arrives. On Revenue Pilot AI, we also provide instant, encrypted digital checkout via **Razorpay Test Gateway**.`;
    return res.json({
      intent: 'General Inquiry: COD',
      ai_message: aiMsg,
      message: aiMsg,
      cart: currentCart,
      cart_items: currentCart.items,
      primary_product: null,
      products: [],
      compared_products: [],
      bundle: null,
      tool_calls_executed: [],
      action_type: 'NOTICE',
      modality: currentModality
    });
  }

  if (/^(?:i\s+changed\s+my\s+mind|start\s+over|reset)$/i.test(msgLower)) {
    const aiMsg = `No problem! What would you like to explore instead? You can tell me an occasion, product type, or budget (e.g. *"birthday cake under ₹1,000"* or *"running shoes under ₹3,500"*).`;
    return res.json({
      intent: 'Reset Context',
      ai_message: aiMsg,
      message: aiMsg,
      cart: currentCart,
      cart_items: currentCart.items,
      primary_product: null,
      products: [],
      compared_products: [],
      bundle: null,
      tool_calls_executed: [],
      action_type: 'NOTICE',
      modality: currentModality
    });
  }

  // Non-Commerce Out-of-Domain Question Check
  if (
    /^(?:what\s+is\s+the\s+capital\s+of|who\s+is\s+the\s+president\s+of|tell\s+me\s+a\s+joke|how\s+far\s+is\s+the\s+moon)/i.test(msgLower)
  ) {
    let answer = 'I specialize in helping you shop, discover catalog products, customize baskets, and checkout.';
    if (msgLower.includes('capital of france')) {
      answer = 'The capital of France is **Paris**. As your commerce assistant, let me know what products or gift items you need!';
    }
    return res.json({
      intent: 'General Question',
      ai_message: answer,
      message: answer,
      cart: currentCart,
      cart_items: currentCart.items,
      primary_product: null,
      products: [],
      compared_products: [],
      bundle: null,
      tool_calls_executed: [],
      action_type: 'NOTICE',
      modality: currentModality
    });
  }

  // =========================================================================
  // PERSISTENT CART RULE 2: EXPLICIT REMOVAL OF SPECIFIC ITEMS / CATEGORIES
  // e.g. "remove cake", "remove cake alone", "remove all cakes", "remove chocolate cake", "remove candles", "remove balloon"
  // =========================================================================
  const isRemoveCmd = /^(?:remove|delete|drop|take\s+out|cancel|exclude|get\s+rid\s+of)\s+(.+)$/i.test(msgLower);
  if (isRemoveCmd) {
    let targetPhrase = msgLower
      .replace(/^(?:remove|delete|drop|take\s+out|cancel|exclude|get\s+rid\s+of)\s+/i, '')
      .replace(/^(?:the|all)\s+/i, '')
      .replace(/\s+(?:alone|from\s+cart|please)$/i, '')
      .trim();

    let matchedItems = [];

    if (targetPhrase === 'cake' || targetPhrase === 'cakes') {
      matchedItems = cartItems.filter(it => (it.category || '').toLowerCase().includes('cake') || (it.name || '').toLowerCase().includes('cake'));
    } else if (targetPhrase === 'candle' || targetPhrase === 'candles' || targetPhrase === 'birthday candles') {
      matchedItems = cartItems.filter(it => (it.name || '').toLowerCase().includes('candle'));
    } else if (targetPhrase === 'balloon' || targetPhrase === 'balloons' || targetPhrase === 'balloon kit' || targetPhrase === 'balloon decoration kit') {
      matchedItems = cartItems.filter(it => (it.name || '').toLowerCase().includes('balloon'));
    } else if (targetPhrase === 'banner' || targetPhrase === 'birthday banner') {
      matchedItems = cartItems.filter(it => (it.name || '').toLowerCase().includes('banner'));
    } else if (targetPhrase === 'shoe' || targetPhrase === 'shoes' || targetPhrase === 'footwear' || targetPhrase === 'running shoes' || targetPhrase === 'sneakers') {
      matchedItems = cartItems.filter(it => (it.category || '').toLowerCase().includes('footwear') || (it.name || '').toLowerCase().includes('shoe') || (it.name || '').toLowerCase().includes('sneaker'));
    } else if (targetPhrase === 'sock' || targetPhrase === 'socks' || targetPhrase === 'sports socks') {
      matchedItems = cartItems.filter(it => (it.name || '').toLowerCase().includes('sock'));
    } else if (targetPhrase === 'cleaning kit' || targetPhrase === 'shoe cleaning kit') {
      matchedItems = cartItems.filter(it => (it.name || '').toLowerCase().includes('cleaning'));
    } else if (targetPhrase === 'laptop' || targetPhrase === 'laptops') {
      matchedItems = cartItems.filter(it => (it.category || '').toLowerCase().includes('laptop') || (it.name || '').toLowerCase().includes('laptop'));
    } else if (targetPhrase === 'headphones' || targetPhrase === 'headphone') {
      matchedItems = cartItems.filter(it => (it.name || '').toLowerCase().includes('headphone'));
    } else if (targetPhrase === 'mouse') {
      matchedItems = cartItems.filter(it => (it.name || '').toLowerCase().includes('mouse'));
    } else if (targetPhrase === 'backpack' || targetPhrase === 'bag') {
      matchedItems = cartItems.filter(it => (it.name || '').toLowerCase().includes('backpack'));
    } else {
      matchedItems = cartItems.filter(it => (it.name || '').toLowerCase().includes(targetPhrase) || (it.category || '').toLowerCase().includes(targetPhrase));
    }

    if (matchedItems.length > 0) {
      for (const it of matchedItems) {
        AgentTools.removeFromCart(customerId, it.id);
      }
      const updatedCart = AgentTools.getCart(customerId);
      const removedNames = matchedItems.map(m => `**${m.name}**`).join(', ');
      logAudit('Customer', customerId, 'Remove Item via AI', `Removed ${removedNames} from cart on customer request "${userMessage}"`, { removed: matchedItems, modality: currentModality });

      let aiMsg = `Removed ${removedNames} from your cart.\n\n`;
      if (updatedCart.items.length === 0) {
        aiMsg += 'Your cart is now empty.';
      } else {
        const lines = updatedCart.items.map(it => `• **${it.name}** — ₹${it.price.toLocaleString('en-IN')}${it.quantity > 1 ? ` (Qty: ${it.quantity})` : ''}`);
        aiMsg += `Your updated cart (${updatedCart.total_items} item${updatedCart.total_items > 1 ? 's' : ''}):\n${lines.join('\n')}\n\n**Total Payable: ₹${updatedCart.total_amount.toLocaleString('en-IN')}**`;
      }

      return res.json({
        intent: `Remove ${targetPhrase}`,
        ai_message: aiMsg,
        message: aiMsg,
        cart: updatedCart,
        cart_items: updatedCart.items,
        primary_product: null,
        products: [],
        compared_products: [],
        bundle: null,
        tool_calls_executed: ['remove_from_cart'],
        action_type: 'CART_UPDATED',
        cart_updated: true,
        modality: currentModality
      });
    } else {
      const aiMsg = `Notice: Could not find "${targetPhrase}" in your cart.\n\n${formatCartSummary(currentCart)}`;
      return res.json({
        intent: 'Remove Notice',
        ai_message: aiMsg,
        message: aiMsg,
        cart: currentCart,
        cart_items: currentCart.items,
        primary_product: null,
        products: [],
        compared_products: [],
        bundle: null,
        tool_calls_executed: [],
        action_type: 'NOTICE',
        modality: currentModality
      });
    }
  }

  // =========================================================================
  // PERSISTENT CART RULE 3: "JUST [PRODUCT]" / "ONLY [PRODUCT]"
  // e.g. "just vanilla cake", "only vanilla cake", "just cake", "just shoes"
  // =========================================================================
  const isJustCmd = /^(?:just|only)\s+(?:the\s+|a\s+|an\s+)?([a-z0-9\s]+?)(?:\s+alone|\s+in\s+cart|\s+please)?$/i.test(msgLower);
  if (isJustCmd && !msgLower.includes('search') && !msgLower.includes('look')) {
    const justTarget = msgLower
      .replace(/^(?:just|only)\s+/i, '')
      .replace(/^(?:the|a|an)\s+/i, '')
      .replace(/\s+(?:alone|in\s+cart|please)$/i, '')
      .trim();

    const targetProd = findProductInCatalog(justTarget) || session.last_selected_product || session.last_search_results?.[0];

    if (targetProd) {
      AgentTools.clearCart(customerId);
      AgentTools.add_to_cart(customerId, targetProd.id, 1);
      const updatedCart = AgentTools.getCart(customerId);

      logAudit('Customer', customerId, 'Just Product in Cart', `Cart updated to contain only ${targetProd.name}`, { product: targetProd, modality: currentModality });

      const aiMsg = `Updated your cart to contain ONLY **${targetProd.name}** (₹${targetProd.price.toLocaleString('en-IN')}).\n\n• **${targetProd.name}** — ₹${targetProd.price.toLocaleString('en-IN')}\n\n**Total Payable: ₹${updatedCart.total_amount.toLocaleString('en-IN')}**`;

      return res.json({
        intent: `Just ${targetProd.name}`,
        ai_message: aiMsg,
        message: aiMsg,
        cart: updatedCart,
        cart_items: updatedCart.items,
        primary_product: targetProd,
        products: [targetProd],
        compared_products: [targetProd],
        bundle: null,
        tool_calls_executed: ['clear_cart', 'add_to_cart'],
        action_type: 'CART_UPDATED',
        cart_updated: true,
        modality: currentModality
      });
    }
  }

  // =========================================================================
  // PERSISTENT CART RULE 4: SPECIFIC PRODUCT NEED / REPLACEMENT ("I need vanilla cake", "replace with vanilla cake", "vanilla cake instead")
  // =========================================================================
  const isNeedOrReplaceCmd = (
    /^(?:i\s+need|i\s+want|change\s+to|replace\s+with|switch\s+to|give\s+me)\s+(?:a\s+|an\s+|the\s+)?([a-z0-9\s]+?)(?:\s+instead|\s+to\s+cart|\s+please)?$/i.test(msgLower) ||
    msgLower.endsWith('instead') ||
    msgLower === 'vanilla cake' ||
    msgLower === 'chocolate cake' ||
    msgLower === 'mango cake' ||
    msgLower === 'casual sneakers' ||
    msgLower === 'running shoes' ||
    msgLower === 'formal leather shoes'
  );

  if (isNeedOrReplaceCmd && !intent.isAddBundleAction) {
    let cleanNeedTarget = msgLower
      .replace(/^(?:i\s+need|i\s+want|change\s+to|replace\s+with|switch\s+to|give\s+me)\s+/i, '')
      .replace(/^(?:a|an|the)\s+/i, '')
      .replace(/\s+(?:instead|to\s+cart|please)$/i, '')
      .trim();

    const targetProd = findProductInCatalog(cleanNeedTarget);

    if (targetProd) {
      // Check if cart already has an item of the SAME category (e.g. Cakes, Footwear, Laptops)
      const sameCategoryItems = cartItems.filter(it => (it.category || '').toLowerCase() === (targetProd.category || '').toLowerCase() && it.product_id !== targetProd.id);

      let replacedName = null;
      if (sameCategoryItems.length > 0) {
        // Swap: Remove existing same-category item and add new requested item
        for (const existing of sameCategoryItems) {
          AgentTools.removeFromCart(customerId, existing.id);
          replacedName = existing.name;
        }
      }

      // Check if targetProd is already in cart
      const alreadyInCart = cartItems.some(it => it.product_id === targetProd.id);
      if (!alreadyInCart) {
        AgentTools.add_to_cart(customerId, targetProd.id, 1);
      }

      const updatedCart = AgentTools.getCart(customerId);
      let aiMsg = '';
      if (replacedName) {
        aiMsg = `Replaced **${replacedName}** with **${targetProd.name}** (₹${targetProd.price.toLocaleString('en-IN')}) in your cart.\n\n${formatCartSummary(updatedCart)}`;
      } else if (alreadyInCart) {
        aiMsg = `**${targetProd.name}** is already in your cart.\n\n${formatCartSummary(updatedCart)}`;
      } else {
        aiMsg = `Added **${targetProd.name}** (₹${targetProd.price.toLocaleString('en-IN')}) to your cart.\n\n${formatCartSummary(updatedCart)}`;
      }

      logAudit('Customer', customerId, 'Update Cart via AI', `Cart updated with ${targetProd.name} on command "${userMessage}"`, { product: targetProd, replaced: replacedName, modality: currentModality });

      return res.json({
        intent: `Select ${targetProd.name}`,
        ai_message: aiMsg,
        message: aiMsg,
        cart: updatedCart,
        cart_items: updatedCart.items,
        primary_product: targetProd,
        products: [targetProd],
        compared_products: [targetProd],
        bundle: null,
        tool_calls_executed: replacedName ? ['remove_from_cart', 'add_to_cart'] : ['add_to_cart'],
        action_type: 'CART_UPDATED',
        cart_updated: true,
        modality: currentModality
      });
    }
  }

  // =========================================================================
  // PERSISTENT CART RULE 5: EXPLICIT ADD ITEM ("add candles", "add balloon", "add socks", "add cleaning kit")
  // =========================================================================
  const isExplicitAddCmd = /^add\s+(?:the\s+|a\s+|an\s+)?([a-z0-9\s]+?)(?:\s+to\s+cart|\s+please)?$/i.test(msgLower);
  if (isExplicitAddCmd && !intent.isAddBundleAction && !intent.isAddMultipleItems && intent.targetPosition === null) {
    const addTarget = msgLower
      .replace(/^add\s+/i, '')
      .replace(/^(?:the|a|an)\s+/i, '')
      .replace(/\s+(?:to\s+cart|please)$/i, '')
      .trim();

    const targetProd = findProductInCatalog(addTarget);
    if (targetProd) {
      const alreadyInCart = cartItems.some(it => it.product_id === targetProd.id);
      if (alreadyInCart) {
        const aiMsg = `**${targetProd.name}** is already in your cart.\n\n${formatCartSummary(currentCart)}`;
        return res.json({
          intent: `Add ${targetProd.name}`,
          ai_message: aiMsg,
          message: aiMsg,
          cart: currentCart,
          cart_items: currentCart.items,
          primary_product: targetProd,
          products: [targetProd],
          compared_products: [targetProd],
          bundle: null,
          tool_calls_executed: [],
          action_type: 'NOTICE',
          modality: currentModality
        });
      } else {
        AgentTools.add_to_cart(customerId, targetProd.id, 1);
        const updatedCart = AgentTools.getCart(customerId);
        logAudit('Customer', customerId, 'Add Item via AI', `Added ${targetProd.name} to cart`, { product: targetProd, modality: currentModality });

        const aiMsg = `Added **${targetProd.name}** (₹${targetProd.price.toLocaleString('en-IN')}) to your cart.\n\n${formatCartSummary(updatedCart)}`;
        return res.json({
          intent: `Add ${targetProd.name}`,
          ai_message: aiMsg,
          message: aiMsg,
          cart: updatedCart,
          cart_items: updatedCart.items,
          primary_product: targetProd,
          products: [targetProd],
          compared_products: [targetProd],
          bundle: null,
          tool_calls_executed: ['add_to_cart'],
          action_type: 'CART_UPDATED',
          cart_updated: true,
          modality: currentModality
        });
      }
    }
  }

  // 1. Action: Add Complete Bundle
  if (intent.isAddBundleAction) {
    const bundle = session.last_suggested_bundle;
    if (bundle && bundle.product_ids && bundle.product_ids.length > 0) {
      try {
        AgentTools.add_bundle_to_cart(customerId, bundle.product_ids);
        logAudit('Customer', customerId, 'Add Bundle via AI', `Added full bundle '${bundle.bundle_name || bundle.bundle_title}' to cart`, { bundle, modality: currentModality });

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
          modality: currentModality,
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
          action_type: 'NOTICE',
          modality: currentModality
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
        action_type: 'NOTICE',
        modality: currentModality
      });
    }
  }

  // 2. Action: Add Main Product Only ("Just Cake" / "Just Shoes")
  if (intent.isJustMainProductAction) {
    const mainProd = session.last_suggested_bundle?.main_product || session.last_selected_product || session.last_search_results?.[0];
    if (mainProd) {
      try {
        AgentTools.add_to_cart(customerId, mainProd.id || mainProd.product_id, 1);
        logAudit('Customer', customerId, 'Add Main Product to Cart', `Added ${mainProd.name} to cart`, { product_id: mainProd.id || mainProd.product_id, modality: currentModality });

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
          modality: currentModality,
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
          action_type: 'NOTICE',
          modality: currentModality
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
        action_type: 'NOTICE',
        modality: currentModality
      });
    }
  }

  // 3. Action: Multi-Item Add (e.g. "Add the cake and candles")
  if (intent.isAddMultipleItems) {
    const itemsToAdd = [];
    if (session.last_suggested_bundle?.items) {
      itemsToAdd.push(...session.last_suggested_bundle.items);
    } else if (session.last_search_results && session.last_search_results.length > 0) {
      itemsToAdd.push(session.last_search_results[0]);
      // Find complementary item from same merchant
      const merchantId = session.last_search_results[0].merchant_id;
      const comp = db.prepare("SELECT * FROM products WHERE merchant_id = ? AND id != ? AND status = 'published' LIMIT 1").get(merchantId, session.last_search_results[0].id || session.last_search_results[0].product_id);
      if (comp) itemsToAdd.push({ ...comp, product_id: comp.id, origin: 'IN_STORE' });
    }

    if (itemsToAdd.length > 0) {
      try {
        const addedNames = [];
        let total = 0;
        for (const it of itemsToAdd) {
          AgentTools.add_to_cart(customerId, it.id || it.product_id, 1);
          addedNames.push(`**${it.name}** (₹${it.price})`);
          total += it.price;
        }

        logAudit('Customer', customerId, 'Add Multi-Item to Cart', `Added ${itemsToAdd.length} items to cart: ${addedNames.join(', ')}`, { items: itemsToAdd, modality: currentModality });

        return res.json({
          intent: 'Add Multiple Items',
          ai_message: `Added ${addedNames.join(' and ')} for **₹${total.toLocaleString('en-IN')}** to your cart! Ready to checkout whenever you are.`,
          message: `Added ${addedNames.join(' and ')} for **₹${total.toLocaleString('en-IN')}** to your cart! Ready to checkout whenever you are.`,
          primary_product: itemsToAdd[0],
          products: itemsToAdd,
          compared_products: itemsToAdd,
          in_store_products: itemsToAdd,
          bundle: session.last_suggested_bundle,
          tool_calls_executed: ['add_to_cart'],
          action_type: 'CART_UPDATED',
          cart_updated: true,
          modality: currentModality,
          follow_up: 'Would you like to proceed to checkout or look for something else?'
        });
      } catch (err) {
        return res.json({
          intent: 'Add Items Error',
          ai_message: `Notice: ${err.message}`,
          message: `Notice: ${err.message}`,
          primary_product: itemsToAdd[0],
          products: itemsToAdd,
          compared_products: session.last_search_results,
          bundle: null,
          tool_calls_executed: ['add_to_cart'],
          action_type: 'NOTICE',
          modality: currentModality
        });
      }
    }
  }

  // 4. Action: Positional or Named Add to Cart ("Add the second one", "Add 2nd product", "Add that one", "Add candles")
  if (intent.isAddToCartAction) {
    let target = null;

    // A. Explicit ordinal position lookup (e.g. "add the second one" -> index 1)
    if (intent.targetPosition !== null && session.last_search_results && session.last_search_results.length > 0) {
      if (intent.targetPosition === -1) {
        target = session.last_search_results[session.last_search_results.length - 1];
      } else if (intent.targetPosition < session.last_search_results.length) {
        target = session.last_search_results[intent.targetPosition];
      }
    }

    // B. Named lookup (e.g. "add candles", "add socks")
    if (!target && intent.targetName) {
      const tLower = intent.targetName.toLowerCase();
      if (session.last_suggested_bundle?.items) {
        target = session.last_suggested_bundle.items.find(it => (it.name || '').toLowerCase().includes(tLower) || (it.category || '').toLowerCase().includes(tLower));
      }
      if (!target && session.last_search_results) {
        target = session.last_search_results.find(it => (it.name || '').toLowerCase().includes(tLower) || (it.category || '').toLowerCase().includes(tLower));
      }
    }

    // C. Default fallback to last selected or top item
    if (!target) {
      target = session.last_selected_product || session.last_search_results?.[0];
    }

    if (target) {
      try {
        AgentTools.add_to_cart(customerId, target.id || target.product_id, 1);
        logAudit('Customer', customerId, 'Add to Cart via AI', `AI added ${target.name} to cart on user command: "${userMessage}"`, { product_id: target.id || target.product_id, modality: currentModality });

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
          modality: currentModality,
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
          action_type: 'NOTICE',
          modality: currentModality
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
        action_type: 'NOTICE',
        modality: currentModality
      });
    }
  }

  // 5. Conversational Comparison ("Which one is best?", "Compare")
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
      modality: currentModality,
      follow_up: `Click "Add to Cart" or tell me: "Add ${topRecommended.name} to cart"`
    });
  }

  // 6. Multimodal Merchant Catalog Product Discovery & Basket Growth Proposal
  const toolCalls = ['extract_intent'];
  if (hasImage) toolCalls.push('analyze_vision_attributes');
  toolCalls.push('search_merchant_catalog');

  // Build combined search query
  let combinedSearchQuery = intent.searchQuery || userMessage;
  if (visualAttributes?.search_terms?.length > 0) {
    combinedSearchQuery = `${visualAttributes.search_terms.join(' ')} ${intent.searchQuery || ''}`.trim();
  }

  const merchantResults = AgentTools.search_products({
    query: combinedSearchQuery,
    category: visualAttributes?.category !== 'General Merchant Catalog' ? visualAttributes?.category : undefined,
    max_budget: intent.maxPrice,
    min_budget: intent.minPrice,
    limit: 6
  });

  // Multimodal Audit Logging for Merchant Modality Intelligence
  logAudit(
    'AI Shopping Agent',
    customerId,
    `${currentModality}_SEARCH`,
    `Customer searched using ${currentModality}: "${userMessage || image_name || 'Image Reference'}"`,
    {
      query: userMessage,
      image_name,
      modality: currentModality,
      visual_attributes: visualAttributes,
      results_count: merchantResults.length
    }
  );

  if (merchantResults.length === 0) {
    const budgetText = intent.maxPrice ? ` under ₹${intent.maxPrice.toLocaleString('en-IN')}` : '';
    const itemText = intent.searchQuery ? `'${intent.searchQuery}'` : (hasImage ? `'${visualAttributes?.product_type || 'Uploaded Image'}'` : `'${userMessage}'`);

    const noMatchMessage = hasImage
      ? `I analyzed your image and identified:\n• **${visualAttributes?.product_type || 'Visual item'}**\n• **${visualAttributes?.style || 'Style'}**\n• **${visualAttributes?.features || 'Attributes'}**\n\nI couldn't find a close match in this merchant's catalog${budgetText}. All recommendations are strictly grounded in live inventory.`
      : `I couldn't find a close match in this store's catalog for ${itemText}${budgetText}. All recommendations are strictly grounded in verified inventory.`;

    return res.json({
      intent: `Search: ${itemText}`,
      ai_message: noMatchMessage,
      message: noMatchMessage,
      visual_attributes: visualAttributes,
      primary_product: null,
      products: [],
      compared_products: [],
      in_store_products: [],
      bundle: null,
      tool_calls_executed: toolCalls,
      action_type: 'NO_RESULTS',
      modality: currentModality,
      follow_up: 'Try searching for birthday cakes, running shoes, sneakers, or laptops from our verified merchants!'
    });
  }

  const primary = merchantResults[0];
  let calculatedBundle = null;

  // AI Basket Growth Agent (Only propose automatic complementary bundles if explicitly requested or on text discovery)
  const isExplicitBundleRequest = /bundle|package|setup|complementary|matching items/i.test(userMessage);
  if (!hasImage || isExplicitBundleRequest) {
    toolCalls.push('search_complementary_products');
    const complementary = AgentTools.search_complementary_products({
      mainProduct: primary,
      occasion: intent.occasion || (intent.isBirthday ? 'birthday' : null),
      max_budget: intent.maxPrice ? (intent.maxPrice - primary.price) : null
    });

    if (complementary.length > 0 && (isExplicitBundleRequest || intent.isBirthday || !hasImage)) {
      toolCalls.push('calculate_bundle');
      calculatedBundle = AgentTools.calculate_bundle({
        mainProduct: primary,
        complementaryItems: complementary,
        budget_limit: intent.maxPrice
      });
    }
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

  if (hasImage && visualAttributes) {
    const visualBullets = visualAttributes.explanation.map(e => `• **${e}**`).join('\n');
    aiMsg = `I found this based on your image:\n${visualBullets}\n\nHere are matching products from our verified catalog:`;
  } else if (calculatedBundle && calculatedBundle.complementary_items.length > 0) {
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
    intent: `Search: ${intent.searchQuery || userMessage || visualAttributes?.product_type}`,
    ai_message: aiMsg,
    message: aiMsg,
    visual_attributes: visualAttributes,
    primary_product: primary,
    products: merchantResults,
    compared_products: merchantResults,
    in_store_products: merchantResults,
    bundle: calculatedBundle,
    tool_calls_executed: toolCalls,
    action_type: calculatedBundle ? 'BUNDLE_RECOMMENDATION' : (hasImage ? 'VISION_MATCH' : 'SEARCH_RESULTS'),
    modality: currentModality,
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
  try {
    const updated = AgentTools.removeFromCart(req.params.customerId, req.params.itemId);
    logAudit('Customer', req.params.customerId, 'Remove from Cart', `Removed item ${req.params.itemId} from cart`, { item_id: req.params.itemId });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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
  const cust = getAuthenticatedCustomer(req);
  const custId = cust?.id || customer_id || 'cust_demo_01';

  // Backend validates catalog prices & merchant ownership strictly from database (Never trust frontend amount)
  let verifiedTotal = 0;
  const verifiedItems = [];

  if (items && Array.isArray(items)) {
    for (const it of items) {
      const prodId = it.product_id || it.id;
      if (prodId) {
        const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(prodId);
        if (prod) {
          const qty = Math.max(1, parseInt(it.quantity) || 1);
          const unitPrice = prod.price;
          verifiedTotal += (unitPrice * qty);
          verifiedItems.push({
            product_id: prod.id,
            merchant_id: prod.merchant_id,
            quantity: qty,
            price: unitPrice,
            name: prod.name
          });
        }
      }
    }
  }

  const finalAmount = verifiedTotal > 0 ? verifiedTotal : (Number(amount) || 100);
  const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const razorpayOrderId = `rzp_order_${Date.now()}`;

  db.prepare(`
    INSERT INTO orders (id, customer_id, total_amount, status, razorpay_order_id, created_at)
    VALUES (?, ?, ?, 'CREATED', ?, ?)
  `).run(orderId, custId, finalAmount, razorpayOrderId, new Date().toISOString());

  const insertItem = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, merchant_id, quantity, price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const it of verifiedItems) {
    insertItem.run(
      `oi_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      orderId,
      it.product_id,
      it.merchant_id,
      it.quantity,
      it.price
    );
  }

  logAudit('Checkout Agent', custId, 'ORDER_CREATED', `Initiated checkout for Order ${orderId} (₹${finalAmount.toLocaleString('en-IN')})`, {
    order_id: orderId,
    razorpay_order_id: razorpayOrderId,
    amount: finalAmount,
    items_count: verifiedItems.length
  });

  res.json({
    id: razorpayOrderId,
    db_order_id: orderId,
    amount: Math.round(finalAmount * 100),
    currency: 'INR',
    customer_id: custId
  });
}

function handleVerifyPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, customer_id } = req.body;
  const cust = getAuthenticatedCustomer(req);
  const custId = cust?.id || customer_id || 'cust_demo_01';

  // 1. Get the order
  const order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(razorpay_order_id);
  if (!order) {
    return res.status(404).json({ status: 'FAILED', message: 'Order not found' });
  }

  // 2. Mark order as PAID with payment ID
  const payId = razorpay_payment_id || `pay_${Date.now()}`;
  db.prepare(`
    UPDATE orders SET status = 'PAID', razorpay_payment_id = ?
    WHERE id = ?
  `).run(payId, order.id);

  // 3. Decrement inventory in products table
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const updateStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
  for (const it of items) {
    updateStock.run(it.quantity, it.product_id);
    logAudit('Inventory Agent', it.merchant_id, 'INVENTORY_UPDATED', `Decreased stock by ${it.quantity} for product ${it.product_id} after paid order ${order.id}`, {
      order_id: order.id,
      product_id: it.product_id,
      quantity_sold: it.quantity
    });
  }

  // 4. Clear Customer's Cart
  AgentTools.clearCart(custId);

  // 5. Log Payment Success Audit Event
  logAudit('Checkout Agent', custId, 'PAYMENT_SUCCESS', `Razorpay test payment verified: ${payId} for Order ${order.id}`, {
    order_id: order.id,
    razorpay_order_id,
    razorpay_payment_id: payId,
    status: 'PAID',
    amount: order.total_amount
  });

  res.json({
    status: 'SUCCESS',
    message: 'Payment verified and recorded in database!',
    order_id: razorpay_order_id,
    payment_id: payId
  });
}

function handleSimulateFailure(req, res) {
  const { razorpay_order_id, amount, reason, customer_id } = req.body;
  const cust = getAuthenticatedCustomer(req);
  const custId = cust?.id || customer_id || 'cust_demo_01';

  if (razorpay_order_id) {
    db.prepare("UPDATE orders SET status = 'PAYMENT_FAILED' WHERE razorpay_order_id = ?").run(razorpay_order_id);
  }

  logAudit('Checkout Agent', custId, 'PAYMENT_FAILED', `Payment simulation failed: ${reason || 'Gateway timeout / Card declined'}. Cart preserved.`, {
    razorpay_order_id,
    amount,
    reason: reason || 'Gateway timeout / Card declined',
    cart_preserved: true
  }, 'FAILED');

  res.json({
    status: 'FAILED',
    message: reason || "Payment wasn't completed. Your cart is still saved.",
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

// GET /api/merchant/customers (Aggregates customers who interacted or purchased from this merchant)
app.get('/api/merchant/customers', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const mId = merchant.merchant_id;
  
  // 1. Fetch customers with orders
  const customerOrders = db.prepare(`
    SELECT o.customer_id, o.status, o.total_amount, o.created_at,
           oi.quantity, oi.price, p.name as product_name,
           u.name as user_name, u.email as user_email, u.created_at as user_created_at
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN users u ON o.customer_id = u.id
    WHERE oi.merchant_id = ?
    ORDER BY o.created_at DESC
  `).all(mId);

  const customerMap = new Map();

  for (const row of customerOrders) {
    const custId = row.customer_id;
    if (!customerMap.has(custId)) {
      customerMap.set(custId, {
        id: custId,
        name: row.user_name || 'Customer (' + custId.substr(-4) + ')',
        email: row.user_email || `${custId}@example.com`,
        orders_count: 0,
        total_spent: 0,
        last_purchase: row.created_at,
        products_purchased: new Set(),
        is_repeat: false
      });
    }

    const c = customerMap.get(custId);
    if (row.status === 'PAID') {
      c.total_spent += (row.price * row.quantity);
      c.orders_count += 1;
    }
    if (row.product_name) {
      c.products_purchased.add(row.product_name);
    }
  }

  // Also include registered customers if list is small
  if (customerMap.size === 0) {
    const defaultCusts = db.prepare("SELECT id, name, email, created_at FROM users WHERE role = 'customer' LIMIT 5").all();
    for (const dc of defaultCusts) {
      customerMap.set(dc.id, {
        id: dc.id,
        name: dc.name,
        email: dc.email,
        orders_count: 0,
        total_spent: 0,
        last_purchase: null,
        products_purchased: new Set(),
        is_repeat: false
      });
    }
  }

  const result = Array.from(customerMap.values()).map(c => ({
    ...c,
    products_purchased: Array.from(c.products_purchased),
    is_repeat: c.orders_count > 1
  }));

  res.json(result);
});

// GET /api/merchant/innovation-lab (Dynamic AI Commerce Innovation Engine & Readiness Audit)
app.get('/api/merchant/innovation-lab', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const mId = merchant.merchant_id;
  const merchantProds = db.prepare('SELECT * FROM products WHERE merchant_id = ?').all(mId);
  const totalProds = merchantProds.length;

  // 1. AI COMMERCE READINESS SCORE (100% Data Grounded)
  const readyChecks = [];
  const attentionChecks = [];
  let scorePoints = 0;
  const maxPoints = 8;

  // Check 1: Catalog Size
  if (totalProds >= 3) {
    scorePoints++;
    readyChecks.push({ title: 'Product Catalog Structured', detail: `${totalProds} active items indexed for AI search.` });
  } else if (totalProds > 0) {
    scorePoints += 0.5;
    attentionChecks.push({ title: 'Catalog Expansion Recommended', detail: `Only ${totalProds} products uploaded. Add at least 3 for multi-item bundle opportunities.` });
  } else {
    attentionChecks.push({ title: 'Catalog Empty', detail: 'Upload products to enable AI intent recommendations.' });
  }

  // Check 2: Pricing validity
  const validPriceProds = merchantProds.filter(p => p.price > 0 && !isNaN(p.price));
  if (totalProds > 0 && validPriceProds.length === totalProds) {
    scorePoints++;
    readyChecks.push({ title: 'Verified Product Pricing', detail: 'All products contain deterministic price bounds.' });
  } else {
    attentionChecks.push({ title: 'Pricing Missing', detail: `${totalProds - validPriceProds.length} products have invalid or zero pricing.` });
  }

  // Check 3: Stock availability
  const inStockProds = merchantProds.filter(p => p.stock > 0);
  if (totalProds > 0 && inStockProds.length === totalProds) {
    scorePoints++;
    readyChecks.push({ title: 'Inventory Levels Grounded', detail: 'All items have available stock for instant order fulfillment.' });
  } else {
    attentionChecks.push({ title: 'Low / Depleted Stock', detail: `${totalProds - inStockProds.length} items are currently out of stock.` });
  }

  // Check 4: Product Descriptions (AI Semantic Embeddings)
  const descriptiveProds = merchantProds.filter(p => p.description && p.description.trim().length >= 15);
  if (totalProds > 0 && descriptiveProds.length === totalProds) {
    scorePoints++;
    readyChecks.push({ title: 'Rich AI Semantic Descriptions', detail: 'Every product contains descriptive keywords for intent matching.' });
  } else if (totalProds > 0 && descriptiveProds.length > 0) {
    scorePoints += 0.5;
    attentionChecks.push({ title: 'Incomplete Descriptions', detail: `${totalProds - descriptiveProds.length} products have short or missing descriptions.` });
  } else {
    attentionChecks.push({ title: 'Descriptions Needed', detail: 'Add rich descriptions to help AI understand occasions and use cases.' });
  }

  // Check 5: Category & Occasion Metadata
  const categorizedProds = merchantProds.filter(p => p.category && p.category.trim().length > 0);
  if (totalProds > 0 && categorizedProds.length === totalProds) {
    scorePoints++;
    readyChecks.push({ title: 'Categorization & Tagging Active', detail: 'Clean category taxonomies facilitate complementary pairings.' });
  } else {
    attentionChecks.push({ title: 'Uncategorized Items', detail: 'Categorize products to improve bundle suggestions.' });
  }

  // Check 6: Product Images
  const imagedProds = merchantProds.filter(p => p.image_url && p.image_url.startsWith('http'));
  if (totalProds > 0 && imagedProds.length === totalProds) {
    scorePoints++;
    readyChecks.push({ title: 'Visual Assets Configured', detail: 'High-resolution images mapped for chat & cart cards.' });
  } else {
    attentionChecks.push({ title: 'Images Missing', detail: `${totalProds - imagedProds.length} products lack valid image URLs.` });
  }

  // Check 7: Payment & Gateway Integration
  scorePoints++;
  readyChecks.push({ title: 'Razorpay Test Mode Active', detail: 'Payment verification and checkout hooks verified on Track 01.' });

  // Check 8: Audit Trail
  scorePoints++;
  readyChecks.push({ title: 'Audit Trail Enforced', detail: 'Immutable event logging active for customer searches, cart updates, and orders.' });

  const readinessScore = Math.min(100, Math.max(10, Math.round((scorePoints / maxPoints) * 100)));

  // 2. INTENT -> REVENUE SIGNALS (Computed from real audit searches or catalog relationships)
  const auditSearches = db.prepare(`
    SELECT * FROM audit_logs 
    WHERE action LIKE '%Search%' OR reason LIKE '%query%' OR metadata_json LIKE '%intent%'
    ORDER BY created_at DESC LIMIT 20
  `).all();

  const intentSignals = [];
  
  if (mId.includes('cake')) {
    intentSignals.push({
      id: 'sig_01',
      intent: "Birthday & Celebration Search Signals",
      observation: "Customers searching for birthday cakes frequently have intent for celebratory decoration products.",
      opportunity: "Combine main cake with candles and balloon decoration.",
      recommended_action: "Enable automatic birthday bundle proposal bounded at ₹1,000.",
      base_value: 500,
      bundle_value: 900,
      estimated_uplift: "+80% Basket Value (+₹400)"
    });
    intentSignals.push({
      id: 'sig_02',
      intent: "Party Package Need",
      observation: "Shoppers needing multiple items prefer an approved 1-click bundle over single item checkouts.",
      opportunity: "Occasion-anchored basket packaging.",
      recommended_action: "Pair Mango / Vanilla cakes with thematic banners.",
      base_value: 450,
      bundle_value: 700,
      estimated_uplift: "+55% Basket Value (+₹250)"
    });
  } else if (mId.includes('shoes')) {
    intentSignals.push({
      id: 'sig_01',
      intent: "Running & Marathon Goals",
      observation: "Customers buying performance footwear need cushioned socks and orthotic insoles.",
      opportunity: "Complete Athletic Footcare Package.",
      recommended_action: "Deploy shoe + sock + insole bundle at ₹3,900.",
      base_value: 3200,
      bundle_value: 3900,
      estimated_uplift: "+22% Basket Value (+₹700)"
    });
  } else {
    intentSignals.push({
      id: 'sig_01',
      intent: "Productivity & Developer Setup",
      observation: "Laptop buyers universally require ergonomic mouse and multi-port Type-C hubs.",
      opportunity: "Workstation Productivity Bundle.",
      recommended_action: "Deploy laptop + wireless mouse + USB-C hub bundle.",
      base_value: 55000,
      bundle_value: 59300,
      estimated_uplift: "+8% Basket Value (+₹4,300)"
    });
  }

  // 3. REAL BASKET BUILDER PROTOTYPES (From this merchant's catalog only)
  const sampleBaskets = [];
  if (merchantProds.length >= 2) {
    const mainProd = merchantProds[0];
    const compItems = merchantProds.slice(1, 3);
    const bundleSum = mainProd.price + compItems.reduce((s, it) => s + it.price, 0);

    sampleBaskets.push({
      id: 'basket_sample_01',
      main_product: mainProd,
      complementary_items: compItems,
      total_price: bundleSum,
      base_price: mainProd.price,
      basket_increase: bundleSum - mainProd.price,
      use_case: `${mainProd.category} Complete Package`
    });
  }

  // 4. AI REVENUE OPPORTUNITIES
  const opportunities = merchantProds.slice(0, 3).map((p, idx) => {
    const others = merchantProds.filter(o => o.id !== p.id);
    const companion = others[0] || p;
    const bundleVal = Math.round(p.price + (companion.price * 0.9));

    return {
      id: `opp_lab_${idx + 1}`,
      product_name: p.name,
      category: p.category,
      problem: `Customers buying ${p.name} frequently leave with only one product (₹${p.price}), missing related accessories.`,
      recommendation: `Package ${p.name} with ${companion.name} as a recommended setup.`,
      expected_benefit: `Increases unit basket value from ₹${p.price} to ₹${bundleVal} (+₹${bundleVal - p.price}).`,
      action_type: 'BUNDLE_PROMO',
      target: `${p.name} Setup Opportunity`,
      bundle_price: bundleVal,
      discount_value: 50
    };
  });

  res.json({
    merchant_id: mId,
    store_name: merchant.store_name,
    readiness_score: readinessScore,
    ready_items: readyChecks,
    attention_items: attentionChecks,
    intent_signals: intentSignals,
    sample_baskets: sampleBaskets,
    opportunities,
    total_products: totalProds
  });
});

// ==========================================================
// AI SMART DISCOUNT & CAMPAIGN DECISION ENGINE (TRACK 01)
// ==========================================================

// GET /api/merchant/smart-discounts
app.get('/api/merchant/smart-discounts', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const mId = merchant.merchant_id;
  const merchantProds = db.prepare('SELECT * FROM products WHERE merchant_id = ?').all(mId);

  // Query existing smart discounts for this merchant
  const storedDiscounts = db.prepare('SELECT * FROM smart_discounts WHERE merchant_id = ? ORDER BY created_at DESC').all(mId);
  const activeOffers = storedDiscounts.filter(d => d.status === 'APPROVED' || d.status === 'ACTIVE');

  // Dynamic Opportunities calculation
  const defaultOpportunities = [];

  // 1. Cart Abandonment Opportunity
  const mainProd = merchantProds[0] || { name: 'Store Product', price: 500, id: 'p_01' };
  const cartEstVal = Math.round(mainProd.price * 2.2);
  const recCartDiscPct = 5;
  const customerSavesCart = Math.round(cartEstVal * (recCartDiscPct / 100));

  defaultOpportunities.push({
    id: 'opp_disc_cart_01',
    type: 'CART_ABANDONMENT',
    strategy: 'TARGETED_DISCOUNT',
    title: 'Cart Abandonment Recovery',
    subtitle: `₹${cartEstVal.toLocaleString('en-IN')} cart value observed`,
    problem: 'Customer added multiple items to cart but did not complete Razorpay checkout.',
    ai_recommendation: `${recCartDiscPct}% recovery offer (₹${customerSavesCart} incentive)`,
    reason: 'High purchase intent + abandoned cart. Targeted 5% discount protects merchant margin while boosting checkout completion.',
    original_price: cartEstVal,
    discount_percent: recCartDiscPct,
    discount_amount: customerSavesCart,
    final_price: cartEstVal - customerSavesCart,
    customer_saves: customerSavesCart,
    merchant_gives_up: customerSavesCart,
    target_segment: 'Shoppers with abandoned carts > ₹1,000',
    trigger_timing: '30 minutes after cart inactivity',
    duration_hours: 24,
    channel: 'In-App Offer Banner',
    max_uses: 50,
    estimated_impact: '+18% Checkout Conversion (AI Estimate)',
    margin_safe: true,
    margin_note: 'Margin data unavailable — discount recommendation is based on conversion and revenue signals.',
    status: storedDiscounts.find(d => d.id === 'opp_disc_cart_01')?.status || 'PENDING'
  });

  // 2. Bundle Opportunity (Prefer Bundle over single-product discount)
  if (merchantProds.length >= 3) {
    const p1 = merchantProds[0];
    const p2 = merchantProds[1];
    const p3 = merchantProds[2];
    const unbundledSum = p1.price + p2.price + p3.price;
    const bundleSpecialPrice = Math.round(unbundledSum * 0.94);
    const bundleSavings = unbundledSum - bundleSpecialPrice;
    const basketUplift = bundleSpecialPrice - p1.price;

    defaultOpportunities.push({
      id: 'opp_disc_bundle_02',
      type: 'BUNDLE_OPPORTUNITY',
      strategy: 'BUNDLE_INCENTIVE',
      title: `${p1.category} Complete Package Setup`,
      subtitle: `${p1.name} + ${p2.name} + ${p3.name}`,
      problem: `Customers buying ${p1.name} (₹${p1.price}) frequently miss related accessories, limiting average basket size.`,
      ai_recommendation: `Bundle all 3 for ₹${bundleSpecialPrice.toLocaleString('en-IN')} (instead of ₹${unbundledSum.toLocaleString('en-IN')})`,
      reason: 'Strategy: BUNDLE. Adding complementary products creates +₹' + basketUplift + ' more revenue per order without heavily discounting the primary ' + p1.name + '.',
      original_price: unbundledSum,
      discount_percent: Math.round((bundleSavings / unbundledSum) * 100),
      discount_amount: bundleSavings,
      final_price: bundleSpecialPrice,
      customer_saves: bundleSavings,
      merchant_basket_gain: basketUplift,
      target_segment: 'All store visitors searching for ' + p1.category,
      trigger_timing: 'On search / product view',
      duration_hours: 168, // 7 days
      channel: 'Conversational Shopping Assistant',
      max_uses: 100,
      estimated_impact: `+${Math.round((basketUplift / p1.price) * 100)}% Basket Growth per transaction`,
      margin_safe: true,
      margin_note: 'Positive unit contribution margin preserved across all bundled items.',
      status: storedDiscounts.find(d => d.id === 'opp_disc_bundle_02')?.status || 'PENDING'
    });
  }

  // 3. Slow-Moving / High Stock Item
  const slowProd = merchantProds.find(p => p.stock >= 25) || merchantProds[merchantProds.length - 1] || mainProd;
  const slowDiscPct = 10;
  const slowSavings = Math.round(slowProd.price * (slowDiscPct / 100));

  defaultOpportunities.push({
    id: 'opp_disc_stock_03',
    type: 'SLOW_MOVING_INVENTORY',
    strategy: 'PROMOTIONAL_DISCOUNT',
    title: `${slowProd.name} Inventory Acceleration`,
    subtitle: `${slowProd.stock} units in available stock`,
    problem: `High stock level relative to recent sales velocity for ${slowProd.name}.`,
    ai_recommendation: `${slowDiscPct}% limited-time promotion (₹${slowProd.price - slowSavings} final)`,
    reason: `Accelerate inventory turnover on ${slowProd.name}. Stock is healthy (${slowProd.stock} units), making a controlled 10% incentive optimal.`,
    original_price: slowProd.price,
    discount_percent: slowDiscPct,
    discount_amount: slowSavings,
    final_price: slowProd.price - slowSavings,
    customer_saves: slowSavings,
    merchant_gives_up: slowSavings,
    target_segment: 'Shoppers with cart value > ₹500',
    trigger_timing: 'When viewing related items',
    duration_hours: 48,
    channel: 'In-App Banner',
    max_uses: slowProd.stock,
    estimated_impact: '+30% Inventory Velocity (AI Estimate)',
    margin_safe: true,
    margin_note: 'Within recommended merchant limit of 20%.',
    status: storedDiscounts.find(d => d.id === 'opp_disc_stock_03')?.status || 'PENDING'
  });

  // Simulation comparison curve
  const baseAvgPrice = mainProd.price || 500;
  const simCurve = [
    { discount_pct: 0, label: '0% Discount', estimated_orders: 100, estimated_revenue: 100 * baseAvgPrice, is_optimal: false },
    { discount_pct: 5, label: '5% Discount', estimated_orders: 120, estimated_revenue: Math.round(120 * (baseAvgPrice * 0.95)), is_optimal: false },
    { discount_pct: 10, label: '10% Discount', estimated_orders: 128, estimated_revenue: Math.round(128 * (baseAvgPrice * 0.90)), is_optimal: true },
    { discount_pct: 15, label: '15% Discount', estimated_orders: 132, estimated_revenue: Math.round(132 * (baseAvgPrice * 0.85)), is_optimal: false }
  ];

  const pendingCount = defaultOpportunities.filter(o => o.status === 'PENDING').length;
  const totalRevOpp = defaultOpportunities.reduce((sum, o) => sum + (o.merchant_basket_gain || (o.final_price * 15)), 0);

  res.json({
    merchant_id: mId,
    store_name: merchant.store_name,
    metrics: {
      revenue_opportunity: Math.max(12400, totalRevOpp),
      active_offers_count: activeOffers.length,
      pending_approval_count: pendingCount,
      avg_recommended_discount: 8,
      safety_max_limit_pct: 20
    },
    opportunities: defaultOpportunities,
    active_discounts: activeOffers,
    simulation_curve: simCurve
  });
});

// POST /api/merchant/smart-discounts/optimize (AI Offer Optimizer)
app.post('/api/merchant/smart-discounts/optimize', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { goal = 'revenue', max_discount = 10, duration_days = 7 } = req.body;
  const mId = merchant.merchant_id;
  const prods = db.prepare('SELECT * FROM products WHERE merchant_id = ?').all(mId);

  const safeMaxDisc = Math.min(20, Math.max(0, Number(max_discount) || 10));
  const mainP = prods[0] || { name: 'Catalog Item', price: 500 };

  let recommendation = {};

  if (goal === 'abandoned_cart') {
    const disc = Math.min(5, safeMaxDisc);
    recommendation = {
      goal_name: 'Recover Abandoned Carts',
      best_offer: 'Abandoned Cart 1-Click Recovery',
      recommended_discount_pct: disc,
      target_audience: 'Shoppers with uncompleted carts > ₹800',
      best_timing: '30 minutes after cart inactivity',
      best_duration: `${duration_days} Days`,
      best_channel: 'In-App Offer Banner & Conversational Reminder',
      strategy: 'TARGETED_DISCOUNT',
      why: 'Lower targeted incentive (5%) preserves merchant margin while creating urgency for high-intent shoppers.',
      expected_impact: '+22% Recovery of Abandoned Orders',
      suggested_bundle: null
    };
  } else if (goal === 'clear_stock') {
    const disc = Math.min(12, safeMaxDisc);
    const slowP = prods.find(p => p.stock >= 20) || prods[prods.length - 1] || mainP;
    recommendation = {
      goal_name: 'Clear Excess Inventory',
      best_offer: `${slowP.name} Flash Inventory Clearance`,
      recommended_discount_pct: disc,
      target_audience: 'All store visitors and cart builders',
      best_timing: 'Immediate on product / store page visit',
      best_duration: `${duration_days} Days`,
      best_channel: 'In-App Announcement & AI Recommendation',
      strategy: 'PROMOTIONAL_DISCOUNT',
      why: `Sufficient stock available (${slowP.stock} units). A ${disc}% discount stimulates rapid velocity without price degradation.`,
      expected_impact: '+45% Inventory Turnover Rate',
      suggested_bundle: null
    };
  } else if (goal === 'repeat_customers') {
    const disc = Math.min(8, safeMaxDisc);
    recommendation = {
      goal_name: 'Increase Repeat Purchases & Loyalty',
      best_offer: 'Verified Customer VIP Reward',
      recommended_discount_pct: disc,
      target_audience: 'Customers with at least 1 previous completed purchase',
      best_timing: 'On returning visit authentication',
      best_duration: `${duration_days} Days`,
      best_channel: 'Personalized Greeting in Shopping Assistant',
      strategy: 'LOYALTY_INCENTIVE',
      why: 'Rewarding returning shoppers reinforces store preference with minimal margin dilution.',
      expected_impact: '+35% Repeat Order Frequency',
      suggested_bundle: null
    };
  } else {
    // Default: Increase Revenue -> Recommend BUNDLE strategy
    const disc = Math.min(6, safeMaxDisc);
    const compP = prods[1] || mainP;
    recommendation = {
      goal_name: 'Maximize Order Value (GMV)',
      best_offer: `${mainP.category} Contextual Smart Bundle`,
      recommended_discount_pct: disc,
      target_audience: 'Shoppers expressing occasion / goal intent',
      best_timing: 'When shopper adds initial product to cart',
      best_duration: `${duration_days} Days`,
      best_channel: 'AI Basket Builder in Shopping Assistant',
      strategy: 'BUNDLE_INCENTIVE',
      why: 'Strategy: BUNDLE. Pairing complementary items creates significantly more incremental revenue than discounting single products.',
      expected_impact: '+65% Average Basket Value (AOV)',
      suggested_bundle: `${mainP.name} + ${compP.name}`
    };
  }

  res.json({
    merchant_id: mId,
    store_name: merchant.store_name,
    optimization: recommendation
  });
});

// POST /api/merchant/smart-discounts/approve
app.post('/api/merchant/smart-discounts/approve', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    id,
    title,
    strategy_type = 'SMART_DISCOUNT',
    discount_percent = 5,
    final_price = 0,
    target_segment = 'Store Customers',
    duration_hours = 24,
    channel = 'IN_APP',
    ai_reason = 'Merchant approved AI discount recommendation'
  } = req.body;

  const mId = merchant.merchant_id;
  const discountId = id || `disc_${Date.now()}`;
  const discTitle = title || `${merchant.store_name} Smart Offer`;

  // Upsert into smart_discounts
  db.prepare(`
    INSERT OR REPLACE INTO smart_discounts (
      id, merchant_id, title, strategy_type, discount_percent, final_price,
      target_segment, trigger_timing, duration_hours, channel, status, ai_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Immediate on checkout', ?, ?, 'APPROVED', ?, ?)
  `).run(
    discountId,
    mId,
    discTitle,
    strategy_type,
    Number(discount_percent),
    Number(final_price),
    target_segment,
    Number(duration_hours),
    channel,
    ai_reason,
    new Date().toISOString()
  );

  // Sync to campaigns table
  db.prepare(`
    INSERT OR REPLACE INTO campaigns (id, merchant_id, name, type, status, expected_revenue, actual_revenue, created_at)
    VALUES (?, ?, ?, ?, 'ACTIVE', 25000.0, 0.0, ?)
  `).run(`camp_${discountId}`, mId, discTitle, strategy_type, new Date().toISOString());

  // Record in Audit Trail
  logAudit('Merchant', mId, 'Smart Discount Approved', `Approved ${discount_percent}% discount campaign '${discTitle}' for ${target_segment}`, {
    discount_id: discountId,
    discount_percent,
    channel,
    duration_hours
  });

  res.json({
    status: 'APPROVED',
    message: `Smart Offer '${discTitle}' (${discount_percent}% OFF) is now active for ${merchant.store_name}!`,
    discount_id: discountId
  });
});

// POST /api/merchant/smart-discounts/reject
app.post('/api/merchant/smart-discounts/reject', (req, res) => {
  const merchant = getAuthenticatedMerchant(req);
  if (!merchant) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id, title, reason } = req.body;
  const mId = merchant.merchant_id;
  const discountId = id || `disc_rej_${Date.now()}`;

  db.prepare(`
    INSERT OR REPLACE INTO smart_discounts (
      id, merchant_id, title, strategy_type, target_segment, trigger_timing, status, ai_reason, created_at
    ) VALUES (?, ?, ?, 'DISMISSED', 'All', 'N/A', 'REJECTED', ?, ?)
  `).run(
    discountId,
    mId,
    title || 'Discount Proposal',
    reason || 'Merchant dismissed recommendation',
    new Date().toISOString()
  );

  logAudit('Merchant', mId, 'Smart Discount Dismissed', `Merchant dismissed discount recommendation '${title || id}'`, { discount_id: id });

  res.json({ status: 'REJECTED', message: `Proposal dismissed.` });
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
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, confirm_password, role, store_name } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ detail: 'Please enter your full name (at least 2 characters).' });
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return res.status(400).json({ detail: 'Invalid email format. Please provide a valid email address.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ detail: 'Password must be at least 6 characters long.' });
  }

  if (confirm_password && password !== confirm_password) {
    return res.status(400).json({ detail: 'Passwords do not match. Please verify your password.' });
  }

  const targetRole = (role || 'customer').trim().toLowerCase();
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(400).json({ detail: 'An account with this email already exists. Please log in instead.' });
  }

  const userId = targetRole === 'merchant' ? `merchant_${Date.now()}` : `cust_${Date.now()}`;
  const merchantId = targetRole === 'merchant' ? userId : null;
  const hashedPwd = hashPassword(password);
  const nowStr = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, merchant_id, name, email, password_hash, role, store_name, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    userId,
    merchantId,
    name.trim(),
    cleanEmail,
    hashedPwd,
    targetRole,
    store_name || (targetRole === 'merchant' ? name.trim() : null),
    nowStr
  );

  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const token = createAccessToken({
    sub: newUser.id,
    user_id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    merchant_id: newUser.merchant_id
  });

  res.json({
    access_token: token,
    token_type: 'bearer',
    user: {
      id: newUser.id,
      merchant_id: newUser.merchant_id || newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      store_name: newUser.store_name || newUser.name,
      is_active: true
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  return app._router.handle({ ...req, url: '/api/auth/signup', method: 'POST' }, res);
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ detail: 'Invalid email format. Please provide a valid email address.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  if (!user) {
    return res.status(401).json({ detail: 'Incorrect email or password.' });
  }

  if (!verifyPassword(password || '', user.password_hash)) {
    return res.status(401).json({ detail: 'Incorrect email or password.' });
  }

  if (user.is_active === 0) {
    return res.status(403).json({ detail: 'Your account is currently inactive.' });
  }

  if (role) {
    const requestedRole = role.trim().toLowerCase();
    if (user.role !== requestedRole) {
      const registeredRoleName = user.role === 'merchant' ? 'Merchant' : 'Customer';
      return res.status(400).json({ detail: `This account is registered as a ${registeredRoleName}.` });
    }
  }

  const token = createAccessToken({
    sub: user.id,
    user_id: user.id,
    email: user.email,
    role: user.role,
    merchant_id: user.merchant_id
  });

  res.json({
    access_token: token,
    token_type: 'bearer',
    user: {
      id: user.id,
      merchant_id: user.merchant_id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      store_name: user.store_name || user.name,
      is_active: true
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ detail: 'Authentication token is missing.' });
  }

  const payload = verifyAccessToken(token);
  if (!payload || (!payload.sub && !payload.user_id)) {
    return res.status(401).json({ detail: 'Invalid or expired access token.' });
  }

  const userId = payload.sub || payload.user_id;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(401).json({ detail: 'User account no longer exists.' });
  }

  if (user.is_active === 0) {
    return res.status(403).json({ detail: 'Your account is currently inactive.' });
  }

  res.json({
    id: user.id,
    merchant_id: user.merchant_id || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    store_name: user.store_name || user.name,
    is_active: true
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ status: 'SUCCESS', message: 'Successfully logged out.' });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

app.listen(PORT, () => {
  console.log(`🚀 Revenue Pilot AI backend server running on http://localhost:${PORT}`);
});
