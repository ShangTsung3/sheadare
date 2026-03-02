import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const GOODWILL_SITE = 'https://goodwill.ge';
const GOODWILL_API = 'https://api.goodwill.ge';
const SHOP_ID = 1;
const PAGE_SIZE = 100;

interface GoodwillCategory {
  id: number;
  name: string;
  orderNo: number;
}

interface GoodwillProduct {
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
  shopId: number;
  isActive: boolean;
  onSale: boolean;
  discountPercent: number | null;
}

export class GoodwillScraper extends BaseScraper {
  readonly storeName = 'Goodwill';
  private token: string | null = null;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private async getToken(): Promise<string> {
    if (this.token) return this.token;

    console.log('[Goodwill] Fetching access token...');
    const res = await this.fetchWithRateLimit(`${GOODWILL_API}/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'client_id=GroceryWeb&client_secret=nukuy6ekop&grant_type=client_credentials&scope=GroceryApi',
    });

    const data = await res.json() as { access_token: string };
    if (!data.access_token) throw new Error('Could not get Goodwill access token');

    this.token = data.access_token;
    console.log('[Goodwill] Token acquired');
    return this.token;
  }

  private async apiGet<T>(path: string): Promise<T> {
    const token = await this.getToken();
    const url = `${GOODWILL_API}${path}`;
    const res = await this.fetchWithRateLimit(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Accept-Language': 'ka',
      },
    });

    if (!res.ok) {
      throw new Error(`Goodwill API ${res.status}: ${path}`);
    }

    return res.json() as Promise<T>;
  }

  async getCategories(): Promise<GoodwillCategory[]> {
    const data = await this.apiGet<{ categories: GoodwillCategory[] }>(
      `/v1/Categories?ShopId=${SHOP_ID}`
    );
    return data.categories || [];
  }

  async getSubcategories(categoryId: number): Promise<GoodwillCategory[]> {
    return this.apiGet<GoodwillCategory[]>(
      `/v1/Categories/subcategories?categoryId=${categoryId}&shopId=${SHOP_ID}`
    );
  }

  async getProductsByCategory(categoryId: number, page: number): Promise<GoodwillProduct[]> {
    const data = await this.apiGet<{ products: GoodwillProduct[] }>(
      `/v1/Products/v3?ShopId=${SHOP_ID}&CategoryId=${categoryId}&Page=${page}&Limit=${PAGE_SIZE}`
    );
    return data.products || [];
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Goodwill] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<number>();

    const categories = await this.getCategories();
    log(`Found ${categories.length} categories`);

    for (const cat of categories) {
      log(`Category: ${cat.name} (${cat.id})`);
      let page = 1;

      while (true) {
        try {
          const products = await this.getProductsByCategory(cat.id, page);
          if (products.length === 0) break;

          let newInPage = 0;
          for (const p of products) {
            if (seen.has(p.id)) continue;
            seen.add(p.id);
            newInPage++;

            allProducts.push({
              external_id: `goodwill-${p.id}`,
              name: p.name,
              price: p.price,
              size: p.sellType || undefined,
              category: cat.name,
              image_url: p.imageUrl || undefined,
              barcode: p.barCode || undefined,
              url: `${GOODWILL_SITE}/ka/products/${p.id}`,
              in_stock: p.storageQuantity > 0,
            });
          }

          if (newInPage > 0) {
            log(`  Page ${page}: +${newInPage} new (${allProducts.length} total)`);
          }

          if (products.length < PAGE_SIZE) break;
          page++;
        } catch (err) {
          log(`  Error in ${cat.name} page ${page}: ${err}`);
          break;
        }
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      const data = await this.apiGet<{ products: GoodwillProduct[] }>(
        `/v1/Products/v3?ShopId=${SHOP_ID}&Name=${encodeURIComponent(query)}&Page=1&Limit=30`
      );
      return (data.products || []).map((p) => ({
        external_id: `goodwill-${p.id}`,
        name: p.name,
        price: p.price,
        size: p.sellType || undefined,
        image_url: p.imageUrl || undefined,
        barcode: p.barCode || undefined,
        url: `${GOODWILL_SITE}/ka/products/${p.id}`,
        in_stock: p.storageQuantity > 0,
      }));
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    try {
      const id = externalId.replace('goodwill-', '');
      const data = await this.apiGet<{ product: GoodwillProduct }>(
        `/v1/Products/details?productId=${id}`
      );
      const p = data.product;
      if (!p) return null;

      return {
        external_id: `goodwill-${p.id}`,
        name: p.name,
        price: p.price,
        size: p.sellType || undefined,
        image_url: p.imageUrl || undefined,
        barcode: p.barCode || undefined,
        url: `${GOODWILL_SITE}/ka/products/${p.id}`,
        in_stock: p.storageQuantity > 0,
      };
    } catch {
      return null;
    }
  }
}
