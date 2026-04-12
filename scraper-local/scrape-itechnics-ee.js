const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SERVER = 'https://gamige.com';
const BATCH_SIZE = 1000;

// ============ iTechnics (WooCommerce Store API) ============
async function scrapeITechnics(browser) {
  console.log('\n=== iTECHNICS ===');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Loading itechnics.ge...');
  try {
    await page.goto('https://itechnics.ge/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    console.log('Initial load slow, waiting more...');
    await new Promise(r => setTimeout(r, 5000));
  }
  console.log('Page loaded:', await page.title());

  // Fetch all products via WooCommerce Store API (paginated, per_page=100)
  const allProducts = [];
  const seen = new Set();
  let pageNum = 1;

  while (true) {
    const url = `https://itechnics.ge/wp-json/wc/store/v1/products?per_page=100&page=${pageNum}`;
    const result = await page.evaluate(async (apiUrl) => {
      try {
        const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return { error: res.status };
        const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1');
        const total = parseInt(res.headers.get('X-WP-Total') || '0');
        const data = await res.json();
        return { data, totalPages, total };
      } catch (e) { return { error: e.message }; }
    }, url);

    if (result.error) {
      console.log(`  Page ${pageNum}: error ${result.error}`);
      break;
    }

    if (!result.data || result.data.length === 0) break;

    let newCount = 0;
    for (const woo of result.data) {
      const id = `itechnics-${woo.id}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const price = parseInt(woo.prices?.price, 10);
      if (!price || price <= 0) continue;
      if (!woo.name || !woo.name.trim()) continue;

      newCount++;
      allProducts.push({
        external_id: id,
        name: woo.name.trim(),
        price,
        category: woo.categories?.[0]?.name || '',
        image_url: woo.images?.[0]?.src || '',
        url: woo.permalink || '',
        in_stock: woo.is_in_stock !== false,
      });
    }

    console.log(`  Page ${pageNum}/${result.totalPages || '?'}: +${newCount} (${allProducts.length} total)`);

    if (pageNum >= (result.totalPages || 1)) break;
    pageNum++;
    await new Promise(r => setTimeout(r, 500));
  }

  await page.close();
  console.log(`iTechnics total: ${allProducts.length}`);
  return allProducts;
}

// ============ EE (Elite Electronics - Next.js) ============
const EE_CATEGORIES = [
  { slug: 'mobiluri-telefoni-c377t', label: 'მობილური ტელეფონი' },
  { slug: 'buds-c127t', label: 'Buds' },
  { slug: 'smart-watch-c147t', label: 'Smart Watch' },
  { slug: 'portatuli-damteni-c137t', label: 'პორტატული დამტენი' },
  { slug: 'televizori-c73t', label: 'ტელევიზორი' },
  { slug: 'headphones-c134t', label: 'Headphones' },
  { slug: 'saxlis-kinoteatri-da-saundbar-c189t', label: 'საუნდბარი' },
  { slug: 'macivari-c4t', label: 'მაცივარი' },
  { slug: 'sarecxi-manqana-c9t', label: 'სარეცხი მანქანა' },
  { slug: 'kondensirebuli-sashrobi-c12t', label: 'საშრობი' },
  { slug: 'chamontazhebuli-teqnika-c15t', label: 'ჩამონტაჟებული ტექნიკა' },
  { slug: 'kondicioneri-c71t', label: 'კონდიციონერი' },
  { slug: 'mtversasruti-c75t', label: 'მტვერსასრუტი' },
  { slug: 'yavis-aparati-c201t', label: 'ყავის აპარატი' },
  { slug: 'air-fryer-c195t', label: 'Air Fryer' },
  { slug: 'hair-styler-c108t', label: 'Hair Styler' },
  { slug: 'notebook-c58t', label: 'Notebook' },
  { slug: 'gaming-c333t', label: 'Gaming' },
  { slug: 'foto-da-video-c328t', label: 'ფოტო და ვიდეო' },
  { slug: 'aveji-c26t', label: 'ავეჯი' },
];

async function scrapeEE(browser) {
  console.log('\n=== EE (Elite Electronics) ===');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Loading ee.ge...');
  await page.goto('https://ee.ge/', { waitUntil: 'networkidle2', timeout: 45000 });
  const title = await page.title();
  if (title.includes('moment') || title.includes('Just')) {
    console.log('Cloudflare challenge detected, waiting...');
    await new Promise(r => setTimeout(r, 10000));
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  }
  console.log('Page loaded:', await page.title());

  const allProducts = [];
  const seen = new Set();

  for (const cat of EE_CATEGORIES) {
    let pageNum = 1;
    const ITEMS_PER_PAGE = 16;

    while (true) {
      try {
        const url = pageNum === 1
          ? `https://ee.ge/${cat.slug}`
          : `https://ee.ge/${cat.slug}?page=${pageNum}`;

        // Navigate to category page and extract __NEXT_DATA__
        const result = await page.evaluate(async (catUrl) => {
          try {
            const res = await fetch(catUrl, {
              headers: { 'Accept': 'text/html' },
            });
            if (!res.ok) return { error: res.status };
            const html = await res.text();

            // Extract __NEXT_DATA__
            const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
            if (!match) return { error: 'no __NEXT_DATA__' };

            const json = JSON.parse(match[1]);
            const pageProps = json?.props?.pageProps || {};
            const listingData = pageProps.initialListingData || pageProps.listingData || {};
            return {
              products: listingData.products || [],
              totalCount: listingData.productsCount || 0,
            };
          } catch (e) { return { error: e.message }; }
        }, url);

        if (result.error) {
          console.log(`  ${cat.label} p${pageNum}: error ${result.error}`);
          break;
        }

        if (!result.products || result.products.length === 0) break;

        let newCount = 0;
        for (const p of result.products) {
          if (!p.name || !p.price || p.price <= 0) continue;
          if (p.disableBuyButton && !p.isPreOrderProduct) continue;

          const id = `ee-${p.id}`;
          if (seen.has(id)) continue;
          seen.add(id);
          newCount++;

          const imageUrl = p.imageUrl
            ? (p.imageUrl.startsWith('http') ? p.imageUrl : `https://static.ee.ge/Elite/${p.imageUrl}`)
            : '';

          allProducts.push({
            external_id: id,
            name: p.name.trim(),
            price: p.price,
            category: p.categoryName || cat.label,
            brand: p.brandName || '',
            image_url: imageUrl,
            url: p.route ? `https://ee.ge/${p.route}` : '',
            in_stock: (p.storageQuantity || 0) > 0,
          });
        }

        const totalPages = Math.ceil(result.totalCount / ITEMS_PER_PAGE);
        console.log(`  ${cat.label} p${pageNum}/${totalPages}: +${newCount} (${allProducts.length} total)`);

        if (pageNum >= totalPages || result.products.length === 0) break;
        pageNum++;
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.log(`  ${cat.label} p${pageNum}: error - ${err.message}`);
        break;
      }
    }
  }

  await page.close();
  console.log(`EE total: ${allProducts.length}`);
  return allProducts;
}

