/**
 * Strict fix: split ALL products where price ratio > 1.8x
 * These are almost certainly different products incorrectly merged.
 */
const Database = require('better-sqlite3');
const db = new Database('data/pricemap.db');
db.pragma('journal_mode = WAL');

const suspicious = db.prepare(`
  SELECT p.id, p.name, p.barcode,
    MIN(so.price) as min_price, MAX(so.price) as max_price,
    ROUND(MAX(so.price) * 1.0 / MIN(so.price), 1) as ratio,
    COUNT(DISTINCT so.store) as store_count
  FROM products p
  JOIN store_offers so ON so.product_id = p.id AND so.in_stock = 1 AND so.price > 0
  GROUP BY p.id
  HAVING store_count >= 2 AND ratio > 1.8
  ORDER BY ratio DESC
`).all();

console.log(`Found ${suspicious.length} products with price ratio > 1.8x\n`);

let splitCount = 0;

const splitTransaction = db.transaction(() => {
  for (const prod of suspicious) {
    const offers = db.prepare(
      'SELECT id, store, price, in_stock, url, last_seen_at FROM store_offers WHERE product_id = ? AND in_stock = 1 AND price > 0 ORDER BY price'
    ).all(prod.id);

    if (offers.length < 2) continue;

    const prices = offers.map(o => o.price).sort((a, b) => a - b);
    const minPrice = prices[0];

    // Split: offers with price > 1.8x the minimum are different products
    const cheapOffers = offers.filter(o => o.price <= minPrice * 1.8);
    const expensiveOffers = offers.filter(o => o.price > minPrice * 1.8);

    if (cheapOffers.length === 0 || expensiveOffers.length === 0) continue;

    const keepGroup = expensiveOffers.length >= cheapOffers.length ? expensiveOffers : cheapOffers;
    const splitGroup = expensiveOffers.length >= cheapOffers.length ? cheapOffers : expensiveOffers;

    db.prepare(`
      INSERT INTO products (external_id, name, name_normalized, barcode, size, category, image_url, brand, source)
      SELECT 'split-' || id || '-' || ?, name, name_normalized, NULL, size, category, image_url, brand, source
      FROM products WHERE id = ?
    `).run(Date.now(), prod.id);

    const newProductId = db.prepare('SELECT last_insert_rowid() as id').get().id;

    for (const offer of splitGroup) {
      db.prepare('UPDATE store_offers SET product_id = ? WHERE id = ?').run(newProductId, offer.id);
    }
    for (const offer of splitGroup) {
      db.prepare('UPDATE price_history SET product_id = ? WHERE product_id = ? AND store = ?')
        .run(newProductId, prod.id, offer.store);
    }

    splitCount++;
    if (splitCount <= 20) {
      console.log(`  Split: ${prod.name} (ratio ${prod.ratio}x)`);
      console.log(`    Keep: ${keepGroup.map(o => o.store + ':' + o.price).join(', ')}`);
      console.log(`    Split: ${splitGroup.map(o => o.store + ':' + o.price).join(', ')}`);
    }
  }
});

splitTransaction();

const total = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
const multi = db.prepare(`
  SELECT COUNT(*) as cnt FROM products p
  WHERE (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) >= 2
`).get();
const three = db.prepare(`
  SELECT COUNT(*) as cnt FROM products p
  WHERE (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) = 3
`).get();

console.log(`\n=== Fix Complete ===`);
console.log(`Products split: ${splitCount}`);
console.log(`Total products: ${total.cnt}`);
console.log(`Multi-store (2+): ${multi.cnt}`);
console.log(`3-store: ${three.cnt}`);
