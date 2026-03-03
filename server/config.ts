export const PORT = Number(process.env.PORT) || 3001;
export const DB_PATH = 'data/pricemap.db';

export const STORES = ['SPAR', '2 Nabiji', 'Goodwill'] as const;
export type StoreName = (typeof STORES)[number];

export const SEED_QUERIES = [
  'ლუდი',
  'რძე',
  'პური',
  'წყალი',
  'ხორცი',
  'ყველი',
  'კარაქი',
  'კვერცხი',
  'შაქარი',
  'ზეთი',
];

export const SCRAPER_RATE_LIMIT_MS = 2000;
export const SCRAPER_CONCURRENCY = 2;
export const DISCOVER_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2h
export const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;  // 2h
