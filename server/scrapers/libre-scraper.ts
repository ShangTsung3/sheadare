import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const LIBRE_SITE = 'https://libre.ge';

const CATEGORIES = [
  { slug: 'boom-price', name: 'ბუმ ფასი' },
  { slug: 'alcoholi-aqcia', name: 'ალკოჰოლური სასმელი' },
  { slug: 'textile', name: 'ტექსტილი' },
  { slug: 'frozen-products', name: 'გაყინული პროდუქცია' },
  { slug: 'kitchen-accessories', name: 'სამზარეულოს აქსესუარები' },
  { slug: 'soft-drink', name: 'უალკოჰოლო სასმელი' },
  { slug: 'household-chemicals', name: 'საყოფაცხოვრებო ქიმია' },
  { slug: 'canned-goods', name: 'ბაკალეა/კონსერვაცია' },
  { slug: 'coffeetea', name: 'ყავა/ჩაი' },
  { slug: 'sweets', name: 'ტკბილეული' },
  { slug: 'snack', name: 'სნექი' },
  { slug: 'fruits-and-vegetables', name: 'ხილ-ბოსტნეული' },
  { slug: 'xorc-produqtebi', name: 'ხორც პროდუქტები' },
  { slug: 'dairy-products', name: 'რძის ნაწარმი' },
];

export class LibreScraper extends BaseScraper {
  readonly storeName = 'Libre';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private parseProducts(html: string, category: string, categorySlug: string): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];

    // Match each product card block
    const cardRegex = /<a\s+class="link-secondary"\s+href="(\/productebi\/[^"]+)">\s*<div class="position-relative product_card[^>]*>[\s\S]*?<\/a>/g;
    let match;

    while ((match = cardRegex.exec(html)) !== null) {
      const block = match[0];
      const url = match[1];

      // Extract product name from alt attribute or title div
      const nameMatch = block.match(/alt="([^"]+)"/);
      const name = nameMatch ? nameMatch[1].trim() : '';
      if (!name) continue;

      // Extract image
      const imgMatch = block.match(/src="(https:\/\/libre\.ge\/storage\/images\/[^"]+)"/);
      const imageUrl = imgMatch ? imgMatch[1] : undefined;

      // Extract product ID from image URL
      const idMatch = imageUrl?.match(/\/(\d+)\.jpg/);
      const productId = idMatch ? idMatch[1] : url.replace(/\//g, '-');

      // Extract price: lari (whole) + tetri (decimal)
      const lariMatch = block.match(/product_card__new_price_lari[^>]*>\s*(\d+)/);
      const tetriMatch = block.match(/product_card__new_price_tetri[^>]*>\s*(\d+)/);
      const lari = lariMatch ? parseInt(lariMatch[1]) : 0;
      const tetri = tetriMatch ? parseInt(tetriMatch[1]) : 0;
      const price = lari + tetri / 100;

      if (price <= 0) continue;

      // Extract old price
      const oldPriceMatch = block.match(/product_card__old_price[^>]*>\s*([\d.]+)/);

      // Extract size from name (common patterns)
      const sizeMatch = name.match(/(\d+(?:[.,]\d+)?\s*(?:მლ|ლ|გ|კგ|მგ|ცალი|ც))\s*$/i);

      products.push({
        external_id: `libre-${productId}`,
        name,
        price,
        size: sizeMatch ? sizeMatch[1] : undefined,
        category,
        image_url: imageUrl,
        url: `${LIBRE_SITE}${url}`,
        in_stock: true,
      });
    }

    return products;
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Libre] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    log(`Scraping ${CATEGORIES.length} categories`);

    for (const cat of CATEGORIES) {
      try {
        const res = await this.fetchWithRateLimit(`${LIBRE_SITE}/productebi/${cat.slug}`);
        const html = await res.text();
        const products = this.parseProducts(html, cat.name, cat.slug);

        let newCount = 0;
        for (const p of products) {
          if (seen.has(p.external_id)) continue;
          seen.add(p.external_id);
          allProducts.push(p);
          newCount++;
        }

        log(`${cat.name}: +${newCount} (${allProducts.length} total)`);
      } catch (err) {
        log(`Error in ${cat.name}: ${err}`);
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      const res = await this.fetchWithRateLimit(`${LIBRE_SITE}/search?q=${encodeURIComponent(query)}`);
      const html = await res.text();
      return this.parseProducts(html, '', 'search');
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
