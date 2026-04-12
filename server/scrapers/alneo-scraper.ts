import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const ALNEO_BASE = 'https://alneo.ge';
const ALNEO_API = `${ALNEO_BASE}/wp-json/wc/store/v1`;
const PER_PAGE = 100;

interface AlneoApiProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  permalink: string;
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

interface AlneoApiCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}

export class AlneoScraper extends BaseScraper {
  readonly storeName = 'Alneo';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private async apiFetch<T>(path: string): Promise<{ data: T; totalPages: number }> {
    const url = `${ALNEO_API}${path}`;
    const res = await this.fetchWithRateLimit(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Alneo API ${res.status}: ${url}`);
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
    const data = await res.json() as T;
    return { data, totalPages };
  }

  /** Fetch all categories from the WooCommerce Store API */
  private async fetchCategories(): Promise<AlneoApiCategory[]> {
    const allCats: AlneoApiCategory[] = [];
    let page = 1;
    while (true) {
      const { data, totalPages } = await this.apiFetch<AlneoApiCategory[]>(
        `/products/categories?per_page=100&page=${page}`
      );
      allCats.push(...data);
      if (page >= totalPages || data.length === 0) break;
      page++;
    }
    return allCats;
  }

  /** Fetch a page of products, optionally filtered by category */
  private async fetchProducts(page: number, categoryId?: number): Promise<{ products: AlneoApiProduct[]; totalPages: number }> {
    let path = `/products?per_page=${PER_PAGE}&page=${page}`;
    if (categoryId) {
      path += `&category=${categoryId}`;
    }
    const { data, totalPages } = await this.apiFetch<AlneoApiProduct[]>(path);
    return { products: data, totalPages };
  }

  private mapProduct(p: AlneoApiProduct): ScrapedProduct {
    // Prices are strings with no minor units (currency_minor_unit: 0)
    const price = parseInt(p.prices.price, 10) || 0;
    const categoryName = p.categories?.[0]?.name || '';
    const imageUrl = p.images?.[0]?.src || p.images?.[0]?.thumbnail || '';

    return {
      external_id: `alneo-${p.id}`,
      name: p.name,
      price,
      category: categoryName,
      image_url: imageUrl || undefined,
      url: p.permalink || `${ALNEO_BASE}/product/${p.slug}/`,
      in_stock: p.is_in_stock,
    };
  }

  /** Scrape ALL products using the WooCommerce Store API */
  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Alneo] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<number>();

    log('Fetching all products via WooCommerce Store API...');

    let page = 1;
    while (true) {
      try {
        const { products, totalPages } = await this.fetchProducts(page);

        if (products.length === 0) break;

        let newInPage = 0;
        for (const p of products) {
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          const mapped = this.mapProduct(p);
          if (mapped.price > 0) {
            allProducts.push(mapped);
            newInPage++;
          }
        }

        log(`Page ${page}/${totalPages}: +${newInPage} new (${allProducts.length} total)`);

        if (page >= totalPages) break;
        page++;
      } catch (err) {
        log(`Error on page ${page}: ${err}`);
        break;
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  /** Fallback HTML scraper for search (WooCommerce search page) */
  private parseProductsFromHtml(html: string): ScrapedProduct[] {
    const $ = cheerio.load(html);
    const products: ScrapedProduct[] = [];

    $('li.product').each((_, el) => {
      const $el = $(el);

      // Product link & URL
      const $link = $el.find('a').first();
      const productUrl = $link.attr('href') || '';

      // Name
      const name = $el.find('.woocommerce-loop-product__title').text().trim();
      if (!name) return;

      // Extract ID from URL slug or add-to-cart button
      const $cartBtn = $el.find('a.add_to_cart_button, a[data-product_id]');
      const productId = $cartBtn.attr('data-product_id') || '';
      if (!productId) return;

      // Price - get the last .woocommerce-Price-amount (sale price if on sale)
      const $prices = $el.find('.woocommerce-Price-amount bdi');
      const priceText = $prices.last().text().replace(/[₾,\s]/g, '').trim();
      const price = parseFloat(priceText) || 0;
      if (price <= 0) return;

      // Image
      const imageUrl = $el.find('img').first().attr('src') || '';

      // SKU
      const sku = $el.find('.sku').text().trim();

      products.push({
        external_id: `alneo-${productId}`,
        name,
        price,
        image_url: imageUrl || undefined,
        url: productUrl || undefined,
        in_stock: true,
      });
    });

    return products;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      // Use the Store API search
      const { data } = await this.apiFetch<AlneoApiProduct[]>(
        `/products?search=${encodeURIComponent(query)}&per_page=30`
      );
      return data.map(p => this.mapProduct(p)).filter(p => p.price > 0);
    } catch {
      // Fallback: scrape HTML search results
      try {
        const res = await this.fetchWithRateLimit(`${ALNEO_BASE}/?s=${encodeURIComponent(query)}&post_type=product`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html',
          },
        });
        if (!res.ok) return [];
        const html = await res.text();
        return this.parseProductsFromHtml(html);
      } catch {
        return [];
      }
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    try {
      const id = externalId.replace('alneo-', '');
      const { data } = await this.apiFetch<AlneoApiProduct>(`/products/${id}`);
      return this.mapProduct(data);
    } catch {
      return null;
    }
  }
}
