import { initDb } from '../db/schema.js';
import { getDb, closeDb } from '../db/connection.js';
import { RateLimiter } from '../scrapers/rate-limiter.js';
import { SparScraper } from '../scrapers/spar-scraper.js';
import { NabijiScraper } from '../scrapers/nabiji-scraper.js';
import { GoodwillScraper } from '../scrapers/goodwill-scraper.js';
import { EuroproductScraper } from '../scrapers/europroduct-scraper.js';
import { ZoomerScraper } from '../scrapers/zoomer-scraper.js';
import { AltaScraper } from '../scrapers/alta-scraper.js';
import { KontaktScraper } from '../scrapers/kontakt-scraper.js';
import { MegatechnicaScraper } from '../scrapers/megatechnica-scraper.js';
import { MetroMartScraper } from '../scrapers/metromart-scraper.js';
import { PspScraper } from '../scrapers/psp-scraper.js';
import { GpcScraper } from '../scrapers/gpc-scraper.js';
import { AversiScraper } from '../scrapers/aversi-scraper.js';
import { GorgiaScraper } from '../scrapers/gorgia-scraper.js';
import { GoodbuildScraper } from '../scrapers/goodbuild-scraper.js';
import { ImartScraper } from '../scrapers/imart-scraper.js';
import { AgrohubScraper } from '../scrapers/agrohub-scraper.js';
import { LibreScraper } from '../scrapers/libre-scraper.js';
import { GeorgitaScraper } from '../scrapers/georgita-scraper.js';
import { TechnoBoomScraper } from '../scrapers/technoboom-scraper.js';
import { ITechnicsScraper } from '../scrapers/itechnics-scraper.js';
import { MyTechnicaScraper } from '../scrapers/mytechnica-scraper.js';
import { AlneoScraper } from '../scrapers/alneo-scraper.js';
import { GrandelScraper } from '../scrapers/grandel-scraper.js';
import { EEScraper } from '../scrapers/ee-scraper.js';
import { upsertProduct, upsertOffer } from '../services/product-service.js';

