const Database = require('better-sqlite3');
const db = new Database('data/pricemap.db');

console.log('=== BARCODE MERGE ===\n');

const newStores = ['Nikora', 'Fresco', 'Naturali', 'Magniti', 'Smart'];

// Step 1: Extract barcodes from product names (Fresco has barcode in name)
const newProducts = db.prepare(`
  SELECT p.id, p.name, so.store, so.price, so.url
  FROM products p JOIN store_offers so ON so.product_id = p.id
  WHERE so.store IN (${newStores.map(() => '?').join(',')}) AND so.in_stock = 1 AND so.price > 0
`).all(...newStores);

console.log(`New store products: ${newProducts.length}`);

// Step 2: Get existing products WITH barcodes
const existingWithBarcode = db.prepare(`
  SELECT p.id, p.name, p.barcode, GROUP_CONCAT(DISTINCT so.store) as stores
  FROM products p JOIN store_offers so ON so.product_id = p.id
  WHERE p.barcode IS NOT NULL AND p.barcode != '' AND p.barcode != 'null'
    AND so.in_stock = 1 AND p.store_type = 'grocery'
  GROUP BY p.id
`).all();

// Build barcode index
const barcodeIndex = new Map();
for (const p of existingWithBarcode) {
  const bc = p.barcode.trim();
  if (bc.length >= 6) barcodeIndex.set(bc, p);
}
console.log(`Existing products with barcodes: ${barcodeIndex.size}`);

// Step 3: Try to match by barcode
const addOffer = db.prepare('INSERT OR REPLACE INTO store_offers (product_id, store, price, url, in_stock, last_seen_at) VALUES (?, ?, ?, ?, 1, datetime(\'now\'))');
const deleteOffer = db.prepare('DELETE FROM store_offers WHERE product_id = ? AND store = ?');

let mergedByBarcode = 0;
let mergedByName = 0;
let noMatch = 0;

const tx = db.transaction(() => {
  for (const np of newProducts) {
    let matched = false;

    // Try 1: Extract barcode from product name (Fresco format: "054881005845 ჩაი შავი...")
    const barcodeInName = np.name.match(/^(\d{6,14})\s/);
    if (barcodeInName) {
      const bc = barcodeInName[1];
      const existing = barcodeIndex.get(bc);
      if (existing) {
        // Price sanity check: within 5x range
        const existingPrices = db.prepare('SELECT MIN(price) as min, MAX(price) as max FROM store_offers WHERE product_id = ? AND in_stock = 1 AND price > 0').get(existing.id);
        if (existingPrices && np.price >= existingPrices.min * 0.2 && np.price <= existingPrices.max * 5) {
          addOffer.run(existing.id, np.store, np.price, np.url);
          deleteOffer.run(np.id, np.store);
          mergedByBarcode++;
          matched = true;
          if (mergedByBarcode <= 5) {
            console.log(`  BC MERGE: "${np.name.substring(0, 40)}" (${np.store}:${np.price}₾) → "${existing.name.substring(0, 40)}" (${existing.stores})`);
          }
        }
      }
    }

    if (matched) continue;

    // Try 2: Match by product barcode field (if new product somehow has barcode)
    // This won't work for Glovo products but keeping for completeness

    // Try 3: Fuzzy name match with size validation
    // Extract size from both names and only match if sizes are identical
    const npSize = extractSize(np.name);
    if (!npSize) { noMatch++; continue; }

    const npBrand = extractBrand(np.name);
    if (!npBrand) { noMatch++; continue; }

    // Find candidates with same brand
    const candidates = existingWithBarcode.filter(ep => {
      const epBrand = extractBrand(ep.name);
      const epSize = extractSize(ep.name);
      return epBrand === npBrand && epSize === npSize;
    });

    if (candidates.length === 1) {
      // Single match with exact brand + exact size = safe to merge
      const existing = candidates[0];
      const existingPrices = db.prepare('SELECT MIN(price) as min, MAX(price) as max FROM store_offers WHERE product_id = ? AND in_stock = 1 AND price > 0').get(existing.id);
      if (existingPrices && np.price >= existingPrices.min * 0.3 && np.price <= existingPrices.max * 3) {
        addOffer.run(existing.id, np.store, np.price, np.url);
        deleteOffer.run(np.id, np.store);
        mergedByName++;
        matched = true;
        if (mergedByName <= 5) {
          console.log(`  NAME MERGE: "${np.name.substring(0, 40)}" (${np.store}:${np.price}₾) → "${existing.name.substring(0, 40)}" (${existing.stores})`);
        }
      }
    }

    if (!matched) noMatch++;
  }
});

