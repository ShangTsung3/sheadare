import { execSync } from 'child_process';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const GPC_BASE = 'https://gpc.ge';

// Category 26 = Medication
const CATEGORY_ID = 26;
const PRODUCTS_PER_PAGE = 24; // GPC default

interface GpcProduct {
  id: number;
  price: string;
  initialPrice: string;
  fullName: string;
  name: string;
  imageUrl: string;
  shape: string;
  numerus: number;
  medicamentCharacteristic?: {
    dose: string;
    shape: string;
    numerus: number;
    generic: string;
    manufacturer: string;
  };
}

export class GpcScraper extends BaseScraper {
  readonly storeName = 'GPC';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private fetchHtmlViaCurl(url: string): string | null {
    try {
      const html = execSync(
        `curl -sL -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Accept: text/html" -H "Accept-Language: ka,en;q=0.9" "${url}"`,
        { timeout: 30000, maxBuffer: 20 * 1024 * 1024 },
      ).toString();
      return html;
    } catch {
      return null;
    }
  }

  private extractProductsFromHtml(html: string): { products: GpcProduct[], hasMore: boolean } {
    const products: GpcProduct[] = [];

    // Find the self.__next_f.push chunk containing "searchResult"
    const chunks = html.match(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g);
    if (!chunks) return { products, hasMore: false };

    for (const chunk of chunks) {
      if (!chunk.includes('searchResult')) continue;

      // Extract the content between push([1," and "])
      const match = chunk.match(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/);
      if (!match) continue;

      // Unescape the string (Next.js RSC flight data)
      let content = match[1];
      // RSC flight data uses escaped quotes and unicode
      content = content.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');

      // Find the searchResult JSON array
      const searchResultMatch = content.match(/"searchResult":\[([\s\S]*?)\],"[a-zA-Z]/);
      if (!searchResultMatch) continue;

      try {
        // Parse individual product objects from the array
        const arrayStr = '[' + searchResultMatch[1] + ']';
        const parsed = JSON.parse(arrayStr);

        for (const item of parsed) {
          if (item && typeof item === 'object' && item.id && item.price) {
            products.push(item);
          }
        }
      } catch {
        // Try parsing products individually via regex
        const productMatches = content.matchAll(/\{"id":(\d+),"price":"([^"]+)"[\s\S]*?"fullName":"([^"]*)"[\s\S]*?(?:"medicamentCharacteristic":\{[^}]*\})?/g);
        for (const pm of productMatches) {
          try {
            // Extract a complete object
            const idStart = content.indexOf(`"id":${pm[1]}`);
            if (idStart === -1) continue;
            // Find the complete object boundaries
            let depth = 0;
            let objStart = content.lastIndexOf('{', idStart);
            let objEnd = objStart;
            for (let i = objStart; i < content.length; i++) {
              if (content[i] === '{') depth++;
              if (content[i] === '}') depth--;
              if (depth === 0) { objEnd = i + 1; break; }
            }
            const objStr = content.slice(objStart, objEnd);
            const parsed = JSON.parse(objStr);
            if (parsed.id && parsed.price) {
              products.push(parsed);
            }
          } catch {
            // Skip unparseable products
          }
        }
      }

      break; // Found the chunk
    }

    return { products, hasMore: products.length >= PRODUCTS_PER_PAGE };
  }

  private mapProduct(item: GpcProduct): ScrapedProduct | null {
    const name = item.fullName?.trim() || item.name?.trim();
    if (!name) return null;

    const price = parseFloat(item.price);
    if (!price || price <= 0) return null;

    const chars = item.medicamentCharacteristic;

    return {
      external_id: `gpc-${item.id}`,
      name,
      price,
      category: 'მედიკამენტები',
      image_url: item.imageUrl || undefined,
      url: `${GPC_BASE}/ka/product/${item.id}`,
      in_stock: true,
      active_ingredient: chars?.generic || undefined,
      dose: chars?.dose || undefined,
      dosage_form: chars?.shape || item.shape || undefined,
      quantity: (chars?.numerus || item.numerus)?.toString() || undefined,
    };
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[GPC] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();
    let page = 1;
    const MAX_PAGES = 200;

    log('Starting GPC medication scrape...');

    while (page <= MAX_PAGES) {
      await this.rateLimiter.acquire();

      const url = `${GPC_BASE}/ka/category/medication?category=${CATEGORY_ID}&page=${page}`;
      const html = this.fetchHtmlViaCurl(url);

      if (!html) {
        log(`  Failed to fetch page ${page}`);
        break;
      }

      const { products, hasMore } = this.extractProductsFromHtml(html);

      if (products.length === 0) {
        log(`  Page ${page}: no products found, stopping`);
        break;
      }

      let newCount = 0;
      for (const item of products) {
        const product = this.mapProduct(item);
        if (product && !seen.has(product.external_id)) {
          seen.add(product.external_id);
          allProducts.push(product);
          newCount++;
        }
      }

      if (page % 10 === 0 || !hasMore) {
        log(`  Page ${page}: +${newCount} (${allProducts.length} total)`);
      }

      if (!hasMore) break;
      page++;
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      await this.rateLimiter.acquire();
      const url = `${GPC_BASE}/ka/search?text=${encodeURIComponent(query)}`;
      const html = this.fetchHtmlViaCurl(url);
      if (!html) return [];

      const { products } = this.extractProductsFromHtml(html);
      return products
        .map(item => this.mapProduct(item))
        .filter(Boolean) as ScrapedProduct[];
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
