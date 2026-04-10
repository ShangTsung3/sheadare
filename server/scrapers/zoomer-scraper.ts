import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const ZOOMER_SITE = 'https://zoommer.ge';
const ZOOMER_API = `${ZOOMER_SITE}/api/proxy/v1/Products/v3`;

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
  routeGe: string | null;
  isInStock: boolean;
  hasDiscount: boolean;
  discountPercent: number;
}

interface ZoomerApiResponse {
  products: ZoomerProduct[];
  productsCount: number;
  categories?: unknown[];
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
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class ZoomerScraper extends BaseScraper {
  readonly storeName = 'Zoomer';
  private cookieHeader: string | null = null;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  /**
   * Fetch the homepage to obtain the session cookie (zoommer-access_token).
   * The old /api/proxy/connect/token endpoint now returns CSRF errors,
   * so we rely on the cookie that the site sets on the first HTML page load.
   */
  private async obtainSessionCookie(): Promise<string | null> {
    if (this.cookieHeader) return this.cookieHeader;
    try {
      const resp = await fetch(ZOOMER_SITE, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'ka,en;q=0.9' },
        redirect: 'follow',
      });
      const setCookies = resp.headers.getSetCookie?.() || [];
      // Extract all cookies and join them for the Cookie header
      const cookies: string[] = [];
      for (const sc of setCookies) {
        const nameVal = sc.split(';')[0]; // e.g. "zoommer-access_token=..."
        if (nameVal) cookies.push(nameVal);
      }
      if (cookies.length > 0) {
        this.cookieHeader = cookies.join('; ');
        return this.cookieHeader;
      }
      // Fallback: parse raw set-cookie from headers (for older Node.js)
      const raw = resp.headers.get('set-cookie');
      if (raw) {
        const tokenMatch = raw.match(/zoommer-access_token=([^;]+)/);
        if (tokenMatch) {
          this.cookieHeader = `zoommer-access_token=${tokenMatch[1]}`;
          return this.cookieHeader;
        }
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Fetch products from the Zoommer API proxy using cookie auth.
   */
  private async fetchApi(params: Record<string, string | number>): Promise<ZoomerApiResponse | null> {
    const cookie = await this.obtainSessionCookie();
    if (!cookie) return null;

    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      qs.set(k, String(v));
    }
    const url = `${ZOOMER_API}?${qs.toString()}`;

    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ka',
          'os': 'web',
          'Cookie': cookie,
          'Referer': ZOOMER_SITE,
        },
      });
      if (!resp.ok) return null;
      const text = await resp.text();
      if (!text) return null;
      return JSON.parse(text) as ZoomerApiResponse;
    } catch {
      return null;
    }
  }

  /**
   * Fallback: extract products from __NEXT_DATA__ in server-rendered HTML.
   * Only gets the first page (28 products) per category.
   */
  private async fetchSsr(categorySlug: string): Promise<{ products: ZoomerProduct[]; productsCount: number } | null> {
    try {
      const resp = await fetch(`${ZOOMER_SITE}/${categorySlug}`, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'ka,en;q=0.9' },
      });
      const html = await resp.text();
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      if (!match) return null;
      const data = JSON.parse(match[1]);
      const fp = data.props?.pageProps?.initialFilteredProducts;
      if (!fp) return null;
      return { products: fp.products || [], productsCount: fp.productsCount || 0 };
    } catch {
      return null;
    }
  }

  private toScrapedProduct(p: ZoomerProduct, categoryLabel: string): ScrapedProduct | null {
    if (p.price <= 0) return null;
    const route = p.route || p.routeGe;
    return {
      external_id: `zoomer-${p.id}`,
      name: p.name,
      price: p.price,
      category: categoryLabel,
      image_url: p.imageUrl || undefined,
      url: route ? `${ZOOMER_SITE}/${route}` : undefined,
      in_stock: p.isInStock,
    };
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Zoomer] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<number>();

    // Try to get session cookie for API access
    const cookie = await this.obtainSessionCookie();
    const useApi = !!cookie;

    if (useApi) {
      log('Got session cookie, using REST API with full pagination');
    } else {
      log('Failed to get session cookie, falling back to SSR scraping (first page only)');
    }

    for (const cat of CATEGORIES) {
      log(`Category: ${cat.label} (${cat.slug})`);

      if (useApi) {
        let page = 1;
        let totalCount = 0;

        while (true) {
          try {
            await this.rateLimiter.acquire();
            const data = await this.fetchApi({ CategoryId: cat.id, Page: page, Limit: PAGE_SIZE });
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
          const result = await this.fetchSsr(cat.slug);
          if (!result) continue;

          let newInPage = 0;
          for (const p of result.products) {
            if (seen.has(p.id)) continue;
            seen.add(p.id);
            const scraped = this.toScrapedProduct(p, cat.label);
            if (scraped) {
              allProducts.push(scraped);
              newInPage++;
            }
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
      // Try API first
      const data = await this.fetchApi({ Name: query, Page: 1, Limit: PAGE_SIZE });
      if (data?.products?.length) {
        return data.products
          .filter((p) => p.price > 0)
          .map((p) => this.toScrapedProduct(p, p.parentCategoryName || ''))
          .filter((p): p is ScrapedProduct => p !== null);
      }

      // Fallback to SSR search page
      const resp = await fetch(`${ZOOMER_SITE}/search?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'ka,en;q=0.9' },
      });
      const html = await resp.text();
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
      if (!match) return [];
      const nextData = JSON.parse(match[1]);
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
