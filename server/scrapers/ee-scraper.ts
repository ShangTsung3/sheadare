import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const EE_BASE = 'https://ee.ge';
const ITEMS_PER_PAGE = 16; // ee.ge returns 16 products per category page, 24 per search page

/**
 * ee.ge (Elite Electronics) is a Next.js SSR site.
 * Product data is embedded in __NEXT_DATA__ JSON on each page.
 *
 * Category URL pattern: /{slug}-c{categoryId}t?page=N
 * Search URL pattern:   /search/{query}?page=N
 * Product URL pattern:  /{slug}-p{productId}
 */

interface EEProduct {
  id: number;
  name: string;
  price: number;
  previousPrice?: number | null;
  barCode?: string;
  imageUrl?: string;
  route?: string;
  storageQuantity?: number;
  categoryId?: number;
  categoryName?: string;
  parentCategoryId?: number;
  brandName?: string;
  hasDiscount?: boolean;
  discountPercent?: number;
  discountAmount?: number;
  onSaleSoon?: boolean;
  disableBuyButton?: boolean;
  isPreOrderProduct?: boolean;
}

interface EECategory {
  slug: string;       // e.g. 'televizori-c73t'
  id: number;         // e.g. 73
  label: string;      // e.g. 'ტელევიზორი'
  parentLabel: string; // e.g. 'ტელევიზორები და აუდიო'
}

// Leaf-level categories (subcategories with actual products)
// Top-level category pages (c29t, c326t, etc.) list subcategory products too,
// but we scrape subcategories to get accurate category labels.
const CATEGORIES: EECategory[] = [
  // მობილურები და ჭკვიანი ტექნიკა (Mobiles & Smart Tech) - parent c29
  { slug: 'mobiluri-telefoni-c377t', id: 377, label: 'მობილური ტელეფონი', parentLabel: 'მობილურები და ჭკვიანი ტექნიკა' },
  { slug: 'buds-c127t', id: 127, label: 'Buds', parentLabel: 'მობილურები და ჭკვიანი ტექნიკა' },
  { slug: 'smart-watch-c147t', id: 147, label: 'Smart Watch', parentLabel: 'მობილურები და ჭკვიანი ტექნიკა' },
  { slug: 'portatuli-damteni-c137t', id: 137, label: 'პორტატული დამტენი', parentLabel: 'მობილურები და ჭკვიანი ტექნიკა' },

  // ტელევიზორები და აუდიო (TV & Audio) - parent c326
  { slug: 'televizori-c73t', id: 73, label: 'ტელევიზორი', parentLabel: 'ტელევიზორები და აუდიო' },
  { slug: 'headphones-c134t', id: 134, label: 'Headphones', parentLabel: 'ტელევიზორები და აუდიო' },
  { slug: 'saxlis-kinoteatri-da-saundbar-c189t', id: 189, label: 'სახლის კინოთეატრი და საუნდბარი', parentLabel: 'ტელევიზორები და აუდიო' },

  // საყოფაცხოვრებო ტექნიკა (Household Appliances) - parent c16
  { slug: 'macivari-c4t', id: 4, label: 'მაცივარი', parentLabel: 'საყოფაცხოვრებო ტექნიკა' },
  { slug: 'sarecxi-manqana-c9t', id: 9, label: 'სარეცხი მანქანა', parentLabel: 'საყოფაცხოვრებო ტექნიკა' },
  { slug: 'kondensirebuli-sashrobi-c12t', id: 12, label: 'კონდენსირებული საშრობი', parentLabel: 'საყოფაცხოვრებო ტექნიკა' },
  { slug: 'chamontazhebuli-teqnika-c15t', id: 15, label: 'ჩამონტაჟებული ტექნიკა', parentLabel: 'საყოფაცხოვრებო ტექნიკა' },
  { slug: 'kondicioneri-c71t', id: 71, label: 'კონდიციონერი', parentLabel: 'საყოფაცხოვრებო ტექნიკა' },
  { slug: 'mtversasruti-c75t', id: 75, label: 'მტვერსასრუტი', parentLabel: 'საყოფაცხოვრებო ტექნიკა' },

  // წვრილი სამზარეულოს ტექნიკა (Small Kitchen Appliances) - parent c30
  { slug: 'yavis-aparati-c201t', id: 201, label: 'ყავის აპარატი', parentLabel: 'წვრილი სამზარეულოს ტექნიკა' },
  { slug: 'air-fryer-c195t', id: 195, label: 'Air Fryer', parentLabel: 'წვრილი სამზარეულოს ტექნიკა' },

  // თავის მოვლა (Hair Care) - parent c311
  { slug: 'hair-styler-c108t', id: 108, label: 'Hair Styler', parentLabel: 'თავის მოვლა' },

  // კომპიუტერები და გეიმინგი (Computers & Gaming) - parent c27
  { slug: 'notebook-c58t', id: 58, label: 'Notebook', parentLabel: 'კომპიუტერები და გეიმინგი' },
  { slug: 'gaming-c333t', id: 333, label: 'Gaming', parentLabel: 'კომპიუტერები და გეიმინგი' },

  // ფოტო, ვიდეო და გართობა (Photo, Video & Entertainment) - parent c328
  { slug: 'foto-da-video-c328t', id: 328, label: 'ფოტო და ვიდეო', parentLabel: 'ფოტო, ვიდეო და გართობა' },

  // ავეჯი (Furniture) - parent c26
  { slug: 'aveji-c26t', id: 26, label: 'ავეჯი', parentLabel: 'ავეჯი' },
];

