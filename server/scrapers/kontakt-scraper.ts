import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedProduct } from './base-scraper.js';
import { RateLimiter } from './rate-limiter.js';

const KONTAKT_SITE = 'https://kontakt.ge';
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

// Parse Georgian price format: "2559,99 ₾" → 2559.99
function parsePrice(text: string): number {
  if (!text || text.includes('------')) return 0;
  const cleaned = text.replace(/[^\d,]/g, '').replace(',', '.');
  const value = parseFloat(cleaned) || 0;
  return Math.round(value * 100) / 100;
}

export class KontaktScraper extends BaseScraper {
  readonly storeName = 'Kontakt';

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  private fetchHtmlViaCurl(url: string): string | null {
    try {
      const html = execSync(
        `curl -sL -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" -H "Accept: text/html" -H "Accept-Language: ka,en;q=0.9" "${url}"`,
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      ).toString();
      return html;
    } catch {
      return null;
    }
  }

  private parseProductsFromHtml(html: string, categoryLabel: string): ScrapedProduct[] {
    const $ = cheerio.load(html);
    const products: ScrapedProduct[] = [];

    $('div.prodItem.product-item').each((_, el) => {
      try {
        const $el = $(el);

        const sku = $el.attr('data-sku') || '';
        if (!sku) return;

        // Product name
        const name = $el.find('.prodItem__title').text().trim();
        if (!name) return;

        // Product URL from image link
        const url = $el.find('a.prodItem__img').attr('href') || '';

        // Product image — look for <img> inside the link
        const imgEl = $el.find('a.prodItem__img img');
        const imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || '';

        // Price extraction from .prodItem__prices > strong
        const priceStrong = $el.find('.prodItem__prices strong');
        let finalPrice = 0;

        if (priceStrong.length) {
          const simplePrice = priceStrong.find('b.simple-price');
          const discountNewPrice = priceStrong.find('b:not(.simple-price)');

          if (simplePrice.length) {
            // Regular price, no discount
            finalPrice = parsePrice(simplePrice.text());
          } else if (discountNewPrice.length) {
            // Discounted price — <i> is old price, <b> is new/final price
            finalPrice = parsePrice(discountNewPrice.text());
          }
        }

        // Check stock: if price text is "------" → out of stock
        const priceText = priceStrong.text().trim();
        const inStock = !priceText.includes('------') && finalPrice > 0;

        if (finalPrice > 0) {
          products.push({
            external_id: `kontakt-${sku}`,
            name,
            price: finalPrice,
            category: categoryLabel,
            image_url: imageUrl || undefined,
            url: url || undefined,
            in_stock: inStock,
          });
        }
      } catch {
        // Skip malformed products
      }
    });

    return products;
  }

  private hasNextPage(html: string): boolean {
    const $ = cheerio.load(html);
    return $('.pages-items .action.next').length > 0;
  }

  async scrapeAll(onProgress?: (msg: string) => void): Promise<ScrapedProduct[]> {
    const log = onProgress || ((m: string) => console.log(`[Kontakt] ${m}`));
    const allProducts: ScrapedProduct[] = [];
    const seen = new Set<string>();

    for (const cat of CATEGORIES) {
      log(`Category: ${cat.label} (id=${cat.id})`);

      let pageNum = 1;

      while (true) {
        try {
          await this.rateLimiter.acquire();

          const url = pageNum === 1
            ? `${CATEGORY_URL}/${cat.id}`
            : `${CATEGORY_URL}/${cat.id}?p=${pageNum}`;

          const html = this.fetchHtmlViaCurl(url);

          if (!html) {
            log(`  Failed to fetch page ${pageNum}`);
            break;
          }

          const products = this.parseProductsFromHtml(html, cat.label);

          if (products.length === 0 && pageNum === 1) {
            log(`  Empty category, skipping`);
            break;
          }

          let newInPage = 0;
          for (const item of products) {
            if (seen.has(item.external_id)) continue;
            seen.add(item.external_id);
            allProducts.push(item);
            newInPage++;
          }

          log(`  Page ${pageNum}: ${products.length} items, +${newInPage} new (${allProducts.length} total)`);

          if (!this.hasNextPage(html) || products.length === 0) break;
          pageNum++;
        } catch (err) {
          log(`  Error in ${cat.label} page ${pageNum}: ${err}`);
          break;
        }
      }
    }

    log(`Total unique products: ${allProducts.length}`);
    return allProducts;
  }

  // Search uses the working /search/ajax/suggest/ endpoint
  async search(query: string): Promise<ScrapedProduct[]> {
    try {
      await this.rateLimiter.acquire();

      const url = `${KONTAKT_SITE}/search/ajax/suggest/?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json',
        },
      });

      if (!res.ok) return [];

      const data = await res.json() as Array<{
        type: string;
        title: string;
        image?: string;
        url?: string;
        price?: string;
        num_results?: string;
      }>;

      if (!Array.isArray(data)) return [];

      return data
        .filter((item) => item.type === 'product')
        .map((item) => {
          // Price is HTML like: <span style="color: black">2559,99&nbsp;₾</span>
          const priceMatch = item.price?.replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '');
          const price = priceMatch ? parsePrice(priceMatch) : 0;
          if (price <= 0) return null;

          return {
            external_id: `kontakt-${item.title.replace(/[^a-zA-Z0-9]/g, '-')}`,
            name: item.title,
            price,
            category: '',
            image_url: item.image || undefined,
            url: item.url || undefined,
            in_stock: true,
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
