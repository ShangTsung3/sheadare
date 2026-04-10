import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const ALTA_SITE = 'https://alta.ge';
const ALTA_API = 'https://api.alta.ge/v1/Products/v4';

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

interface AltaApiResponse {
  products: AltaProduct[];
  productsCount: number;
  hasNextPage: boolean;
}

interface AltaCategory {
  id: number;
  path: string;
  label: string;
}

const CATEGORIES: AltaCategory[] = [
  // Mobile phones & accessories
  { id: 16, path: 'mobiluri-telefonebi-da-aqsesuarebi/mobiluri-telefonebi-c16s', label: 'ტელეფონები' },
  { id: 17, path: 'mobiluri-telefonebi-da-aqsesuarebi/smart-saatebi-c17s', label: 'სმარტ საათები' },
  { id: 18, path: 'mobiluri-telefonebi-da-aqsesuarebi/smart-saatis-aqsesuarebi-c18s', label: 'საათის აქსესუარები' },
  { id: 19, path: 'mobiluri-telefonebi-da-aqsesuarebi/mobiluri-telefonis-aqsesuarebi-c19s', label: 'ტელ. აქსესუარები' },
  { id: 22, path: 'mobiluri-telefonis-aqsesuarebi/usadeno-yursasmeni-c22t', label: 'უსადენო ყურსასმენი' },

  // Computers & accessories
  { id: 34, path: 'kompiuteruli-teqnika-da-aqsesuarebi/noutbuqi-c34s', label: 'ნოუთბუქი' },
  { id: 35, path: 'kompiuteruli-teqnika-da-aqsesuarebi/noutbuqis-aqsesuarebi-c35s', label: 'ნოუთბუქის აქსესუარები' },
  { id: 41, path: 'kompiuteruli-teqnika-da-aqsesuarebi/tabi-c41s', label: 'ტაბლეტები' },
  { id: 42, path: 'kompiuteruli-teqnika-da-aqsesuarebi/tabis-aqsesuarebi-c42s', label: 'ტაბის აქსესუარები' },
  { id: 47, path: 'kompiuteruli-teqnika-da-aqsesuarebi/paneluri-kompiuteri-all-in-one-c47s', label: 'All-in-One' },
  { id: 49, path: 'kompiuteruli-teqnika-da-aqsesuarebi/monitori-c49s', label: 'მონიტორი' },
  { id: 51, path: 'kompiuteruli-teqnika-da-aqsesuarebi/pc-komponentebi-c51s', label: 'PC კომპონენტები' },
  { id: 61, path: 'kompiuteruli-teqnika-da-aqsesuarebi/bechdva-da-kopireba-c61s', label: 'პრინტერები' },
  { id: 66, path: 'kompiuteruli-teqnika-da-aqsesuarebi/qseluri-motsyobilobebi-c66s', label: 'ქსელური მოწყობილობები' },
  { id: 70, path: 'kompiuteruli-teqnika-da-aqsesuarebi/kompiuteris-aqsesuarebi-c70s', label: 'კომპ. აქსესუარები' },
  { id: 84, path: 'kompiuteruli-teqnika-da-aqsesuarebi/kvebis-tsyaroebi-c84s', label: 'კვების წყარო/UPS' },

  // TVs & Audio
  { id: 88, path: 'televizorebi-da-audio-sistemebi/televizori-c88s', label: 'ტელევიზორი' },
  { id: 89, path: 'televizorebi-da-audio-sistemebi/televizoris-aqsesuarebi-c89s', label: 'TV აქსესუარები' },
  { id: 93, path: 'televizorebi-da-audio-sistemebi/proeqtori-c93s', label: 'პროექტორი' },
  { id: 94, path: 'televizorebi-da-audio-sistemebi/proeqtoris-aqsesuarebi-c94s', label: 'პროექტორის აქს.' },
  { id: 95, path: 'televizorebi-da-audio-sistemebi/audio-sistemebi-c95s', label: 'აუდიო სისტემა' },

  // Gaming
  { id: 99, path: 'geimingi/satamasho-konsolebi-c99s', label: 'სათამაშო კონსოლები' },
  { id: 113, path: 'geimingi/geiming-aqsesuarebi-c113s', label: 'გეიმინგ აქსესუარები' },

  // Photo & Video
  { id: 122, path: 'foto-da-video/cifruli-kamera-c122s', label: 'ციფრული კამერა' },
  { id: 131, path: 'foto-da-video/droni-c131s', label: 'დრონი' },

  // Large home appliances
  { id: 135, path: 'mskhvili-sayofackhovrebo-teqnika/macivari-c135s', label: 'მაცივარი' },
  { id: 136, path: 'mskhvili-sayofackhovrebo-teqnika/sareckhi-manqana-c136s', label: 'სარეცხი მანქანა' },
  { id: 137, path: 'mskhvili-sayofackhovrebo-teqnika/sashrobi-manqana-c137s', label: 'საშრობი მანქანა' },
  { id: 138, path: 'mskhvili-sayofackhovrebo-teqnika/churchlis-sareckhi-manqana-c138s', label: 'ჭურჭლის სარეცხი' },
  { id: 139, path: 'mskhvili-sayofackhovrebo-teqnika/gazqura-c139s', label: 'გაზქურა' },
  { id: 140, path: 'mskhvili-sayofackhovrebo-teqnika/chasashenebeli-teqnika-c140s', label: 'ჩასაშენებელი ტექნიკა' },
  { id: 146, path: 'mskhvili-sayofackhovrebo-teqnika/klimaturi-teqnika-c146s', label: 'კლიმატური ტექნიკა' },
  { id: 283, path: 'mskhvili-sayofackhovrebo-teqnika/gamtsovi-c283s', label: 'გამწოვი' },

  // Small kitchen appliances
  { id: 155, path: 'tsvrili-saojakho-teqnika/samzareulos-tsvrili-teqnika-c155s', label: 'სამზარეულო ტექნიკა' },
  { id: 175, path: 'tsvrili-saojakho-teqnika/yavis-moyvarultatvis-c175s', label: 'ყავის სექცია' },

  // Home & garden care
  { id: 181, path: 'sakhlis-da-ezos-movla/mtversasruti-c181s', label: 'მტვერსასრუტი' },
  { id: 183, path: 'sakhlis-da-ezos-movla/roboti-mtversasruti-c183s', label: 'რობოტ მტვერსასრუტი' },
  { id: 185, path: 'sakhlis-da-ezos-movla/uto-c185s', label: 'უთო' },

  // Personal care
  { id: 187, path: 'tavis-movla/tsversaparsi-c187s', label: 'წვერსაპარსი' },
  { id: 189, path: 'tavis-movla/tmis-feni-c189s', label: 'თმის ფენი' },
  { id: 191, path: 'tavis-movla/tmis-uto-c191s', label: 'თმის უთო' },
  { id: 193, path: 'tavis-movla/eleqtro-jagrisebi-irigatorebi-c193s', label: 'ელ. ჯაგრისი' },
  { id: 194, path: 'tavis-movla/sastsori-c194s', label: 'სასწორი' },

  // Smart home
  { id: 195, path: 'chkviani-sakhli/chkviani-kamera-c195s', label: 'ჭკვიანი კამერა' },
  { id: 197, path: 'chkviani-sakhli/chkviani-chamrtvelebi-c197s', label: 'ჭკვიანი ჩამრთველები' },
  { id: 198, path: 'chkviani-sakhli/chkviani-ganateba-c198s', label: 'ჭკვიანი განათება' },
  { id: 249, path: 'chkviani-sakhli/kontroli-da-avtomatizacia-c249s', label: 'ავტომატიზაცია' },

  // Electric transport
  { id: 238, path: 'eleqtro-transporti/eleqtro-skuteri-c238s', label: 'ელექტრო სკუტერი' },
];

