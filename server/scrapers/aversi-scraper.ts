import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';
import { parsePharmacyFromName } from '../services/pharmacy-matcher.js';

const AVERSI_BASE = 'https://shop.aversi.ge';
const ITEMS_PER_PAGE = 192;
const MAX_PAGES = 20;

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

  private parseProductsFromHtml(html: string): ScrapedProduct[] {
    const $ = cheerio.load(html);
    const products: ScrapedProduct[] = [];

    // Each product is in a form with product_id input
    $('form[name^="product_form"]').each((_, formEl) => {
      try {
        const $form = $(formEl);

        // Product ID
        const productId = $form.find('input[name$="[product_id]"]').attr('value');
        if (!productId) return;

        // Name from .product-title
        const $titleLink = $form.find('.product-title');
        const name = $titleLink.attr('title')?.trim() || $titleLink.text().trim();
        if (!name) return;

        // Price - first ty-price-num that contains a number
        let price = 0;
        $form.find('.ty-price-num').each((_, priceEl) => {
          const text = $(priceEl).text().trim();
          const num = parseFloat(text.replace(/[,\s]/g, ''));
          if (num > 0 && price === 0) price = num;
        });
        if (price <= 0) return;

        // URL
        const href = $titleLink.attr('href') || '';
        const url = href.startsWith('http') ? href : (href ? `${AVERSI_BASE}${href}` : undefined);

        // Image
        const imgSrc = $form.find('.ty-pict').attr('src') || '';
        const imageUrl = imgSrc.startsWith('http') ? imgSrc : undefined;

        // Parse pharmacy info from name (Aversi has no structured drug data)
        const pharmaInfo = parsePharmacyFromName(name);

        products.push({
          external_id: `aversi-${productId}`,
          name,
          price,
          category: 'მედიკამენტები',
          image_url: imageUrl,
          url,
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

    return products;
  }

  private hasNextPage(html: string): boolean {
    const $ = cheerio.load(html);
    return $('.ty-pagination__next').length > 0;
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Aversi] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    log('Starting Aversi medication scrape...');

    for (let page = 1; page <= MAX_PAGES; page++) {
      await this.rateLimiter.acquire();

      const url = `${AVERSI_BASE}/en/medication/page-${page}/?items_per_page=${ITEMS_PER_PAGE}`;
      const html = this.fetchHtmlViaCurl(url);

      if (!html) {
        log(`  Failed to fetch page ${page}`);
        break;
      }

      // Check for Cloudflare challenge
      if (html.includes('Just a moment...') && html.includes('challenge')) {
        log(`  Cloudflare challenge on page ${page}, stopping`);
        break;
      }

      const products = this.parseProductsFromHtml(html);

      if (products.length === 0) {
        log(`  Page ${page}: no products found, stopping`);
        break;
      }

      let newCount = 0;
      for (const p of products) {
        if (!seen.has(p.external_id)) {
          seen.add(p.external_id);
          allProducts.push(p);
          newCount++;
        }
      }

      log(`  Page ${page}: +${newCount} (${allProducts.length} total)`);

      if (!this.hasNextPage(html)) break;
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      await this.rateLimiter.acquire();
      const url = `${AVERSI_BASE}/en/medication/?q=${encodeURIComponent(query)}&items_per_page=20`;
      const html = this.fetchHtmlViaCurl(url);
      if (!html) return [];

      return this.parseProductsFromHtml(html);
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
