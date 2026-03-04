import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const MEGA_SITE = 'https://megatechnica.ge';

interface MegaCategory {
  path: string;
  label: string;
}

const CATEGORIES: MegaCategory[] = [
  // Phones & tablets
  { path: '/ge/telefonebi', label: 'სმარტფონები' },
  { path: '/ge/mobilurebi', label: 'მობილურები' },
  { path: '/ge/planshetebi', label: 'პლანშეტები' },
  { path: '/ge/smart', label: 'სმარტ საათები' },
  { path: '/ge/accessories', label: 'მობ. აქსესუარები' },

  // TVs & Audio
  { path: '/ge/televizorebi', label: 'ტელევიზორები' },
  { path: '/ge/audio', label: 'აუდიო სისტემები' },
  { path: '/ge/dinamikebi', label: 'დინამიკები' },
  { path: '/ge/yursasmeni', label: 'ყურსასმენები' },

  // Computers
  { path: '/ge/leptopebi', label: 'ლეპტოპები' },
  { path: '/ge/monitor', label: 'მონიტორები' },
  { path: '/ge/mausebi', label: 'მაუსები' },
  { path: '/ge/klaviatura', label: 'კლავიატურები' },
  { path: '/ge/sadenebi', label: 'სადენები' },
  { path: '/ge/Powercore', label: 'დამტენები' },
  { path: '/ge/Notebook%20Bags', label: 'ჩანთები' },
  { path: '/ge/USB%20Flash%20drive', label: 'USB ფლეშ' },
  { path: '/ge/WIFI', label: 'ქსელური მოწყობილობები' },
  { path: '/ge/Gamepad', label: 'გეიმინგი' },

  // Home appliances
  { path: '/ge/macivrebi%20macivari', label: 'მაცივრები' },
  { path: '/ge/sashrobi-da-sarecxi-manqanebi', label: 'სარეცხი/საშრობი მანქანები' },
  { path: '/ge/churchlis-sarecxi-manqana', label: 'ჭურჭლის სარეცხი' },
  { path: '/ge/gazqura', label: 'გაზქურები' },
  { path: '/ge/gumeli', label: 'ღუმელი/გამწოვი/ზედაპირი' },
  { path: '/ge/mikrotalguli-aparatebi', label: 'მიკროტალღური' },

  // Cleaning & ironing
  { path: '/ge/mtversasrutebi-utoebi', label: 'მტვერსასრუტი/უთო' },

  // Beauty & personal care
  { path: '/ge/estetika-silamaze', label: 'სილამაზე და მოვლა' },

  // Kitchen appliances
  { path: '/ge/samzareulos-teqnika', label: 'სამზარეულო ტექნიკა' },

  // Heating & cooling
  { path: '/ge/gatboba-gagrileba', label: 'გათბობა/გაგრილება' },

  // Water dispensers
  { path: '/ge/wylis-dispenseri', label: 'წყლის დისპენსერი' },

  // Other
  { path: '/ge/other', label: 'სხვა' },
];

export class MegatechnicaScraper extends BaseScraper {
  readonly storeName = 'Megatechnica';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
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

  private parseProductsFromHtml(html: string, categoryLabel: string): ScrapedProduct[] {
    const $ = cheerio.load(html);
    const products: ScrapedProduct[] = [];

    $('div.products li[itemprop="itemListElement"]').each((_, el) => {
      try {
        const $el = $(el);

        const name = $el.find('a.link span[itemprop="name"]').text().trim();
        if (!name) return;

        const priceText = $el.find('span.price').first().text().trim();
        const price = parseFloat(priceText.replace(/[,\s]/g, ''));
        if (!price || price <= 0) return;

        // Image: hidden img with itemprop="image"
        const imgSrc = $el.find('img[itemprop="image"]').attr('src') || '';
        const imageUrl = imgSrc.startsWith('http') ? imgSrc : (imgSrc ? `${MEGA_SITE}${imgSrc}` : undefined);

        // Link: a.link href (already absolute)
        const href = $el.find('a.link').attr('href') || '';
        const fullUrl = href.startsWith('http') ? href : (href ? `${MEGA_SITE}${href}` : undefined);

        // Product ID from hidden input or URL
        const productId = $el.find('input[name="product_id"]').attr('value') || '';
        const id = productId || href.replace(/[^a-zA-Z0-9]/g, '-');

        products.push({
          external_id: `mega-${id}`,
          name,
          price,
          category: categoryLabel,
          image_url: imageUrl,
          url: fullUrl,
          in_stock: true,
        });
      } catch {
        // Skip malformed products
      }
    });

    return products;
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Megatechnica] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    for (const cat of CATEGORIES) {
      log(`Category: ${cat.label} (${cat.path})`);

      try {
        await this.rateLimiter.acquire();
        // All products are on a single page (no pagination needed)
        const url = `${MEGA_SITE}${cat.path}`;
        const html = this.fetchHtmlViaCurl(url);

        if (!html) {
          log(`  Failed to fetch ${cat.path}`);
          continue;
        }

        const products = this.parseProductsFromHtml(html, cat.label);

        let newCount = 0;
        for (const p of products) {
          if (seen.has(p.external_id)) continue;
          seen.add(p.external_id);
          allProducts.push(p);
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
      const url = `${MEGA_SITE}/ge/search?q=${encodeURIComponent(query)}`;
      const html = this.fetchHtmlViaCurl(url);
      if (!html) return [];

      return this.parseProductsFromHtml(html, '');
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