const PAGE_SIZE = 28;
const REQUEST_HEADERS = {
  'accept-language': 'ka',
  'os': 'web',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

export class AltaScraper extends BaseScraper {
  readonly storeName = 'Alta';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private async fetchApi(categoryId: number, page: number): Promise<AltaApiResponse | null> {
    try {
      const url = `${ALTA_API}?CategoryId=${categoryId}&Page=${page}&Limit=${PAGE_SIZE}`;
      await this.rateLimiter.acquire();
      const response = await fetch(url, { headers: REQUEST_HEADERS });
      if (!response.ok) return null;
      return await response.json() as AltaApiResponse;
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

    log(`Scraping ${CATEGORIES.length} categories via Alta API (no auth required)`);

    for (const cat of CATEGORIES) {
      log(`Category: ${cat.label} (id=${cat.id})`);
      let page = 1;

      while (true) {
        try {
          const data = await this.fetchApi(cat.id, page);
          if (!data || !data.products || data.products.length === 0) {
            if (page === 1) log(`  No products found`);
            break;
          }

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
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
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

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      // Search via SSR on alta.ge (api.alta.ge search is behind Cloudflare)
      const url = `${ALTA_SITE}/search/${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': REQUEST_HEADERS['User-Agent'],
          'Accept': 'text/html',
          'Accept-Language': 'ka,en;q=0.9',
        },
      });
      if (!response.ok) return [];
      const html = await response.text();
      const nextData = this.extractNextData(html);
      if (!nextData) return [];

      const products: AltaProduct[] =
        nextData.props?.pageProps?.initialSearchData?.products || [];

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
