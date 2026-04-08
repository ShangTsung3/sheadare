import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const GOODBUILD_BASE = 'https://goodbuild.ge';
const ITEMS_PER_PAGE = 96;

interface Category {
  path: string;
  label: string;
}

const MAIN_CATEGORIES: Category[] = [
  { path: '/eleqtro-instrumentebi/', label: 'ელექტრო ინსტრუმენტები' },
  { path: '/meqanikuri-instrumentebi/', label: 'მექანიკური ინსტრუმენტები' },
  { path: '/building-equipment/', label: 'სამშენებლო ეკიპირება' },
  { path: '/gatboba-kondicireba/', label: 'გათბობა-კონდიცირება' },
  { path: '/samsheneblo-masala/', label: 'სამშენებლო მასალა' },
  { path: '/samsheneblo-qimia/', label: 'სამშენებლო ქიმია' },
  { path: '/saxarji-masalebi/', label: 'სახარჯი მასალები' },
  { path: '/sakopackhovrebo/', label: 'საყოფაცხოვრებო' },
  { path: '/wyalmomarageba/', label: 'წყალმომარაგება' },
  { path: '/usaprtxoeba/', label: 'უსაფრთხოება' },
  { path: '/eleqtrooba/', label: 'ელექტროობა' },
  { path: '/bagi-da-ezo/', label: 'ბაღი და ეზო' },
];

export class GoodbuildScraper extends BaseScraper {
  readonly storeName = 'Goodbuild';

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
  private async discoverSubcategories(mainCat: Category): Promise<Category[]> {
    const url = `${GOODBUILD_BASE}${mainCat.path}`;
    const html = await this.fetchPage(url);
    const $ = cheerio.load(html);

    const subcategories: Category[] = [];
    const seen = new Set<string>();

    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();

      if (
        href.startsWith(`${GOODBUILD_BASE}${mainCat.path}`) &&
        href !== `${GOODBUILD_BASE}${mainCat.path}` &&
        text.length > 0 &&
        !href.includes('page-') &&
        !href.includes('?')
      ) {
        const path = href.replace(GOODBUILD_BASE, '');
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

      // Price format: <span class="ty-price-num">2,600.00</span>
      const $priceSpan = $(`#sec_discounted_price_${productId}`);
      const price = this.parsePrice($priceSpan);
      if (!price || price <= 0) return;

      // Images use lazy loading: data-src instead of src
      const $img = $form.find(`img[id^="det_img_${productId}"]`);
      const imageUrl = $img.attr('data-src') || $img.attr('src') || '';
      // Skip placeholder base64 images
      const finalImage = imageUrl.startsWith('data:') ? '' : imageUrl;

      products.push({
        external_id: `goodbuild-${productId}`,
        name,
        price,
        category,
        image_url: finalImage || undefined,
        url: productUrl || undefined,
        in_stock: true,
      });
    });

    return products;
  }

  /** Parse price: "2,600.00" → 2600.00 */
  private parsePrice($span: cheerio.Cheerio<any>): number {
    if (!$span.length) return 0;
    const text = $span.text().trim().replace(/[₾\s]/g, '').replace(/,/g, '');
    return parseFloat(text) || 0;
  }

  private hasNextPage($: cheerio.CheerioAPI): boolean {
    return $('a.ty-pagination__next').length > 0;
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Goodbuild] ${m}`));
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
        subcategories = [mainCat];
      }

      log(`  ${subcategories.length} subcategories`);

      for (const subCat of subcategories) {
        let pageNum = 1;

        while (true) {
          try {
            const pageUrl = pageNum === 1
              ? `${GOODBUILD_BASE}${subCat.path}?items_per_page=${ITEMS_PER_PAGE}`
              : `${GOODBUILD_BASE}${subCat.path}page-${pageNum}/?items_per_page=${ITEMS_PER_PAGE}`;

            const html = await this.fetchPage(pageUrl);
            const $ = cheerio.load(html);
            const products = this.parseProducts($, mainCat.label);

            if (products.length === 0 && pageNum === 1) {
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
      const url = `${GOODBUILD_BASE}/?match=all&q=${encodeURIComponent(query)}&items_per_page=30`;
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
