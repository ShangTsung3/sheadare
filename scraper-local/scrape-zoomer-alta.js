const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SERVER = 'https://gamige.com';
const PAGE_SIZE = 28;

async function scrapeStore(browser, config) {
  console.log(`\n=== ${config.name.toUpperCase()} ===`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Open first category page to get Cloudflare cookies
  console.log('Getting cookies...');
  await page.goto(config.categories[0].url, { waitUntil: 'networkidle2', timeout: 45000 });
  const title = await page.title();
  if (title.includes('moment')) {
    console.log('Cloudflare challenge detected, waiting...');
    await new Promise(r => setTimeout(r, 10000));
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  }
  console.log('Page loaded:', await page.title());

  const allProducts = [];
  const seen = new Set();

  for (const cat of config.categories) {
    let pageNum = 1;
    while (true) {
      try {
        const apiUrl = config.apiUrl(cat.id, pageNum, PAGE_SIZE);
        const result = await page.evaluate(async (url) => {
          const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
          if (!res.ok) return { error: res.status };
          return res.json();
        }, apiUrl);

        if (result.error) {
          console.log(`  ${cat.name} p${pageNum}: HTTP ${result.error}`);
          break;
        }

        const products = config.extractProducts(result);
        if (products.length === 0) break;

        let newCount = 0;
        for (const p of products) {
          const id = `${config.source}-${p.id}`;
          if (seen.has(id)) continue;
          seen.add(id);
          newCount++;
          allProducts.push({
            external_id: id,
            name: p.name,
            price: p.price,
            image_url: p.image,
            category: cat.name,
            url: config.productUrl(p),
            in_stock: true,
          });
        }

        console.log(`  ${cat.name} p${pageNum}: +${newCount} (${allProducts.length} total)`);

        const hasMore = config.hasNextPage(result, pageNum, PAGE_SIZE);
        if (!hasMore) break;
        pageNum++;
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.log(`  ${cat.name} p${pageNum}: error - ${err.message}`);
        break;
      }
    }
  }

  await page.close();
  console.log(`${config.name} total: ${allProducts.length}`);
  return allProducts;
}

const ZOOMER_CONFIG = {
  name: 'Zoomer',
  source: 'zoomer',
  categories: [
    { id: 855, name: 'ტელეფონები', url: 'https://zoommer.ge/mobiluri-telefonebi-c855' },
    { id: 877, name: 'ტაბლეტები', url: 'https://zoommer.ge/planshetebi-c877' },
    { id: 717, name: 'ლეპტოპები', url: 'https://zoommer.ge/leptopis-brendebi-c717' },
    { id: 505, name: 'ტელევიზორები', url: 'https://zoommer.ge/televizorebi-c505' },
    { id: 503, name: 'მონიტორები', url: 'https://zoommer.ge/monitorebi-c503' },
    { id: 463, name: 'გეიმინგი', url: 'https://zoommer.ge/gaming-c463' },
    { id: 528, name: 'აუდიო', url: 'https://zoommer.ge/audio-sistema-c528' },
    { id: 533, name: 'ყურსასმენები', url: 'https://zoommer.ge/yursasmenebi-c533' },
    { id: 873, name: 'სმარტ საათები', url: 'https://zoommer.ge/smart-saatebi-c873' },
    { id: 460, name: 'IT / საოფისე', url: 'https://zoommer.ge/it-c460' },
    { id: 495, name: 'სამზარეულო', url: 'https://zoommer.ge/samzareulo-c495' },
    { id: 490, name: 'პერსონალური მოვლა', url: 'https://zoommer.ge/tavis-movla-c490' },
  ],
  apiUrl: (catId, page, limit) => `/api/proxy/v1/Products/v3?CategoryId=${catId}&Page=${page}&Limit=${limit}`,
  extractProducts: (data) => (data.products || []).map(p => ({
    id: p.id || p.productId,
    name: p.name || '',
    price: p.price || p.finalPrice || 0,
    image: p.imageUrl || p.primaryImage || '',
    slug: p.slug || p.url || '',
  })).filter(p => p.price > 0),
  hasNextPage: (data, page, limit) => (data.productsCount || 0) > page * limit,
  productUrl: (p) => `https://zoommer.ge/p/${p.slug || p.id}`,
};

const ALTA_CONFIG = {
  name: 'Alta',
  source: 'alta',
  categories: [
    // Top-level categories — ყველა sub-კატეგორიის პროდუქტს მოიცავს
    { id: 1, name: 'მობილური და აქსესუარები', url: 'https://alta.ge/mobiluri-telefonebi-da-aqsesuarebi-c1' },
    { id: 2, name: 'კომპიუტერული ტექნიკა', url: 'https://alta.ge/kompiuteruli-teqnika-da-aqsesuarebi-c2' },
    { id: 3, name: 'ტელევიზორები და აუდიო', url: 'https://alta.ge/televizorebi-da-audio-sistemebi-c3' },
    { id: 4, name: 'გეიმინგი', url: 'https://alta.ge/geimingi-c4' },
    { id: 5, name: 'ფოტო და ვიდეო', url: 'https://alta.ge/foto-da-video-c5' },
    { id: 6, name: 'მსხვილი ტექნიკა', url: 'https://alta.ge/mskhvili-sayofackhovrebo-teqnika-c6' },
    { id: 7, name: 'წვრილი ტექნიკა', url: 'https://alta.ge/tsvrili-saojakho-teqnika-c7' },
    { id: 9, name: 'სახლის მოვლა', url: 'https://alta.ge/sakhlis-da-ezos-movla-c9' },
    { id: 10, name: 'თავის მოვლა', url: 'https://alta.ge/tavis-movla-c10' },
    { id: 11, name: 'ჭკვიანი სახლი', url: 'https://alta.ge/chkviani-sakhli-c11' },
  ],
  apiUrl: (catId, page, limit) => `https://api.alta.ge/v1/Products/v4?CategoryId=${catId}&Page=${page}&Limit=${limit}`,
  extractProducts: (data) => (data.products || []).map(p => ({
    id: p.id || p.productId,
    name: p.name || '',
    price: p.price || p.finalPrice || 0,
    image: p.imageUrl || p.primaryImage || '',
    slug: p.slug || p.url || '',
  })).filter(p => p.price > 0),
  hasNextPage: (data, page, limit) => data.hasNextPage === true || (data.productsCount || 0) > page * limit,
  productUrl: (p) => `https://alta.ge/p/${p.slug || p.id}`,
};

async function main() {
  console.log('Starting local scraper...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  try {
    // Zoomer
    const zoomerProducts = await scrapeStore(browser, ZOOMER_CONFIG);
    const zoomerFile = path.join(__dirname, 'zoomer-products.json');
    fs.writeFileSync(zoomerFile, JSON.stringify(zoomerProducts));
    console.log(`Saved ${zoomerProducts.length} Zoomer products to ${zoomerFile}`);

    // Alta
    const altaProducts = await scrapeStore(browser, ALTA_CONFIG);
    const altaFile = path.join(__dirname, 'alta-products.json');
    fs.writeFileSync(altaFile, JSON.stringify(altaProducts));
    console.log(`Saved ${altaProducts.length} Alta products to ${altaFile}`);

    // Upload to server
    for (const [store, file] of [['Zoomer', zoomerFile], ['Alta', altaFile]]) {
      const products = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (products.length === 0) continue;
      console.log(`\nUploading ${products.length} ${store} products...`);
      try {
        const res = await fetch(`${SERVER}/api/admin/import-products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store, source: store.toLowerCase(), products }),
        });
        const data = await res.json();
        console.log(`${store}:`, data);
      } catch (err) {
        console.log(`${store} upload failed:`, err.message);
      }
    }
  } finally {
    await browser.close();
  }
  console.log('\nDone!');
}

main();
