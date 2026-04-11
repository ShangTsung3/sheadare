const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SERVER = 'https://gamige.com';

const STORES = [
  { name: 'Nikora', slug: 'nikora-test-tbi', source: 'nikora' },
  { name: 'Fresco', slug: 'fresco-tbi', source: 'fresco' },
  { name: 'Magniti', slug: 'magniti-tbi', source: 'magniti' },
];

async function scrapeStore(browser, store) {
  console.log(`\n=== ${store.name.toUpperCase()} ===`);
  const page = await browser.newPage();
  await page.goto(`https://glovoapp.com/en/ge/tbilisi/stores/${store.slug}/`, { waitUntil: 'networkidle2', timeout: 45000 });
  
  // Scroll to load all products
  let lastHeight = 0;
  for (let i = 0; i < 100; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise(r => setTimeout(r, 1200));
    const height = await page.evaluate(() => document.body.scrollHeight);
    const count = await page.evaluate(() => document.querySelectorAll('[class*=ItemTile_itemTile]').length);
    if (i % 15 === 0) console.log(`  Scroll ${i} | products: ${count} | height: ${height}`);
    if (height === lastHeight && i > 15) break;
    lastHeight = height;
  }
  
  // Extract products
  const products = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('[class*=ItemTile_itemTile]').forEach(el => {
      const name = el.querySelector('[class*=ItemTile_title]')?.textContent?.trim();
      const priceEl = el.querySelector('[class*=ItemTile_discountedPrice], [class*=ItemTile_price]');
      const priceText = priceEl?.textContent?.trim();
      const img = el.querySelector('img')?.src || '';
      if (name && priceText) {
        const price = parseFloat(priceText.replace('₾','').replace(',','.'));
        if (price > 0) items.push({ name, price, img });
      }
    });
    return items;
  });
  
  // Deduplicate
  const seen = new Set();
  const clean = products.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
  
  console.log(`  ${store.name} total: ${clean.length} unique products`);
  
  // Save locally
  fs.writeFileSync(`glovo-${store.source}-products.json`, JSON.stringify(clean, null, 2));
  
  // Upload to server
  if (clean.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < clean.length; i += BATCH) {
      const batch = clean.slice(i, i + BATCH).map(p => ({
        external_id: `${store.source}-glovo-${p.name.replace(/\s+/g, '-').substring(0, 50)}`,
        name: p.name,
        price: p.price,
        image_url: p.img || undefined,
        url: `https://glovoapp.com/en/ge/tbilisi/stores/${store.slug}/`,
        in_stock: true,
      }));
      try {
        const res = await fetch(`${SERVER}/api/admin/import-products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store: store.name, source: store.source, products: batch }),
        });
        const data = await res.json();
        console.log(`  Upload batch ${Math.floor(i/BATCH)+1}: ${data.imported || 0} imported`);
      } catch (err) {
        console.log(`  Upload failed: ${err.message}`);
      }
    }
  }
  
  await page.close();
  return clean.length;
}

async function main() {
  console.log('Starting Glovo scraper...');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  let total = 0;
  for (const store of STORES) {
    try {
      total += await scrapeStore(browser, store);
    } catch (err) {
      console.log(`  ${store.name} ERROR: ${err.message}`);
    }
  }
  
  await browser.close();
  console.log(`\nDone! Total: ${total} products from ${STORES.length} stores`);
}

main();
