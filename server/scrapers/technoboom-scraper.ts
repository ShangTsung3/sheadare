import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const API_BASE =
  'https://technoboomapp-fsf3eybnbugkfsf0.canadacentral-01.azurewebsites.net/api';
const SITE_BASE = 'https://technoboom.ge';
const IMAGE_BASE = `${API_BASE.replace('/api', '')}`;

// ---------- API response types ----------

interface TBCategory {
  mainCategoryId: number;
  categoryId: number;
  categoryName: string;
}

interface TBItemLayer {
  id: number;
  layerId: number;
  layerCode: string;
  layerName: string;
  layerType: boolean;
  layerPriority: number;
}

interface TBItem {
  id: number;
  no: string;                   // SKU e.g. "I31756"
  description: string;          // model e.g. "5014-SL"
  brandId: number;
  brandName: string;
  mainCategoryId: number;
  mainCategoryName: string;
  categoryId: number;
  categoryName: string;
  subCategoryId: number;
  subCategoryName: string;
  priceRetail: number;          // original (before discount)
  discountPercent: number;
  discountAmount: number;
  realPriceRetail: number;      // final price the customer pays
  qvt: number;                  // quantity in stock
  unitVolume: number;
  boomShipping: number;
  itemLayers: TBItemLayer[];
  imageUrl: string;             // e.g. "/uploads/items/I31756/xxx.webp"
}

interface TBFilterCategory {
  mainCategoryId: number;
  mainCategoryName: string;
  mainCategoryImageUrl: string;
  brands: { brandId: number; brandName: string; imageUrl: string }[];
  categories: {
    categoryId: number;
    categoryName: string;
    subCategories: { subCategoryId: number; subCategoryName: string }[];
  }[];
}

// ---------- Scraper ----------

export class TechnoBoomScraper extends BaseScraper {
  readonly storeName = 'TechnoBoom';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  // ---- helpers ----

  private async fetchJson<T>(url: string): Promise<T> {
    const res = await this.fetchWithRateLimit(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json() as Promise<T>;
  }

  /** Build a full image URL from the relative path returned by the API */
  private buildImageUrl(relative: string | undefined): string | undefined {
    if (!relative) return undefined;
    // The relative path looks like "/uploads/items/I31756/xxx.webp"
    // The images are served from the same Azure backend
    return `${IMAGE_BASE}${relative}`;
  }

  /** Build a product page URL on technoboom.ge */
  private buildProductUrl(item: TBItem): string {
    // technoboom.ge uses /ka/product/<id> route structure
    return `${SITE_BASE}/ka/product/${item.id}`;
  }

  /** Map a single API item to our ScrapedProduct */
  private mapItem(item: TBItem): ScrapedProduct | null {
    const price = item.realPriceRetail ?? item.priceRetail;
    if (!price || price <= 0) return null;

    const name = [item.brandName, item.description]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (!name) return null;

    return {
      external_id: `technoboom-${item.id}`,
      name,
      price,
      brand: item.brandName || undefined,
      category: item.categoryName || item.mainCategoryName || undefined,
      image_url: this.buildImageUrl(item.imageUrl),
      url: this.buildProductUrl(item),
      in_stock: (item.qvt ?? 0) > 0,
    };
  }

  // ---- public API (required by BaseScraper) ----

  /** Fetch all categories from the API */
  async fetchCategories(): Promise<TBCategory[]> {
    return this.fetchJson<TBCategory[]>(
      `${API_BASE}/Categories/web-categories`,
    );
  }

  /** Fetch the full category tree with brands and subcategories */
  async fetchCategoryTree(): Promise<TBFilterCategory[]> {
    return this.fetchJson<TBFilterCategory[]>(
      `${API_BASE}/Items/web-items-filterCategory-Short`,
    );
  }

  /**
   * Scrape all products.
   *
   * The API exposes two useful endpoints:
   *   1. /Items/web-items-short           – all items (flat list, no pagination)
   *   2. /Items/web-items-short?categoryId – items filtered by category
   *
   * We first try the "all items" endpoint.  If the response is very large we
   * fall back to fetching per-category.
   */
  async scrapeAll(
    onProgress?: (msg: string) => void,
  ): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[TechnoBoom] ${m}`));
    const seen = new Set<string>();
    const allProducts: ScrapedProduct[] = [];

    const addItem = (item: TBItem) => {
      const mapped = this.mapItem(item);
      if (!mapped) return;
      if (seen.has(mapped.external_id)) return;
      seen.add(mapped.external_id);
      allProducts.push(mapped);
    };

    // Strategy 1 – single bulk fetch
    try {
      log('Fetching all items from bulk endpoint...');
      const items = await this.fetchJson<TBItem[]>(
        `${API_BASE}/Items/web-items-short`,
      );
      log(`Bulk endpoint returned ${items.length} items`);

      for (const item of items) addItem(item);

      log(`After bulk: ${allProducts.length} unique products`);
    } catch (err) {
      log(`Bulk fetch failed (${err}), falling back to per-category fetch`);
    }

    // Strategy 2 – per-category fetch (fills gaps or serves as fallback)
    try {
      const categories = await this.fetchCategories();
      log(`Found ${categories.length} categories, fetching per-category...`);

      for (const cat of categories) {
        try {
          const items = await this.fetchJson<TBItem[]>(
            `${API_BASE}/Items/web-items-short?categoryId=${cat.categoryId}`,
          );
          let newCount = 0;
          for (const item of items) {
            const before = allProducts.length;
            addItem(item);
            if (allProducts.length > before) newCount++;
          }
          if (newCount > 0) {
            log(
              `  ${cat.categoryName} (id=${cat.categoryId}): +${newCount} new (${allProducts.length} total)`,
            );
          }
        } catch (err) {
          log(`  Error fetching category ${cat.categoryName}: ${err}`);
        }
      }
    } catch (err) {
      log(`Category fetch failed: ${err}`);
    }

    // Strategy 3 – featured / layered items (catch anything not in main listing)
    try {
      const layered = await this.fetchJson<Record<string, TBItem[]>>(
        `${API_BASE}/Items/web-items-short-by-layer2`,
      );
      let newCount = 0;
      for (const items of Object.values(layered)) {
        for (const item of items) {
          const before = allProducts.length;
          addItem(item);
          if (allProducts.length > before) newCount++;
        }
      }
      if (newCount > 0) {
        log(`Featured/layered items: +${newCount} new (${allProducts.length} total)`);
      }
    } catch (err) {
      log(`Layered items fetch failed: ${err}`);
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    // The search suggest endpoint uses a different parameter format.
    // Fall back to filtering the full items list by query string match.
    try {
      const items = await this.fetchJson<TBItem[]>(
        `${API_BASE}/Items/web-items-short`,
      );
      const q = query.toLowerCase();
      const results: ScrapedProduct[] = [];

      for (const item of items) {
        const haystack = [
          item.description,
          item.brandName,
          item.categoryName,
          item.subCategoryName,
          item.no,
        ]
          .join(' ')
          .toLowerCase();

        if (haystack.includes(q)) {
          const mapped = this.mapItem(item);
          if (mapped) results.push(mapped);
        }
        if (results.length >= 30) break;
      }

      return results;
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    // externalId format: "technoboom-{id}"
    const idMatch = externalId.match(/^technoboom-(\d+)$/);
    if (!idMatch) return null;

    try {
      const item = await this.fetchJson<TBItem>(
        `${API_BASE}/Items/web/${idMatch[1]}`,
      );
      return this.mapItem(item);
    } catch {
      return null;
    }
  }
}
