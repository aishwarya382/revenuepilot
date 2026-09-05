// backend/recommendation_engine.js
// Provides functions to fetch complementary product recommendations from the live catalog.
// Uses the `related_products` column in `products` table (comma‑separated IDs).
// Filters out out‑of‑stock items, respects budget, and excludes products already in the cart.

const { db } = require('./db');

/** Parse a comma‑separated list of product IDs from the `related_products` column. */
function parseRelatedIds(str) {
  if (!str) return [];
  return str.split(',').map(id => id.trim()).filter(Boolean);
}

/** Fetch product details for given IDs, only published and in stock. */
function fetchProductsByIds(ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT id, merchant_id, merchant_name, name, category, price, stock, description, image_url FROM products WHERE id IN (${placeholders}) AND status = 'published' AND stock > 0`);
  return stmt.all(...ids);
}

/** Get complementary recommendations for a base product.
 * @param {string} productId – ID of the product the user is viewing.
 * @param {object} options – Optional filters:
 *   budget: maximum price the user is willing to spend on recommendations.
 *   excludeIds: array of product IDs already in the cart (to avoid duplicates).
 *   limit: maximum number of recommendations to return (default 5).
 */
function getComplementary(productId, options = {}) {
  const { budget, excludeIds = [], limit = 5 } = options;
  const baseStmt = db.prepare('SELECT related_products, name FROM products WHERE id = ?');
  const base = baseStmt.get(productId);
  if (!base) return [];

  const related = parseRelatedIds(base.related_products).filter(id => !excludeIds.includes(id));
  let candidates = fetchProductsByIds(related);

  // Apply budget filter if provided.
  if (typeof budget === 'number') {
    candidates = candidates.filter(p => p.price <= budget);
  }

  // Simple relevance sort – you could replace with merchant‑defined priority.
  candidates.sort((a, b) => a.price - b.price);

  const limited = candidates.slice(0, limit);
  return limited.map(p => ({
    ...p,
    reason: `Complementary to ${base.name}`,
  }));
}

module.exports = { getComplementary };
