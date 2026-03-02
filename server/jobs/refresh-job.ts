import { getDb } from '../db/connection.js';
import { RateLimiter } from '../scrapers/rate-limiter.js';
import { SparScraper } from '../scrapers/spar-scraper.js';
import { upsertOffer } from '../services/product-service.js';
import { checkAlerts } from '../services/alert-service.js';
import { SCRAPER_RATE_LIMIT_MS } from '../config.js';

export async function runRefreshJob(): Promise<void> {
  const db = getDb();
  const rateLimiter = new RateLimiter(1, SCRAPER_RATE_LIMIT_MS);
  const scraper = new SparScraper(rateLimiter);

  const runRow = db.prepare(
    "INSERT INTO scraper_runs (job_type, store, status) VALUES ('refresh', 'SPAR', 'running')"
  ).run();
  const runId = runRow.lastInsertRowid;

  let totalPrices = 0;

  try {
    // Get all SPAR products that were scraped (not seeded)
    const products = db.prepare(
      "SELECT id, external_id FROM products WHERE source = 'spar' AND external_id IS NOT NULL"
    ).all() as Array<{ id: number; external_id: string }>;

    console.log(`[Refresh] Refreshing ${products.length} SPAR products`);

    for (const product of products) {
      const scraped = await scraper.fetchProduct(product.external_id);
      if (scraped) {
        upsertOffer(product.id, 'SPAR', scraped.price, scraped.url);
        totalPrices++;
      }
    }

    // Check alerts after updating prices
    const triggered = checkAlerts();
    if (triggered.length > 0) {
      console.log(`[Refresh] ${triggered.length} alerts triggered`);
    }

    db.prepare(
      "UPDATE scraper_runs SET status = 'completed', prices_updated = ?, finished_at = datetime('now') WHERE id = ?"
    ).run(totalPrices, runId);

    console.log(`[Refresh] Completed. Prices updated: ${totalPrices}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    db.prepare(
      "UPDATE scraper_runs SET status = 'failed', error_message = ?, finished_at = datetime('now') WHERE id = ?"
    ).run(message, runId);
    console.error('[Refresh] Failed:', message);
  }
}
