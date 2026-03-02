import { getDb, closeDb } from './connection.js';
import { initDb } from './schema.js';

const SEED_PRODUCTS = [
  {
    name: 'ლუდი ყაზბეგი',
    size: '0.5L',
    category: 'ლუდი',
    prices: { '2 Nabiji': 2.40, 'SPAR': 2.55, 'Goodwill': 2.60 },
  },
  {
    name: 'რძე სანტე',
    size: '1L',
    category: 'რძე',
    prices: { '2 Nabiji': 3.40, 'SPAR': 3.10, 'Goodwill': 3.50 },
  },
  {
    name: 'პური მზეთამზე',
    size: '400g',
    category: 'პური',
    prices: { '2 Nabiji': 1.20, 'SPAR': 1.15, 'Goodwill': 1.30 },
  },
  {
    name: 'წყალი ბაკურიანი',
    size: '0.5L',
    category: 'წყალი',
    prices: { '2 Nabiji': 0.65, 'SPAR': 0.60, 'Goodwill': 0.70 },
  },
  {
    name: 'ქათმის ფილე',
    size: '1kg',
    category: 'ხორცი',
    prices: { '2 Nabiji': 15.20, 'SPAR': 14.80, 'Goodwill': 14.50 },
  },
];

function normalize(name: string): string {
  return name.toLowerCase().trim();
}

function seed(): void {
  initDb();
  const db = getDb();

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (external_id, name, name_normalized, size, category, source)
    VALUES (?, ?, ?, ?, ?, 'seed')
  `);

  const insertOffer = db.prepare(`
    INSERT OR REPLACE INTO store_offers (product_id, store, price, in_stock)
    VALUES (?, ?, ?, 1)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO price_history (product_id, store, price)
    VALUES (?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    for (let i = 0; i < SEED_PRODUCTS.length; i++) {
      const p = SEED_PRODUCTS[i];
      const externalId = `seed-${i + 1}`;

      insertProduct.run(externalId, p.name, normalize(p.name), p.size, p.category);

      const row = db.prepare('SELECT id FROM products WHERE external_id = ? AND source = ?').get(externalId, 'seed') as { id: number };
      const productId = row.id;

      for (const [store, price] of Object.entries(p.prices)) {
        insertOffer.run(productId, store, price);
        insertHistory.run(productId, store, price);
      }
    }
  });

  seedAll();
  console.log(`Seeded ${SEED_PRODUCTS.length} products with prices.`);
  closeDb();
}

seed();
