const Database = require('better-sqlite3');
const db = new Database('data/pricemap.db');

// Common brand keywords to extract
const BRANDS = [
  'კოკა კოლა', 'კოკაკოლა', 'coca cola', 'პეპსი', 'pepsi', 'ფანტა', 'fanta', 'სპრაიტი', 'sprite',
  'ნესკაფე', 'nescafe', 'ნესტეა', 'nestea', 'ლიპტონი', 'lipton',
  'ბორჯომი', 'ნაბეღლავი', 'ბახმარო', 'ლიკანი', 'საირმე',
  'პარმალატი', 'parmalat', 'სანტე', 'sante', 'სოფლის ნობათი',
  'ბარამბო', 'barambo', 'ორჯინალ', 'original',
  'ვიჩი', 'vichi', 'არვი', 'ტაბერა', 'tabera',
  'ლეისი', 'lays', 'ჩითოსი', 'cheetos', 'დორიტოს', 'doritos',
  'რიტერ სპორტი', 'ritter sport', 'მილკა', 'milka', 'სნიკერსი', 'snickers',
  'ნიქორა', 'nikora', 'კარტოფილი', 'ბანანი', 'ვაშლი', 'პომიდორი', 'კიტრი',
  'კარაქი', 'მაწონი', 'რძე', 'კვერცხი', 'ყველი', 'პური',
  'ზეთი', 'შაქარი', 'მარილი', 'ბრინჯი', 'მაკარონი', 'ფქვილი',
  'არაჟანი', 'ხაჭო', 'მატსონი',
];

// Normalize product name for matching
function normalize(name) {
  let n = name.toLowerCase()
    .replace(/[\/\-\(\)\[\]"'„"«»]/g, ' ')  // remove punctuation
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Expand common abbreviations
  n = n.replace(/\bგაზ\b/g, 'გაზიანი')
    .replace(/\bსასმ\b/g, 'სასმელი')
    .replace(/\bმინ\b/g, 'მინერალური')
    .replace(/\bშოკ\b/g, 'შოკოლადი')
    .replace(/\bდაფ\b/g, 'დაფქული')
    .replace(/\bკარ\b/g, 'კარამელი')
    .replace(/\bმარ\b/g, 'მარწყვი')
    .replace(/\bსვ\b/g, 'სველი')
    .replace(/\bხელს\b/g, 'ხელსახოცი')
    .replace(/\bსუფ\b/g, 'სუფრის');

  return n;
}

// Extract volume/weight
function extractSize(name) {
  const n = name.toLowerCase();
  const match = n.match(/(\d+(?:[.,]\d+)?)\s*(ლ|ლიტ|მლ|კგ|გრ|გ|ც)\b/);
  if (match) {
    let val = parseFloat(match[1].replace(',', '.'));
    let unit = match[2];
    // Normalize to base unit
    if (unit === 'მლ') { val /= 1000; unit = 'ლ'; }
    if (unit === 'გ' || unit === 'გრ') { val /= 1000; unit = 'კგ'; }
    return `${val}${unit}`;
  }
  return '';
}

// Extract brand from name (space-insensitive)
function extractBrand(name) {
  const n = normalize(name).replace(/\s/g, '');
  for (const brand of BRANDS) {
    const brandNoSpace = brand.toLowerCase().replace(/\s/g, '');
    if (n.includes(brandNoSpace)) return brandNoSpace;
  }
  return '';
}

console.log('Starting product merge...');

// Get all new store products (single-store products from Glovo stores)
const newStores = ['Nikora', 'Fresco', 'Magniti', 'Smart', 'Naturali'];
const newProducts = db.prepare(`
  SELECT p.id, p.name, so.store, so.price, so.url
  FROM products p
  JOIN store_offers so ON so.product_id = p.id
  WHERE so.store IN (${newStores.map(() => '?').join(',')})
    AND so.in_stock = 1 AND so.price > 0
`).all(...newStores);

