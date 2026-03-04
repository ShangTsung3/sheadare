import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const KONTAKT_SITE = 'https://kontakt.ge';
const GRAPHQL_URL = `${KONTAKT_SITE}/graphql`;

interface KontaktCategory {
  id: string;
  label: string;
}

const CATEGORIES: KontaktCategory[] = [
  { id: '2297', label: 'ტელეფონები' },    // 551 products
  { id: '2303', label: 'ტაბლეტები' },     // 75 products
  { id: '2309', label: 'ლეპტოპები' },     // 227 products
  { id: '2315', label: 'ტელევიზორები' },   // 255 products
  { id: '2299', label: 'ყურსასმენები' },   // 272 products
  { id: '2295', label: 'გეიმინგი' },       // 233 products
];

interface GqlProductItem {
  name: string;
  sku: string;
  url_key?: string;
  price_range: {
    minimum_price: {
      final_price: { value: number; currency: string };
    };
  };
  small_image?: { url: string };
  stock_status?: string;
}

interface GqlResponse {
  data?: {
    products?: {
      items: GqlProductItem[];
      total_count: number;
      page_info: {
        current_page: number;
        total_pages: number;
      };
    };
  };
}

export class KontaktScraper extends BaseScraper {
  readonly storeName = 'Kontakt';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private async fetchGraphQL(query: string): Promise<GqlResponse | null> {
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Store': 'default',
        },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) return null;
      return await res.json() as GqlResponse;
    } catch {
      return null;
    }
  }

  private buildQuery(categoryId: string, page: number, pageSize = 50): string {
    return `{
  products(
    filter: { category_id: { eq: "${categoryId}" } }
    pageSize: ${pageSize}
    currentPage: ${page}
    sort: { position: ASC }
  ) {
    items {
      name
      sku
      url_key
      price_range {
        minimum_price {
          final_price {
            value
            currency
          }
        }
      }
      small_image {
        url
      }
      stock_status
    }
    total_count
    page_info {
      current_page
      total_pages
    }
  }
}`;
  }

  private toScrapedProduct(item: GqlProductItem, categoryLabel: string): ScrapedProduct | null {
    const price = item.price_range?.minimum_price?.final_price?.value;
    if (!price || price <= 0) return null;

    return {
      external_id: `kontakt-${item.sku}`,
      name: item.name,
      price,
      category: categoryLabel,
      image_url: item.small_image?.url || undefined,
      url: item.url_key ? `${KONTAKT_SITE}/${item.url_key}.html` : undefined,
      in_stock: item.stock_status !== 'OUT_OF_STOCK',
    };
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Kontakt] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    for (const cat of CATEGORIES) {
      log(`Category: ${cat.label} (id=${cat.id})`);

      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        try {
          await this.rateLimiter.acquire();

          const query = this.buildQuery(cat.id, page);
          const response = await this.fetchGraphQL(query);

          if (!response?.data?.products) {
            log(`  No data for category ${cat.id} page ${page}`);
            break;
          }

          const { items, total_count, page_info } = response.data.products;
          totalPages = page_info.total_pages;

          if (items.length === 0) break;

          let newInPage = 0;
          for (const item of items) {
            if (seen.has(item.sku)) continue;
            seen.add(item.sku);

            const scraped = this.toScrapedProduct(item, cat.label);
            if (scraped) {
              allProducts.push(scraped);
              newInPage++;
            }
          }

          log(`  Page ${page}/${totalPages}: +${newInPage} products (${total_count} total in category, ${allProducts.length} scraped total)`);
          page++;
        } catch (err) {
          log(`  Error in ${cat.label} page ${page}: ${err}`);
          break;
        }
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      await this.rateLimiter.acquire();

      const gql = `{
  products(
    search: "${query.replace(/"/g, '\\"')}"
    pageSize: 30
    currentPage: 1
  ) {
    items {
      name
      sku
      url_key
      price_range {
        minimum_price {
          final_price {
            value
            currency
          }
        }
      }
      small_image {
        url
      }
      stock_status
    }
    total_count
    page_info {
      current_page
      total_pages
    }
  }
}`;

      const response = await this.fetchGraphQL(gql);
      if (!response?.data?.products?.items) return [];

      return response.data.products.items
        .map((item) => this.toScrapedProduct(item, ''))
        .filter((p): p is ScrapedProduct => p !== null);
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
