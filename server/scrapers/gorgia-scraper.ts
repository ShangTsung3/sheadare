import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const GORGIA_BASE = 'https://gorgia.ge';
const ITEMS_PER_PAGE = 96;

interface GorgiaCategory {
  path: string;
  label: string;
}

// Main categories on gorgia.ge
const MAIN_CATEGORIES: GorgiaCategory[] = [
  { path: '/ka/mshenebloba/', label: 'მშენებლობა' },
  { path: '/ka/remonti/', label: 'რემონტი' },
  { path: '/ka/aveji/', label: 'ავეჯი' },
  { path: '/ka/teqnika/', label: 'ტექნიკა' },
  { path: '/ka/santeqnika/', label: 'სანტექნიკა' },
  { path: '/ka/klimaturi-teqnika/', label: 'კლიმატური ტექნიკა' },
  { path: '/ka/xelsawyoebi/', label: 'ხელსაწყოები' },
  { path: '/ka/ikeas-produqcia/', label: 'IKEA-ს პროდუქცია' },
  { path: '/ka/bagi/', label: 'ბაღი' },
  { path: '/ka/ganateba/', label: 'განათება' },
  { path: '/ka/sayofacxovrebo/', label: 'საყოფაცხოვრებო' },
  { path: '/ka/sabavshvo/', label: 'საბავშვო' },
  { path: '/ka/cxovelebis-movla/', label: 'ცხოველების მოვლა' },
];

export class GorgiaScraper extends BaseScraper {
  readonly storeName = 'Gorgia';

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

  /** Discover subcategory URLs from a main category page */
  private async discoverSubcategories(mainCat: GorgiaCategory): Promise<GorgiaCategory[]> {
    const url = `${GORGIA_BASE}${mainCat.path}`;
    const html = await this.fetchPage(url);
    const $ = cheerio.load(html);

    const subcategories: GorgiaCategory[] = [];
    const seen = new Set<string>();

    // Subcategory links are within the category page, pointing to deeper paths
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();

      // Match subcategory links under this main category
      // e.g., /ka/mshenebloba/samsheneblo-fxvnilebi/
      if (
        href.startsWith(`${GORGIA_BASE}${mainCat.path}`) &&
        href !== `${GORGIA_BASE}${mainCat.path}` &&
        text.length > 0 &&
        !href.includes('page-') &&
        !href.includes('?')
      ) {
        const path = href.replace(GORGIA_BASE, '');
        // Only direct subcategories (one level deeper)
        const mainParts = mainCat.path.split('/').filter(Boolean);
        const subParts = path.split('/').filter(Boolean);
        if (subParts.length === mainParts.length + 1 && !seen.has(path)) {
          seen.add(path);
          subcategories.push({ path, label: text });
        }
      }
    });

    return subcategories;
  }

  /** Parse products from a category listing page HTML */
  private parseProducts($: cheerio.CheerioAPI, category: string): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];

    $('a.product-title').each((_, el) => {
      const $title = $(el);
      const name = $title.attr('title')?.trim() || $title.text().trim();
      const productUrl = $title.attr('href') || '';

      if (!name) return;

      // Extract product_id from nearby form element
      const $form = $title.closest('form');
      const formName = $form.attr('name') || '';
      const idMatch = formName.match(/product_form_(\d+)/);
      if (!idMatch) return;
      const productId = idMatch[1];

      // Get discounted (current) price: <span id="sec_discounted_price_{id}" class="ty-price-num">11<sup>74</sup></span>
      const $priceSpan = $(`#sec_discounted_price_${productId}`);
      const price = this.parsePrice($priceSpan);
      if (!price || price <= 0) return;

      // Get image
      const $img = $form.find(`img#det_img_${productId}desktop`);
      let imageUrl = $img.attr('src') || '';
      // Use higher res srcset if available
      const srcset = $img.attr('srcset') || '';
      if (srcset) {
        const match2x = srcset.match(/^(https?:\/\/[^\s]+)/);
        if (match2x) imageUrl = match2x[1];
      }

      products.push({
        external_id: `gorgia-${productId}`,
        name,
        price,
        category,
        image_url: imageUrl || undefined,
        url: productUrl || undefined,
        in_stock: true,
      });
    });

    return products;
  }

  /** Parse price from a ty-price-num span: "11<sup>74</sup>" → 11.74 */
  private parsePrice($span: cheerio.Cheerio<any>): number {
    if (!$span.length) return 0;

    // Get the text content of the span (integer part)
    const $clone = $span.clone();
    $clone.find('sup').remove();
    // Strip spaces and commas (thousands separators: "1 075" or "1,075")
    const intPart = $clone.text().trim().replace(/[\s,]/g, '');

    // Get decimal from sup
    const supText = $span.find('sup').first().text().trim();

    if (!intPart && !supText) return 0;
    // Filter out the currency symbol sup (₾)
    if (supText === '₾') return parseInt(intPart) || 0;

    const priceStr = supText ? `${intPart}.${supText}` : intPart;
    return parseFloat(priceStr) || 0;
  }

  /** Check if there's a next page link */
  private hasNextPage($: cheerio.CheerioAPI): boolean {
    return $('a.ty-pagination__next').length > 0;
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Gorgia] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    for (const mainCat of MAIN_CATEGORIES) {
      log(`Main category: ${mainCat.label}`);

      let subcategories: GorgiaCategory[];
      try {
        subcategories = await this.discoverSubcategories(mainCat);
      } catch (err) {
        log(`  Error discovering subcategories: ${err}`);
        continue;
      }

      if (subcategories.length === 0) {
        // Some categories might have products directly (no subcategories)
        subcategories = [mainCat];
      }

      log(`  ${subcategories.length} subcategories`);

      for (const subCat of subcategories) {
        let pageNum = 1;

        while (true) {
          try {
            const pageUrl = pageNum === 1
              ? `${GORGIA_BASE}${subCat.path}?items_per_page=${ITEMS_PER_PAGE}`
              : `${GORGIA_BASE}${subCat.path}page-${pageNum}/?items_per_page=${ITEMS_PER_PAGE}`;

            const html = await this.fetchPage(pageUrl);
            const $ = cheerio.load(html);
            const products = this.parseProducts($, mainCat.label);

            if (products.length === 0 && pageNum === 1) {
              break; // Empty subcategory
            }

            let newInPage = 0;
            for (const p of products) {
              if (seen.has(p.external_id)) continue;
              seen.add(p.external_id);
              allProducts.push(p);
              newInPage++;
            }

            log(`  ${subCat.label}: page ${pageNum}, +${newInPage} new (${allProducts.length} total)`);

            if (!this.hasNextPage($) || products.length === 0) break;
            pageNum++;
          } catch (err) {
            log(`  Error in ${subCat.label} page ${pageNum}: ${err}`);
            break;
          }
        }
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      const url = `${GORGIA_BASE}/ka/?match=all&q=${encodeURIComponent(query)}&items_per_page=30`;
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);
      return this.parseProducts($, '');
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
