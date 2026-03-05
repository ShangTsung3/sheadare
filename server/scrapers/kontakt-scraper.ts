import { chromium, type Browser, type Page } from 'playwright';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const KONTAKT_SITE = 'https://kontakt.ge';
const GRAPHQL_URL = `${KONTAKT_SITE}/graphql`;
const CATEGORY_URL = `${KONTAKT_SITE}/catalog/category/view/id`;

interface KontaktCategory {
  id: string;
  label: string;
}

const CATEGORIES: KontaktCategory[] = [
  // === მობილურები ===
  { id: '2297', label: 'მობილური ტელეფონები' },
  { id: '2361', label: 'ეკრანის დამცავები' },
  { id: '2362', label: 'ქეისები' },
  { id: '2363', label: 'ადაპტერები' },
  { id: '2364', label: 'უსადენო დამტენები' },
  { id: '2365', label: 'Power Bank' },
  { id: '2366', label: 'კაბელები' },
  { id: '2367', label: 'მანქანის აქსესუარები (მობ.)' },
  { id: '2675', label: 'AirTag' },
  { id: '2739', label: 'სტაციონალური ტელეფონი' },

  // === ყურსასმენები ===
  { id: '2371', label: 'უსადენო ყურსასმენები' },
  { id: '3313', label: 'TWS ყურსასმენები' },
  { id: '2373', label: 'კაბელიანი ყურსასმენები' },
  { id: '2374', label: 'Gaming ყურსასმენები' },

  // === სმარტ გაჯეტები ===
  { id: '2302', label: 'სმარტ საათები' },
  { id: '2303', label: 'პლანშეტები' },
  { id: '2728', label: 'სტილუსები' },
  { id: '2730', label: 'პლანშეტის ქეისები' },
  { id: '2392', label: 'დრონები' },
  { id: '2397', label: 'ბინოკლები' },
  { id: '2398', label: 'ფოტო პრინტერები (სმარტ)' },
  { id: '2404', label: 'სანათები' },
  { id: '2403', label: 'უსაფრთხოების კამერები' },
  { id: '2633', label: 'სასწორები' },
  { id: '3280', label: 'სმარტ სათვალე' },
  { id: '2408', label: 'ველოსიპედები' },
  { id: '2410', label: 'სკუტერები' },
  { id: '2711', label: 'ავტომობილის აქსესუარები' },

  // === კომპიუტერული ტექნიკა ===
  { id: '2309', label: 'ლეპტოპები' },
  { id: '2310', label: 'მონიტორები' },
  { id: '2313', label: 'პრინტერები' },
  { id: '2430', label: 'Wifi როუტერი' },
  { id: '2431', label: 'ქსელის კაბელები' },
  { id: '2435', label: 'კლავიატურები' },
  { id: '2436', label: 'მაუსები' },
  { id: '2437', label: 'მაუს პადები' },
  { id: '2439', label: 'გადამყვანები' },
  { id: '2440', label: 'ლეპტოპის ჩანთები' },
  { id: '2441', label: 'ვებ კამერები' },
  { id: '2444', label: 'ფლეშ მეხსიერებები' },
  { id: '2448', label: 'კარტრიჯები' },
  { id: '2465', label: 'HDMI კაბელები' },
  { id: '2705', label: 'სეტები (კლავ.+მაუსი)' },
  { id: '3270', label: 'ელემენტები' },
  { id: '3275', label: 'ქულერები' },

  // === ტელევიზორები & აუდიო ===
  { id: '2315', label: 'ტელევიზორები' },
  { id: '2317', label: 'პროექტორები' },
  { id: '2459', label: 'საუნდბარები' },
  { id: '2460', label: 'ბლუთუზ დინამიკები' },
  { id: '2735', label: 'ფოტო აპარატები' },
  { id: '2736', label: 'ფოტო პრინტერები' },

  // === საყოფაცხოვრებო ტექნიკა ===
  { id: '2471', label: 'მაცივრები' },
  { id: '2472', label: 'სარეცხი მანქანები' },
  { id: '2473', label: 'ჭურჭლის სარეცხი მანქანები' },
  { id: '2474', label: 'გაზქურები' },
  { id: '2475', label: 'საშრობი მანქანები' },
  { id: '2477', label: 'წყლის დისპენსერები' },
  { id: '2537', label: 'გამწოვები' },
  { id: '2479', label: 'ჩასაშენებელი ღუმელი' },
  { id: '2478', label: 'გაზქურის ზედაპირი' },
  { id: '2717', label: 'საკერავი მანქანები' },

  // === კლიმატი ===
  { id: '2495', label: 'ვენტილატორი' },
  { id: '2497', label: 'წყლის გამაცხელებელი' },
  { id: '2499', label: 'ელექტრო გამათბობლები' },
  { id: '2500', label: 'გაზის გამათბობლები' },
  { id: '2567', label: 'კონდიციონერები' },

  // === სამზარეულო ===
  { id: '2511', label: 'ბლენდერები' },
  { id: '2512', label: 'ხორცსაკეპი მანქანა' },
  { id: '2513', label: 'ყავის აპარატები' },
  { id: '2514', label: 'ყავის საფქვავები' },
  { id: '2515', label: 'მიქსერები' },
  { id: '2516', label: 'კომბაინები' },
  { id: '2517', label: 'ელექტრო ჩაიდანი' },
  { id: '2518', label: 'ტოსტერი' },
  { id: '2519', label: 'ელექტრო გრილი' },
  { id: '2520', label: 'წვენსაწური' },
  { id: '2521', label: 'ჩოფერი' },
  { id: '2524', label: 'აეროგრილები' },
  { id: '2525', label: 'მულტისახარშები' },
  { id: '2527', label: 'პურის საცხობები' },
  { id: '2528', label: 'მინი ღუმელები' },
  { id: '2529', label: 'მიკროტალღური ღუმელი' },
  { id: '2545', label: 'ტაფები' },
  { id: '2546', label: 'ქვაბები' },
  { id: '2547', label: 'ქვაბების ნაკრები' },
  { id: '2548', label: 'დანები' },
  { id: '2549', label: 'თერმოსები' },
  { id: '2552', label: 'სამზარეულოს აქსესუარები' },

  // === სახლი და დასუფთავება ===
  { id: '2553', label: 'მტვერსასრუტები' },
  { id: '2554', label: 'რობოტი მტვერსასრუტები' },
  { id: '2555', label: 'უსადენო მტვერსასრუტები' },
  { id: '2558', label: 'უთო' },
  { id: '2561', label: 'ორთქლის უთო' },
  { id: '2562', label: 'ორთქლის გენერატორი' },
  { id: '2565', label: 'ჰაერის გამწმენდები' },
  { id: '2566', label: 'ჰაერის დამატენიანებლები' },

  // === Gaming ===
  { id: '2576', label: 'PlayStation 5' },
  { id: '2676', label: 'ჯოისტიკები' },
  { id: '2338', label: 'Gaming ლეპტოპები' },
  { id: '2339', label: 'Gaming მონიტორები' },
  { id: '2591', label: 'Gaming მაუსები' },
  { id: '2592', label: 'Gaming კლავიატურები' },
  { id: '2593', label: 'Gaming მაუსპადები' },
  { id: '2594', label: 'Gaming ყურსასმენები' },

  // === სილამაზე და ჯანმრთელობა ===
  { id: '2598', label: 'თმის ფენები' },
  { id: '2599', label: 'თმის სახვევები' },
  { id: '2600', label: 'თმის უთოები' },
  { id: '2601', label: 'თმის სტაილერები' },
  { id: '2603', label: 'ელექტრო ჯაგრისები' },
  { id: '2604', label: 'წვერსაპარსები' },
  { id: '2605', label: 'ტრიმერები' },
  { id: '2606', label: 'თმის საკრეჭები' },
  { id: '2602', label: 'ეპილატორები' },
  { id: '2716', label: 'ირიგატორები' },

  // === სხვა ===
  { id: '2712', label: 'ყავის მარცვლები' },
  { id: '2719', label: 'სათამაშოები' },
  { id: '3269', label: 'სასკოლო ზურგჩანთები' },
];

