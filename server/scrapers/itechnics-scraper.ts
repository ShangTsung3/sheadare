import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const ITECHNICS_BASE = 'https://itechnics.ge';
const API_BASE = `${ITECHNICS_BASE}/wp-json/wc/store/v1`;
const PER_PAGE = 10; // Server caps at 10 regardless of requested value

interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  sku: string;
  on_sale: boolean;
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    currency_code: string;
    currency_minor_unit: number;
  };
  images: Array<{
    id: number;
    src: string;
    thumbnail: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  is_in_stock: boolean;
  is_purchasable: boolean;
}

interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}

export class ITechnicsScraper extends BaseScraper {
  readonly storeName = 'iTechnics';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const res = await this.fetchWithRateLimit(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'ka,en;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json() as Promise<T>;
  }

  /** Fetch all product categories from the WooCommerce Store API */
  private async fetchCategories(): Promise<WooCategory[]> {
    const allCategories: WooCategory[] = [];
    let page = 1;

    while (true) {
      const url = `${API_BASE}/products/categories?per_page=100&page=${page}`;
      const categories = await this.fetchJson<WooCategory[]>(url);
      if (!categories.length) break;
      allCategories.push(...categories);
      // If fewer than 100, we've reached the end
      if (categories.length < 100) break;
      page++;
    }

    return allCategories;
  }

  /** Get leaf categories (categories that actually contain products, skipping service categories) */
  private getScrapableCategories(allCategories: WooCategory[]): WooCategory[] {
    const skipSlugs = new Set([
      'uncategorized-ka',
      'services',
      'iphone-servisebi',
      'programmatic',
      'ipad-services',
      'iphone-services',
      'mac-services',
    ]);

    // Find categories with products, excluding services
    return allCategories.filter(cat =>
      cat.count > 0 && !skipSlugs.has(cat.slug)
    );
  }

  /** Convert a WooCommerce product to our ScrapedProduct format */
  private toScrapedProduct(woo: WooProduct): ScrapedProduct | null {
    const price = parseInt(woo.prices.price, 10);
    if (!price || price <= 0) return null;
    if (!woo.name || woo.name.trim().length === 0) return null;

    const category = woo.categories.length > 0
      ? woo.categories[0].name
      : undefined;

    const imageUrl = woo.images.length > 0
      ? woo.images[0].src
      : undefined;

    return {
      external_id: `itechnics-${woo.id}`,
      name: woo.name.trim(),
      price,
      category,
      image_url: imageUrl,
      url: woo.permalink,
      in_stock: woo.is_in_stock,
    };
  }

  /** Fetch all products for a given category, handling pagination */
  private async fetchCategoryProducts(categoryId: number): Promise<WooProduct[]> {
    const products: WooProduct[] = [];
    let page = 1;
    const maxPages = 50; // Safety limit

    while (page <= maxPages) {
      const url = `${API_BASE}/products?category=${categoryId}&per_page=${PER_PAGE}&page=${page}`;
      const pageProducts = await this.fetchJson<WooProduct[]>(url);

      if (!pageProducts.length) break;
      products.push(...pageProducts);

      // If fewer than PER_PAGE, we've reached the last page
      if (pageProducts.length < PER_PAGE) break;
      page++;
    }

    return products;
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[iTechnics] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>(); // Deduplicate by external_id (woo product ID)

    log('Fetching categories...');
    const allCategories = await this.fetchCategories();
    log(`Found ${allCategories.length} total categories`);

    const scrapable = this.getScrapableCategories(allCategories);
    log(`${scrapable.length} scrapable categories (excluding services)`);

    // Build set of parent IDs to prefer leaf categories
    const parentIds = new Set(allCategories.map(c => c.parent).filter(p => p > 0));

    // Prefer leaf categories (those not used as parents) to reduce duplicate fetching,
    // but also include parents that have products directly assigned
    const leafCategories = scrapable.filter(c => !parentIds.has(c.id));
    const parentWithProducts = scrapable.filter(c => parentIds.has(c.id) && c.count > 0);

    // Start with leaf categories, then fill in any parents whose products weren't captured
    const categoriesToScrape = [...leafCategories];
    log(`${categoriesToScrape.length} leaf categories to scrape`);

    for (const cat of categoriesToScrape) {
      try {
        const products = await this.fetchCategoryProducts(cat.id);
        let newInCat = 0;

        for (const woo of products) {
          const key = `itechnics-${woo.id}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const product = this.toScrapedProduct(woo);
          if (product) {
            allProducts.push(product);
            newInCat++;
          }
        }

        if (newInCat > 0) {
          log(`  ${cat.name} (id:${cat.id}): +${newInCat} new (${allProducts.length} total)`);
        }
      } catch (err) {
        log(`  Error in category ${cat.name} (id:${cat.id}): ${err}`);
      }
    }

    // Now scrape parent categories to catch any products not in leaf categories
    for (const cat of parentWithProducts) {
      try {
        const products = await this.fetchCategoryProducts(cat.id);
        let newInCat = 0;

        for (const woo of products) {
          const key = `itechnics-${woo.id}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const product = this.toScrapedProduct(woo);
          if (product) {
            allProducts.push(product);
            newInCat++;
          }
        }

        if (newInCat > 0) {
          log(`  ${cat.name} (id:${cat.id}, parent): +${newInCat} new (${allProducts.length} total)`);
        }
      } catch (err) {
        log(`  Error in parent category ${cat.name} (id:${cat.id}): ${err}`);
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      const results: ScrapedProduct[] = [];
      const seen = new Set<string>();
      let page = 1;
      const maxPages = 5; // Limit search to 50 results

      while (page <= maxPages) {
        const url = `${API_BASE}/products?search=${encodeURIComponent(query)}&per_page=${PER_PAGE}&page=${page}`;
        const products = await this.fetchJson<WooProduct[]>(url);

        if (!products.length) break;

        for (const woo of products) {
          const key = `itechnics-${woo.id}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const product = this.toScrapedProduct(woo);
          if (product) results.push(product);
        }

        if (products.length < PER_PAGE) break;
        page++;
      }

      return results;
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    try {
      // externalId format: "itechnics-{id}"
      const id = externalId.replace('itechnics-', '');
      const url = `${API_BASE}/products/${id}`;
      const woo = await this.fetchJson<WooProduct>(url);
      return this.toScrapedProduct(woo);
    } catch {
      return null;
    }
  }
}
