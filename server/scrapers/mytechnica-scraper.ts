import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const BASE_URL = 'https://mytechnica.ge';
const API_BASE = `${BASE_URL}/wp-json/wc/store/v1`;
const PER_PAGE = 100; // WooCommerce Store API max
const MAX_PAGES = 200; // Safety limit

interface WCProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  sku: string;
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    currency_code: string;
  };
  images: Array<{
    id: number;
    src: string;
    thumbnail: string;
    name: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  is_in_stock: boolean;
  on_sale: boolean;
}

interface WCCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}

export class MyTechnicaScraper extends BaseScraper {
  readonly storeName = 'MyTechnica';
  static readonly source = 'mytechnica';
  static readonly storeType = 'electronics';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private async fetchJSON<T>(url: string): Promise<{ data: T; totalPages: number }> {
    const res = await this.fetchWithRateLimit(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

    const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);
    const data = (await res.json()) as T;
    return { data, totalPages };
  }

  /** Convert a WooCommerce Store API product to our ScrapedProduct format */
  private toScrapedProduct(p: WCProduct): ScrapedProduct | null {
    // Prices from the Store API are in whole currency units (e.g. "2564" = 2564 GEL)
    const price = parseFloat(p.prices?.price);
    if (!price || price <= 0) return null;

    const categoryName = p.categories?.[0]?.name || '';
    const imageUrl = p.images?.[0]?.src || '';

    return {
      external_id: `mytechnica-${p.id}`,
      name: p.name,
      price,
      category: categoryName,
      image_url: imageUrl || undefined,
      url: p.permalink || undefined,
      in_stock: p.is_in_stock ?? true,
    };
  }

  /** Fetch all categories from the store */
  async fetchCategories(): Promise<WCCategory[]> {
    const allCategories: WCCategory[] = [];
    let page = 1;

    while (true) {
      const url = `${API_BASE}/products/categories?per_page=${PER_PAGE}&page=${page}`;
      const { data: categories, totalPages } = await this.fetchJSON<WCCategory[]>(url);

      allCategories.push(...categories);
      if (page >= totalPages || categories.length === 0) break;
      page++;
    }

    return allCategories;
  }

  /** Scrape all products using the WooCommerce Store API */
  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[MyTechnica] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    // First, discover categories for progress logging
    let categories: WCCategory[] = [];
    try {
      categories = await this.fetchCategories();
      log(`Found ${categories.length} categories`);
    } catch (err) {
      log(`Could not fetch categories, will scrape all products without category filter: ${err}`);
    }

    // Scrape by category for better progress tracking and to ensure full coverage
    if (categories.length > 0) {
      // Only scrape leaf categories (those with count > 0)
      const leafCategories = categories.filter(c => c.count > 0);
      log(`Scraping ${leafCategories.length} categories with products`);

      for (const cat of leafCategories) {
        let page = 1;

        while (page <= MAX_PAGES) {
          try {
            const url = `${API_BASE}/products?category=${cat.id}&per_page=${PER_PAGE}&page=${page}`;
            const { data: products, totalPages } = await this.fetchJSON<WCProduct[]>(url);

            if (products.length === 0) break;

            let newInPage = 0;
            for (const p of products) {
              const scraped = this.toScrapedProduct(p);
              if (!scraped) continue;
              // Override category with the one we queried for
              scraped.category = cat.name;
              if (seen.has(scraped.external_id)) continue;
              seen.add(scraped.external_id);
              allProducts.push(scraped);
              newInPage++;
            }

            log(`  ${cat.name}: page ${page}/${totalPages}, +${newInPage} new (${allProducts.length} total)`);

            if (page >= totalPages) break;
            page++;
          } catch (err) {
            log(`  Error in ${cat.name} page ${page}: ${err}`);
            break;
          }
        }
      }
    } else {
      // Fallback: scrape all products without category filter
      let page = 1;

      while (page <= MAX_PAGES) {
        try {
          const url = `${API_BASE}/products?per_page=${PER_PAGE}&page=${page}`;
          const { data: products, totalPages } = await this.fetchJSON<WCProduct[]>(url);

          if (products.length === 0) break;

          let newInPage = 0;
          for (const p of products) {
            const scraped = this.toScrapedProduct(p);
            if (!scraped) continue;
            if (seen.has(scraped.external_id)) continue;
            seen.add(scraped.external_id);
            allProducts.push(scraped);
            newInPage++;
          }

          log(`Page ${page}/${totalPages}, +${newInPage} new (${allProducts.length} total)`);

          if (page >= totalPages) break;
          page++;
        } catch (err) {
          log(`Error on page ${page}: ${err}`);
          break;
        }
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  /** Search products by query string */
  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      const url = `${API_BASE}/products?search=${encodeURIComponent(query)}&per_page=30`;
      const { data: products } = await this.fetchJSON<WCProduct[]>(url);

      return products
        .map(p => this.toScrapedProduct(p))
        .filter((p): p is ScrapedProduct => p !== null);
    } catch {
      return [];
    }
  }

  /** Fetch a single product by external ID */
  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    const idMatch = externalId.match(/^mytechnica-(\d+)$/);
    if (!idMatch) return null;

    try {
      const url = `${API_BASE}/products/${idMatch[1]}`;
      const { data: product } = await this.fetchJSON<WCProduct>(url);
      return this.toScrapedProduct(product);
    } catch {
      return null;
    }
  }
}
