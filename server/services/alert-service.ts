import { getDb } from '../db/connection.js';

interface AlertRow {
  id: number;
  user_id: number;
  product_id: number;
  target_price: number;
  store: string | null;
  active: number;
  triggered_at: string | null;
  created_at: string;
}

export interface AlertDTO {
  id: number;
  product_id: number;
  target_price: number;
  store: string | null;
  active: boolean;
  triggered_at: string | null;
  created_at: string;
}

function toDTO(row: AlertRow): AlertDTO {
  return {
    id: row.id,
    product_id: row.product_id,
    target_price: row.target_price,
    store: row.store,
    active: Boolean(row.active),
    triggered_at: row.triggered_at,
    created_at: row.created_at,
  };
}

function ensureUser(deviceId: string): number {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO users (device_id) VALUES (?)').run(deviceId);
  const row = db.prepare('SELECT id FROM users WHERE device_id = ?').get(deviceId) as { id: number };
  return row.id;
}

export function createAlert(deviceId: string, productId: number, targetPrice: number, store?: string): AlertDTO {
  const db = getDb();
  const userId = ensureUser(deviceId);

  const result = db.prepare(
    'INSERT INTO alerts (user_id, product_id, target_price, store) VALUES (?, ?, ?, ?)'
  ).run(userId, productId, targetPrice, store || null);

  const row = db.prepare('SELECT * FROM alerts WHERE id = ?').get(result.lastInsertRowid) as AlertRow;
  return toDTO(row);
}

export function getAlerts(deviceId: string): (AlertDTO & { product_name?: string; product_image?: string })[] {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE device_id = ?').get(deviceId) as { id: number } | undefined;
  if (!user) return [];

  const rows = db.prepare(`
    SELECT a.*, p.name as product_name, p.image_url as product_image
    FROM alerts a
    LEFT JOIN products p ON p.id = a.product_id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `).all(user.id) as (AlertRow & { product_name?: string; product_image?: string })[];
  return rows.map(row => ({ ...toDTO(row), product_name: row.product_name, product_image: row.product_image }));
}

export function deleteAlert(deviceId: string, alertId: number): boolean {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE device_id = ?').get(deviceId) as { id: number } | undefined;
  if (!user) return false;

  const result = db.prepare('DELETE FROM alerts WHERE id = ? AND user_id = ?').run(alertId, user.id);
  return result.changes > 0;
}

export function checkAlerts(): Array<{ alert: AlertDTO; currentPrice: number; store: string }> {
  const db = getDb();
  const triggered: Array<{ alert: AlertDTO; currentPrice: number; store: string }> = [];

  const activeAlerts = db.prepare('SELECT * FROM alerts WHERE active = 1').all() as AlertRow[];

  for (const alert of activeAlerts) {
    let query: string;
    let params: unknown[];

    if (alert.store) {
      query = 'SELECT price, store FROM store_offers WHERE product_id = ? AND store = ? AND price <= ?';
      params = [alert.product_id, alert.store, alert.target_price];
    } else {
      query = 'SELECT price, store FROM store_offers WHERE product_id = ? AND price <= ? ORDER BY price ASC LIMIT 1';
      params = [alert.product_id, alert.target_price];
    }

    const match = db.prepare(query).get(...params) as { price: number; store: string } | undefined;
    if (match) {
      db.prepare('UPDATE alerts SET active = 0, triggered_at = datetime(\'now\') WHERE id = ?').run(alert.id);
      triggered.push({ alert: toDTO({ ...alert, active: 0 }), currentPrice: match.price, store: match.store });
    }
  }

  return triggered;
}
