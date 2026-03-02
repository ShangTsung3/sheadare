import { getDb } from '../db/connection.js';
import { STORES } from '../config.js';

interface BasketItem {
  product_id: number;
  quantity: number;
}

interface StoreOfferRow {
  product_id: number;
  store: string;
  price: number;
  in_stock: number;
}

interface StoreTotal {
  store: string;
  total: number;
  complete: boolean;
  items: Array<{ product_id: number; price: number | null; available: boolean }>;
}

export interface BasketResult {
  recommendation: { store: string; total: number; complete: boolean };
  all_stores: StoreTotal[];
  savings: number;
  items: Array<{ product_id: number; name: string; quantity: number }>;
}

export function optimizeBasket(items: BasketItem[]): BasketResult {
  const db = getDb();
  const productIds = items.map((i) => i.product_id);

  if (productIds.length === 0) {
    return {
      recommendation: { store: '', total: 0, complete: false },
      all_stores: [],
      savings: 0,
      items: [],
    };
  }

  const placeholders = productIds.map(() => '?').join(',');
  const offers = db.prepare(
    `SELECT product_id, store, price, in_stock FROM store_offers WHERE product_id IN (${placeholders})`
  ).all(...productIds) as StoreOfferRow[];

  const productNames = new Map<number, string>();
  for (const pid of productIds) {
    const row = db.prepare('SELECT name FROM products WHERE id = ?').get(pid) as { name: string } | undefined;
    if (row) productNames.set(pid, row.name);
  }

  const quantityMap = new Map<number, number>();
  for (const item of items) {
    quantityMap.set(item.product_id, item.quantity);
  }

  // Calculate per-store totals
  const storeTotals: StoreTotal[] = STORES.map((store) => {
    const storeItems = productIds.map((pid) => {
      const offer = offers.find((o) => o.product_id === pid && o.store === store);
      const qty = quantityMap.get(pid) || 1;
      if (offer && offer.in_stock) {
        return { product_id: pid, price: offer.price * qty, available: true };
      }
      return { product_id: pid, price: null, available: false };
    });

    const total = storeItems.reduce((sum, i) => sum + (i.price || 0), 0);
    const complete = storeItems.every((i) => i.available);

    return { store, total: +total.toFixed(2), complete, items: storeItems };
  });

  // Prefer stores that have all items, then sort by total
  const sorted = [...storeTotals].sort((a, b) => {
    if (a.complete !== b.complete) return a.complete ? -1 : 1;
    return a.total - b.total;
  });

  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const savings = +(worst.total - best.total).toFixed(2);

  return {
    recommendation: { store: best.store, total: best.total, complete: best.complete },
    all_stores: storeTotals,
    savings,
    items: items.map((i) => ({
      product_id: i.product_id,
      name: productNames.get(i.product_id) || '',
      quantity: i.quantity,
    })),
  };
}
