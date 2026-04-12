const Database = require('better-sqlite3');
const db = new Database('data/pricemap.db');

console.log('=== SMART MERGE (strict, barcode-backed) ===\n');

const newStores = ['Nikora', 'Fresco', 'Naturali', 'Magniti', 'Smart'];

// Get unmatched new store products (single store only)
const unmatched = db.prepare(`
  SELECT p.id, p.name, so.store, so.price, so.url
  FROM products p JOIN store_offers so ON so.product_id = p.id
  WHERE so.store IN (${newStores.map(() => '?').join(',')}) AND so.in_stock = 1 AND so.price > 0
    AND (SELECT COUNT(DISTINCT so2.store) FROM store_offers so2 WHERE so2.product_id = p.id AND so2.in_stock = 1) = 1
`).all(...newStores);

console.log(`Unmatched products to process: ${unmatched.length}`);

// Get ALL barcode products (our golden standard)
const barcoded = db.prepare(`
  SELECT p.id, p.name, p.barcode, GROUP_CONCAT(DISTINCT so.store) as stores,
    MIN(so.price) as min_price, MAX(so.price) as max_price
  FROM products p JOIN store_offers so ON so.product_id = p.id
  WHERE p.barcode IS NOT NULL AND p.barcode != '' AND length(p.barcode) > 5
    AND so.in_stock = 1 AND p.store_type = 'grocery'
  GROUP BY p.id
`).all();

console.log(`Golden barcode products: ${barcoded.length}`);

// === TOKENIZER ===
// Stop words that don't help matching
const STOP_WORDS = new Set(['და', 'ან', 'რომ', 'ეს', 'იმ', 'მაგ', 'ყველ', 'ნებისმიერ',
  'ახალ', 'ძველ', 'ახ', 'პროდ', 'ნაწარმ', 'საქონ', 'პრემიუმ',
  'იმპ', 'ექსპ', 'ქარ', 'უცხ', 'ადგ', 'კატ', 'ხარისხ']);

