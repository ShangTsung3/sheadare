/**
 * One-time barcode deduplication script.
 * Merges products that share the same barcode into a single canonical record,
 * consolidating all store_offers under one product_id.
 *
 * Usage: npx tsx server/jobs/dedup-barcode.ts
 */

import Database from 'better-sqlite3';

const db = new Database('data/pricemap.db');
db.pragma('journal_mode = WAL');

interface ProductRow {
  id: number;
  name: string;
  barcode: string;
  source: string;
  image_url: string | null;
  size: string | null;
  category: string | null;
}

interface OfferRow {
  id: number;
  product_id: number;
  store: string;
  price: number;
  in_stock: number;
  url: string | null;
  last_seen_at: string | null;
}

// Find all barcodes shared by multiple product records
const sharedBarcodes = db.prepare(`
  SELECT barcode, COUNT(*) as cnt
  FROM products
  WHERE barcode IS NOT NULL AND barcode != ''
  GROUP BY barcode
  HAVING COUNT(*) > 1
`).all() as { barcode: string; cnt: number }[];

console.log(`Found ${sharedBarcodes.length} barcodes with duplicate product records\n`);

let mergedCount = 0;
let offersMovedCount = 0;
let productsRemovedCount = 0;

const mergeTransaction = db.transaction(() => {
  for (const { barcode } of sharedBarcodes) {
    // Get all products with this barcode
    const products = db.prepare(
      'SELECT id, name, barcode, source, image_url, size, category FROM products WHERE barcode = ? ORDER BY id ASC'
    ).all(barcode) as ProductRow[];

    if (products.length < 2) continue;

    // Pick canonical: prefer the one with most store_offers, then lowest id
    const withOfferCount = products.map(p => {
      const count = (db.prepare(
        'SELECT COUNT(*) as cnt FROM store_offers WHERE product_id = ?'
      ).get(p.id) as { cnt: number }).cnt;
      return { ...p, offerCount: count };
    });
    withOfferCount.sort((a, b) => b.offerCount - a.offerCount || a.id - b.id);

    const canonical = withOfferCount[0];
    const duplicates = withOfferCount.slice(1);

    for (const dup of duplicates) {
      // Move store_offers from duplicate to canonical
      const dupOffers = db.prepare(
        'SELECT * FROM store_offers WHERE product_id = ?'
      ).all(dup.id) as OfferRow[];

      for (const offer of dupOffers) {
        // Check if canonical already has an offer from this store
        const existing = db.prepare(
          'SELECT id FROM store_offers WHERE product_id = ? AND store = ?'
        ).get(canonical.id, offer.store) as { id: number } | undefined;

        if (!existing) {
          // Move the offer to canonical
          db.prepare(
            'UPDATE store_offers SET product_id = ? WHERE id = ?'
          ).run(canonical.id, offer.id);
          offersMovedCount++;
        } else {
          // Canonical already has this store's offer — delete duplicate's offer
          db.prepare('DELETE FROM store_offers WHERE id = ?').run(offer.id);
        }
      }

      // Move price_history from duplicate to canonical
      db.prepare(
        'UPDATE price_history SET product_id = ? WHERE product_id = ?'
      ).run(canonical.id, dup.id);

      // Update alerts referencing the duplicate
      db.prepare(
        'UPDATE alerts SET product_id = ? WHERE product_id = ?'
      ).run(canonical.id, dup.id);

      // Update favorites referencing the duplicate
      db.prepare(
        'DELETE FROM favorites WHERE product_id = ?'
      ).run(dup.id);

      // Delete the duplicate product record
      db.prepare('DELETE FROM products WHERE id = ?').run(dup.id);
      productsRemovedCount++;
    }

    // Fill in missing data on canonical from duplicates (image, size, category)
    if (!canonical.image_url) {
      const withImage = duplicates.find(d => d.image_url);
      if (withImage) {
        db.prepare('UPDATE products SET image_url = ? WHERE id = ?').run(withImage.image_url, canonical.id);
      }
    }
    if (!canonical.size) {
      const withSize = duplicates.find(d => d.size);
      if (withSize) {
        db.prepare('UPDATE products SET size = ? WHERE id = ?').run(withSize.size, canonical.id);
      }
    }
    if (!canonical.category) {
      const withCat = duplicates.find(d => d.category);
      if (withCat) {
        db.prepare('UPDATE products SET category = ? WHERE id = ?').run(withCat.category, canonical.id);
      }
    }

    mergedCount++;
  }
});

mergeTransaction();

// Stats after merge
const after3 = (db.prepare(`
  SELECT COUNT(*) as cnt FROM products p
  WHERE (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) = 3
`).get() as { cnt: number }).cnt;

const after2 = (db.prepare(`
  SELECT COUNT(*) as cnt FROM products p
  WHERE (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) >= 2
`).get() as { cnt: number }).cnt;

const totalProducts = (db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number }).cnt;

console.log('=== Deduplication Complete ===');
console.log(`Barcode groups merged: ${mergedCount}`);
console.log(`Store offers moved: ${offersMovedCount}`);
console.log(`Duplicate products removed: ${productsRemovedCount}`);
console.log();
console.log(`Total products now: ${totalProducts}`);
console.log(`Products in 2+ stores: ${after2}`);
console.log(`Products in all 3 stores: ${after3}`);
