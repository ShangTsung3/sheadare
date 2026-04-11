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
  { name: 'IOLI', slug: 'ioli-tbi', source: 'ioli' },
];

async function extractProducts(page) {
  return page.evaluate(() => {
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
}

async function scrollToBottom(page, maxScrolls = 60) {
  let lastHeight = 0;
  let stable = 0;
  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise(r => setTimeout(r, 1200));
    const height = await page.evaluate(() => document.body.scrollHeight);
    if (height === lastHeight) { stable++; if (stable > 5) break; }
    else stable = 0;
    lastHeight = height;
  }
}

async function scrapeStore(browser, store) {
  console.log(`\n=== ${store.name.toUpperCase()} ===`);
  const page = await browser.newPage();
  const allProducts = new Map(); // name -> product (dedup)

  try {
    await page.goto(`https://glovoapp.com/en/ge/tbilisi/stores/${store.slug}/`, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 3000));

    // Get category links/buttons
    const categories = await page.evaluate(() => {
      const cats = [];
      // Find category sections on the page
      document.querySelectorAll('[class*=SectionHeader], [class*=section-header], [class*=CategoryBar] a, [class*=category] a, [class*=CollectionBar] a').forEach(el => {
        const text = el.textContent?.trim();
        const href = el.getAttribute('href') || '';
        if (text && text.length > 1 && text.length < 50) {
          cats.push({ text, href });
        }
      });
      // Also try nav items
      document.querySelectorAll('nav a, [role=tab], [class*=Tab]').forEach(el => {
        const text = el.textContent?.trim();
        const href = el.getAttribute('href') || '';
        if (text && text.length > 1 && text.length < 50 && !cats.find(c => c.text === text)) {
          cats.push({ text, href });
        }
      });
      return cats;
    });

    console.log(`  Found ${categories.length} categories`);

    // First extract products from main page
    await scrollToBottom(page);
    let products = await extractProducts(page);
    products.forEach(p => allProducts.set(p.name, p));
    console.log(`  Main page: ${products.length} products (${allProducts.size} unique)`);

    // Now click each category and extract products
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      try {
        if (cat.href && cat.href.startsWith('http')) {
          await page.goto(cat.href, { waitUntil: 'networkidle2', timeout: 30000 });
        } else {
          // Click the category
          const clicked = await page.evaluate((catText) => {
            const els = Array.from(document.querySelectorAll('a, button, [role=tab]'));
            const el = els.find(e => e.textContent?.trim() === catText);
            if (el) { el.click(); return true; }
            return false;
          }, cat.text);
          if (!clicked) continue;
          await new Promise(r => setTimeout(r, 2000));
        }

        await scrollToBottom(page, 30);
        products = await extractProducts(page);
        let newCount = 0;
        products.forEach(p => { if (!allProducts.has(p.name)) { allProducts.set(p.name, p); newCount++; } });
        if (newCount > 0) console.log(`  ${cat.text}: +${newCount} new (${allProducts.size} total)`);
      } catch (err) {
        // Skip category errors
      }
    }
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }

  const finalProducts = Array.from(allProducts.values());
  console.log(`  ${store.name} TOTAL: ${finalProducts.length} unique products`);

  // Save locally
  fs.writeFileSync(`glovo-${store.source}-full.json`, JSON.stringify(finalProducts, null, 2));

  // Upload to server
  if (finalProducts.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < finalProducts.length; i += BATCH) {
      const batch = finalProducts.slice(i, i + BATCH).map(p => ({
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
        console.log(`  Upload batch ${Math.floor(i/BATCH)+1}: ${data.imported || 0} imported`);
      } catch (err) {
        console.log(`  Upload failed: ${err.message}`);
      }
    }
  }

  await page.close();
  return finalProducts.length;
}

async function main() {
  console.log('Starting Glovo FULL scraper (with categories)...');
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
      console.log(`  ${store.name} FATAL ERROR: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`\n=== DONE! Total: ${total} products from ${STORES.length} stores ===`);
}

main();
