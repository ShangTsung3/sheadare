const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SERVER = 'https://gamige.com';

// All working Glovo stores
const STORES = [
  { name: 'SPAR', slug: 'spar-tbi', source: 'spar-glovo' },
  { name: 'Smart', slug: 'smart-tbi', source: 'smart' },
  { name: 'Naturali', slug: 'naturali-tbi', source: 'naturali' },
  { name: 'Magniti', slug: 'magniti-tbi', source: 'magniti' },  // retry full
  { name: 'Libre', slug: 'libre-tbi', source: 'libre-glovo' },  // more products than website
];

async function scrapeStore(browser, store) {
  console.log(`\n=== ${store.name.toUpperCase()} ===`);
  const page = await browser.newPage();
  const allProducts = new Map();

  try {
    await page.goto(`https://glovoapp.com/en/ge/tbilisi/stores/${store.slug}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 3000));

    // Get categories
    const categories = await page.evaluate(() => {
      const cats = [];
      document.querySelectorAll('[class*=SectionHeader], [class*=section-header], [class*=CategoryBar] a, nav a, [role=tab]').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 1 && text.length < 50 && !cats.find(c => c.text === text)) {
          cats.push({ text });
        }
      });
      return cats;
    });
    console.log(`  Found ${categories.length} categories`);

    // Scroll main page
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await new Promise(r => setTimeout(r, 1000));
      const h = await page.evaluate(() => document.body.scrollHeight);
      if (i > 5) { const h2 = await page.evaluate(() => document.body.scrollHeight); if (h === h2) break; }
    }

    let products = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('[class*=ItemTile_itemTile], [class*=itemTile]').forEach(el => {
        const name = el.querySelector('[class*=title], h3, h4')?.textContent?.trim();
        const priceEl = el.querySelector('[class*=discountedPrice], [class*=price]');
        const priceText = priceEl?.textContent?.trim();
        const img = el.querySelector('img')?.src || '';
        if (name && priceText && name.length > 2) {
          const price = parseFloat(priceText.replace('₾','').replace(',','.'));
          if (price > 0) items.push({ name, price, img });
        }
      });
      return items;
    });
    products.forEach(p => allProducts.set(p.name, p));
    console.log(`  Main page: ${allProducts.size} unique`);

    // Click each category
    for (const cat of categories) {
      try {
        const clicked = await page.evaluate((catText) => {
          const els = Array.from(document.querySelectorAll('a, button, [role=tab], [class*=Tab], [class*=category]'));
          const el = els.find(e => e.textContent?.trim() === catText);
          if (el) { el.click(); return true; }
          return false;
        }, cat.text);
        if (!clicked) continue;
        await new Promise(r => setTimeout(r, 2500));

        // Scroll in category
        for (let i = 0; i < 20; i++) {
          await page.evaluate(() => window.scrollBy(0, 1500));
          await new Promise(r => setTimeout(r, 800));
        }

        const catProducts = await page.evaluate(() => {
          const items = [];
          document.querySelectorAll('[class*=ItemTile_itemTile], [class*=itemTile]').forEach(el => {
            const name = el.querySelector('[class*=title], h3, h4')?.textContent?.trim();
            const priceEl = el.querySelector('[class*=discountedPrice], [class*=price]');
            const priceText = priceEl?.textContent?.trim();
            const img = el.querySelector('img')?.src || '';
            if (name && priceText && name.length > 2) {
              const price = parseFloat(priceText.replace('₾','').replace(',','.'));
              if (price > 0) items.push({ name, price, img });
            }
          });
          return items;
        });

        let newCount = 0;
        catProducts.forEach(p => { if (!allProducts.has(p.name)) { allProducts.set(p.name, p); newCount++; } });
        if (newCount > 0) console.log(`  ${cat.text}: +${newCount} (${allProducts.size} total)`);
      } catch {}
    }
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }

  const final = Array.from(allProducts.values());
  console.log(`  ${store.name} TOTAL: ${final.length}`);

  fs.writeFileSync(`glovo-${store.source}-full.json`, JSON.stringify(final, null, 2));

  // Upload
  if (final.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < final.length; i += BATCH) {
      const batch = final.slice(i, i + BATCH).map(p => ({
        external_id: `${store.source}-${p.name.replace(/[^a-zA-Z0-9\u10A0-\u10FF]/g, '-').substring(0, 60)}`,
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
        console.log(`  Upload batch ${Math.floor(i/BATCH)+1}: ${data.imported || 0}`);
      } catch (err) { console.log(`  Upload error: ${err.message}`); }
    }
  }

  await page.close();
  return final.length;
}

async function main() {
  console.log('Starting Glovo ALL stores scraper...');
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  let total = 0;
  for (const store of STORES) {
    try { total += await scrapeStore(browser, store); }
    catch (err) { console.log(`  ${store.name} FATAL: ${err.message}`); }
    // Brief pause between stores to avoid rate limiting
    await new Promise(r => setTimeout(r, 5000));
  }
  await browser.close();
  console.log(`\n=== DONE! Total: ${total} products ===`);
}

main();
