import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const PSP_GRAPHQL = 'https://app.psp.ge/graphql';

// Category 823 = მედიკამენტები (~5,041 products)
const CATEGORIES = [
  { id: '823', label: 'მედიკამენტები' },
];

const PRODUCTS_QUERY = `
query GetProducts($categoryId: String!, $pageSize: Int!, $currentPage: Int!) {
  products(
    filter: { category_id: { eq: $categoryId } }
    pageSize: $pageSize
    currentPage: $currentPage
  ) {
    total_count
    items {
      id
      name
      sku
      doza
      migebis_forma
      moculoba
      moqmedi_nivtiereba
      stock_status
      small_image { url }
      price_range {
        minimum_price {
          regular_price { value }
          final_price { value }
        }
      }
    }
  }
}`;

interface PspProduct {
  id: number;
  name: string;
  sku: string;
  doza: string | null;
  migebis_forma: string | null;
  moculoba: string | null;
  moqmedi_nivtiereba: string | null;
  stock_status: string;
  small_image: { url: string } | null;
  price_range: {
    minimum_price: {
      regular_price: { value: number };
      final_price: { value: number };
    };
  };
}

export class PspScraper extends BaseScraper {
  readonly storeName = 'PSP';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private async fetchGraphQL(query: string, variables: Record<string, unknown>): Promise<any> {
    const response = await this.fetchWithRateLimit(PSP_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`PSP GraphQL error: ${response.status}`);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(`PSP GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  private mapProduct(item: PspProduct, categoryLabel: string): ScrapedProduct | null {
    const name = item.name?.trim();
    if (!name) return null;

    const price = item.price_range?.minimum_price?.final_price?.value
      || item.price_range?.minimum_price?.regular_price?.value;
    if (!price || price <= 0) return null;

    // Parse dose from name if not in structured field
    let dose = item.doza || undefined;
    if (!dose) {
      // Try percentage first (e.g. "1%", "0.1%")
      const pctMatch = name.match(/([\d.]+)\s*%/);
      if (pctMatch) {
        dose = pctMatch[0].trim();
      } else {
        const doseMatch = name.match(/([\d.]+)\s*(მგ|mg|გ|g|მკგ|mcg|მლ|ml)/i);
        if (doseMatch) dose = doseMatch[0].trim();
      }
    }

    // Parse quantity from name
    let quantity: string | undefined;
    const qtyMatch = name.match(/(\d+)\s*(ტაბლეტი|კაფსულა|ამპულა|ფლაკონი|ფლ|ცალი|tab|caps|amp)/i)
      || name.match(/[#№Nn]\s*(\d+)/)
      || name.match(/(\d+)\s*ც(?:\s|$)/);
    if (qtyMatch) {
      quantity = qtyMatch[1];
    }

    return {
      external_id: `psp-${item.id}`,
      name,
      price,
      category: categoryLabel,
      image_url: item.small_image?.url || undefined,
      url: `https://psp.ge`,
      in_stock: item.stock_status === 'IN_STOCK',
      active_ingredient: item.moqmedi_nivtiereba || undefined,
      dose,
      dosage_form: item.migebis_forma || undefined,
      quantity,
    };
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[PSP] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();
    const PAGE_SIZE = 50;

    for (const cat of CATEGORIES) {
      log(`Category: ${cat.label} (ID: ${cat.id})`);

      try {
        // First page to get total count
        const firstData = await this.fetchGraphQL(PRODUCTS_QUERY, {
          categoryId: cat.id,
          pageSize: PAGE_SIZE,
          currentPage: 1,
        });

        const totalCount = firstData.products.total_count;
        const totalPages = Math.ceil(totalCount / PAGE_SIZE);
        log(`  Total: ${totalCount} products, ${totalPages} pages`);

        // Process first page
        for (const item of firstData.products.items) {
          const product = this.mapProduct(item, cat.label);
          if (product && !seen.has(product.external_id)) {
            seen.add(product.external_id);
            allProducts.push(product);
          }
        }
        log(`  Page 1/${totalPages} — ${allProducts.length} total`);

        // Remaining pages
        for (let page = 2; page <= totalPages; page++) {
          try {
            const data = await this.fetchGraphQL(PRODUCTS_QUERY, {
              categoryId: cat.id,
              pageSize: PAGE_SIZE,
              currentPage: page,
            });

            for (const item of data.products.items) {
              const product = this.mapProduct(item, cat.label);
              if (product && !seen.has(product.external_id)) {
                seen.add(product.external_id);
                allProducts.push(product);
              }
            }

            if (page % 10 === 0 || page === totalPages) {
              log(`  Page ${page}/${totalPages} — ${allProducts.length} total`);
            }
          } catch (err) {
            log(`  Error on page ${page}: ${err}`);
          }
        }
      } catch (err) {
        log(`  Error in category ${cat.label}: ${err}`);
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      const data = await this.fetchGraphQL(`
        query SearchProducts($query: String!) {
          products(search: $query, pageSize: 20, currentPage: 1) {
            items {
              id name sku doza migebis_forma moculoba moqmedi_nivtiereba stock_status
              small_image { url }
              price_range { minimum_price { regular_price { value } final_price { value } } }
            }
          }
        }
      `, { query });

      return data.products.items
        .map((item: PspProduct) => this.mapProduct(item, ''))
        .filter(Boolean) as ScrapedProduct[];
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