export class EEScraper extends BaseScraper {
  readonly storeName = 'EE';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private async fetchPage(url: string): Promise<string> {
    const res = await this.fetchWithRateLimit(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ka,en;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  }

  /**
   * Extract __NEXT_DATA__ JSON from the HTML page.
   * Returns the parsed pageProps object.
   */
  private extractNextData(html: string): any {
    const $ = cheerio.load(html);
    const scriptEl = $('script#__NEXT_DATA__');
    if (!scriptEl.length) {
      throw new Error('__NEXT_DATA__ script not found');
    }
    const json = JSON.parse(scriptEl.text());
    return json?.props?.pageProps || {};
  }

  /**
   * Parse EE product objects into ScrapedProduct format.
   */
  private mapProducts(products: EEProduct[], categoryLabel: string): ScrapedProduct[] {
    const results: ScrapedProduct[] = [];

    for (const p of products) {
      if (!p.name || !p.price || p.price <= 0) continue;

      // Skip out-of-stock or pre-order-only items
      if (p.disableBuyButton && !p.isPreOrderProduct) continue;

      const imageUrl = p.imageUrl
        ? (p.imageUrl.startsWith('http') ? p.imageUrl : `https://static.ee.ge/Elite/${p.imageUrl}`)
        : undefined;

      const productUrl = p.route
        ? `${EE_BASE}/${p.route}`
        : undefined;

      // Use categoryName from product data if available, fallback to provided label
      const category = p.categoryName || categoryLabel;

      results.push({
        external_id: `ee-${p.id}`,
        name: p.name.trim(),
        price: p.price,
        category,
        brand: p.brandName || undefined,
        image_url: imageUrl,
        url: productUrl,
        in_stock: (p.storageQuantity ?? 0) > 0,
      });
    }

    return results;
  }

  /**
   * Fetch products from a category page with pagination.
   * Returns total product count so we know how many pages to fetch.
   */
  private async fetchCategoryPage(slug: string, page: number): Promise<{ products: EEProduct[]; totalCount: number }> {
    const url = page === 1
      ? `${EE_BASE}/${slug}`
      : `${EE_BASE}/${slug}?page=${page}`;

    const html = await this.fetchPage(url);
    const pageProps = this.extractNextData(html);

    const listingData = pageProps.initialListingData || pageProps.listingData || {};
    const products: EEProduct[] = listingData.products || [];
    const totalCount: number = listingData.productsCount || 0;

    return { products, totalCount };
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[EE] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    for (const cat of CATEGORIES) {
      log(`Category: ${cat.label} (${cat.slug})`);

      let page = 1;
      let totalCount = 0;

      while (true) {
        try {
          const result = await this.fetchCategoryPage(cat.slug, page);
          const products = this.mapProducts(result.products, cat.label);

          if (page === 1) {
            totalCount = result.totalCount;
            const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
            log(`  ${totalCount} products, ${totalPages} pages`);
          }

          if (products.length === 0) break;

          let newInPage = 0;
          for (const p of products) {
            if (seen.has(p.external_id)) continue;
            seen.add(p.external_id);
            allProducts.push(p);
            newInPage++;
          }

          log(`  page ${page}: +${newInPage} new (${allProducts.length} total)`);

          // Check if we've fetched all pages
          const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
          if (page >= totalPages || products.length === 0) break;
          page++;
        } catch (err) {
          log(`  Error on page ${page}: ${err}`);
          break;
        }
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      // ee.ge search: /search/{query}?page=N (24 results per page)
      const url = `${EE_BASE}/search/${encodeURIComponent(query)}`;
      const html = await this.fetchPage(url);
      const pageProps = this.extractNextData(html);

      const listingData = pageProps.initialListingData || pageProps.listingData || {};
      const products: EEProduct[] = listingData.products || [];

      return this.mapProducts(products, '');
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    // Extract numeric ID from 'ee-{id}' format
    const match = externalId.match(/^ee-(\d+)$/);
    if (!match) return null;

    const productId = match[1];

    try {
      // We don't have a direct product lookup API — search won't reliably find it.
      // Product pages have dynamic routes, so we'd need the slug.
      // For now, return null. Could be extended with a DB lookup for the stored URL.
      return null;
    } catch {
      return null;
    }
  }
}
