import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const GRANDEL_BASE = 'https://grandel.ge';
const ITEMS_PER_PAGE = 64;

interface Category {
  path: string;
  label: string;
}

// Main categories on grandel.ge (CS-Cart based electronics store)
const MAIN_CATEGORIES: Category[] = [
  { path: '/aqcia/', label: 'აქცია' },
  { path: '/mobile-phone/', label: 'სმარტფონი & აქსესუარები' },
  { path: '/kompiuteruli-teqnika/', label: 'IT | ლეპტოპები' },
  { path: '/cifruli-teqnika/', label: 'ტელევიზორი & აქსესუარები' },
  { path: '/msxvili-teqnika/', label: 'მსხვილი ტექნიკა' },
  { path: '/saxlis-teqnika/', label: 'ტექნიკა სახლისთვის' },
];

export class GrandelScraper extends BaseScraper {
  readonly storeName = 'Grandel';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private async fetchPage(url: string): Promise<string> {
    const res = await this.fetchWithRateLimit(encodeURI(url), {
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
  private async discoverSubcategories(mainCat: Category): Promise<Category[]> {
    const url = `${GRANDEL_BASE}${mainCat.path}`;
    const html = await this.fetchPage(url);
    const $ = cheerio.load(html);

    const subcategories: Category[] = [];
    const seen = new Set<string>();

    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();

      const decodedHref = decodeURIComponent(href);

      if (
        (decodedHref.startsWith(`${GRANDEL_BASE}${mainCat.path}`) ||
         decodedHref.startsWith(mainCat.path)) &&
        decodedHref !== `${GRANDEL_BASE}${mainCat.path}` &&
        decodedHref !== mainCat.path &&
        text.length > 0 &&
        text.length < 80 &&
        !decodedHref.includes('page-') &&
        !decodedHref.includes('?')
      ) {
        const path = decodedHref.replace(GRANDEL_BASE, '');
        const mainParts = mainCat.path.split('/').filter(Boolean);
        const subParts = path.split('/').filter(Boolean);
        // Direct subcategories only (one level deeper)
        if (subParts.length === mainParts.length + 1 && !seen.has(path)) {
          seen.add(path);
          subcategories.push({ path, label: text });
        }
      }
    });

    return subcategories;
  }

  /** Parse products from a CS-Cart category listing page */
  private parseProducts($: cheerio.CheerioAPI, category: string): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];

    // CS-Cart uses product-title links and product_form_{id} forms
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

      // Price: span#sec_discounted_price_{id}
      const $priceSpan = $(`#sec_discounted_price_${productId}`);
      const price = this.parsePrice($priceSpan);
      if (!price || price <= 0) return;

      // Image: try data-src (lazy loading), fall back to src
      const $img = $form.find(`img[id^="det_img_${productId}"]`);
      let imageUrl = $img.attr('data-src') || $img.attr('src') || '';
      // Also try general product image
      if (!imageUrl || imageUrl.startsWith('data:')) {
        const $anyImg = $form.find('img.ty-pict, img.ty-product-img').first();
        imageUrl = $anyImg.attr('data-src') || $anyImg.attr('src') || '';
      }
      const finalImage = imageUrl.startsWith('data:') ? '' : imageUrl;

