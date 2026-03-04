import Database from 'better-sqlite3';
import { extractCanonicalKey } from '../services/electronics-matcher.js';

const db = new Database('./data/pricemap.db');

// Get all electronics products
const products = db.prepare(`SELECT id, name, canonical_key FROM products WHERE store_type = 'electronics'`).all() as any[];

console.log(`Recomputing canonical keys for ${products.length} products...`);

const update = db.prepare('UPDATE products SET canonical_key = ? WHERE id = ?');

let changed = 0;
let nulled = 0;

const recompute = db.transaction(() => {
  for (const p of products) {
    const newKey = extractCanonicalKey(p.name);
    if (newKey !== p.canonical_key) {
      update.run(newKey, p.id);
      changed++;
      if (!newKey) nulled++;
    }
  }
});

recompute();

console.log(`Done. ${changed} keys changed, ${nulled} became null.`);

// Now merge products that share the same canonical_key but are separate entries
// Find duplicate canonical_keys
const dupes = db.prepare(`
  SELECT canonical_key, GROUP_CONCAT(id) as ids, COUNT(*) as cnt
  FROM products
  WHERE canonical_key IS NOT NULL AND store_type = 'electronics'
  GROUP BY canonical_key
  HAVING cnt > 1
`).all() as any[];

console.log(`\nFound ${dupes.length} canonical keys with multiple product entries. Merging...`);

let merged = 0;
// For store_offers: move only if the target doesn't already have that store
const checkOffer = db.prepare('SELECT 1 FROM store_offers WHERE product_id = ? AND store = ?');
const moveOffer = db.prepare('UPDATE store_offers SET product_id = ? WHERE product_id = ? AND store = ?');
const deleteOffer = db.prepare('DELETE FROM store_offers WHERE product_id = ? AND store = ?');
const getOffersForProduct = db.prepare('SELECT store FROM store_offers WHERE product_id = ?');
const mergeHistory = db.prepare('UPDATE OR IGNORE price_history SET product_id = ? WHERE product_id = ?');
const deleteHistory = db.prepare('DELETE FROM price_history WHERE product_id = ?');
const deleteFavorites = db.prepare('DELETE FROM favorites WHERE product_id = ?');
const deleteAlerts = db.prepare('DELETE FROM alerts WHERE product_id = ?');
const deleteOffers = db.prepare('DELETE FROM store_offers WHERE product_id = ?');
const deleteStmt = db.prepare('DELETE FROM products WHERE id = ?');

// Extract model IDs from name for safety check
function extractModelIds(s: string): string[] {
  if (!s) return [];
  const lower = s.toLowerCase();
  const ids: string[] = [];
  const smCodes = lower.match(/sm[- ]?([a-z]\d{3,4}[a-z]?)/g);
  if (smCodes) ids.push(...smCodes.map((m: string) => m.replace(/[- ]/g, '')));
  const lgModels = lower.match(/(?:gr|gc|gw|f2v|f4v|wd|wm)[- ]?([a-z0-9]{4,})/g);
  if (lgModels) ids.push(...lgModels.map((m: string) => m.replace(/[- ]/g, '').slice(0, 8)));
  const asusModels = lower.match(/\b([a-z]\d{3,4}[a-z]{1,3})\b/g);
  if (asusModels) ids.push(...asusModels.filter((m: string) => m.length >= 6));
  return [...new Set(ids)];
}
function modelIdsOverlap(a: string[], b: string[]): boolean {
  for (const ai of a) { for (const bi of b) { if (ai === bi || ai.includes(bi) || bi.includes(ai)) return true; } }
  return false;
}
const getName = db.prepare('SELECT name FROM products WHERE id = ?');

const merge = db.transaction(() => {
  for (const dupe of dupes) {
    const ids = dupe.ids.split(',').map(Number);
    const keepId = ids[0];
    const keepName = (getName.get(keepId) as any)?.name || '';
    const keepModels = extractModelIds(keepName);

    for (let i = 1; i < ids.length; i++) {
      const removeId = ids[i];
      const removeName = (getName.get(removeId) as any)?.name || '';
      const removeModels = extractModelIds(removeName);

      // Safety: don't merge if model IDs conflict (e.g. GR-B589 vs GR-F589)
      if (keepModels.length > 0 && removeModels.length > 0 && !modelIdsOverlap(keepModels, removeModels)) {
        console.log(`  SKIP merge: "${keepName}" vs "${removeName}" (model mismatch)`);
        continue;
      }

      // Move offers that don't conflict
      const offers = getOffersForProduct.all(removeId) as any[];
      for (const o of offers) {
        if (!checkOffer.get(keepId, o.store)) {
          moveOffer.run(keepId, removeId, o.store);
        } else {
          deleteOffer.run(removeId, o.store);
        }
      }
      // Move/clean other references
      mergeHistory.run(keepId, removeId);
      deleteHistory.run(removeId);
      deleteFavorites.run(removeId);
      deleteAlerts.run(removeId);
      deleteOffers.run(removeId);
      deleteStmt.run(removeId);
      merged++;
    }
  }
});

merge();

console.log(`Merged ${merged} duplicate products.`);

// Final stats
const total = db.prepare(`SELECT COUNT(*) as c FROM products WHERE store_type = 'electronics'`).get() as any;
const matched = db.prepare(`
  SELECT COUNT(*) as c FROM (
    SELECT p.id FROM products p
    JOIN store_offers so ON so.product_id = p.id
    WHERE p.canonical_key IS NOT NULL
    GROUP BY p.id HAVING COUNT(DISTINCT so.store) >= 2
  )
`).get() as any;

console.log(`\nFinal: ${total.c} unique products, ${matched.c} matched across 2+ stores`);

// Sample new matches
const samples = db.prepare(`
  SELECT p.canonical_key, GROUP_CONCAT(DISTINCT so.store) as stores,
         MIN(so.price) as min_price, MAX(so.price) as max_price,
         COUNT(DISTINCT so.store) as cnt
  FROM products p JOIN store_offers so ON so.product_id = p.id
  WHERE p.canonical_key IS NOT NULL
  GROUP BY p.id HAVING cnt >= 2
  ORDER BY cnt DESC, (max_price - min_price) DESC
  LIMIT 25
`).all() as any[];

console.log('\nTop matches (most stores, biggest price diff):');
samples.forEach((s: any) => console.log(`  [${s.cnt}] ${s.canonical_key} -> ${s.stores} (${s.min_price}-${s.max_price})`));
