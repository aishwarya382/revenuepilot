const { db, logAudit } = require('./db');

const AgentTools = {
  // Product search grounded strictly in the live merchant SQL catalog
  search_products({ query, category, max_budget, min_budget, maxPrice, minPrice, merchant_id, limit = 10 }) {
    const maxB = max_budget !== undefined ? max_budget : maxPrice;
    const minB = min_budget !== undefined ? min_budget : minPrice;

    let sql = "SELECT * FROM products WHERE status = 'published' AND stock > 0";
    const params = [];

    if (merchant_id) {
      sql += ' AND merchant_id = ?';
      params.push(merchant_id);
    }
    if (category) {
      sql += ' AND LOWER(category) LIKE LOWER(?)';
      params.push(`%${category}%`);
    }
    if (maxB !== null && maxB !== undefined && !isNaN(maxB)) {
      sql += ' AND price <= ?';
      params.push(Number(maxB));
    }
    if (minB !== null && minB !== undefined && !isNaN(minB)) {
      sql += ' AND price >= ?';
      params.push(Number(minB));
    }

    const allFiltered = db.prepare(sql).all(...params);

    const formatted = allFiltered.map(p => ({
      ...p,
      product_id: p.id,
      image: p.image_url,
      origin: 'IN_STORE',
      badge: p.merchant_name || 'In-Store',
      source_name: p.merchant_name || 'In-Store'
    }));

    if (!query) {
      return formatted.slice(0, limit);
    }

    const stopwords = new Set([
      'under', 'around', 'below', 'above', 'with', 'need', 'want', 'find', 'show',
      'looking', 'for', 'please', 'the', 'and', 'rs', 'inr', 'rupees', 'budget', 'best', 'good', 'a', 'an', 'i'
    ]);

    const keywords = query.toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(w => w.length > 1 && !stopwords.has(w) && isNaN(w));

    if (keywords.length === 0) {
      return formatted.slice(0, limit);
    }

    const scored = [];
    const isWholeWord = (text, word) => new RegExp(`\\b${word}\\b`, 'i').test(text);

    // Occasion and goal-based semantic keyword enrichment
    const queryLower = query.toLowerCase();
    const isBirthdayGoal = /birthday|anniversary|celebration|party|daughter|son|kid|child|festive/i.test(queryLower);
    const isRunningGoal = /running|marathon|jogging|fitness|gym|workout|athletic|shoes|walk/i.test(queryLower);
    const isTechGoal = /coding|programming|developer|gaming|work|office|study|student|laptop|computer/i.test(queryLower);

    for (const p of formatted) {
      const nameLower = (p.name || '').toLowerCase();
      const descLower = (p.description || '').toLowerCase();
      const catLower = (p.category || '').toLowerCase();
      const merchantLower = (p.merchant_name || '').toLowerCase();

      let score = 0;
      let matchedCount = 0;

      // Direct keyword matching (prefer whole-word and prevent sub-word false matches on short words)
      for (const kw of keywords) {
        const allowSubstring = kw.length >= 4;

        if (isWholeWord(nameLower, kw)) {
          score += 25;
          matchedCount++;
        } else if (allowSubstring && nameLower.includes(kw)) {
          score += 15;
          matchedCount++;
        }

        if (isWholeWord(catLower, kw)) {
          score += 20;
          matchedCount++;
        } else if (allowSubstring && (catLower.includes(kw) || kw.includes(catLower))) {
          score += 12;
          matchedCount++;
        }

        if (isWholeWord(descLower, kw)) {
          score += 6;
          matchedCount++;
        } else if (allowSubstring && descLower.includes(kw)) {
          score += 3;
          matchedCount++;
        }

        if (isWholeWord(merchantLower, kw)) {
          score += 10;
          matchedCount++;
        }
      }

      // Goal & Occasion intent boosts
      if (isBirthdayGoal && (merchantLower.includes('cake') || catLower.includes('cake') || catLower.includes('party') || catLower.includes('decoration'))) {
        if (catLower.includes('cake') || nameLower.includes('cake')) {
          score += 35; // Primary anchor product
          matchedCount++;
        } else {
          score += 20;
          matchedCount++;
        }
      }

      if (isRunningGoal && (catLower.includes('footwear') || catLower.includes('running') || nameLower.includes('runner') || nameLower.includes('shoe'))) {
        if (nameLower.includes('runner') || nameLower.includes('shoe')) {
          score += 35; // Primary anchor product
          matchedCount++;
        } else {
          score += 20;
          matchedCount++;
        }
      }

      if (isTechGoal && (catLower.includes('computers') || catLower.includes('laptops') || nameLower.includes('laptop') || nameLower.includes('ultrabook'))) {
        if (nameLower.includes('laptop') || nameLower.includes('ultrabook')) {
          score += 35; // Primary anchor product
          matchedCount++;
        } else {
          score += 20;
          matchedCount++;
        }
      }

      if (matchedCount > 0) {
        scored.push({ product: p, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.product).slice(0, limit);
  },

  search_merchant_catalog(opts) {
    return this.search_products(opts);
  },

  // Lookup product details by ID directly from SQL database
  get_product(productId) {
    const inStore = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (inStore) {
      return {
        ...inStore,
        product_id: inStore.id,
        image: inStore.image_url,
        origin: 'IN_STORE',
        badge: inStore.merchant_name || 'In-Store',
        source_name: inStore.merchant_name || 'In-Store'
      };
    }
    return null;
  },

  get_product_details(productId) {
    return this.get_product(productId);
  },

  // Get related cross-sell items within same merchant's database
  get_related_products(productId, limit = 3) {
    const prod = db.prepare('SELECT id, category, merchant_id, related_products FROM products WHERE id = ?').get(productId);
    if (!prod) return [];

    let related = [];
    const seenIds = new Set([productId]);

    if (prod.related_products) {
      const ids = prod.related_products.split(',').map(s => s.trim()).filter(Boolean);
      for (const rId of ids) {
        if (!seenIds.has(rId)) {
          const item = db.prepare("SELECT * FROM products WHERE id = ? AND stock > 0 AND status = 'published'").get(rId);
          if (item) {
            related.push(item);
            seenIds.add(item.id);
          }
        }
      }
    }

    if (related.length < limit) {
      const more = db.prepare("SELECT * FROM products WHERE merchant_id = ? AND id != ? AND stock > 0 AND status = 'published' LIMIT ?")
        .all(prod.merchant_id, prod.id, limit - related.length);
      for (const m of more) {
        if (!seenIds.has(m.id)) {
          related.push(m);
          seenIds.add(m.id);
        }
      }
    }

    return related.map(p => ({
      ...p,
      product_id: p.id,
      image: p.image_url,
      origin: 'IN_STORE',
      badge: p.merchant_name,
      source_name: p.merchant_name
    })).slice(0, limit);
  },

  // AI Basket Growth: Find complementary cross-sell items within same merchant
  search_complementary_products({ mainProduct, occasion = null, max_budget = null }) {
    if (!mainProduct) return [];

    const related = this.get_related_products(mainProduct.id || mainProduct.product_id, 4);
    if (related.length > 0) {
      return related.filter(p => {
        if (max_budget !== null && max_budget !== undefined && p.price > max_budget) return false;
        return true;
      });
    }

    // Secondary fallback within same merchant
    const compCategories = ['Decoration', 'Party Supplies', 'Accessories', 'Audio', 'Footwear'];
    let complementary = [];
    const seen = new Set([mainProduct.id || mainProduct.product_id]);

    for (const cat of compCategories) {
      const found = db.prepare("SELECT * FROM products WHERE merchant_id = ? AND id != ? AND category = ? AND stock > 0 AND status = 'published' LIMIT 2")
        .all(mainProduct.merchant_id, mainProduct.id || mainProduct.product_id, cat);
      for (const f of found) {
        if (!seen.has(f.id)) {
          complementary.push(f);
          seen.add(f.id);
        }
      }
    }

    return complementary.map(p => ({
      ...p,
      product_id: p.id,
      image: p.image_url,
      origin: 'IN_STORE',
      badge: p.merchant_name,
      source_name: p.merchant_name
    })).filter(p => {
      if (max_budget !== null && max_budget !== undefined && p.price > max_budget) return false;
      return true;
    });
  },

  // Bounded Bundle Calculation (Total Price <= Customer Budget)
  calculate_bundle({ mainProduct, complementaryItems = [], budget_limit = null }) {
    if (!mainProduct) return null;

    let totalPrice = mainProduct.price;
    const items = [mainProduct];
    const addedIds = new Set([mainProduct.id || mainProduct.product_id]);

    for (const item of complementaryItems) {
      const itemId = item.id || item.product_id;
      if (!addedIds.has(itemId)) {
        if (budget_limit === null || budget_limit === undefined || (totalPrice + item.price <= budget_limit)) {
          items.push(item);
          totalPrice += item.price;
          addedIds.add(itemId);
        }
      }
    }

    const remainingBudget = budget_limit !== null && budget_limit !== undefined ? budget_limit - totalPrice : null;
    const enrichedItems = items.map(i => ({
      ...i,
      product_id: i.product_id || i.id,
      image: i.image || i.image_url
    }));

    return {
      bundle_title: `Complete ${mainProduct.category || 'Setup'} Package`,
      bundle_name: `Complete ${mainProduct.name} Setup`,
      main_product: { ...mainProduct, product_id: mainProduct.product_id || mainProduct.id },
      complementary_items: enrichedItems.filter(i => (i.product_id || i.id) !== (mainProduct.product_id || mainProduct.id)),
      items: enrichedItems,
      bundle_items: enrichedItems.map(i => ({
        product_id: i.product_id || i.id,
        quantity: 1,
        price: i.price,
        name: i.name
      })),
      total_price: totalPrice,
      budget_limit: budget_limit,
      remaining_budget: remainingBudget,
      product_ids: enrichedItems.map(i => i.product_id || i.id)
    };
  },

  // Customer Cart Operations
  getOrCreateCart(customerId) {
    const custId = customerId || 'cust_demo_01';
    let cart = db.prepare("SELECT * FROM carts WHERE customer_id = ? AND status = 'ACTIVE'").get(custId);
    if (!cart) {
      const newId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      db.prepare('INSERT INTO carts (id, customer_id, status) VALUES (?, ?, ?)').run(newId, custId, 'ACTIVE');
      cart = { id: newId, customer_id: custId, status: 'ACTIVE' };
    }
    return cart;
  },

  getCart(customerId) {
    const cart = this.getOrCreateCart(customerId);
    const items = db.prepare(`
      SELECT ci.id, ci.product_id, ci.quantity, ci.price,
             p.name, p.category, p.image_url, p.merchant_id, p.merchant_name, p.stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
    `).all(cart.id);

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      cart_id: cart.id,
      customer_id: customerId,
      items: items.map(it => ({
        ...it,
        id: it.id,
        item_id: it.id,
        item_total: it.price * it.quantity,
        image: it.image_url
      })),
      total_amount: totalAmount,
      total_items: totalItems
    };
  },

  add_to_cart(customerId, productId, quantity = 1) {
    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!prod) {
      throw new Error(`Product ${productId} not found in store database.`);
    }

    if (prod.stock < quantity) {
      throw new Error(`Insufficient stock for ${prod.name}.`);
    }

    const cart = this.getOrCreateCart(customerId);
    const existing = db.prepare('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?').get(cart.id, productId);

    if (existing) {
      db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
    } else {
      const itemId = `ci_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      db.prepare('INSERT INTO cart_items (id, cart_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)').run(
        itemId,
        cart.id,
        productId,
        quantity,
        prod.price
      );
    }
    return this.getCart(customerId);
  },

  addToCart(customerId, productId, quantity = 1) {
    return this.add_to_cart(customerId, productId, quantity);
  },

  add_bundle_to_cart(customerId, productIds = []) {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new Error('No products specified in bundle.');
    }
    for (const prodId of productIds) {
      this.add_to_cart(customerId, prodId, 1);
    }
    return this.getCart(customerId);
  },

  removeFromCart(customerId, itemId) {
    const cart = this.getOrCreateCart(customerId);
    db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND (id = ? OR product_id = ?)').run(cart.id, itemId, itemId);
    return this.getCart(customerId);
  },

  clearCart(customerId) {
    const cart = db.prepare("SELECT id FROM carts WHERE customer_id = ? AND status = 'ACTIVE'").get(customerId);
    if (cart) {
      db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
    }
    return this.getCart(customerId);
  }
};

module.exports = {
  AgentTools
};
