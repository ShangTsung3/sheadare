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
}
