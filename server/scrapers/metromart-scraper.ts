import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const METRO_SITE = 'https://metromart.ge';

interface MetroCategory {
  path: string;
  label: string;
}

const CATEGORIES: MetroCategory[] = [
  // Phones (112)
  { path: '/shop/category/Mobile-Phones-Smartphones-384', label: 'სმარტფონები' },

  // Laptops (23)
  { path: '/shop/category/Laptops-716', label: 'ლეპტოპები' },

  // TVs (94)
  { path: '/shop/category/Smart-TV-454', label: 'სმარტ ტელევიზორები' },
  { path: '/shop/category/Non-Smart-TV-456', label: 'ტელევიზორები' },

  // Audio (49)
  { path: '/shop/category/Wireless-Headphones-Earbuds-505', label: 'უსადენო ყურსასმენები' },
  { path: '/shop/category/Wired-Headphones-504', label: 'სადენიანი ყურსასმენები' },

  // Gaming (9)
  { path: '/shop/category/Gaming-Consoles-411', label: 'გეიმინგ კონსოლები' },
  { path: '/shop/category/Controllers-Accessories-412', label: 'კონტროლერები' },

  // Home Appliances - Major (389)
  { path: '/shop/category/Refrigerators-349', label: 'მაცივრები' },
  { path: '/shop/category/Washing-Machines-351', label: 'სარეცხი მანქანები' },
  { path: '/shop/category/Dryers-353', label: 'საშრობი მანქანები' },
  { path: '/shop/category/Dishwashers-355', label: 'ჭურჭლის სარეცხი' },
  { path: '/shop/category/Ovens-361', label: 'ღუმელები' },
  { path: '/shop/category/Range-Hoods-365', label: 'გამწოვები' },
  { path: '/shop/category/Microwaves-367', label: 'მიკროტალღური' },

  // Home Appliances - Small (82)
  { path: '/shop/category/Irons-Steamers-373', label: 'უთოები' },
  { path: '/shop/category/Air-Conditioners-375', label: 'კონდიციონერები' },
  { path: '/shop/category/Heaters-377', label: 'გამათბობლები' },

  // Kitchen Appliances (86)
  { path: '/shop/category/Kettles-535', label: 'ჩაიდნები' },
  { path: '/shop/category/Blenders-Mixers-537', label: 'ბლენდერები' },
  { path: '/shop/category/Coffee-Machines-539', label: 'ყავის აპარატები' },

  // Personal Care (17)
  { path: '/shop/category/Hair-Dryers-Stylers-427', label: 'ფენი/სტაილერი' },
  { path: '/shop/category/Shavers-Trimmers-425', label: 'საპარსი/ტრიმერი' },
];

export class MetroMartScraper extends BaseScraper {
  readonly storeName = 'MetroMart';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private fetchHtml(url: string): string | null {
    try {
      const html = execSync(
        `curl -sL -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Accept: text/html" -H "Accept-Language: ka,en;q=0.9" "${url}"`,
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      ).toString();
      return html;
    } catch {
      return null;
    }
  }