function tokenize(name) {
  return name.toLowerCase()
    .replace(/^\d{6,14}\s/, '') // Remove barcode prefix (Fresco)
    .replace(/[\/\-\.\,\(\)\[\]"'„"«»:;!?#%&@]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !/^\d+$/.test(w) && !STOP_WORDS.has(w))
    .map(w => {
      // Remove common Georgian suffixes for better matching
      if (w.length > 4) {
        w = w.replace(/ის$/, '').replace(/ით$/, '').replace(/ში$/, '');
      }
      return w;
    })
    .filter(w => w.length >= 3);
}

function extractSize(name) {
  const n = name.toLowerCase();
  // Try multiple patterns
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(ლ)\b/,
    /(\d+(?:[.,]\d+)?)\s*(მლ)\b/,
    /(\d+(?:[.,]\d+)?)\s*(კგ)\b/,
    /(\d+(?:[.,]\d+)?)\s*(გრ)\b/,
    /(\d+(?:[.,]\d+)?)\s*(გ)\b/,
    /(\d+(?:[.,]\d+)?)\s*(ც)\b/,
  ];
  for (const p of patterns) {
    const match = n.match(p);
    if (match) {
      let val = parseFloat(match[1].replace(',', '.'));
      let unit = match[2];
      // Normalize to base units
      if (unit === 'მლ') { val /= 1000; unit = 'ლ'; }
      if (unit === 'გრ' || unit === 'გ') {
        if (val >= 1000) { val /= 1000; unit = 'კგ'; }
        else { unit = 'გ'; }
      }
      return { val: Math.round(val * 1000) / 1000, unit };
    }
  }
  return null;
}

function sizesMatch(s1, s2) {
  if (!s1 || !s2) return false;
  if (s1.unit !== s2.unit) return false;
  // Allow 5% tolerance for rounding (0.800 vs 0.8)
  const ratio = s1.val / s2.val;
  return ratio >= 0.95 && ratio <= 1.05;
}

// Build keyword index: token → [{product, tokens, size}]
console.log('Building keyword index...');
const productData = barcoded.map(bp => ({
  ...bp,
  tokens: tokenize(bp.name),
  size: extractSize(bp.name),
}));

const keywordIndex = new Map();
for (const pd of productData) {
  for (const t of pd.tokens) {
    if (!keywordIndex.has(t)) keywordIndex.set(t, []);
    keywordIndex.get(t).push(pd);
  }
}
console.log(`Index: ${keywordIndex.size} unique keywords\n`);

// === MATCHING ===
const addOffer = db.prepare('INSERT OR REPLACE INTO store_offers (product_id, store, price, url, in_stock, last_seen_at) VALUES (?, ?, ?, ?, 1, datetime(\'now\'))');
const deleteOffer = db.prepare('DELETE FROM store_offers WHERE product_id = ? AND store = ?');

let merged = 0;
let skippedAmbiguous = 0;
let skippedNoSize = 0;
let skippedPriceMismatch = 0;
let noMatch = 0;
const examples = [];
const wrongExamples = [];

const tx = db.transaction(() => {
  for (const np of unmatched) {
    const npTokens = tokenize(np.name);
    const npSize = extractSize(np.name);

    if (npTokens.length < 2) { noMatch++; continue; }

    // Score each candidate by keyword overlap
    const candidateScores = new Map();
    for (const token of npTokens) {
      const matches = keywordIndex.get(token) || [];
      for (const m of matches) {
        candidateScores.set(m.id, (candidateScores.get(m.id) || 0) + 1);
      }
    }

    // Find candidates with high overlap
    const goodCandidates = [];
    for (const [id, score] of candidateScores) {
      const pd = productData.find(p => p.id === id);
      if (!pd) continue;

      const maxTokens = Math.max(npTokens.length, pd.tokens.length);
      const minTokens = Math.min(npTokens.length, pd.tokens.length);
      const overlap = score / maxTokens;
      const overlapMin = score / minTokens; // At least half of shorter name matches

      if (overlap >= 0.5 || (overlapMin >= 0.7 && score >= 3)) {
        goodCandidates.push({ pd, score, overlap, overlapMin });
      }
    }

    if (goodCandidates.length === 0) { noMatch++; continue; }

    // Sort by score descending
    goodCandidates.sort((a, b) => b.score - a.score);
    const best = goodCandidates[0];

    // STRICT RULE 1: If top 2 candidates have similar scores → ambiguous, skip
    if (goodCandidates.length >= 2) {
      const second = goodCandidates[1];
      if (second.score >= best.score * 0.8) {
        // Check if they're the same product (same barcode)
        if (best.pd.barcode !== second.pd.barcode) {
          skippedAmbiguous++;
          continue;
        }
      }
    }

    // STRICT RULE 2: Size must match exactly
    if (npSize && best.pd.size) {
      if (!sizesMatch(npSize, best.pd.size)) {
        skippedNoSize++;
        continue;
      }
    }

    // STRICT RULE 3: Price must be within 2x range
    if (best.pd.min_price > 0) {
      const ratio = np.price / best.pd.min_price;
      if (ratio < 0.4 || ratio > 2.5) {
        skippedPriceMismatch++;
        continue;
      }
    }

    // STRICT RULE 4: Minimum 3 matching keywords
    if (best.score < 3 && best.overlap < 0.7) {
      noMatch++;
      continue;
    }

    // MERGE!
    addOffer.run(best.pd.id, np.store, np.price, np.url);
    deleteOffer.run(np.id, np.store);
    merged++;

    if (examples.length < 20) {
      examples.push({
        new: np.name.substring(0, 50),
        store: np.store,
        price: np.price,
        match: best.pd.name.substring(0, 50),
        matchStores: best.pd.stores,
        score: best.score,
        overlap: best.overlap.toFixed(2),
      });
    }
  }
});

tx();

console.log(`=== RESULTS ===`);
console.log(`  ✅ Merged: ${merged}`);
console.log(`  ⏭️ Skipped (ambiguous, 2+ candidates): ${skippedAmbiguous}`);
console.log(`  ⏭️ Skipped (size mismatch): ${skippedNoSize}`);
console.log(`  ⏭️ Skipped (price mismatch): ${skippedPriceMismatch}`);
console.log(`  ❌ No match: ${noMatch}`);
console.log(`  Total: ${unmatched.length}`);

console.log(`\n=== EXAMPLES (verify these are correct!) ===`);
examples.forEach(e => {
  console.log(`  ${e.store}:${e.price}₾ | "${e.new}" → "${e.match}" (${e.matchStores}) [score:${e.score}, overlap:${e.overlap}]`);
});

// Final stats
const topProducts = db.prepare(`
  SELECT p.name, COUNT(DISTINCT so.store) as stores, GROUP_CONCAT(DISTINCT so.store) as store_list
  FROM products p JOIN store_offers so ON so.product_id = p.id
  WHERE so.in_stock = 1 AND p.store_type = 'grocery'
  GROUP BY p.id HAVING stores >= 5 ORDER BY stores DESC LIMIT 10
`).all();
console.log(`\n=== TOP MATCHED PRODUCTS ===`);
topProducts.forEach(r => console.log(`  ${r.stores} stores | ${r.name.substring(0, 50)} | ${r.store_list}`));

const storeStats = db.prepare(`
  SELECT so.store, COUNT(DISTINCT so.product_id) as cnt
  FROM store_offers so JOIN products p ON p.id = so.product_id
  WHERE so.in_stock = 1 AND p.store_type = 'grocery'
  GROUP BY so.store ORDER BY cnt DESC
`).all();
console.log(`\n=== STORE STATS ===`);
storeStats.forEach(r => console.log(`  ${r.store}: ${r.cnt}`));

db.close();
