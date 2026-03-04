import { execSync } from 'child_process';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const ZOOMER_SITE = 'https://zoommer.ge';
const ZOOMER_API = `${ZOOMER_SITE}/api/proxy/v1/Products/v3`;
const ZOOMER_TOKEN_URL = `${ZOOMER_SITE}/api/proxy/connect/token`;

interface ZoomerProduct {
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
  isInStock: boolean;
  hasDiscount: boolean;
  discountPercent: number;
}

interface ZoomerCategory {
  id: number;
  slug: string;
  label: string;
}

const CATEGORIES: ZoomerCategory[] = [
  // Core devices
  { id: 855, slug: 'mobiluri-telefonebi-c855', label: 'ტელეფონები' },
  { id: 877, slug: 'planshetebi-c877', label: 'ტაბლეტები' },
  { id: 717, slug: 'leptopis-brendebi-c717', label: 'ლეპტოპები' },
  { id: 505, slug: 'televizorebi-c505', label: 'ტელევიზორები' },
  { id: 503, slug: 'monitorebi-c503', label: 'მონიტორები' },
  { id: 463, slug: 'gaming-c463', label: 'გეიმინგი' },

  // Audio
  { id: 528, slug: 'audio-sistema-c528', label: 'აუდიო სისტემა' },
  { id: 533, slug: 'yursasmenebi-c533', label: 'ყურსასმენები' },
  { id: 862, slug: 'mikrofoni-c862', label: 'მიკროფონები' },

  // Wearables
  { id: 873, slug: 'smart-saatebi-c873', label: 'სმარტ საათები' },
  { id: 872, slug: 'fitnes-trekerebi-da-aqsesuarebi-c872', label: 'ფიტნეს ტრეკერები' },

  // Accessories
  { id: 538, slug: 'mobiluris-aqsesuarebi-c538', label: 'მობილურის აქსესუარები' },
  { id: 539, slug: 'planshetis-aqsesuarebi-c539', label: 'ტაბლეტის აქსესუარები' },
  { id: 700, slug: 'leptopis-aqsesuarebi-c700', label: 'ლეპტოპის აქსესუარები' },
  { id: 506, slug: 'televizoris-da-monitoris-aqsesuarebi-c506', label: 'TV/მონიტორის აქსესუარები' },
  { id: 970, slug: 'smart-saatis-aqsesuarebi-c970', label: 'საათის აქსესუარები' },
  { id: 1145, slug: 'kabelebi-c1145', label: 'კაბელები' },

  // IT & storage
  { id: 460, slug: 'it-c460', label: 'IT / საოფისე' },
  { id: 519, slug: 'mekhsierebis-matareblebi-c519', label: 'მეხსიერება' },

  // Photo & video
  { id: 858, slug: 'foto-da-video-kamerebi-c858', label: 'ფოტო/ვიდეო კამერები' },
  { id: 864, slug: 'eqshen-kamerebi-c864', label: 'ექშენ კამერები' },
  { id: 865, slug: 'dronebi-da-aqsesuarebi-c865', label: 'დრონები' },
  { id: 881, slug: 'foto-printerebi-c881', label: 'ფოტო პრინტერები' },
  { id: 732, slug: 'foto-video-aqsesuarebi-c732', label: 'ფოტო/ვიდეო აქსესუარები' },

  // Smart home & monitoring
  { id: 474, slug: 'chkviani-sakhli-c474', label: 'ჭკვიანი სახლი' },
  { id: 488, slug: 'monitoringi-c488', label: 'მონიტორინგი' },
  { id: 891, slug: 'media-pleerebi-c891', label: 'მედია პლეერები' },
  { id: 642, slug: 'proeqtorebi-c642', label: 'პროექტორები' },
  { id: 1178, slug: 'smart-ganateba-c1178', label: 'სმარტ განათება' },

  // Home appliances
  { id: 495, slug: 'samzareulo-c495', label: 'სამზარეულო' },
  { id: 490, slug: 'tavis-movla-c490', label: 'პერსონალური მოვლა' },
  { id: 1262, slug: 'tansacmlis-movla-c1262', label: 'ტანსაცმლის მოვლა' },

  // Mobility & other
  { id: 1164, slug: 'smart-gadaadgileba-c1164', label: 'ელექტრო ტრანსპორტი' },
  { id: 481, slug: 'manqanis-aqsesuarebi-c481', label: 'მანქანის აქსესუარები' },
  { id: 469, slug: 'shinauri-ckhovelebi-c469', label: 'შინაური ცხოველები' },
  { id: 776, slug: 'grafikuli-tabebi-c776', label: 'გრაფიკული ტაბები' },
  { id: 1086, slug: 'ebook-c1086', label: 'E-Book' },
  { id: 1188, slug: 'samgzavro-chemodani-c1188', label: 'სამგზავრო ჩემოდანი' },
];

