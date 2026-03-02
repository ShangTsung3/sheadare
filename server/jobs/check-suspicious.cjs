const Database = require('better-sqlite3');
const db = new Database('data/pricemap.db');

// Find products in 2+ stores where price ratio is suspiciously high (>2x)
const suspicious = db.prepare(`
  SELECT p.id, p.name, p.barcode,
    MIN(so.price) as min_price, MAX(so.price) as max_price,
    ROUND(MAX(so.price) * 1.0 / MIN(so.price), 1) as ratio
  FROM products p
  JOIN store_offers so ON so.product_id = p.id AND so.in_stock = 1 AND so.price > 0
  GROUP BY p.id
  HAVING COUNT(DISTINCT so.store) >= 2 AND ratio > 2.0
  ORDER BY ratio DESC
  LIMIT 30
`).all();

console.log('Suspicious merges (price ratio > 2x):');
for (const s of suspicious) {
  const offers = db.prepare('SELECT store, price, url FROM store_offers WHERE product_id = ? AND in_stock = 1 AND price > 0').all(s.id);
  console.log(`\n  ${s.name} (barcode: ${s.barcode || 'none'}) ratio: ${s.ratio}x`);
  for (const o of offers) console.log(`    ${o.store}: ${o.price} - ${o.url || ''}`);
}
console.log(`\nTotal suspicious: ${suspicious.length}`);

// Also count totals
const total = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
const multi = db.prepare(`
  SELECT COUNT(*) as cnt FROM products p
  WHERE (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) >= 2
`).get();
console.log(`\nTotal products: ${total.cnt}`);
console.log(`Multi-store products: ${multi.cnt}`);
