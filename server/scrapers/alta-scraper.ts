import { execSync } from 'child_process';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const ALTA_SITE = 'https://alta.ge';
const ALTA_API = 'https://api.alta.ge/v1/Products/v4';
const ALTA_TOKEN_URL = 'https://api.alta.ge/connect/token';

interface AltaProduct {
  id: number;
  name: string;
  barCode: string | null;
  price: number;
  previousPrice: number | null;
  categoryId: number;
  categoryName: string;
  parentCategoryName: string;
  imageUrl: string | null;
  route: string | null;
  storageQuantity: number;
  disableBuyButton: boolean;
  hasDiscount: boolean;
  discountPercent: number;
  brandName: string | null;
}

interface AltaCategory {
  id: number;
  path: string;
  label: string;
}

const CATEGORIES: AltaCategory[] = [
  { id: 16, path: 'mobiluri-telefonebi-da-aqsesuarebi/mobiluri-telefonebi-c16s', label: 'ტელეფონები' },
  { id: 41, path: 'kompiuteruli-teqnika-da-aqsesuarebi/tabi-c41s', label: 'ტაბლეტები' },
  { id: 34, path: 'kompiuteruli-teqnika-da-aqsesuarebi/noutbuqi-c34s', label: 'ლეპტოპები' },
  { id: 88, path: 'televizorebi-da-audio-sistemebi/televizori-c88s', label: 'ტელევიზორები' },
  { id: 95, path: 'televizorebi-da-audio-sistemebi/audio-sistemebi-c95s', label: 'აუდიო' },
  { id: 99, path: 'geimingi/satamasho-konsolebi-c99s', label: 'გეიმინგი' },
  { id: 49, path: 'kompiuteruli-teqnika-da-aqsesuarebi/monitori-c49s', label: 'მონიტორები' },
];

const PAGE_SIZE = 28;

export class AltaScraper extends BaseScraper {
  readonly storeName = 'Alta';
  private accessToken: string | null = null;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private getAccessToken(): string | null {
    if (this.accessToken) return this.accessToken;
    try {
      // Alta sets an access token cookie when you visit the site
      // Extract it from the cookie since api.alta.ge has Cloudflare
      const cookieOutput = execSync(
        `curl -sL -c - "https://alta.ge" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o /dev/null`,
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      ).toString();

      // Parse the alta-access_token cookie
      const match = cookieOutput.match(/alta-access_token\s+(.+)/);
      if (match) {
        const decoded = decodeURIComponent(match[1].trim());
        const parsed = JSON.parse(decoded);
        this.accessToken = parsed.token || null;
        return this.accessToken;
      }
      return null;
    } catch {
      return null;
    }
  }

  private fetchApi(categoryId: number, page: number): { products: AltaProduct[]; productsCount: number; hasNextPage: boolean } | null {
    const token = this.accessToken;
    if (!token) return null;
    try {
      // Use alta.ge proxy to avoid Cloudflare on api.alta.ge
      const url = `${ALTA_API}?CategoryId=${categoryId}&Page=${page}&Limit=${PAGE_SIZE}`;
      const result = execSync(
        `curl -sL "${url}" -H "Authorization: Bearer ${token}" -H "accept-language: ka" -H "os: web" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"`,
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      ).toString();
      return JSON.parse(result);
    } catch {
      return null;
    }
  }

  private fetchHtmlViaCurl(url: string): string | null {
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

  private extractNextData(html: string): any {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }

  private toScrapedProduct(p: AltaProduct, categoryLabel: string): ScrapedProduct | null {
    if (p.price <= 0) return null;

    return {
      external_id: `alta-${p.id}`,
      name: p.name,
      price: p.price,
      category: categoryLabel,
      image_url: p.imageUrl || undefined,
      brand: p.brandName || undefined,
      url: p.route ? `${ALTA_SITE}/${p.route}` : undefined,
      in_stock: p.storageQuantity > 0 && !p.disableBuyButton,
    };
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Alta] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<number>();

    const token = this.getAccessToken();
    if (!token) {
      log('Failed to get access token, falling back to SSR scraping');
    } else {
      log('Got access token, using REST API for full pagination');
    }

    for (const cat of CATEGORIES) {
      log(`Category: ${cat.label} (${cat.path})`);

      if (token) {
        // Use REST API for full pagination
        let page = 1;

        while (true) {
          try {
            await this.rateLimiter.acquire();
            const data = this.fetchApi(cat.id, page);
            if (!data || !data.products || data.products.length === 0) break;

            let newInPage = 0;
            for (const p of data.products) {
              if (seen.has(p.id)) continue;
              seen.add(p.id);
              const scraped = this.toScrapedProduct(p, cat.label);
              if (scraped) {
                allProducts.push(scraped);
                newInPage++;
              }
            }

            const totalPages = Math.ceil(data.productsCount / PAGE_SIZE);
            log(`  Page ${page}/${totalPages}: +${newInPage} (${allProducts.length} total)`);

            if (!data.hasNextPage || page >= totalPages) break;
            page++;
          } catch (err) {
            log(`  Error page ${page}: ${err}`);
            break;
          }
        }
      } else {
        // Fallback: SSR first page only
        try {
          await this.rateLimiter.acquire();
          const html = this.fetchHtmlViaCurl(`${ALTA_SITE}/${cat.path}`);
          if (!html) continue;
          const nextData = this.extractNextData(html);
          if (!nextData) continue;

          const products: AltaProduct[] = nextData.props?.pageProps?.initialListingData?.products || [];
          let newInPage = 0;
          for (const p of products) {
            if (seen.has(p.id)) continue;
            seen.add(p.id);
            const scraped = this.toScrapedProduct(p, cat.label);
            if (scraped) { allProducts.push(scraped); newInPage++; }
          }
          log(`  +${newInPage} products (SSR fallback, first page only)`);
        } catch (err) {
          log(`  Error: ${err}`);
        }
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      const url = `${ALTA_SITE}/search?q=${encodeURIComponent(query)}`;
      const html = this.fetchHtmlViaCurl(url);
      if (!html) return [];
      const nextData = this.extractNextData(html);
      if (!nextData) return [];

      const products: AltaProduct[] =
        nextData.props?.pageProps?.initialListingData?.products || [];

      return products
        .filter((p) => p.price > 0)
        .map((p) => this.toScrapedProduct(p, p.categoryName || ''))
        .filter((p): p is ScrapedProduct => p !== null);
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