  private async fetchProductCards(productIds: number[], page: number, log?: (msg: string) => void): Promise<Map<number, string>> {
    const results = new Map<number, string>();
    const batchSize = 5;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      const promises = batch.map(async (productId) => {
        try {
          const payload = JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            id: productId,
            params: { product_id: productId, view_mode: 'grid', page },
          });
          const resp = await fetch(`${METRO_SITE}/render-category-product-frame`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            body: payload,
            signal: AbortSignal.timeout(10000),
          });
          const json = await resp.json() as any;
          if (json?.result?.html) {
            results.set(productId, json.result.html);
          }
        } catch {
          // Skip failed products
        }
      });
      await Promise.all(promises);
      if (log) {
        log(`    Fetched ${Math.min(i + batchSize, productIds.length)}/${productIds.length} cards`);
      }
      // Small delay between batches to avoid overwhelming the server
      await new Promise(r => setTimeout(r, 200));
    }
    return results;
  }

  private parseProductCard(html: string, categoryLabel: string): ScrapedProduct | null {
    try {
      const $ = cheerio.load(html);

      // Extract from hidden data spans
      const name = $('span.data-product-info').text().trim();
      if (!name) return null;

      const priceText = $('span.data-product-price').text().trim();
      const price = parseFloat(priceText);
      if (!price || price <= 0) return null;

      const brand = $('span.data-product-brand').text().trim() || undefined;
      const metroId = $('span.data-product-id').text().trim();
      const fullCategory = $('span.data-product-category').text().trim();

      // Product URL
      const href = $('a[itemprop="url"], a.img-product').attr('href') || '';
      const url = href ? `${METRO_SITE}${href.split('?')[0]}` : undefined;

      // Image URL
      const imgSrc = $('img[itemprop="image"]').attr('src') || '';
      const imageUrl = imgSrc ? `${METRO_SITE}${imgSrc}` : undefined;

      // Template ID from image URL or product URL
      const templateMatch = imgSrc.match(/product\.template\/(\d+)/) || href.match(/-(\d+)(?:\?|$)/);
      const templateId = templateMatch?.[1] || metroId;

      return {
        external_id: `metromart-${templateId}`,
        name: name.replace(/^\[\d+\]\s*/, ''), // Remove [SKU] prefix
        price: Math.round(price * 100) / 100,
        category: categoryLabel || fullCategory,
        image_url: imageUrl,
        brand,
        url,
        in_stock: true,
      };
    } catch {
      return null;
    }
  }

  private extractProductIds(html: string): number[] {
    const $ = cheerio.load(html);
    const ids: number[] = [];
    $('div[product-id]').each((_, el) => {
      const id = parseInt($(el).attr('product-id') || '', 10);
      if (id > 0) ids.push(id);
    });
    return ids;
  }

  private extractPagination(html: string): { maxPage: number; baseUrl: string | null } {
    const $ = cheerio.load(html);
    let maxPage = 1;
    let baseUrl: string | null = null;
    $('ul.pagination li a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const match = href.match(/(.+)\/page\/(\d+)/);
      if (match) {
        if (!baseUrl) baseUrl = match[1];
        const p = parseInt(match[2], 10);
        if (p > maxPage) maxPage = p;
      }
    });
    return { maxPage, baseUrl };
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[MetroMart] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    for (const cat of CATEGORIES) {
      log(`Category: ${cat.label} (${cat.path})`);

      try {
        // Fetch first page to get product IDs and page count
        log(`  Fetching page 1...`);
        const firstPageHtml = this.fetchHtml(`${METRO_SITE}${cat.path}`);
        if (!firstPageHtml) {
          log(`  Failed to fetch ${cat.path}`);
          continue;
        }
        log(`  Page 1 HTML: ${firstPageHtml.length} chars`);

        const { maxPage: totalPages, baseUrl: paginationBase } = this.extractPagination(firstPageHtml);
        let allProductIds: number[] = this.extractProductIds(firstPageHtml);
        log(`  Page 1: ${allProductIds.length} IDs, ${totalPages} total pages`);

        // Fetch remaining pages to get all product IDs (no rate limiting — lightweight HTML only)
        for (let page = 2; page <= totalPages; page++) {
          const pageUrl = paginationBase
            ? `${METRO_SITE}${paginationBase}/page/${page}`
            : `${METRO_SITE}${cat.path}/page/${page}`;
          const pageHtml = this.fetchHtml(pageUrl);
          if (pageHtml) {
            allProductIds.push(...this.extractProductIds(pageHtml));
          }
        }

        log(`  Found ${allProductIds.length} products across ${totalPages} pages`);

        // Fetch product cards via JSON-RPC in parallel batches
        const cardMap = await this.fetchProductCards(allProductIds, 1, log);

        let newCount = 0;
        for (const [, cardHtml] of cardMap) {
          const product = this.parseProductCard(cardHtml, cat.label);
          if (!product) continue;

          if (seen.has(product.external_id)) continue;
          seen.add(product.external_id);
          allProducts.push(product);
          newCount++;
        }

        log(`  +${newCount} products (${allProducts.length} total)`);
      } catch (err) {
        log(`  Error in ${cat.label}: ${err}`);
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      await this.rateLimiter.acquire();
      const html = this.fetchHtml(`${METRO_SITE}/shop?search=${encodeURIComponent(query)}`);
      if (!html) return [];

      const productIds = this.extractProductIds(html).slice(0, 10);
      const cardMap = await this.fetchProductCards(productIds, 1);
      const results: ScrapedProduct[] = [];

      for (const [, cardHtml] of cardMap) {
        const product = this.parseProductCard(cardHtml, '');
        if (product) results.push(product);
      }

      return results;
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