function extractSize(name) {
  const n = name.toLowerCase();
  const match = n.match(/(\d+(?:[.,]\d+)?)\s*(ლ|ლიტ|მლ|კგ|გრ|გ|ც)\b/);
  if (match) {
    let val = parseFloat(match[1].replace(',', '.'));
    let unit = match[2];
    if (unit === 'მლ') { val /= 1000; unit = 'ლ'; }
    if (unit === 'გ' || unit === 'გრ') { val /= 1000; unit = 'კგ'; }
    return `${val}${unit}`;
  }
  return '';
}

function extractBrand(name) {
  const n = name.toLowerCase().replace(/\s/g, '');
  const brands = [
    'კოკაკოლა', 'cocacola', 'პეპსი', 'pepsi', 'ფანტა', 'fanta', 'სპრაიტი', 'sprite',
    'ნესკაფე', 'nescafe', 'ნესტეა', 'nestea', 'ლიპტონი', 'lipton', 'აჰმადი', 'ahmad',
    'ტვინინგი', 'twinings', 'ბორჯომი', 'ნაბეღლავი', 'ბახმარო', 'ლიკანი', 'საირმე',
    'პარმალატი', 'parmalat', 'სანტე', 'სოფლისნობათი',
    'ბარამბო', 'barambo', 'ვიჩი', 'vichi', 'არვი',
    'ლეისი', 'lays', 'ჩითოსი', 'cheetos', 'დორიტოს', 'doritos', 'პრინგლსი', 'pringles',
    'რიტერსპორტი', 'rittersport', 'მილკა', 'milka', 'სნიკერსი', 'snickers',
    'მარსი', 'mars', 'ტვიქსი', 'twix', 'ბაუნტი', 'bounty', 'კიტკატი', 'kitkat',
    'ნუტელა', 'nutella', 'ნივეა', 'nivea', 'პალმოლივი', 'palmolive',
    'ოლეინა', 'oleina', 'იდეალი', 'ideal', 'პრეზიდენტი', 'president',
    'არლა', 'arla', 'ალპენ გოლდი', 'alpengold',
    'ფეირი', 'fairy', 'პერსილი', 'persil', 'ტაიდი', 'tide', 'ლენორი', 'lenor',
    'კოლგეითი', 'colgate', 'ორალბი', 'oralb', 'ჰედენშოულდერსი', 'headshoulders',
    'დოვე', 'dove', 'რექსონა', 'rexona', 'გილეტი', 'gillette',
    'ზეწარი', 'კრიალა', 'გემრიელი', 'ნიკორა', 'დილა', 'dila',
    'ჩირიო', 'cheerio', 'კელოგსი', 'kelloggs', 'დანონი', 'danone',
    'აქტივია', 'activia', 'კეფირი', 'მაწონი', 'არაჟანი',
    'ყინულა', 'ალტეპა', 'ბარნი', 'barni', 'ორეო', 'oreo',
    'მაკფა', 'makfa', 'ბარილა', 'barilla', 'რიჩმონდი', 'richmond',
    'გორილა', 'gorilla', 'ბერნი', 'burn', 'რედბული', 'redbull',
    'ჰაინცი', 'heinz', 'კნორი', 'knorr', 'მაგი', 'maggi',
    'ჯეკობსი', 'jacobs', 'ლავაცა', 'lavazza', 'ილი', 'illy',
    'მილკენი', 'milkeni', 'სულგუნი', 'იმერული',
    'ვაკე', 'ფრესკო', 'fresco',
  ];
  for (const brand of brands) {
    if (n.includes(brand)) return brand;
  }
  return '';
}

tx();

console.log(`\n=== Results ===`);
console.log(`  Merged by barcode: ${mergedByBarcode}`);
console.log(`  Merged by brand+size: ${mergedByName}`);
console.log(`  No match: ${noMatch}`);
console.log(`  Total: ${newProducts.length}`);

// Verify
const verify = db.prepare(`
  SELECT so.store, COUNT(DISTINCT so.product_id) as cnt
  FROM store_offers so JOIN products p ON p.id = so.product_id
  WHERE so.in_stock = 1 AND p.store_type = 'grocery'
  GROUP BY so.store ORDER BY cnt DESC
`).all();
console.log('\nStores after merge:');
verify.forEach(r => console.log(`  ${r.store}: ${r.cnt}`));

// Show products with most stores
const top = db.prepare(`
  SELECT p.name, COUNT(DISTINCT so.store) as stores
  FROM products p JOIN store_offers so ON so.product_id = p.id
  WHERE so.in_stock = 1 AND p.store_type = 'grocery'
  GROUP BY p.id HAVING stores >= 6 ORDER BY stores DESC LIMIT 5
`).all();
console.log('\nTop matched products:');
top.forEach(r => console.log(`  ${r.stores} stores | ${r.name}`));

db.close();
