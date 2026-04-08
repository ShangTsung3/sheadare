import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const SPAR_SITE = 'https://sparonline.ge';
const SPAR_API = 'https://api.spargeorgia.com';
const SHOP_ID = 21;
const PAGE_SIZE = 50;

interface SparCategory {
  id: number;
  name: string;
  parentCategoryId: number;
}

interface SparProduct {
  id: number;
  name: string;
  barCode: string | null;
  description: string | null;
  sellType: string | null;
  price: number;
  previousPrice: number | null;
  categoryId: number | null;
  categoryName: string | null;
  subCategoryId: number | null;
  subCategoryName: string | null;
  storageQuantity: number;
  imageUrl: string | null;
  brandId: number | null;
  shopId: number;
  isActive: boolean;
  onSale: boolean;
}

export class SparScraper extends BaseScraper {
  readonly storeName = 'SPAR';
  private token: string | null = null;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private async getToken(): Promise<string> {
    if (this.token) return this.token;

    console.log('[SPAR] Fetching access token...');
    const res = await this.fetchWithRateLimit(SPAR_SITE);
    const html = await res.text();
    const match = html.match(/"accessToken":"([^"]+)"/);
    if (!match) throw new Error('Could not extract SPAR access token');

    this.token = match[1];
    console.log('[SPAR] Token acquired');
    return this.token;
  }

  private async apiGet<T>(path: string): Promise<T> {
    const token = await this.getToken();
    const url = `${SPAR_API}${path}`;
    const res = await this.fetchWithRateLimit(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (res.status === 401) {
      // Token expired, refresh
      this.token = null;
      const newToken = await this.getToken();
      const retry = await this.fetchWithRateLimit(url, {
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Accept': 'application/json',
        },
      });
      return retry.json() as Promise<T>;
    }

    if (!res.ok) {
      throw new Error(`SPAR API ${res.status}: ${path}`);
    }

    return res.json() as Promise<T>;
  }

  async getCategories(): Promise<SparCategory[]> {
    const data = await this.apiGet<{ categories: SparCategory[] }>(
      `/v1/Categories?shopId=${SHOP_ID}`
    );
    return data.categories;
  }

  async getSubcategories(categoryId: number): Promise<SparCategory[]> {
    return this.apiGet<SparCategory[]>(
      `/v1/Categories/subcategories?shopId=${SHOP_ID}&categoryId=${categoryId}`
    );
  }

  async getProductsBySubcategory(subCategoryId: number, page = 1): Promise<{ products: SparProduct[]; total: number }> {
    const data = await this.apiGet<{ products: SparProduct[]; productsCount: number }>(
      `/v1/Products/v3?shopId=${SHOP_ID}&subCategoryId=${subCategoryId}&page=${page}&pageSize=${PAGE_SIZE}`
    );
    return { products: data.products || [], total: data.productsCount || 0 };
  }

  /** Check if the SPAR online shop is active */
  private async isShopActive(): Promise<boolean> {
    try {
      const token = await this.getToken();
      const res = await this.fetchWithRateLimit(`${SPAR_API}/v1/Shops`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      const data = await res.json() as { shops: Array<{ isShopOpen: boolean; categoriesCount: number }> };
      const shop = data.shops?.[0];
      return !!(shop?.isShopOpen && shop.categoriesCount > 0);
    } catch {
      return false;
    }
  }

  /** Scrape ALL products from every category/subcategory */
  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[SPAR] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<number>();

    // Check if the online shop is active before attempting to scrape
    const active = await this.isShopActive();
    if (!active) {
      log('SPAR online shop is currently inactive (isShopOpen=false). Skipping scrape.');
      return allProducts;
    }

    const categories = await this.getCategories();
    log(`Found ${categories.length} categories`);

    for (const cat of categories) {
      log(`Category: ${cat.name} (${cat.id})`);

      let subcats: SparCategory[];
      try {
        subcats = await this.getSubcategories(cat.id);
      } catch {
        log(`  Skipping category ${cat.name} - no subcategories`);
        continue;
      }

      log(`  ${subcats.length} subcategories`);

      for (const sub of subcats) {
        let page = 1;
        let emptyStreak = 0;

        while (true) {
          try {
            const { products, total } = await this.getProductsBySubcategory(sub.id, page);
            if (products.length === 0) break;

            let newInPage = 0;
            for (const p of products) {
              if (seen.has(p.id)) continue;
              seen.add(p.id);
              newInPage++;

              allProducts.push({
                external_id: `spar-${p.id}`,
                name: p.name,
                price: p.price,
                size: p.sellType || undefined,
                category: cat.name,
                image_url: p.imageUrl || undefined,
                barcode: p.barCode || undefined,
                url: `${SPAR_SITE}/product/${p.id}`,
                in_stock: p.storageQuantity > 0,
              });
            }

            if (newInPage > 0) {
              log(`  ${sub.name}: page ${page}, +${newInPage} new (${allProducts.length} total)`);
              emptyStreak = 0;
            } else {
              emptyStreak++;
              // If 2 consecutive pages have 0 new products, this subcategory is exhausted
              if (emptyStreak >= 2) break;
            }

            // Keep paginating if we got a full page
            if (products.length < PAGE_SIZE) break;
            if (total > 0 && page * PAGE_SIZE >= total) break;
            page++;
          } catch (err) {
            log(`  Error in ${sub.name} page ${page}: ${err}`);
            break;
          }
        }
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  // Keep BaseScraper interface methods
  async search(query: string): Promise<ScrapedProduct[]> {
    // The SPAR API doesn't seem to have a search endpoint,
    // so we search our local DB instead. This method is kept
    // for interface compatibility.
    return [];
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    try {
      const id = externalId.replace('spar-', '');
      const data = await this.apiGet<{ products: SparProduct[] }>(
        `/v1/Products/details?shopId=${SHOP_ID}&productId=${id}`
      );
      const p = data.products?.[0];
      if (!p) return null;

      return {
        external_id: `spar-${p.id}`,
        name: p.name,
        price: p.price,
        size: p.sellType || undefined,
        image_url: p.imageUrl || undefined,
        in_stock: p.storageQuantity > 0,
      };
    } catch {
      return null;
    }
  }
}
