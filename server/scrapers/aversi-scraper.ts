import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';
import { parsePharmacyFromName } from '../services/pharmacy-matcher.js';

const AVERSI_BASE = 'https://www.aversi.ge';
const SECTIONS = [
  { path: '/en/medikamentebi', label: 'მედიკამენტები' },
  { path: '/en/movlis-sashualebebi', label: 'მოვლის საშუალებები' },
];
const PRODUCTS_PER_PAGE = 12;

export class AversiScraper extends BaseScraper {
  readonly storeName = 'Aversi';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private fetchHtmlViaCurl(url: string): string | null {
    try {
      const html = execSync(
        `curl -sL -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Accept: text/html" -H "Accept-Language: en,ka;q=0.9" "${url}"`,
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      ).toString();
      return html;
    } catch {
      return null;
    }
  }

  /** Extract subcategory IDs from a section page */
  private async fetchCategoryIds(sectionPath: string, log: (msg: string) => void): Promise<string[]> {
    await this.rateLimiter.acquire();
    const url = `${AVERSI_BASE}${sectionPath}`;
    const html = this.fetchHtmlViaCurl(url);
    if (!html) {
      log(`Failed to fetch ${sectionPath}`);
      return [];
    }

    const $ = cheerio.load(html);
    const categoryIds: string[] = [];
    const pattern = new RegExp(sectionPath.replace(/\//g, '\\/') + '\\/(\\d+)');

    $(`a[href*="${sectionPath}/"]`).each((_, el) => {
      const href = $(el).attr('href') || '';
      const match = href.match(pattern);
      if (match && !categoryIds.includes(match[1])) {
        categoryIds.push(match[1]);
      }
    });

    return categoryIds;
  }

  /** Parse products from a category listing page */
  private parseListingPage(html: string, categoryLabel = 'მედიკამენტები'): { products: ScrapedProduct[]; hasMore: boolean } {
    const $ = cheerio.load(html);
    const products: ScrapedProduct[] = [];

    // Each product is in a .col-sm-6.col-md-3.col-lg-3 grid cell containing a .product div.
    // Structure per card:
    //   <div class="product">
    //     <a href="...drugDet/?MatID=XXXX">  (annotation link)
    //     <div class="product-thumb">
    //       <a href="...MatID=XXXX"><img alt="Name" src="..."></a>
    //     </div>
    //     <div class="product-details">
    //       <a href="...MatID=XXXX"><h5>Name</h5>
    //         <span class="amount text-theme-colored">13.79 Gel</span>
    //       </a>
    //     </div>
    //   </div>
    $('div.product').each((_, cardEl) => {
      try {
        const $card = $(cardEl);

        // Extract MatID from any link in the card
        const href = $card.find('a[href*="MatID="]').first().attr('href') || '';
        const matIdMatch = href.match(/MatID=(\d+)/);
        if (!matIdMatch) return;
        const matId = matIdMatch[1];

        // Name from img alt (in product-thumb)
        const $img = $card.find('.product-thumb img').first();
        const name = ($img.attr('alt') || '').trim();
        if (!name) return;

        // Image URL
        const imgSrc = $img.attr('src') || '';
        const imageUrl = imgSrc
          ? (imgSrc.startsWith('http') ? imgSrc : `${AVERSI_BASE}${imgSrc}`)
          : undefined;

        // Price from span.amount.text-theme-colored
        let price = 0;
        const priceText = $card.find('span.amount.text-theme-colored').first().text().trim();
        const priceMatch = priceText.match(/([\d.]+)/);
        if (priceMatch) price = parseFloat(priceMatch[1]);
        if (price <= 0) return;

        const pharmaInfo = parsePharmacyFromName(name);

        products.push({
          external_id: `aversi-${matId}`,
          name,
          price,
          category: categoryLabel,
          image_url: imageUrl,
          url: `${AVERSI_BASE}/en/aversi/act/drugDet/?MatID=${matId}`,
          in_stock: true,
          active_ingredient: pharmaInfo.activeIngredient,
          dose: pharmaInfo.dose,
          dosage_form: pharmaInfo.form,
          quantity: pharmaInfo.quantity,
        });
      } catch {
        // Skip malformed products
      }
    });

    // Check if there's a next page link
    const hasMore = $('a[href*="page="]').filter((_, el) => {
      const text = $(el).text().trim();
      return text === '›' || text === '»' || text === 'Next' || text === '>';
    }).length > 0
      || products.length >= PRODUCTS_PER_PAGE;

    return { products, hasMore };
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Aversi] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    log('Starting Aversi scrape from www.aversi.ge...');

    for (const section of SECTIONS) {
      log(`Section: ${section.label} (${section.path})`);

      const categoryIds = await this.fetchCategoryIds(section.path, log);
      if (categoryIds.length === 0) {
        log(`  No subcategories found, skipping`);
        continue;
      }
      log(`  Found ${categoryIds.length} subcategories`);

      for (let ci = 0; ci < categoryIds.length; ci++) {
        const catId = categoryIds[ci];
        let page = 1;

        while (true) {
          await this.rateLimiter.acquire();

          const url = `${AVERSI_BASE}${section.path}/${catId}?page=${page}`;
          const html = this.fetchHtmlViaCurl(url);

          if (!html) {
            log(`  Cat ${catId} page ${page}: fetch failed, skipping`);
            break;
          }

          const { products, hasMore } = this.parseListingPage(html, section.label);

          if (products.length === 0) break;

          for (const p of products) {
            if (!seen.has(p.external_id)) {
              seen.add(p.external_id);
              allProducts.push(p);
            }
          }

          if (!hasMore || products.length < PRODUCTS_PER_PAGE) break;
          page++;
          if (page > 100) break;
        }

        if ((ci + 1) % 10 === 0 || ci === categoryIds.length - 1) {
          log(`  Categories ${ci + 1}/${categoryIds.length} — ${allProducts.length} total products`);
        }
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      await this.rateLimiter.acquire();
      const url = `${AVERSI_BASE}/en/search?q=${encodeURIComponent(query)}`;
      const html = this.fetchHtmlViaCurl(url);
      if (!html) return [];

      const { products } = this.parseListingPage(html);
      return products;
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
