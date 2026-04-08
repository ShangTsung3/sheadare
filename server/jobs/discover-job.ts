import { getDb } from '../db/connection.js';
import { RateLimiter } from '../scrapers/rate-limiter.js';
import { SparScraper } from '../scrapers/spar-scraper.js';
import { NabijiScraper } from '../scrapers/nabiji-scraper.js';
import { GoodwillScraper } from '../scrapers/goodwill-scraper.js';
import { EuroproductScraper } from '../scrapers/europroduct-scraper.js';
import { ZoomerScraper } from '../scrapers/zoomer-scraper.js';
import { AltaScraper } from '../scrapers/alta-scraper.js';
import { KontaktScraper } from '../scrapers/kontakt-scraper.js';
import { MegatechnicaScraper } from '../scrapers/megatechnica-scraper.js';
import { AgrohubScraper } from '../scrapers/agrohub-scraper.js';
import { upsertProduct, upsertOffer } from '../services/product-service.js';
import { SCRAPER_RATE_LIMIT_MS } from '../config.js';
import { BaseScraper, ScrapedProduct } from '../scrapers/base-scraper.js';

interface StoreConfig {
  name: string;
  source: string;
  storeType: string;
  createScraper: (rl: RateLimiter) => BaseScraper & { scrapeAll: (onProgress?: (msg: string) => void) => Promise<ScrapedProduct[]> };
}

const STORES: StoreConfig[] = [
  // SPAR ონლაინ მაღაზია დახურულია (isShopOpen=false) — სქრეიპერში graceful skip აქვს
  { name: 'SPAR', source: 'spar', storeType: 'grocery', createScraper: (rl) => new SparScraper(rl) },
  { name: '2 Nabiji', source: 'nabiji', storeType: 'grocery', createScraper: (rl) => new NabijiScraper(rl) },
  { name: 'Goodwill', source: 'goodwill', storeType: 'grocery', createScraper: (rl) => new GoodwillScraper(rl) },
  { name: 'Europroduct', source: 'europroduct', storeType: 'grocery', createScraper: (rl) => new EuroproductScraper(rl) },
  { name: 'Agrohub', source: 'agrohub', storeType: 'grocery', createScraper: (rl) => new AgrohubScraper(rl, process.env.AGROHUB_TOKEN || '') },
  // ტექნიკა დროებით გამორთულია
  // { name: 'Zoomer', source: 'zoomer', storeType: 'electronics', createScraper: (rl) => new ZoomerScraper(rl) },
  // { name: 'Alta', source: 'alta', storeType: 'electronics', createScraper: (rl) => new AltaScraper(rl) },
  // { name: 'Kontakt', source: 'kontakt', storeType: 'electronics', createScraper: (rl) => new KontaktScraper(rl) },
  // { name: 'Megatechnica', source: 'megatechnica', storeType: 'electronics', createScraper: (rl) => new MegatechnicaScraper(rl) },
];

export async function runDiscoverJob(): Promise<void> {
  const db = getDb();
  const rateLimiter = new RateLimiter(1, SCRAPER_RATE_LIMIT_MS);

  for (const store of STORES) {
    const runRow = db.prepare(
      "INSERT INTO scraper_runs (job_type, store, status) VALUES ('discover', ?, 'running')"
    ).run(store.name);
    const runId = runRow.lastInsertRowid;

    let totalProducts = 0;
    let totalPrices = 0;

    try {
      const scraper = store.createScraper(rateLimiter);
      const products = await scraper.scrapeAll((msg) => console.log(`[Discover/${store.name}] ${msg}`));

      console.log(`[Discover/${store.name}] Upserting ${products.length} products into DB...`);

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
            source: store.source,
            store_type: store.storeType,
          });

          upsertOffer(productId, store.name, p.price, p.url);
          totalProducts++;
          totalPrices++;
        }
      });

      upsertAll();

      db.prepare(
        "UPDATE scraper_runs SET status = 'completed', products_found = ?, prices_updated = ?, finished_at = datetime('now') WHERE id = ?"
      ).run(totalProducts, totalPrices, runId);

      console.log(`[Discover/${store.name}] Completed. Products: ${totalProducts}, Prices: ${totalPrices}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      db.prepare(
        "UPDATE scraper_runs SET status = 'failed', error_message = ?, finished_at = datetime('now') WHERE id = ?"
      ).run(message, runId);
      console.error(`[Discover/${store.name}] Failed:`, message);
    }
  }
}
