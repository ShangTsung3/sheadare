import { initDb } from '../db/schema.js';
import { getDb, closeDb } from '../db/connection.js';
import { RateLimiter } from '../scrapers/rate-limiter.js';
import { SparScraper } from '../scrapers/spar-scraper.js';
import { NabijiScraper } from '../scrapers/nabiji-scraper.js';
import { GoodwillScraper } from '../scrapers/goodwill-scraper.js';
import { EuroproductScraper } from '../scrapers/europroduct-scraper.js';
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

  closeDb();
  console.log('All done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
