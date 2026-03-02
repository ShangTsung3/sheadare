import { getDb } from '../db/connection.js';
import { getProductById, StoreOfferRow, ProductDTO } from './product-service.js';

export interface CompareResult {
  product: ProductDTO;
  bestPrice: { store: string; price: number };
  stores: Array<{ store: string; price: number; delta: number; inStock: boolean }>;
}

export function compareProduct(productId: number): CompareResult | null {
  const db = getDb();
  const product = getProductById(productId);
  if (!product) return null;

  const offers = db.prepare(
    'SELECT store, price, in_stock, url FROM store_offers WHERE product_id = ? ORDER BY price ASC'
  ).all(productId) as StoreOfferRow[];

  if (offers.length === 0) return null;

  const bestPrice = offers[0].price;
  const bestStore = offers[0].store;

  return {
    product,
    bestPrice: { store: bestStore, price: bestPrice },
    stores: offers.map((o) => ({
      store: o.store,
      price: o.price,
      delta: +(o.price - bestPrice).toFixed(2),
      inStock: Boolean(o.in_stock),
    })),
  };
}

export interface HistoryEntry {
  store: string;
  price: number;
  date: string;
}

export function getProductHistory(productId: number): { product_id: string; history: HistoryEntry[] } {
  const db = getDb();
  const rows = db.prepare(
    'SELECT store, price, recorded_at as date FROM price_history WHERE product_id = ? ORDER BY recorded_at DESC LIMIT 500'
  ).all(productId) as HistoryEntry[];

  return { product_id: String(productId), history: rows };
}
