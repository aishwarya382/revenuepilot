const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'shopmind.db');
const db = new DatabaseSync(dbPath);

// Initialize relational schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    merchant_id TEXT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    store_name TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    merchant_name TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 20,
    description TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    related_products TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS carts (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY,
    cart_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS delivery_addresses (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    house_flat_building TEXT NOT NULL,
    street_area TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pin_code TEXT NOT NULL,
    landmark TEXT,
    is_default INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    subtotal_amount REAL,
    discount_amount REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'CREATED',
    payment_method TEXT DEFAULT 'CARD',
    payment_status TEXT DEFAULT 'PENDING',
    shipping_address_json TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    merchant_id TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_type TEXT NOT NULL,
    actor_id TEXT,
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    metadata_json TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    expected_revenue REAL NOT NULL,
    actual_revenue REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS smart_discounts (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    strategy_type TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT,
    original_price REAL,
    discount_percent REAL NOT NULL DEFAULT 5,
    discount_amount REAL NOT NULL DEFAULT 0,
    final_price REAL,
    target_segment TEXT NOT NULL,
    trigger_timing TEXT NOT NULL,
    duration_hours INTEGER NOT NULL DEFAULT 24,
    max_uses INTEGER NOT NULL DEFAULT 100,
    used_count INTEGER NOT NULL DEFAULT 0,
    channel TEXT NOT NULL DEFAULT 'IN_APP',
    status TEXT NOT NULL DEFAULT 'PENDING',
    ai_reason TEXT NOT NULL,
    estimated_impact TEXT,
    margin_safe INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
`);

// Clean legacy data & ensure columns
try { db.exec("ALTER TABLE users ADD COLUMN merchant_id TEXT"); } catch (_) { }
try { db.exec("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'CARD'"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'PENDING'"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN subtotal_amount REAL"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN shipping_address_json TEXT"); } catch (_) { }
// New columns for detailed order tracking
try { db.exec("ALTER TABLE orders ADD COLUMN merchant_id TEXT"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN product_id TEXT"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN product_name TEXT"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN quantity INTEGER"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN price_at_order REAL"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'PENDING'"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN subtotal_amount REAL"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0"); } catch (_) { }
try { db.exec("ALTER TABLE orders ADD COLUMN shipping_address_json TEXT"); } catch (_) { }

const { hashPassword } = require('./auth');
// Recommendation log table for tracking
try { db.exec("CREATE TABLE IF NOT EXISTS recommendation_log (id TEXT PRIMARY KEY, session_id TEXT, original_product_id TEXT, recommended_product_id TEXT, reason TEXT, user_response TEXT CHECK(user_response IN ('accepted','rejected')), timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)"); } catch (_) {}
const demoPasswordHash = hashPassword('Demo@12345');

// Sync Seed Users with exact merchant_id bindings and hashed passwords
const seedUsers = [
  // Demo Accounts
  ['merchant_celebration_cakes', 'merchant_celebration_cakes', 'Celebration Cakes', 'merchant@revenuepilot.ai', demoPasswordHash, 'merchant', 'Celebration Cakes', 1],
  ['merchant_celebration_owner', 'merchant_celebration_cakes', 'Celebration Cakes Owner', 'owner@celebrationcakes.in', demoPasswordHash, 'merchant', 'Celebration Cakes', 1],

  // Merchant 2: StepWalk Shoes
  ['merchant_stepwalk_shoes', 'merchant_stepwalk_shoes', 'StepWalk Shoes', 'owner@stepwalk.in', demoPasswordHash, 'merchant', 'StepWalk Shoes', 1],

  // Merchant 3: TechStore Pro
  ['merchant_tech_store', 'merchant_tech_store', 'TechStore Pro', 'admin@techstore.in', demoPasswordHash, 'merchant', 'TechStore Pro', 1],

  // Customer Accounts
  ['cust_demo_01', null, 'Demo Customer', 'customer@revenuepilot.ai', demoPasswordHash, 'customer', null, 1],
  ['cust_demo_aarav', null, 'Aarav Sharma', 'aarav@college.edu', demoPasswordHash, 'customer', null, 1],
  ['cust_demo_02', null, 'Priya Patel', 'priya@gmail.com', demoPasswordHash, 'customer', null, 1],
  ['cust_demo_03', null, 'Rahul Verma', 'rahul@outlook.com', demoPasswordHash, 'customer', null, 1]
];

const upsertUser = db.prepare(`
  INSERT OR REPLACE INTO users (id, merchant_id, name, email, password_hash, role, store_name, is_active, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date().toISOString();
for (const u of seedUsers) {
  upsertUser.run(u[0], u[1], u[2], u[3], u[4], u[5], u[6], u[7], now);
}

// Clear and seed isolated multi-tenant product catalogs
db.exec("DELETE FROM products");

const seedProducts = [
  // ==========================================
  // Merchant 1: Celebration Cakes (merchant_celebration_cakes)
  // ==========================================
  [
    'prod_cake_01',
    'merchant_celebration_cakes',
    'Celebration Cakes',
    'Chocolate Cake',
    'Cakes',
    500.0,
    20,
    'Moist rich Belgian chocolate sponge with smooth dark chocolate frosting. Serves 6-8 people.',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
    'prod_cake_04,prod_cake_05,prod_cake_06'
  ],
  [
    'prod_cake_02',
    'merchant_celebration_cakes',
    'Celebration Cakes',
    'Mango Cake',
    'Cakes',
    600.0,
    15,
    'Fresh seasonal Alphonso mango puree layered with vanilla sponge and whipped cream frosting.',
    'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=600&q=80',
    'prod_cake_04,prod_cake_05,prod_cake_06'
  ],
  [
    'prod_cake_03',
    'merchant_celebration_cakes',
    'Celebration Cakes',
    'Vanilla Cake',
    'Cakes',
    450.0,
    15,
    'Classic fluffy Madagascar vanilla sponge layered with light buttercream frosting.',
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80',
    'prod_cake_04,prod_cake_05,prod_cake_06'
  ],
  [
    'prod_cake_04',
    'merchant_celebration_cakes',
    'Celebration Cakes',
    'Birthday Candles (Set of 12)',
    'Decoration',
    100.0,
    50,
    'Sparkling metallic gold birthday candle set with drip-free wax holders.',
    'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
    null
  ],
  [
    'prod_cake_05',
    'merchant_celebration_cakes',
    'Celebration Cakes',
    'Balloon Decoration Kit',
    'Decoration',
    300.0,
    20,
    'Pack of 30 pastel metallic party balloons with ribbons and balloon inflator pump.',
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&q=80',
    null
  ],
  [
    'prod_cake_06',
    'merchant_celebration_cakes',
    'Celebration Cakes',
    'Birthday Banner',
    'Decoration',
    150.0,
    30,
    'Shimmering gold cursive Happy Birthday wall hanging banner with pre-threaded string.',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    null
  ],

  // ==========================================
  // Merchant 2: StepWalk Shoes (merchant_stepwalk_shoes)
  // ==========================================
  [
    'prod_shoe_01',
    'merchant_stepwalk_shoes',
    'StepWalk Shoes',
    'Nike-style Running Shoes',
    'Footwear',
    2999.0,
    25,
    'Lightweight breathable mesh athletic running shoes with responsive shock-absorbing cushioning.',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
    'prod_shoe_04,prod_shoe_05'
  ],
  [
    'prod_shoe_02',
    'merchant_stepwalk_shoes',
    'StepWalk Shoes',
    'Casual Sneakers',
    'Footwear',
    2499.0,
    30,
    'Classic low-top white minimalist sneakers with vulcanized rubber grip sole.',
    'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=600&q=80',
    'prod_shoe_04,prod_shoe_05'
  ],
  [
    'prod_shoe_03',
    'merchant_stepwalk_shoes',
    'StepWalk Shoes',
    'Formal Leather Shoes',
    'Footwear',
    3499.0,
    15,
    'Handcrafted genuine leather Oxford formal dress shoes with padded leather insole.',
    'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=600&q=80',
    'prod_shoe_04'
  ],
  [
    'prod_shoe_04',
    'merchant_stepwalk_shoes',
    'StepWalk Shoes',
    'Shoe Cleaning Kit',
    'Accessories',
    399.0,
    50,
    'Complete sneaker care kit with foam cleaner, horsehair brush, and microfiber wipe.',
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=600&q=80',
    null
  ],
  [
    'prod_shoe_05',
    'merchant_stepwalk_shoes',
    'StepWalk Shoes',
    'Sports Socks (Set of 3)',
    'Accessories',
    199.0,
    100,
    'Cushioned moisture-wicking ankle sports socks with arch compression band.',
    'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=600&q=80',
    null
  ],

  // ==========================================
  // Merchant 3: TechStore Pro (merchant_tech_store)
  // ==========================================
  [
    'prod_tech_01',
    'merchant_tech_store',
    'TechStore Pro',
    'HP Pavilion Plus 14 Laptop',
    'Laptops',
    55000.0,
    10,
    'Intel Core i5 13th Gen • 16GB RAM • 512GB NVMe SSD • 14" OLED Screen • 14hr Battery. Ideal for development and productivity.',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80',
    'prod_tech_02,prod_tech_03,prod_tech_04'
  ],
  [
    'prod_tech_02',
    'merchant_tech_store',
    'TechStore Pro',
    'AcousticPro ANC Wireless Headphones',
    'Audio',
    4500.0,
    30,
    'Active noise cancelling wireless headphones with low-latency mode, spatial audio, and 40-hr battery.',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    null
  ],
  [
    'prod_tech_03',
    'merchant_tech_store',
    'TechStore Pro',
    'ErgoGrip Wireless Silent Mouse',
    'Accessories',
    1500.0,
    50,
    'Ergonomic dual-mode Bluetooth & 2.4Ghz silent click mouse with 24-month battery life.',
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80',
    null
  ],
  [
    'prod_tech_04',
    'merchant_tech_store',
    'TechStore Pro',
    'ShieldPack Anti-Theft Laptop Backpack',
    'Accessories',
    2000.0,
    40,
    'Water-resistant ergonomic laptop backpack with padded 15.6" compartment and hidden anti-theft pockets.',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
    null
  ]
];

const insertProd = db.prepare(`
  INSERT INTO products (id, merchant_id, merchant_name, name, category, price, stock, description, image_url, status, related_products, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
`);

for (const p of seedProducts) {
  insertProd.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], now);
}

// Log audit event helper
function logAudit(actorType, actorId, action, reason, metadata = {}, status = 'COMPLETED') {
  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, actor_type, actor_id, action, reason, metadata_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    actorType,
    actorId || 'system',
    action,
    reason,
    JSON.stringify(metadata),
    status,
    new Date().toISOString()
  );
}

const { getComplementary } = require('./recommendation_engine');
module.exports = {
  db,
  logAudit
};
