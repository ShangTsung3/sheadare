import { RateLimiter } from './rate-limiter.js';

export interface ScrapedProduct {
  external_id: string;
  name: string;
  price: number;
  size?: string;
  category?: string;
  image_url?: string;
  brand?: string;
  barcode?: string;
  url?: string;
  in_stock?: boolean;
}

export abstract class BaseScraper {
  abstract readonly storeName: string;
  protected rateLimiter: RateLimiter;

  constructor(rateLimiter: RateLimiter) {
    this.rateLimiter = rateLimiter;
  }

  abstract search(query: string): Promise<ScrapedProduct[]>;
  abstract fetchProduct(externalId: string): Promise<ScrapedProduct | null>;

  protected async fetchWithRateLimit(url: string, options?: RequestInit): Promise<Response> {
    await this.rateLimiter.acquire();
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'PriceMap/1.0 (price comparison)',
        'Accept': 'application/json, text/html',
        ...options?.headers,
      },
    });
    return response;
  }
}