// Parse Georgian price format: "4399,99 ₾" → 4399.99
function parsePrice(text: string): number {
  if (!text || text.includes('------')) return 0;
  const cleaned = text.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

// Extract products from the rendered Playwright page
function extractProductsScript(): any[] {
  const items = document.querySelectorAll('.prodItem.product-item');
  const results: any[] = [];

  for (const el of items) {
    const sku = el.getAttribute('data-sku') || '';
    if (!sku) continue;

    // Product name
    const nameEl = el.querySelector('.prodItem__title');
    const name = nameEl?.textContent?.trim() || '';

    // Product URL from image link
    const linkEl = el.querySelector('a.prodItem__img') as HTMLAnchorElement | null;
    const url = linkEl?.href || '';

    // Product image
    const imgEl = el.querySelector('img.product-image') as HTMLImageElement | null;
    const imageUrl = imgEl?.src || '';

    // Price extraction from prodItem__prices > strong
    const priceStrong = el.querySelector('.prodItem__prices strong');
    let finalPrice = 0;

    if (priceStrong) {
      const simplePrice = priceStrong.querySelector('b.simple-price');
      const discountNew = priceStrong.querySelector('b:not(.simple-price)');

      if (simplePrice) {
        // Regular price, no discount
        finalPrice = parseFloat(
          (simplePrice.textContent?.trim() || '')
            .replace(/[^\d,]/g, '').replace(',', '.')
        ) || 0;
      } else if (discountNew) {
        // Discounted price — <i> is old, <b> is new/final
        finalPrice = parseFloat(
          (discountNew.textContent?.trim() || '')
            .replace(/[^\d,]/g, '').replace(',', '.')
        ) || 0;
      }
    }

    // Check stock: if price is "------ ₾" → out of stock
    const priceText = priceStrong?.textContent?.trim() || '';
    const inStock = !priceText.includes('------') && finalPrice > 0;

    if (name && finalPrice > 0) {
      results.push({ sku, name, finalPrice, url, imageUrl, inStock });
    }
  }

  return results;
}

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

  private async scrapeCategoryPage(
    page: Page,
    categoryId: string,
    pageNum: number,
  ): Promise<{ products: any[]; hasNextPage: boolean }> {
    const url = pageNum === 1
      ? `${CATEGORY_URL}/${categoryId}`
      : `${CATEGORY_URL}/${categoryId}?p=${pageNum}`;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait for product items or "no products" indicator
    try {
      await page.waitForSelector('.prodItem.product-item, .message.info.empty', {
        timeout: 8000,
      });
    } catch {
      // Page may have loaded but no products visible yet
    }

    const products = await page.evaluate(extractProductsScript);

    const hasNextPage = await page.evaluate(() => {
      const nextLink = document.querySelector('.pages-items .action.next');
      return !!nextLink;
    });

    return { products, hasNextPage };
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Kontakt] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    log('Launching browser for Kontakt scraping...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // Block heavy resources to speed up page loading
    // Use fulfill() instead of abort() to prevent ERR_NETWORK_IO_SUSPENDED
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        return route.fulfill({ status: 200, body: '', contentType: 'text/plain' });
      }
      return route.continue();
    });

    try {
      for (const cat of CATEGORIES) {
        log(`Category: ${cat.label} (id=${cat.id})`);

        let pageNum = 1;

        while (true) {
          try {
            await this.rateLimiter.acquire();

            const { products, hasNextPage } = await this.scrapeCategoryPage(
              page, cat.id, pageNum,
            );

            if (products.length === 0 && pageNum === 1) {
              log(`  Empty category, skipping`);
              break;
            }

            let newInPage = 0;
            for (const item of products) {
              if (seen.has(item.sku)) continue;
              seen.add(item.sku);

              allProducts.push({
                external_id: `kontakt-${item.sku}`,
                name: item.name,
                price: item.finalPrice,
                category: cat.label,
                image_url: item.imageUrl || undefined,
                url: item.url || undefined,
                in_stock: item.inStock,
              });
              newInPage++;
            }

            log(`  Page ${pageNum}: ${products.length} items, +${newInPage} new (${allProducts.length} total)`);

            if (!hasNextPage || products.length === 0) break;
            pageNum++;
          } catch (err) {
            log(`  Error in ${cat.label} page ${pageNum}: ${err}`);
            break;
          }
        }
      }
    } finally {
      await browser.close();
      log('Browser closed');
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  // Search still uses GraphQL (fast, good enough for live search)
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
        .map((item) => {
          const price = item.price_range?.minimum_price?.final_price?.value;
          if (!price || price <= 0) return null;

          return {
            external_id: `kontakt-${item.sku}`,
            name: item.name,
            price,
            category: '',
            image_url: item.small_image?.url || undefined,
            url: item.url_key ? `${KONTAKT_SITE}/${item.url_key}.html` : undefined,
            in_stock: item.stock_status !== 'OUT_OF_STOCK',
          } as ScrapedProduct;
        })
        .filter((p): p is ScrapedProduct => p !== null);
    } catch {
      return [];
    }
  }

  async fetchProduct(externalId: string): Promise<ScrapedProduct | null> {
    return null;
  }
}
