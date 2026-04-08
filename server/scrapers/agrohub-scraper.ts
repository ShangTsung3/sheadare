import { RateLimiter } from './rate-limiter.js';

const API_BASE = 'https://api.agrohub.ge/v1';
const SHOP_ID = 1;

interface AgrohubProduct {
  external_id: string;
  name: string;
  size: string;
  category: string;
  image_url: string;
  brand: string;
  barcode: string;
  price: number;
  url: string;
}

export class AgrohubScraper {
  private token: string;
  private rateLimiter: RateLimiter;

  constructor(rateLimiter: RateLimiter, token: string) {
    this.rateLimiter = rateLimiter;
    this.token = token;
  }

  private async fetch(path: string): Promise<any> {
    await this.rateLimiter.acquire();
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
        'os': 'web',
        'accept-language': 'ka',
        'origin': 'https://agrohub.ge',
        'referer': 'https://agrohub.ge/',
      },
    });
    if (!res.ok) throw new Error(`Agrohub API ${res.status}: ${url}`);
    return res.json();
  }

  async scrapeAll(log: (msg: string) => void): Promise<AgrohubProduct[]> {
    const allProducts: AgrohubProduct[] = [];
    const seenIds = new Set<number>();

    // 1. Get all parent categories
    log('Fetching categories...');
    const catData = await this.fetch(`/Categories?ShopId=${SHOP_ID}`);
    const categories: Array<{ id: number; name: string }> = catData.categories || [];
    log(`Found ${categories.length} categories`);

    // 2. For each category, get subcategories, then products
    for (const cat of categories) {
      log(`Category: ${cat.name} (${cat.id})`);

      // Get subcategories
      let subs: Array<{ id: number; name: string }> = [];
      try {
        subs = await this.fetch(`/Categories/subcategories?categoryId=${cat.id}&shopId=${SHOP_ID}`);
      } catch {}

      if (subs.length > 0) {
        // Fetch products per subcategory
        for (const sub of subs) {
          try {
            const data = await this.fetch(
              `/Products/GetGroupedProducts?ShopId=${SHOP_ID}&ParentCategoryId=${cat.id}&SubCategoryId=${sub.id}&DiscountAsc=true&PageSize=500`
            );
            const groups = data.groupedProduct || data.groupes || [];
            let count = 0;
            for (const group of groups) {
              const products = group.products || [];
              for (const p of products) {
                if (p.id && p.price > 0 && !seenIds.has(p.id)) {
                  seenIds.add(p.id);
                  allProducts.push(this.mapProduct(p, cat.name));
                  count++;
                }
              }
            }
            if (count > 0) log(`  ${sub.name}: +${count} (${allProducts.length} total)`);
          } catch {}
        }
      } else {
        // No subcategories - fetch directly by parent category
        try {
          const data = await this.fetch(
            `/Products/GetGroupedProducts?ShopId=${SHOP_ID}&ParentCategoryId=${cat.id}&DiscountAsc=true&PageSize=500`
          );
          const groups = data.groupedProduct || data.groupes || [];
          let count = 0;
          for (const group of groups) {
            const products = group.products || [];
            for (const p of products) {
              if (p.id && p.price > 0 && !seenIds.has(p.id)) {
                seenIds.add(p.id);
                allProducts.push(this.mapProduct(p, cat.name));
                count++;
              }
            }
          }
          if (count > 0) log(`  Direct: +${count} (${allProducts.length} total)`);
        } catch {}
      }
    }

    // 3. Also get discount products
    log('Fetching discount products...');
    try {
      const data = await this.fetch(`/Products/Discount_Product?ShopId=${SHOP_ID}&OnSale=true`);
      const products = data.products || [];
      let count = 0;
      for (const p of products) {
        if (p.id && p.price > 0 && !seenIds.has(p.id)) {
          seenIds.add(p.id);
          allProducts.push(this.mapProduct(p, 'discount'));
          count++;
        }
      }
      log(`  Discount: +${count}`);
    } catch {}

    log(`Total: ${allProducts.length} unique products`);
    return allProducts;
  }

  private mapProduct(p: any, category: string): AgrohubProduct {
    const sizeMatch = (p.name || '').match(/(\d+(?:[.,]\d+)?)\s*(მლ|მგ|ლ|კგ|გრ|ml|mg|l|kg|g)\b/i);
    return {
      external_id: `agrohub-${p.id}`,
      name: p.name || '',
      size: sizeMatch ? `${sizeMatch[1]}${sizeMatch[2]}` : '',
      category,
      image_url: p.imageUrl || '',
      brand: '',
      barcode: p.barCode || '',
      price: p.price,
      url: 'https://agrohub.ge',
    };
  }
}
