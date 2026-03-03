import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const EURO_SITE = 'https://europroduct.ge';
const ITEMS_PER_PAGE = 21; // Site always shows 21 per page

interface EuroCategory {
  id: string;
  name: string;
}

const CATEGORIES: EuroCategory[] = [
  { id: '302', name: 'ვეგანური/ვეგეტარიანული' },
  { id: '150', name: 'ულაქტოზო' },
  { id: '291', name: 'უგლუტენო' },
  { id: '135', name: 'პურ-ფუნთუშეული' },
  { id: '151', name: 'ხილ-ბოსტნეული' },
  { id: '132', name: 'კვერცხი და რძის ნაწარმი' },
  { id: '152', name: 'ხორცი და თევზი' },
  { id: '126', name: 'ბაკალეა' },
  { id: '143', name: 'სნექები' },
  { id: '147', name: 'ყავა და ჩაი' },
  { id: '145', name: 'ტკბილეული' },
  { id: '139', name: 'სასმელები' },
  { id: '130', name: 'გაყინული პროდუქცია' },
  { id: '148', name: 'ცხოველთა კვება' },
  { id: '140', name: 'საყოფაცხოვრებო ნაწარმი' },
  { id: '146', name: 'ქიმია' },
];

export class EuroproductScraper extends BaseScraper {
  readonly storeName = 'Europroduct';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private parsePrice(text: string): number {
    // Format: "6,50 ₾" → 6.50
    const cleaned = text.replace('₾', '').replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private extractBarcode(imageUrl: string): string | undefined {
    // Image URL: .../prod/004b3e05a6/076171109453.jpeg?w=500
    // The filename (before extension) is often the barcode
    const match = imageUrl.match(/\/(\d{8,14})\.\w+/);
    return match ? match[1] : undefined;
  }

  private parseProductCards(html: string, category: string): ScrapedProduct[] {
    const $ = cheerio.load(html);
    const products: ScrapedProduct[] = [];

    $('div.product-grid-item').each(function () {
      const el = $(this);

      // Product ID from add-to-cart button or link
      const productId = el.find('.js-add-to-cart').attr('data-id')
        || el.find('a[href*="/products/product/"]').attr('href')?.match(/product\/([A-F0-9]+)/i)?.[1];
      if (!productId) return;

      // Name
      const name = el.find('h2.product-name a').text().trim();
      if (!name) return;

      // Price - check for discount price first
      const priceEl = el.find('span.product-price');
      const newPriceText = priceEl.find('span.new').text().trim();
      const regularPriceText = priceEl.find('span').not('.new').not('.old').text().trim();
      const priceText = newPriceText || regularPriceText;
      const price = priceText ? parseFloat(priceText.replace('₾', '').replace(',', '.').trim()) : 0;
      if (!price || price <= 0) return;

      // Image
      const imgSrc = el.find('img.embed-responsive-item').attr('src') || undefined;

      // Barcode from image filename
      let barcode: string | undefined;
      if (imgSrc) {
        const match = imgSrc.match(/\/(\d{8,14})\.\w+/);
        if (match) barcode = match[1];
      }

      // URL
      const url = `${EURO_SITE}/products/product/${productId}`;

      products.push({
        external_id: `euro-${productId}`,
        name,
        price,
        category,
        image_url: imgSrc,
        barcode,
        url,
        in_stock: true,
      });
    });

    return products;
  }

  private getMaxPage(html: string): number {
    const $ = cheerio.load(html);
    let maxPage = 1;
    $('a[href*="page-"]').each(function () {
      const text = $(this).text().trim();
      const num = parseInt(text);
      if (!isNaN(num) && num > maxPage) maxPage = num;
    });
    return maxPage;
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Europroduct] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    log(`Scraping ${CATEGORIES.length} categories`);

    for (const cat of CATEGORIES) {
      let page = 1;
      let maxPage = 1;

      while (page <= maxPage) {
        try {
          // Page 1: /products?pcat_idIn=X, Page 2+: /products/page-N?pcat_idIn=X
          const url = page === 1
            ? `${EURO_SITE}/products?pcat_idIn=${cat.id}`
            : `${EURO_SITE}/products/page-${page}?pcat_idIn=${cat.id}`;

          const res = await this.fetchWithRateLimit(url, {
            headers: { 'Accept': 'text/html', 'Accept-Language': 'ka' },
          });

          if (!res.ok) {
            log(`  HTTP ${res.status} for ${cat.name} page ${page}`);
            break;
          }

          const html = await res.text();

          // On first page, detect total pages from pagination links
          if (page === 1) {
            maxPage = this.getMaxPage(html);
          }

          const products = this.parseProductCards(html, cat.name);

          if (products.length === 0) break;

          let newInPage = 0;
          for (const p of products) {
            if (seen.has(p.external_id)) continue;
            seen.add(p.external_id);
            newInPage++;
            allProducts.push(p);
          }

          if (newInPage > 0 && (page === 1 || page % 5 === 0 || page === maxPage)) {
            log(`  ${cat.name}: page ${page}/${maxPage}, +${newInPage} new (${allProducts.length} total)`);
          }

          page++;
        } catch (err) {
          log(`  Error in ${cat.name} page ${page}: ${err}`);
          break;
        }
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      const url = `${EURO_SITE}/products?NameContains=${encodeURIComponent(query)}&PageSize=30`;
      const res = await this.fetchWithRateLimit(url, {
        headers: { 'Accept': 'text/html', 'Accept-Language': 'ka' },
      });
      if (!res.ok) return [];
      const html = await res.text();
      return this.parseProductCards(html, '');
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    try {
      const id = externalId.replace('euro-', '');
      const url = `${EURO_SITE}/products/product/${id}`;
      const res = await this.fetchWithRateLimit(url, {
        headers: { 'Accept': 'text/html', 'Accept-Language': 'ka' },
      });
      if (!res.ok) return null;

      const html = await res.text();
      const $ = cheerio.load(html);

      const name = $('h1').first().text().trim() || $('h2.product-name').first().text().trim();
      if (!name) return null;

      const priceText = $('span.new').first().text().trim() || $('span.product-price span').first().text().trim();
      const price = priceText ? parseFloat(priceText.replace('₾', '').replace(',', '.').trim()) : 0;

      const imgSrc = $('img.embed-responsive-item').first().attr('src') || undefined;
      let barcode: string | undefined;
      if (imgSrc) {
        const match = imgSrc.match(/\/(\d{8,14})\.\w+/);
        if (match) barcode = match[1];
      }

      return {
        external_id: `euro-${id}`,
        name,
        price,
        image_url: imgSrc,
        barcode,
        url,
        in_stock: true,
      };
    } catch {
      return null;
    }
  }
}
