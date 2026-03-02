import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const NABIJI_SITE = 'https://2nabiji.ge';
const NABIJI_API = 'https://catalog-api.orinabiji.ge/catalog/api';
const CDN_BASE = 'https://cdn.2nabiji.ge';
const PAGE_SIZE = 50;

interface NabijiCategory {
  _id: string;
  name: { ge: string; en?: string };
  nameSlug: string;
  parent: string | null;
}

interface NabijiProduct {
  _id: string;
  productId: string;
  title: string;
  barCode: string | null;
  categoryId: string;
  nameSlug: string;
  description?: string;
  images?: { imageId: string; imagePath: string; originalName: string }[];
  stocks?: { price: number; stock: number; discountPrice: number }[];
  stock?: { price: number; stock: number };
  discount?: { price: number; discountName?: { ge?: string } } | null;
  isInStock: boolean;
  totalStock?: number;
}

export class NabijiScraper extends BaseScraper {
  readonly storeName = '2 Nabiji';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private async apiGet<T>(path: string): Promise<T> {
    const url = `${NABIJI_API}${path}`;
    const res = await this.fetchWithRateLimit(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`2Nabiji API ${res.status}: ${path}`);
    }
    return res.json() as Promise<T>;
  }

  private async apiPost<T>(path: string, body: unknown): Promise<T> {
    const url = `${NABIJI_API}${path}`;
    const res = await this.fetchWithRateLimit(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`2Nabiji API ${res.status}: ${path}`);
    }
    return res.json() as Promise<T>;
  }

  async getCategories(): Promise<NabijiCategory[]> {
    const data = await this.apiGet<{ status: string; data: NabijiCategory[] }>(
      '/categories/thin?lang=ge'
    );
    return data.data || [];
  }

  async getProductsByCategory(
    categoryId: string,
    skip: number
  ): Promise<{ products: NabijiProduct[]; totalCount: number }> {
    const data = await this.apiPost<{
      status: string;
      data: { products: NabijiProduct[]; totalCount: number };
    }>(
      `/products/shop/search?lang=ge&skip=${skip}&limit=${PAGE_SIZE}&sortField=isInStock&sortDirection=-1&searchText=&loadCategories=false`,
      { categoryIds: [categoryId], offerGroupIds: [] }
    );
    return {
      products: data.data?.products || [],
      totalCount: data.data?.totalCount || 0,
    };
  }

  private getProductPrice(p: NabijiProduct): number {
    // Discount price takes priority
    if (p.discount && p.discount.price > 0) {
      return p.discount.price;
    }
    // Then stock price
    if (p.stock?.price) return p.stock.price;
    if (p.stocks?.[0]?.price) return p.stocks[0].price;
    return 0;
  }

  private getImageUrl(p: NabijiProduct): string | undefined {
    const img = p.images?.[0];
    if (!img?.imagePath) return undefined;
    return `${CDN_BASE}/${img.imagePath}`;
  }

  /** Scrape ALL products from every leaf category */
  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[2Nabiji] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    const categories = await this.getCategories();
    log(`Found ${categories.length} total categories`);

    // Get leaf categories (those that are not parents of other categories)
    const parentIds = new Set(categories.filter(c => c.parent).map(c => c.parent!));
    const leafCategories = categories.filter(c => !parentIds.has(c._id));
    log(`${leafCategories.length} leaf categories to scrape`);

    // Build category name map for parent lookup
    const catNameMap = new Map<string, string>();
    for (const c of categories) {
      catNameMap.set(c._id, c.name.ge);
    }

    for (const cat of leafCategories) {
      let skip = 0;
      const parentName = cat.parent ? catNameMap.get(cat.parent) : undefined;
      const categoryLabel = parentName ? `${parentName} > ${cat.name.ge}` : cat.name.ge;

      while (true) {
        try {
          const { products, totalCount } = await this.getProductsByCategory(cat._id, skip);
          if (products.length === 0) break;

          let newInPage = 0;
          for (const p of products) {
            if (seen.has(p._id)) continue;
            seen.add(p._id);
            newInPage++;

            const price = this.getProductPrice(p);
            if (price <= 0) continue;

            allProducts.push({
              external_id: `nabiji-${p._id}`,
              name: p.title,
              price,
              category: parentName || cat.name.ge,
              image_url: this.getImageUrl(p),
              barcode: p.barCode || undefined,
              url: `${NABIJI_SITE}/ge/product/${p.nameSlug}`,
              in_stock: p.isInStock,
            });
          }

          if (newInPage > 0) {
            log(`  ${categoryLabel}: skip=${skip}, +${newInPage} new (${allProducts.length} total)`);
          }

          skip += products.length;
          if (skip >= totalCount) break;
          if (products.length < PAGE_SIZE) break;
        } catch (err) {
          log(`  Error in ${categoryLabel} skip=${skip}: ${err}`);
          break;
        }
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      const data = await this.apiPost<{
        status: string;
        data: { products: NabijiProduct[]; totalCount: number };
      }>(
        `/products/shop/search?lang=ge&skip=0&limit=30&sortField=isInStock&sortDirection=-1&searchText=${encodeURIComponent(query)}&loadCategories=false`,
        { categoryIds: [], offerGroupIds: [] }
      );

      return (data.data?.products || []).map((p) => ({
        external_id: `nabiji-${p._id}`,
        name: p.title,
        price: this.getProductPrice(p),
        image_url: this.getImageUrl(p),
        url: `${NABIJI_SITE}/ge/product/${p.nameSlug}`,
        in_stock: p.isInStock,
      }));
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    try {
      const id = externalId.replace('nabiji-', '');
      const data = await this.apiGet<{ status: string; data: NabijiProduct }>(
        `/products/details/${id}?lang=ge`
      );
      const p = data.data;
      if (!p) return null;

      return {
        external_id: `nabiji-${p._id}`,
        name: p.title,
        price: this.getProductPrice(p),
        image_url: this.getImageUrl(p),
        url: `${NABIJI_SITE}/ge/product/${p.nameSlug}`,
        in_stock: p.isInStock,
      };
    } catch {
      return null;
    }
  }
}
