/**
 * Merge back split products that were incorrectly split (ratio < 2.5x = likely real price diff).
 * Only merges if original exists with same name AND the combined ratio would be < 2.5x.
 */
const Database = require('better-sqlite3');
const db = new Database('data/pricemap.db');
db.pragma('journal_mode = WAL');

const splitProducts = db.prepare(`
  SELECT p.id, p.name, p.external_id
  FROM products p
  WHERE p.external_id LIKE 'split-%' OR p.external_id LIKE 'wrong-merge-%'
`).all();

console.log(`Found ${splitProducts.length} split products\n`);

let mergedCount = 0;
let keptCount = 0;

const tx = db.transaction(() => {
  for (const split of splitProducts) {
    const original = db.prepare(`
      SELECT p.id FROM products p
      WHERE p.name = ? AND p.id != ? AND p.barcode IS NOT NULL AND p.barcode != ''
      LIMIT 1
    `).get(split.name, split.id);

    if (!original) { keptCount++; continue; }

    // Get all offers from both products
    const origOffers = db.prepare('SELECT store, price FROM store_offers WHERE product_id = ? AND in_stock = 1 AND price > 0').all(original.id);
    const splitOffers = db.prepare('SELECT id, store, price FROM store_offers WHERE product_id = ? AND in_stock = 1 AND price > 0').all(split.id);

    // Check what ratio would be if merged
    const allPrices = [...origOffers.map(o => o.price), ...splitOffers.map(o => o.price)];
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const ratio = maxP / minP;

    if (ratio > 2.5) {
      // Too suspicious - keep separate
      keptCount++;
      continue;
    }

    // Safe to merge - move offers back
    for (const offer of splitOffers) {
      const existing = db.prepare('SELECT id FROM store_offers WHERE product_id = ? AND store = ?').get(original.id, offer.store);
      if (!existing) {
        db.prepare('UPDATE store_offers SET product_id = ? WHERE id = ?').run(original.id, offer.id);
      } else {
        db.prepare('DELETE FROM store_offers WHERE id = ?').run(offer.id);
      }
    }
    db.prepare('UPDATE price_history SET product_id = ? WHERE product_id = ?').run(original.id, split.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(split.id);
    mergedCount++;
    console.log(`  Merged: ${split.name} (ratio ${ratio.toFixed(1)}x)`);
  }
});

tx();

const total = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
const multi = db.prepare(`
  SELECT COUNT(*) as cnt FROM products p
  WHERE (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) >= 2
`).get();

console.log(`\n=== Done ===`);
console.log(`Merged back (safe, <2.5x): ${mergedCount}`);
console.log(`Kept separate (>2.5x): ${keptCount}`);
console.log(`Total products: ${total.cnt}`);
console.log(`Multi-store: ${multi.cnt}`);