      products.push({
        external_id: `grandel-${productId}`,
        name,
        price,
        category,
        image_url: finalImage || undefined,
        url: productUrl || undefined,
        in_stock: true,
      });
    });

    // Fallback: if no product-title links found, try alternative selectors
    if (products.length === 0) {
      $('div.ty-grid-list__item, div.ty-column3').each((_, el) => {
        const $el = $(el);

        const $link = $el.find('a[href*="/"]').filter((_, a) => {
          const href = $(a).attr('href') || '';
          return href.includes(GRANDEL_BASE) && !href.includes('dispatch=');
        }).first();

        const name = $link.text().trim();
        const productUrl = $link.attr('href') || '';
        if (!name || name.length < 3) return;

        // Try to get product ID from quick view or cart button
        const $btn = $el.find('[data-ca-product-id], button[name="dispatch[checkout.add..product_id]"]');
        let productId = $btn.attr('data-ca-product-id') || '';
        if (!productId) {
          const btnMatch = ($el.html() || '').match(/product_id[=:](\d+)/);
          if (btnMatch) productId = btnMatch[1];
        }
        if (!productId) return;

        // Price
        const priceText = $el.find('.ty-price-num, .ty-list-price').first().text().trim();
        const price = this.parsePriceText(priceText);
        if (price <= 0) return;

        // Image
        const $img = $el.find('img').first();
        const imageUrl = $img.attr('data-src') || $img.attr('src') || '';
        const finalImage = imageUrl.startsWith('data:') ? '' : imageUrl;

        products.push({
          external_id: `grandel-${productId}`,
          name,
          price,
          category,
          image_url: finalImage || undefined,
          url: productUrl || undefined,
          in_stock: true,
        });
      });
    }

    return products;
  }

  /** Parse price from a ty-price-num span element */
  private parsePrice($span: cheerio.Cheerio<any>): number {
    if (!$span.length) return 0;
    return this.parsePriceText($span.text());
  }

  /** Parse price from text like "2,600.00 ₾" or "359 ₾" */
  private parsePriceText(text: string): number {
    const cleaned = text.trim()
      .replace(/\u200d/g, '')  // zero-width joiners
      .replace(/[₾\s]/g, '')
      .replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  }

  /** Check if there's a next page link (CS-Cart pagination) */
  private hasNextPage($: cheerio.CheerioAPI): boolean {
    return $('a.ty-pagination__next').length > 0;
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Grandel] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    for (const mainCat of MAIN_CATEGORIES) {
      log(`Main category: ${mainCat.label}`);

      let subcategories: Category[];
      try {
        subcategories = await this.discoverSubcategories(mainCat);
      } catch (err) {
        log(`  Error discovering subcategories: ${err}`);
        continue;
      }

      if (subcategories.length === 0) {
        // Some categories might have products directly
        subcategories = [mainCat];
      }

      log(`  ${subcategories.length} subcategories`);

      for (const subCat of subcategories) {
        let pageNum = 1;

        while (true) {
          try {
            const pageUrl = pageNum === 1
              ? `${GRANDEL_BASE}${subCat.path}?items_per_page=${ITEMS_PER_PAGE}`
              : `${GRANDEL_BASE}${subCat.path}page-${pageNum}/?items_per_page=${ITEMS_PER_PAGE}`;

            const html = await this.fetchPage(pageUrl);
            const $ = cheerio.load(html);
            const products = this.parseProducts($, mainCat.label);

            if (products.length === 0 && pageNum === 1) {
              // No products — try discovering sub-subcategories
              log(`  ${subCat.label}: no products, trying sub-subcategories...`);
              let subSubs: Category[] = [];
              try {
                subSubs = await this.discoverSubcategories(subCat);
              } catch { /* ignore */ }

              if (subSubs.length > 0) {
                log(`    Found ${subSubs.length} sub-subcategories`);
                for (const ss of subSubs) {
                  let ssPage = 1;
                  while (true) {
                    try {
                      const ssUrl = ssPage === 1
                        ? `${GRANDEL_BASE}${ss.path}?items_per_page=${ITEMS_PER_PAGE}`
                        : `${GRANDEL_BASE}${ss.path}page-${ssPage}/?items_per_page=${ITEMS_PER_PAGE}`;
                      const ssHtml = await this.fetchPage(ssUrl);
                      const ss$ = cheerio.load(ssHtml);
                      const ssProducts = this.parseProducts(ss$, mainCat.label);

                      if (ssProducts.length === 0) break;

                      let newInPage = 0;
                      for (const p of ssProducts) {
                        if (seen.has(p.external_id)) continue;
                        seen.add(p.external_id);
                        allProducts.push(p);
                        newInPage++;
                      }
                      log(`    ${ss.label}: page ${ssPage}, +${newInPage} new (${allProducts.length} total)`);

                      if (!this.hasNextPage(ss$) || ssProducts.length === 0) break;
                      ssPage++;
                    } catch (err) {
                      log(`    Error in ${ss.label} page ${ssPage}: ${err}`);
                      break;
                    }
                  }
                }
              }
              break;
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
      const url = `${GRANDEL_BASE}/?match=all&q=${encodeURIComponent(query)}&items_per_page=30`;
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
