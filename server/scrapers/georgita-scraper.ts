import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const GEORGITA_SITE = 'https://georgita.ge';
const PRODUCTS_PER_PAGE = 33;
const MAX_PAGES = 50;

export class GeorgitaScraper extends BaseScraper {
  readonly storeName = 'Georgita';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private parseProducts(html: string): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];

    // Split by product items
    const blocks = html.split('product-grid-item js-product-item');

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i].slice(0, 3000);

      // Product ID from data-id
      const idMatch = block.match(/data-id="([^"]+)"/);
      const productId = idMatch ? idMatch[1] : null;
      if (!productId) continue;

      // Product URL
      const urlMatch = block.match(/href="(https?:\/\/georgita\.ge\/[^"]*product\/[^"]+)"/);
      const url = urlMatch ? urlMatch[1] : `${GEORGITA_SITE}/products/product/${productId}`;

      // Product name from product-name h4 > a
      const nameTagMatch = block.match(/product-name">\s*<a[^>]*>([^<]+)<\/a>/s);
      // Fallback: alt attribute (may contain quotes, so use a broader match)
      const altMatch = block.match(/alt="([^"]{3,})"/);
      const name = (nameTagMatch ? nameTagMatch[1] : altMatch ? altMatch[1] : '').trim();
      if (!name) continue;

      // Image
      const imgMatch = block.match(/src="(https?:\/\/georgita\.ge\/eCommerce\/Products\/[^"]+)"/);
      const imageUrl = imgMatch ? imgMatch[1] : undefined;

      // Price: Georgian format uses comma as decimal (10,00 ₾)
      const newPriceMatch = block.match(/class="new">([\d.,]+)\s*₾/);
      const regularPriceMatch = block.match(/product-price">\s*\n?\s*([\d.,]+)\s*₾/);
      const priceStr = newPriceMatch ? newPriceMatch[1] : regularPriceMatch ? regularPriceMatch[1] : null;
      if (!priceStr) continue;
      const price = parseFloat(priceStr.replace(',', '.'));
      if (price <= 0 || isNaN(price)) continue;

      // Size from name (Georgian and international units)
      const sizeMatch = name.match(/(\d+(?:[.,]\d+)?\s*(?:მლ|მგ|გრ|კგ|ლ|ცალი|ML|L|G|GR|KG|MG|PCS|CT|OZ|CL))\b/i);

      products.push({
        external_id: `georgita-${productId}`,
        name,
        price,
        size: sizeMatch ? sizeMatch[1] : undefined,
        image_url: imageUrl,
        url,
        in_stock: true,
      });
    }

    return products;
  }

  private getTotalPages(html: string): number {
    const matches = html.match(/page=(\d+)/g);
    if (!matches) return 1;
    let max = 1;
    for (const m of matches) {
      const num = parseInt(m.replace('page=', ''));
      if (num > max) max = num;
    }
    return Math.min(max, MAX_PAGES);
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Georgita] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    // First page to get total pages
    const firstRes = await this.fetchWithRateLimit(`${GEORGITA_SITE}/products?page=1`);
    const firstHtml = await firstRes.text();
    const totalPages = this.getTotalPages(firstHtml);
    log(`Found ${totalPages} pages`);

    // Parse first page
    const firstProducts = this.parseProducts(firstHtml);
    for (const p of firstProducts) {
      if (!seen.has(p.external_id)) {
        seen.add(p.external_id);
        allProducts.push(p);
      }
    }
    log(`Page 1: +${firstProducts.length} (${allProducts.length} total)`);

    // Remaining pages
    for (let page = 2; page <= totalPages; page++) {
      try {
        const res = await this.fetchWithRateLimit(`${GEORGITA_SITE}/products?page=${page}`);
        const html = await res.text();
        const products = this.parseProducts(html);

        let newCount = 0;
        for (const p of products) {
          if (!seen.has(p.external_id)) {
            seen.add(p.external_id);
            allProducts.push(p);
            newCount++;
          }
        }

        if (page % 5 === 0 || page === totalPages) {
          log(`Page ${page}/${totalPages}: +${newCount} (${allProducts.length} total)`);
        }
      } catch (err) {
        log(`Error on page ${page}: ${err}`);
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      const res = await this.fetchWithRateLimit(`${GEORGITA_SITE}/products?SearchValue=${encodeURIComponent(query)}`);
      const html = await res.text();
      return this.parseProducts(html);
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