// ============ Upload helper ============
async function uploadProducts(store, source, products) {
  if (products.length === 0) { console.log(`${store}: no products to upload`); return; }

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    console.log(`Uploading ${store} batch ${Math.floor(i/BATCH_SIZE)+1} (${batch.length} products)...`);
    try {
      const res = await fetch(`${SERVER}/api/admin/import-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store, source, products: batch }),
      });
      const data = await res.json();
      console.log(`  ${store}:`, data);
    } catch (err) {
      console.log(`  ${store} upload failed:`, err.message);
    }
  }
}

// ============ Main ============
async function main() {
  console.log('Starting local scraper for iTechnics + EE...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  try {
    // iTechnics
    const itechnicsProducts = await scrapeITechnics(browser);
    fs.writeFileSync(path.join(__dirname, 'itechnics-products.json'), JSON.stringify(itechnicsProducts));
    console.log(`Saved ${itechnicsProducts.length} iTechnics products`);
    await uploadProducts('iTechnics', 'itechnics', itechnicsProducts);

    // EE
    const eeProducts = await scrapeEE(browser);
    fs.writeFileSync(path.join(__dirname, 'ee-products.json'), JSON.stringify(eeProducts));
    console.log(`Saved ${eeProducts.length} EE products`);
    await uploadProducts('EE', 'ee', eeProducts);

  } finally {
    await browser.close();
  }
  console.log('\nDone!');
}

main();