const PAGE_SIZE = 28;

export class ZoomerScraper extends BaseScraper {
  readonly storeName = 'Zoomer';
  private accessToken: string | null = null;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private getAccessToken(): string | null {
    if (this.accessToken) return this.accessToken;
    try {
      const result = execSync(
        `curl -sL -X POST "${ZOOMER_TOKEN_URL}" -H "Authorization: Basic Wm9vbWVyV2ViOmhlc295YW0=" -H "Content-Type: application/x-www-form-urlencoded" -d "grant_type=client_credentials&client_id=ZoomerWeb"`,
        { timeout: 15000 },
      ).toString();
      const data = JSON.parse(result);
      this.accessToken = data.access_token || null;
      return this.accessToken;
    } catch {
      return null;
    }
  }

  private fetchApi(categoryId: number, page: number): { products: ZoomerProduct[]; productsCount: number } | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const url = `${ZOOMER_API}?CategoryId=${categoryId}&Page=${page}&Limit=${PAGE_SIZE}`;
      const result = execSync(
        `curl -sL "${url}" -H "Authorization: Bearer ${token}" -H "accept-language: ka" -H "os: web" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"`,
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

  private toScrapedProduct(p: ZoomerProduct, categoryLabel: string): ScrapedProduct | null {
    if (p.price <= 0) return null;

    return {
      external_id: `zoomer-${p.id}`,
      name: p.name,
      price: p.price,
      category: categoryLabel,
      image_url: p.imageUrl || undefined,
      url: p.route ? `${ZOOMER_SITE}/${p.route}` : undefined,
      in_stock: p.isInStock,
    };
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Zoomer] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<number>();

    // Get auth token first
    const token = this.getAccessToken();
    if (!token) {
      log('Failed to get access token, falling back to SSR scraping');
    } else {
      log('Got access token, using REST API for full pagination');
    }

    for (const cat of CATEGORIES) {
      log(`Category: ${cat.label} (${cat.slug})`);

      if (token) {
        // Use REST API for full pagination
        let page = 1;
        let totalCount = 0;

        while (true) {
          try {
            await this.rateLimiter.acquire();
            const data = this.fetchApi(cat.id, page);
            if (!data || !data.products || data.products.length === 0) break;

            totalCount = data.productsCount;
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

            const totalPages = Math.ceil(totalCount / PAGE_SIZE);
            log(`  Page ${page}/${totalPages}: +${newInPage} (${allProducts.length} total)`);

            if (page >= totalPages || data.products.length < PAGE_SIZE) break;
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
          const html = this.fetchHtmlViaCurl(`${ZOOMER_SITE}/${cat.slug}`);
          if (!html) continue;
          const nextData = this.extractNextData(html);
          if (!nextData) continue;

          const products: ZoomerProduct[] = nextData.props?.pageProps?.initialFilteredProducts?.products || [];
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
      const url = `${ZOOMER_SITE}/search?q=${encodeURIComponent(query)}`;
      const html = this.fetchHtmlViaCurl(url);
      if (!html) return [];
      const nextData = this.extractNextData(html);
      if (!nextData) return [];

      const products: ZoomerProduct[] =
        nextData.props?.pageProps?.initialFilteredProducts?.products || [];

      return products
        .filter((p) => p.price > 0)
        .map((p) => this.toScrapedProduct(p, p.parentCategoryName || ''))
        .filter((p): p is ScrapedProduct => p !== null);
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