async function main() {
  initDb();
  const db = getDb();

  const store = process.argv[2] || 'all';

  // Faster rate limit for manual runs (500ms vs 2s in scheduled mode)
  const rateLimiter = new RateLimiter(1, 500);

  if (store === 'spar' || store === 'all') {
    console.log('Running full SPAR scrape...');
    const scraper = new SparScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[SPAR] ${msg}`));

    console.log(`Upserting ${products.length} SPAR products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          barcode: p.barcode,
          source: 'spar',
        });
        upsertOffer(productId, 'SPAR', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`SPAR done. ${products.length} products saved.`);
  }

  if (store === 'nabiji' || store === 'all') {
    console.log('Running full 2 Nabiji scrape...');
    const scraper = new NabijiScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[2Nabiji] ${msg}`));

    console.log(`Upserting ${products.length} 2 Nabiji products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          barcode: p.barcode,
          source: 'nabiji',
        });
        upsertOffer(productId, '2 Nabiji', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`2 Nabiji done. ${products.length} products saved.`);
  }

  if (store === 'goodwill' || store === 'all') {
    console.log('Running full Goodwill scrape...');
    const scraper = new GoodwillScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[Goodwill] ${msg}`));

    console.log(`Upserting ${products.length} Goodwill products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          barcode: p.barcode,
          source: 'goodwill',
        });
        upsertOffer(productId, 'Goodwill', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`Goodwill done. ${products.length} products saved.`);
  }

  if (store === 'europroduct' || store === 'all') {
    console.log('Running full Europroduct scrape...');
    const scraper = new EuroproductScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[Europroduct] ${msg}`));

    console.log(`Upserting ${products.length} Europroduct products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          barcode: p.barcode,
          source: 'europroduct',
        });
        upsertOffer(productId, 'Europroduct', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`Europroduct done. ${products.length} products saved.`);
  }

  if (store === 'zoomer' || store === 'all') {
    console.log('Running full Zoomer scrape...');
    const scraper = new ZoomerScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[Zoomer] ${msg}`));

    console.log(`Upserting ${products.length} Zoomer products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'zoomer',
          store_type: 'electronics',
        });
        upsertOffer(productId, 'Zoomer', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`Zoomer done. ${products.length} products saved.`);
  }

  if (store === 'alta' || store === 'all') {
    console.log('Running full Alta scrape...');
    const scraper = new AltaScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[Alta] ${msg}`));

    console.log(`Upserting ${products.length} Alta products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'alta',
          store_type: 'electronics',
        });
        upsertOffer(productId, 'Alta', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`Alta done. ${products.length} products saved.`);
  }

  if (store === 'kontakt' || store === 'all') {
    console.log('Running full Kontakt scrape...');
    const scraper = new KontaktScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[Kontakt] ${msg}`));

    console.log(`Upserting ${products.length} Kontakt products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'kontakt',
          store_type: 'electronics',
        });
        upsertOffer(productId, 'Kontakt', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`Kontakt done. ${products.length} products saved.`);
  }

  if (store === 'megatechnica' || store === 'all') {
    console.log('Running full Megatechnica scrape...');
    const scraper = new MegatechnicaScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[Megatechnica] ${msg}`));

    console.log(`Upserting ${products.length} Megatechnica products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'megatechnica',
          store_type: 'electronics',
        });
        upsertOffer(productId, 'Megatechnica', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`Megatechnica done. ${products.length} products saved.`);
  }

  if (store === 'metromart' || store === 'all') {
    console.log('Running full MetroMart scrape...');
    const scraper = new MetroMartScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[MetroMart] ${msg}`));

    console.log(`Upserting ${products.length} MetroMart products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'metromart',
          store_type: 'electronics',
        });
        upsertOffer(productId, 'MetroMart', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`MetroMart done. ${products.length} products saved.`);
  }

  if (store === 'gorgia' || store === 'construction' || store === 'all') {
    console.log('Marking existing Gorgia offers as out_of_stock...');
    db.prepare("UPDATE store_offers SET in_stock = 0 WHERE store = 'Gorgia'").run();
    console.log('Running full Gorgia scrape...');
    const gorgiaScraper = new GorgiaScraper(rateLimiter);
    const gorgeProducts = await gorgiaScraper.scrapeAll((msg) => console.log(`[Gorgia] ${msg}`));

    console.log(`Upserting ${gorgeProducts.length} Gorgia products into DB...`);
    const upsertGorgia = db.transaction(() => {
      for (const p of gorgeProducts) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'gorgia',
          store_type: 'construction',
          price: p.price,
        });
        upsertOffer(productId, 'Gorgia', p.price, p.url);
      }
    });
    upsertGorgia();
    console.log(`Gorgia done. ${gorgeProducts.length} products saved.`);
  }

  if (store === 'goodbuild' || store === 'construction' || store === 'all') {
    console.log('Marking existing Goodbuild offers as out_of_stock...');
    db.prepare("UPDATE store_offers SET in_stock = 0 WHERE store = 'Goodbuild'").run();
    console.log('Running full Goodbuild scrape...');
    const goodbuildScraper = new GoodbuildScraper(rateLimiter);
    const goodbuildProducts = await goodbuildScraper.scrapeAll((msg) => console.log(`[Goodbuild] ${msg}`));

    console.log(`Upserting ${goodbuildProducts.length} Goodbuild products into DB...`);
    const upsertGoodbuild = db.transaction(() => {
      for (const p of goodbuildProducts) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'goodbuild',
          store_type: 'construction',
          price: p.price,
        });
        upsertOffer(productId, 'Goodbuild', p.price, p.url);
      }
    });
    upsertGoodbuild();
    console.log(`Goodbuild done. ${goodbuildProducts.length} products saved.`);
  }

  if (store === 'imart' || store === 'construction' || store === 'all') {
    console.log('Marking existing iMart offers as out_of_stock...');
    db.prepare("UPDATE store_offers SET in_stock = 0 WHERE store = 'iMart'").run();
    console.log('Running full iMart scrape...');
    const imartScraper = new ImartScraper(rateLimiter);
    const imartProducts = await imartScraper.scrapeAll((msg) => console.log(`[iMart] ${msg}`));

    console.log(`Upserting ${imartProducts.length} iMart products into DB...`);
    const upsertImart = db.transaction(() => {
      for (const p of imartProducts) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'imart',
          store_type: 'construction',
          price: p.price,
        });
        upsertOffer(productId, 'iMart', p.price, p.url);
      }
    });
    upsertImart();
    console.log(`iMart done. ${imartProducts.length} products saved.`);
  }

  if (store === 'psp' || store === 'pharmacy' || store === 'all') {
    console.log('Marking existing PSP offers as out_of_stock...');
    db.prepare("UPDATE store_offers SET in_stock = 0 WHERE store = 'PSP'").run();

    console.log('Running full PSP scrape...');
    const scraper = new PspScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[PSP] ${msg}`));

    console.log(`Upserting ${products.length} PSP products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'psp',
          store_type: 'pharmacy',
          active_ingredient: p.active_ingredient,
          dose: p.dose,
          dosage_form: p.dosage_form,
          quantity: p.quantity,
          price: p.price,
        });
        upsertOffer(productId, 'PSP', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`PSP done. ${products.length} products saved.`);
  }

  if (store === 'gpc' || store === 'pharmacy' || store === 'all') {
    console.log('Marking existing GPC offers as out_of_stock...');
    db.prepare("UPDATE store_offers SET in_stock = 0 WHERE store = 'GPC'").run();

    console.log('Running full GPC scrape...');
    const scraper = new GpcScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[GPC] ${msg}`));

    console.log(`Upserting ${products.length} GPC products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'gpc',
          store_type: 'pharmacy',
          active_ingredient: p.active_ingredient,
          dose: p.dose,
          dosage_form: p.dosage_form,
          quantity: p.quantity,
          price: p.price,
          manufacturer: p.manufacturer,
        });
        upsertOffer(productId, 'GPC', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`GPC done. ${products.length} products saved.`);
  }

  if (store === 'aversi' || store === 'pharmacy' || store === 'all') {
    // Mark all existing Aversi offers as out_of_stock before scraping.
    // The new scrape from www.aversi.ge has different product IDs (MatID vs shop product_id),
    // so old offers that no longer exist will stay out_of_stock.
    console.log('Marking existing Aversi offers as out_of_stock...');
    db.prepare("UPDATE store_offers SET in_stock = 0 WHERE store = 'Aversi'").run();

    console.log('Running full Aversi scrape...');
    const scraper = new AversiScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[Aversi] ${msg}`));

    console.log(`Upserting ${products.length} Aversi products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'aversi',
          store_type: 'pharmacy',
          active_ingredient: p.active_ingredient,
          dose: p.dose,
          dosage_form: p.dosage_form,
          quantity: p.quantity,
          price: p.price,
        });
        upsertOffer(productId, 'Aversi', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`Aversi done. ${products.length} products saved.`);
  }

  if (store === 'agrohub' || store === 'all') {
    const agrohubToken = process.env.AGROHUB_TOKEN;
    if (!agrohubToken) { console.log('AGROHUB_TOKEN not set, skipping.'); }
    else {
    console.log('Running full Agrohub scrape...');
    const scraper = new AgrohubScraper(rateLimiter, agrohubToken);
    const products = await scraper.scrapeAll((msg) => console.log(`[Agrohub] ${msg}`));

    console.log(`Upserting ${products.length} Agrohub products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          barcode: p.barcode,
          source: 'agrohub',
        });
        upsertOffer(productId, 'Agrohub', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`Agrohub done. ${products.length} products saved.`);
    }
  }

  if (store === 'libre' || store === 'all') {
    console.log('Running full Libre scrape...');
    const scraper = new LibreScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[Libre] ${msg}`));

    console.log(`Upserting ${products.length} Libre products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          source: 'libre',
        });
        upsertOffer(productId, 'Libre', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`Libre done. ${products.length} products saved.`);
  }

  if (store === 'georgita' || store === 'all') {
    console.log('Running full Georgita scrape...');
    const scraper = new GeorgitaScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[Georgita] ${msg}`));

    console.log(`Upserting ${products.length} Georgita products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          image_url: p.image_url,
          source: 'georgita',
        });
        upsertOffer(productId, 'Georgita', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`Georgita done. ${products.length} products saved.`);
  }

  if (store === 'technoboom' || store === 'electronics' || store === 'all') {
    console.log('Running full TechnoBoom scrape...');
    const scraper = new TechnoBoomScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[TechnoBoom] ${msg}`));

    console.log(`Upserting ${products.length} TechnoBoom products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'technoboom',
          store_type: 'electronics',
        });
        upsertOffer(productId, 'TechnoBoom', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`TechnoBoom done. ${products.length} products saved.`);
  }

  if (store === 'itechnics' || store === 'electronics' || store === 'all') {
    console.log('Running full iTechnics scrape...');
    const scraper = new ITechnicsScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[iTechnics] ${msg}`));

    console.log(`Upserting ${products.length} iTechnics products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'itechnics',
          store_type: 'electronics',
        });
        upsertOffer(productId, 'iTechnics', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`iTechnics done. ${products.length} products saved.`);
  }

  if (store === 'mytechnica' || store === 'electronics' || store === 'all') {
    console.log('Running full MyTechnica scrape...');
    const scraper = new MyTechnicaScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[MyTechnica] ${msg}`));

    console.log(`Upserting ${products.length} MyTechnica products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'mytechnica',
          store_type: 'electronics',
        });
        upsertOffer(productId, 'MyTechnica', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`MyTechnica done. ${products.length} products saved.`);
  }

  if (store === 'alneo' || store === 'electronics' || store === 'all') {
    console.log('Running full Alneo scrape...');
    const scraper = new AlneoScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[Alneo] ${msg}`));

    console.log(`Upserting ${products.length} Alneo products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'alneo',
          store_type: 'electronics',
        });
        upsertOffer(productId, 'Alneo', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`Alneo done. ${products.length} products saved.`);
  }

  if (store === 'grandel' || store === 'electronics' || store === 'all') {
    console.log('Running full Grandel scrape...');
    const scraper = new GrandelScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[Grandel] ${msg}`));

    console.log(`Upserting ${products.length} Grandel products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'grandel',
          store_type: 'electronics',
        });
        upsertOffer(productId, 'Grandel', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`Grandel done. ${products.length} products saved.`);
  }

  if (store === 'ee' || store === 'electronics' || store === 'all') {
    console.log('Running full EE (Elite Electronics) scrape...');
    const scraper = new EEScraper(rateLimiter);
    const products = await scraper.scrapeAll((msg) => console.log(`[EE] ${msg}`));

    console.log(`Upserting ${products.length} EE products into DB...`);
    const upsertAll = db.transaction(() => {
      for (const p of products) {
        const productId = upsertProduct({
          external_id: p.external_id,
          name: p.name,
          size: p.size,
          category: p.category,
          image_url: p.image_url,
          brand: p.brand,
          source: 'ee',
          store_type: 'electronics',
        });
        upsertOffer(productId, 'EE', p.price, p.url);
      }
    });
    upsertAll();
    console.log(`EE done. ${products.length} products saved.`);
  }

  // Clean up stale cross-store offers that violate the price threshold.
  // This handles cases where offers were merged in previous runs with a looser
  // threshold and now the prices diverge too much.
  if (store === 'pharmacy' || store === 'all') {
    console.log('Cleaning up stale pharmacy price mismatches...');
    const mismatches = db.prepare(`
      SELECT p.id, p.canonical_key,
        MIN(so.price) as min_price, MAX(so.price) as max_price,
        CAST(MAX(so.price) AS REAL) / MIN(so.price) as ratio
      FROM products p
      JOIN store_offers so ON so.product_id = p.id AND so.in_stock = 1 AND so.price > 0
      WHERE p.store_type = 'pharmacy'
      GROUP BY p.id
      HAVING COUNT(DISTINCT so.store) >= 2 AND ratio > 1.8
    `).all() as { id: number; canonical_key: string; min_price: number; max_price: number; ratio: number }[];

    let cleaned = 0;
    for (const m of mismatches) {
      // Find the median price and remove offers that are too far from it
      const offers = db.prepare(
        'SELECT store, price FROM store_offers WHERE product_id = ? AND in_stock = 1 AND price > 0 ORDER BY price'
      ).all(m.id) as { store: string; price: number }[];
      const median = offers[Math.floor(offers.length / 2)].price;
      for (const o of offers) {
        const r = o.price / median;
        if (r > 1.8 || r < 1 / 1.8) {
          db.prepare('UPDATE store_offers SET in_stock = 0 WHERE product_id = ? AND store = ?').run(m.id, o.store);
          console.log(`  Removed ${o.store}:${o.price} from product ${m.canonical_key} (median=${median.toFixed(2)}, ratio=${r.toFixed(2)}x)`);
          cleaned++;
        }
      }
    }
    console.log(`Cleaned ${cleaned} stale offers.`);
  }

  closeDb();
  console.log('All done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
