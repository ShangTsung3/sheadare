import { getDb } from './connection.js';

export function initDb(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      name TEXT NOT NULL,
      name_normalized TEXT,
      barcode TEXT,
      size TEXT,
      category TEXT,
      image_url TEXT,
      brand TEXT,
      source TEXT DEFAULT 'seed',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(external_id, source)
    );

    CREATE TABLE IF NOT EXISTS store_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      store TEXT NOT NULL,
      price REAL NOT NULL,
      in_stock INTEGER DEFAULT 1,
      url TEXT,
      last_seen_at TEXT DEFAULT (datetime('now')),
      UNIQUE(product_id, store)
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      store TEXT NOT NULL,
      price REAL NOT NULL,
      recorded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      PRIMARY KEY(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      target_price REAL NOT NULL,
      store TEXT,
      active INTEGER DEFAULT 1,
      triggered_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scraper_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_type TEXT NOT NULL,
      store TEXT NOT NULL,
      status TEXT NOT NULL,
      products_found INTEGER DEFAULT 0,
      prices_updated INTEGER DEFAULT 0,
      error_message TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_name_normalized ON products(name_normalized);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_store_offers_product ON store_offers(product_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
  `);

  // Migration: add barcode column to existing DB
  try {
    db.exec('ALTER TABLE products ADD COLUMN barcode TEXT');
  } catch {
    // Column already exists
  }

  // Migration: add store_type column for grocery vs electronics
  try {
    db.exec("ALTER TABLE products ADD COLUMN store_type TEXT DEFAULT 'grocery'");
  } catch {
    // Column already exists
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_store_type ON products(store_type)');

  // Migration: add canonical_key for electronics product matching
  try {
    db.exec('ALTER TABLE products ADD COLUMN canonical_key TEXT');
  } catch {
    // Column already exists
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_canonical_key ON products(canonical_key)');

  // Migration: add manufacturer column for pharmacy products
  try {
    db.exec('ALTER TABLE products ADD COLUMN manufacturer TEXT');
  } catch {
    // Column already exists
  }

  // Migration: auth columns on users
  try { db.exec('ALTER TABLE users ADD COLUMN email TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN name TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN verification_code TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN verification_expires TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT \'local\''); } catch {}
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL');

  // Analytics tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      results_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS product_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_search_log_date ON search_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_product_views_date ON product_views(created_at);
    CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id);
  `);

  // Analysis cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lookup_key TEXT UNIQUE NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
