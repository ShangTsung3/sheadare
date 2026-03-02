/**
 * Fix duplicates created by the split scripts.
 * Find products with barcode=null that have the same name as a barcode-having product,
 * and merge their offers back.
 */
const Database = require('better-sqlite3');
const db = new Database('data/pricemap.db');
db.pragma('journal_mode = WAL');

// Find all split products (external_id starts with 'split-')
const splitProducts = db.prepare(`
  SELECT p.id, p.name, p.name_normalized, p.size
  FROM products p
  WHERE p.external_id LIKE 'split-%'
`).all();

console.log(`Found ${splitProducts.length} split products to check\n`);

let mergedCount = 0;
let deletedCount = 0;

const mergeTransaction = db.transaction(() => {
  for (const split of splitProducts) {
    // Find original product with same name that has a barcode
    const original = db.prepare(`
      SELECT p.id FROM products p
      WHERE p.name = ? AND p.id != ? AND p.barcode IS NOT NULL AND p.barcode != ''
      LIMIT 1
    `).get(split.name, split.id);

    if (!original) continue;

    // Get split product's offers
    const splitOffers = db.prepare('SELECT id, store, price FROM store_offers WHERE product_id = ?').all(split.id);

    for (const offer of splitOffers) {
      // Check if original already has this store
      const existing = db.prepare('SELECT id, price FROM store_offers WHERE product_id = ? AND store = ?').get(original.id, offer.store);

      if (!existing) {
        // Move offer to original
        db.prepare('UPDATE store_offers SET product_id = ? WHERE id = ?').run(original.id, offer.id);
        console.log(`  Merged: "${split.name}" ${offer.store}:${offer.price} -> product ${original.id}`);
        mergedCount++;
      } else {
        // Original already has this store - delete the duplicate offer
        db.prepare('DELETE FROM store_offers WHERE id = ?').run(offer.id);
      }
    }

    // Move price history
    db.prepare('UPDATE price_history SET product_id = ? WHERE product_id = ?').run(original.id, split.id);

    // Delete the split product
    db.prepare('DELETE FROM products WHERE id = ?').run(split.id);
    deletedCount++;
  }
});

mergeTransaction();

// Stats
const total = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
const multi = db.prepare(`
  SELECT COUNT(*) as cnt FROM products p
  WHERE (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) >= 2
`).get();

console.log(`\n=== Fix Complete ===`);
console.log(`Offers merged back: ${mergedCount}`);
console.log(`Duplicate products deleted: ${deletedCount}`);
console.log(`Total products: ${total.cnt}`);
console.log(`Multi-store: ${multi.cnt}`);