console.log(`Found ${newProducts.length} products from new stores`);

// Get existing products (multi-store or from original scrapers)
const existingProducts = db.prepare(`
  SELECT p.id, p.name, GROUP_CONCAT(DISTINCT so.store) as stores
  FROM products p
  JOIN store_offers so ON so.product_id = p.id
  WHERE so.store NOT IN (${newStores.map(() => '?').join(',')})
    AND so.in_stock = 1 AND so.price > 0 AND p.store_type = 'grocery'
  GROUP BY p.id
`).all(...newStores);

console.log(`Found ${existingProducts.length} existing products to match against`);

// Build index: brand+size → existing products
const index = new Map();
let indexed = 0;
for (const ep of existingProducts) {
  const brand = extractBrand(ep.name);
  const size = extractSize(ep.name);
  if (brand) {
    const key = size ? `${brand}|${size}` : `${brand}|*`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(ep);
    indexed++;
  }
}

console.log(`Index has ${index.size} brand+size combinations`);

// Try to merge new products into existing ones
let merged = 0;
let noMatch = 0;
const addOffer = db.prepare('INSERT OR REPLACE INTO store_offers (product_id, store, price, url, in_stock, last_seen_at) VALUES (?, ?, ?, ?, 1, datetime(\'now\'))');
const deleteOffer = db.prepare('DELETE FROM store_offers WHERE product_id = ? AND store = ?');

const tx = db.transaction(() => {
  for (const np of newProducts) {
    const brand = extractBrand(np.name);
    const size = extractSize(np.name);
    if (!brand) { noMatch++; continue; }

    const key = size ? `${brand}|${size}` : `${brand}|*`;
    let candidates = index.get(key);
    // Fallback: try brand-only match
    if (!candidates || candidates.length === 0) {
      candidates = index.get(`${brand}|*`);
    }
    // Try all sizes for this brand
    if (!candidates || candidates.length === 0) {
      candidates = [];
      for (const [k, v] of index) { if (k.startsWith(brand + '|')) candidates.push(...v); }
    }
    if (candidates.length === 0) { noMatch++; continue; }

    // Find best match by normalized name similarity
    let bestMatch = null;
    let bestScore = 0;
    const npNorm = normalize(np.name);

    for (const cand of candidates) {
      const candNorm = normalize(cand.name);
      // Count common words
      const npWords = new Set(npNorm.split(' ').filter(w => w.length > 2));
      const candWords = new Set(candNorm.split(' ').filter(w => w.length > 2));
      let common = 0;
      for (const w of npWords) { if (candWords.has(w)) common++; }
      const score = common / Math.max(npWords.size, candWords.size);
      if (score > bestScore) { bestScore = score; bestMatch = cand; }
    }

    if (bestMatch && bestScore >= 0.3) {
      // Merge: add offer from new store to existing product
      addOffer.run(bestMatch.id, np.store, np.price, np.url);
      // Remove offer from the separate product
      deleteOffer.run(np.id, np.store);
      merged++;
      if (merged <= 10) {
        console.log(`  MERGED: "${np.name}" (${np.store}:${np.price}₾) → "${bestMatch.name}" (${bestMatch.stores})`);
      }
    } else {
      noMatch++;
    }
  }
});
tx();

console.log(`\nResults:`);
console.log(`  Merged: ${merged}`);
console.log(`  No match: ${noMatch}`);
console.log(`  Total: ${newProducts.length}`);

// Verify
const verify = db.prepare(`
  SELECT so.store, COUNT(DISTINCT so.product_id) as cnt
  FROM store_offers so
  JOIN products p ON p.id = so.product_id
  WHERE so.in_stock = 1 AND p.store_type = 'grocery'
  GROUP BY so.store ORDER BY cnt DESC
`).all();
console.log('\nStores after merge:');
verify.forEach(r => console.log(`  ${r.store}: ${r.cnt}`));

db.close();
