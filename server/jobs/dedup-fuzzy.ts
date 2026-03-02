/**
 * Fuzzy name-based deduplication for products with different barcodes.
 * Matches products across stores by normalizing names and comparing key tokens.
 *
 * Usage: npx tsx server/jobs/dedup-fuzzy.ts
 */

import Database from 'better-sqlite3';

const db = new Database('data/pricemap.db');
db.pragma('journal_mode = WAL');

interface ProductRow {
  id: number;
  name: string;
  barcode: string;
  size: string | null;
  category: string | null;
  image_url: string | null;
}

interface OfferRow {
  store: string;
}

/**
 * Normalize a product name for fuzzy comparison:
 * - Lowercase
 * - Strip all delimiters: / " " " , - ( )
 * - Normalize spaces
 * - Strip trailing Georgian suffix ი from words
 * - Normalize decimals: , -> .
 * - Remove common category prefixes
 */
function normalize(name: string): string {
  let n = name.toLowerCase();
  // Strip delimiters
  n = n.replace(/[\/\"""'',\-\(\)\.]/g, ' ');
  // Normalize whitespace
  n = n.replace(/\s+/g, ' ').trim();
  // Remove common category prefixes
  const prefixes = ['გაზ სასმელი', 'მინ წყალი', 'მინერალური წყალი', 'წყალი მინერალური'];
  for (const p of prefixes) {
    if (n.startsWith(p)) n = n.slice(p.length).trim();
  }
  return n;
}

/** Extract size from product name or size field */
function extractSize(name: string, sizeField: string | null): string {
  const text = (name + ' ' + (sizeField || '')).toLowerCase();
  // Match patterns like: 0.5ლ, 0,5ლ, 500მლ, 500გრ, 1კგ, 1ლ, 330მლ, etc.
  const match = text.match(/(\d+[.,]?\d*)\s*(ლ|ლიტრი|მლ|გრ|კგ|ც)/);
  if (!match) return '';
  let val = parseFloat(match[1].replace(',', '.'));
  const unit = match[2];
  // Normalize to base units
  if (unit === 'მლ') { val = val / 1000; return val + 'ლ'; }
  if (unit === 'გრ' && val >= 1000) { return (val / 1000) + 'კგ'; }
  return val + unit;
}

/** Extract brand-like tokens (words > 2 chars, not common words) */
function extractTokens(normalized: string): string[] {
  const stopWords = new Set([
    'და', 'ან', 'ის', 'ში', 'ით', 'ზე', 'ის', 'ად',
    'ქილა', 'შუშა', 'პეტი', 'პეტ', 'ბოთლი',
    'ღია', 'ფერის', 'მუქი', 'შავი', 'თეთრი',
    'შეფუთვით', 'მუყაოს', 'რძიანი',
  ]);

  return normalized
    .split(' ')
    .map(w => w.replace(/ი$/, '')) // Strip trailing ი
    .filter(w => w.length > 2 && !stopWords.has(w) && !/^\d/.test(w));
}

/** Check if two token sets are similar enough (Jaccard-like) */
function tokenSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let shared = 0;
  for (const t of setA) {
    // Check exact match or substring match
    for (const u of setB) {
      if (t === u || (t.length >= 3 && u.length >= 3 && (t.includes(u) || u.includes(t)))) {
        shared++;
        break;
      }
    }
  }
  return shared / Math.max(setA.size, setB.size);
}

// Get all products with their stores
const allProducts = db.prepare(`
  SELECT p.id, p.name, p.barcode, p.size, p.category, p.image_url
  FROM products p
  WHERE EXISTS (SELECT 1 FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1)
`).all() as ProductRow[];

// Build store map for each product
const storesOf = new Map<number, Set<string>>();
for (const p of allProducts) {
  const offers = db.prepare('SELECT store FROM store_offers WHERE product_id = ? AND in_stock = 1').all(p.id) as OfferRow[];
  storesOf.set(p.id, new Set(offers.map(o => o.store)));
}

// Group products by store count
const singleStore = allProducts.filter(p => (storesOf.get(p.id)?.size || 0) === 1);
const multiStore = allProducts.filter(p => (storesOf.get(p.id)?.size || 0) >= 2);

console.log(`Single-store products: ${singleStore.length}`);
console.log(`Multi-store products: ${multiStore.length}`);

// Pre-compute normalized data
const normCache = new Map<number, { norm: string; size: string; tokens: string[] }>();
for (const p of allProducts) {
  const norm = normalize(p.name);
  normCache.set(p.id, {
    norm,
    size: extractSize(p.name, p.size),
    tokens: extractTokens(norm),
  });
}

let mergedCount = 0;
let offersMovedCount = 0;

const mergeTransaction = db.transaction(() => {
  // For each single-store product, try to find a match in multi-store or other single-store products
  const processed = new Set<number>();

  for (const product of singleStore) {
    if (processed.has(product.id)) continue;

    const myStores = storesOf.get(product.id)!;
    const myData = normCache.get(product.id)!;
    if (myData.tokens.length < 1) continue;

    let bestMatch: { id: number; score: number } | null = null;

    // Search among ALL other products that have at LEAST one store we're missing
    for (const candidate of allProducts) {
      if (candidate.id === product.id) continue;
      if (processed.has(candidate.id)) continue;

      const candStores = storesOf.get(candidate.id)!;
      // Must have a store we don't have
      let hasNew = false;
      for (const s of candStores) {
        if (!myStores.has(s)) { hasNew = true; break; }
      }
      if (!hasNew) continue;

      const candData = normCache.get(candidate.id)!;

      // Size must match (if both have sizes)
      if (myData.size && candData.size && myData.size !== candData.size) continue;

      // Token similarity - require high threshold (0.85) to avoid false merges
      // Size MUST match if both have sizes
      const sim = tokenSimilarity(myData.tokens, candData.tokens);
      if (sim >= 0.85 && (!bestMatch || sim > bestMatch.score)) {
        bestMatch = { id: candidate.id, score: sim };
      }
    }

    if (bestMatch) {
      // Merge: move offers from product to bestMatch (or vice versa, pick the one with more offers)
      const matchStores = storesOf.get(bestMatch.id)!;
      const canonicalId = matchStores.size >= myStores.size ? bestMatch.id : product.id;
      const duplicateId = canonicalId === product.id ? bestMatch.id : product.id;

      const dupOffers = db.prepare('SELECT * FROM store_offers WHERE product_id = ?').all(duplicateId) as any[];

      for (const offer of dupOffers) {
        const existing = db.prepare('SELECT id FROM store_offers WHERE product_id = ? AND store = ?').get(canonicalId, offer.store);
        if (!existing) {
          db.prepare('UPDATE store_offers SET product_id = ? WHERE id = ?').run(canonicalId, offer.id);
          offersMovedCount++;
          // Update in-memory store set
          storesOf.get(canonicalId)!.add(offer.store);
        } else {
          db.prepare('DELETE FROM store_offers WHERE id = ?').run(offer.id);
        }
      }

      // Move price_history
      db.prepare('UPDATE price_history SET product_id = ? WHERE product_id = ?').run(canonicalId, duplicateId);
      // Clean up alerts/favorites
      db.prepare('UPDATE OR IGNORE alerts SET product_id = ? WHERE product_id = ?').run(canonicalId, duplicateId);
      db.prepare('DELETE FROM alerts WHERE product_id = ?').run(duplicateId);
      db.prepare('DELETE FROM favorites WHERE product_id = ?').run(duplicateId);
      // Delete duplicate
      db.prepare('DELETE FROM products WHERE id = ?').run(duplicateId);

      processed.add(duplicateId);
      mergedCount++;
    }
  }
});

mergeTransaction();

// Stats
const after3 = (db.prepare(`
  SELECT COUNT(*) as cnt FROM products p
  WHERE (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) = 3
`).get() as { cnt: number }).cnt;

const after2 = (db.prepare(`
  SELECT COUNT(*) as cnt FROM products p
  WHERE (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) >= 2
`).get() as { cnt: number }).cnt;

const totalProducts = (db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number }).cnt;

console.log('\n=== Fuzzy Deduplication Complete ===');
console.log(`Products merged: ${mergedCount}`);
console.log(`Store offers moved: ${offersMovedCount}`);
console.log();
console.log(`Total products now: ${totalProducts}`);
console.log(`Products in 2+ stores: ${after2}`);
console.log(`Products in all 3 stores: ${after3}`);
