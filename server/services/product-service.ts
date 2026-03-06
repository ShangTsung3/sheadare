import { getDb } from '../db/connection.js';
import { extractCanonicalKey, stripColorsFromName } from './electronics-matcher.js';
import { extractPharmacyCanonicalKey, extractBrandKey, buildBrandDict, parsePharmacyFromName } from './pharmacy-matcher.js';

// Lazy-built Georgian → Latin brand dictionary from PSP data in DB.
// Used to translate GPC's Georgian brand names to Latin for cross-store matching.
let _brandDict: Record<string, string> | null = null;
function getPharmacyBrandDict(): Record<string, string> {
  if (_brandDict) return _brandDict;
  const db = getDb();
  const rows = db.prepare(
    "SELECT name FROM products WHERE source = 'psp' AND store_type = 'pharmacy'"
  ).all() as { name: string }[];
  _brandDict = buildBrandDict(rows.map(r => r.name));
  return _brandDict;
}

// Extract model identifiers from product name/URL for cross-validation
// e.g. "LG GR-B589BQAM" → ["grb589"], "SM-R410NZKACIS" → ["smr410"]
function extractModelIds(s: string): string[] {
  if (!s) return [];
  const lower = s.toLowerCase();
  const ids: string[] = [];

  // Samsung SM codes: SM-R410, SM-S938B, SM-X520
  const smCodes = lower.match(/sm[- ]?([a-z]\d{3,4}[a-z]?)/g);
  if (smCodes) ids.push(...smCodes.map(m => m.replace(/[- ]/g, '')));

  // LG appliance models: GR-B589, GC-B247, GW-B509
  const lgModels = lower.match(/(?:gr|gc|gw|f2v|f4v|wd|wm)[- ]?([a-z0-9]{4,})/g);
  if (lgModels) ids.push(...lgModels.map(m => m.replace(/[- ]/g, '').slice(0, 8)));

  // Asus model codes: M1502YA, S5406SA, G615LR, X1502VA
  const asusModels = lower.match(/\b([a-z]\d{3,4}[a-z]{1,3})\b/g);
  if (asusModels) ids.push(...asusModels.filter(m => m.length >= 6));

  return [...new Set(ids)];
}

// Check if two sets of model IDs have any overlap
function modelIdsOverlap(a: string[], b: string[]): boolean {
  for (const ai of a) {
    for (const bi of b) {
      if (ai === bi || ai.includes(bi) || bi.includes(ai)) return true;
    }
  }
  return false;
}

export interface ProductRow {
  id: number;
  external_id: string | null;
  name: string;
  name_normalized: string | null;
  size: string | null;
  category: string | null;
  image_url: string | null;
  brand: string | null;
  source: string;
}

export interface StoreOfferRow {
  store: string;
  price: number;
  in_stock: number;
  url: string | null;
}

export interface ProductDTO {
  id: string;
  name: string;
  size: string;
  category: string;
  prices: Record<string, number>;
  image?: string;
  priceTrend?: 'up' | 'down';
}

function toDTO(product: ProductRow, offers: StoreOfferRow[]): ProductDTO {
  const prices: Record<string, number> = {};
  for (const o of offers) {
    if (o.in_stock) {
      prices[o.store] = o.price;
    }
  }
  return {
    id: String(product.id),
    name: product.name,
    size: product.size || '',
    category: product.category || '',
    prices,
    ...(product.image_url ? { image: product.image_url } : {}),
  };
}

export function searchProducts(query: string, category?: string, page = 1, limit = 20, allStores = false, storeType?: string): { results: ProductDTO[]; total: number } {
  const db = getDb();
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: unknown[] = [];

  let relevanceExpr = '0';
  if (query) {
    // Split query into words and trim Georgian suffixes (last 1 char) for fuzzy matching
    // e.g. "ლუდი ეფესი" → stems ["ლუდ", "ეფეს"] → matches both "ეფესი" and "ეფეს"
    const words = query.trim().split(/\s+/).filter(w => w.length > 0);
    const stems = words.map(w => w.length > 2 ? w.slice(0, -1) : w);

    const conditions = stems.map(() => '(p.name LIKE ? OR p.name_normalized LIKE ?)').join(' AND ');
    where += ` AND (${conditions})`;
    for (const stem of stems) {
      const q = `%${stem}%`;
      params.push(q, q);
    }

    // Relevance scoring:
    // +30: exact word match (ზეთი as standalone word → "მზესუმზირის ზეთი")
    // +10: word-start match (ზეთ at start of word → "ზეთისხილი")
    // +0:  mid-word match (default)
    const relevanceParts = stems.map((stem, i) => {
      const word = words[i]; // original word before stemming
      const esc = (s: string) => s.replace(/'/g, "''");

      // Exact word patterns - original word surrounded by delimiters (space, /, start, end)
      const exactChecks = [
        `p.name LIKE '% ${esc(word)} %'`,
        `p.name LIKE '% ${esc(word)}/%'`,
        `p.name LIKE '%/${esc(word)} %'`,
        `p.name LIKE '${esc(word)} %'`,
        `p.name LIKE '${esc(word)}/%'`,
        `p.name LIKE '% ${esc(word)}'`,
      ].join(' OR ');

      // Word-start patterns (existing)
      const startChecks = `p.name LIKE '${esc(stem)}%' OR p.name LIKE '% ${esc(stem)}%'`;

      return `(CASE WHEN ${exactChecks} THEN 30 WHEN ${startChecks} THEN 10 ELSE 0 END)`;
    });
    relevanceExpr = relevanceParts.join(' + ');
  }

  if (category) {
    where += ' AND p.category LIKE ?';
    params.push(`%${category}%`);
  }

  if (storeType) {
    where += ' AND p.store_type = ?';
    params.push(storeType);
  }

  // Filter to products available in all 3 stores
  if (allStores) {
    where += ' AND (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) = 3';
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM products p ${where}`).get(...params) as { total: number };

  const products = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) as store_count,
      (SELECT MAX(so.price) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) as max_price,
      (SELECT MIN(so.price) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) as min_price,
      (${relevanceExpr}) as relevance
    FROM products p ${where}
    ORDER BY
      relevance DESC,
      store_count DESC,
      CASE WHEN max_price > 0 THEN ((max_price - min_price) * 100.0 / max_price) ELSE 0 END DESC,
      p.id
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as ProductRow[];

  const results = products.map((p) => {
    const offers = db.prepare('SELECT store, price, in_stock, url FROM store_offers WHERE product_id = ?').all(p.id) as StoreOfferRow[];
    return toDTO(p, offers);
  });

  return { results, total: countRow.total };
}

function getProductTrend(productId: number): 'up' | 'down' | undefined {
  const db = getDb();
  const prevDay = db.prepare(`
    SELECT DISTINCT DATE(recorded_at) as d FROM price_history
    WHERE product_id = ? ORDER BY d DESC LIMIT 1 OFFSET 1
  `).get(productId) as { d: string } | undefined;
  if (!prevDay) return undefined;

  const currentMin = db.prepare(
    'SELECT MIN(price) as p FROM store_offers WHERE product_id = ? AND in_stock = 1 AND price > 0'
  ).get(productId) as { p: number } | undefined;
  const prevMin = db.prepare(
    'SELECT MIN(price) as p FROM price_history WHERE product_id = ? AND DATE(recorded_at) = ? AND price > 0'
  ).get(productId, prevDay.d) as { p: number } | undefined;

  if (!currentMin?.p || !prevMin?.p) return undefined;
  if (currentMin.p < prevMin.p - 0.01) return 'down';
  if (currentMin.p > prevMin.p + 0.01) return 'up';
  return undefined;
}

export function getTopSavings(limit = 7): ProductDTO[] {
  const db = getDb();
  const products = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) as store_count,
      (SELECT MAX(so.price) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) as max_price,
      (SELECT MIN(so.price) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) as min_price
    FROM products p
    WHERE p.store_type = 'grocery'
      AND (SELECT COUNT(DISTINCT so.store) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) = 3
      AND p.external_id NOT LIKE 'split-%' AND p.external_id NOT LIKE 'wrong-merge-%'
      AND (SELECT MAX(so.price) FROM store_offers so WHERE so.product_id = p.id AND so.in_stock = 1 AND so.price > 0) <= 30
      AND p.name NOT LIKE '%ვისკი%' AND p.name NOT LIKE '%კონიაკი%' AND p.name NOT LIKE '%ღვინო%'
      AND p.name NOT LIKE '%შამპანური%' AND p.name NOT LIKE '%ლიქიორი%' AND p.name NOT LIKE '%ჯინი%'
      AND p.name NOT LIKE '%არაყი%' AND p.name NOT LIKE '%ვოდკა%' AND p.name NOT LIKE '%ბრენდი%'
      AND p.name NOT LIKE '%ტეკილა%' AND p.name NOT LIKE '%რომი%'
    ORDER BY (max_price - min_price) DESC
    LIMIT ?
  `).all(limit) as ProductRow[];

  return products.map((p) => {
    const offers = db.prepare('SELECT store, price, in_stock, url FROM store_offers WHERE product_id = ?').all(p.id) as StoreOfferRow[];
    const dto = toDTO(p, offers);
    const trend = getProductTrend(p.id);
    if (trend) dto.priceTrend = trend;
    return dto;
  });
}

export function searchByBarcode(barcode: string): ProductDTO | null {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE barcode = ? LIMIT 1').get(barcode) as ProductRow | undefined;
  if (!product) return null;

  const offers = db.prepare('SELECT store, price, in_stock, url FROM store_offers WHERE product_id = ?').all(product.id) as StoreOfferRow[];
  const dto = toDTO(product, offers);
  const trend = getProductTrend(product.id);
  if (trend) dto.priceTrend = trend;
  return dto;
}

export function getProductById(id: number): ProductDTO | null {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined;
  if (!product) return null;

  const offers = db.prepare('SELECT store, price, in_stock, url FROM store_offers WHERE product_id = ?').all(id) as StoreOfferRow[];
  const dto = toDTO(product, offers);
  const trend = getProductTrend(id);
  if (trend) dto.priceTrend = trend;
  return dto;
}

export function getProductWithStores(id: number) {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined;
  if (!product) return null;

  const offers = db.prepare('SELECT store, price, in_stock, url FROM store_offers WHERE product_id = ?').all(id) as StoreOfferRow[];
  const dto = toDTO(product, offers);

  const trend = getProductTrend(id);
  if (trend) dto.priceTrend = trend;

  return {
    ...dto,
    stores: offers.map((o) => ({
      store: o.store,
      price: o.price,
      inStock: Boolean(o.in_stock),
      url: o.url,
    })),
  };
}

export function searchProductsForAI(query: string, category?: string, storeType?: string, limit = 5) {
  const { results } = searchProducts(query, category, 1, limit, false, storeType);
  return results.map(p => {
    const priceEntries = Object.entries(p.prices).filter(([, v]) => v > 0).sort((a, b) => a[1] - b[1]);
    return {
      id: p.id,
      name: p.name,
      size: p.size,
      prices: p.prices,
      cheapest_store: priceEntries[0]?.[0] || null,
      cheapest_price: priceEntries[0]?.[1] || null,
      image: p.image || null,
    };
  });
}

export function upsertProduct(data: {
  external_id: string;
  name: string;
  size?: string;
  category?: string;
  image_url?: string;
  brand?: string;
  barcode?: string;
  source: string;
  store_type?: string;
  active_ingredient?: string;
  dose?: string;
  dosage_form?: string;
  quantity?: string;
}): number {
  const db = getDb();
  const normalized = data.name.toLowerCase().trim();

  // If barcode is provided, check if a product with the same barcode already exists.
  // If so, reuse that product ID — don't create a duplicate record.
  if (data.barcode) {
    const existing = db.prepare(
      'SELECT id, image_url, size, category FROM products WHERE barcode = ? LIMIT 1'
    ).get(data.barcode) as { id: number; image_url: string | null; size: string | null; category: string | null } | undefined;

    if (existing) {
      // Fill in missing data on the canonical record
      if (!existing.image_url && data.image_url) {
        db.prepare('UPDATE products SET image_url = ?, updated_at = datetime(\'now\') WHERE id = ?').run(data.image_url, existing.id);
      }
      if (!existing.size && data.size) {
        db.prepare('UPDATE products SET size = ?, updated_at = datetime(\'now\') WHERE id = ?').run(data.size, existing.id);
      }
      if (!existing.category && data.category) {
        db.prepare('UPDATE products SET category = ?, updated_at = datetime(\'now\') WHERE id = ?').run(data.category, existing.id);
      }
      return existing.id;
    }
  }

  // For electronics: use canonical_key to match same product across different stores
  // Also strip color from name so merged products show a color-neutral name
  // For pharmacy: use brand name + dose + form + quantity (NOT active ingredient)
  let canonicalKey: string | null = null;
  if (data.store_type === 'electronics') {
    canonicalKey = extractCanonicalKey(data.name);
  } else if (data.store_type === 'pharmacy') {
    const brandKey = extractBrandKey(data.name, data.source, getPharmacyBrandDict());
    // Fall back to parsing dose/form/quantity from name when structured fields are missing
    // (GPC doesn't always provide medicamentCharacteristic)
    const parsed = (!data.dose && !data.dosage_form) ? parsePharmacyFromName(data.name) : null;
    canonicalKey = extractPharmacyCanonicalKey({
      name: data.name,
      brandKey,
      dose: data.dose || parsed?.dose,
      form: data.dosage_form || parsed?.form,
      quantity: data.quantity || parsed?.quantity,
    });
  }
  const displayName = data.store_type === 'electronics' ? stripColorsFromName(data.name) : data.name;

  if (canonicalKey) {
    const existing = db.prepare(
      "SELECT id, name, image_url, size, category FROM products WHERE canonical_key = ? AND store_type = 'electronics' LIMIT 1"
    ).get(canonicalKey) as { id: number; name: string; image_url: string | null; size: string | null; category: string | null } | undefined;

    if (existing) {
      // Safety check: verify model numbers in names aren't contradicting
      // e.g. don't merge "LG GR-B589" with "LG GR-F589" even if keys match
      const newModels = extractModelIds(data.name);
      const existingModels = extractModelIds(existing.name);
      const compatible = newModels.length === 0 || existingModels.length === 0 || modelIdsOverlap(newModels, existingModels);

      if (compatible) {
        // Fill in missing data on the canonical record
        if (!existing.image_url && data.image_url) {
          db.prepare("UPDATE products SET image_url = ?, updated_at = datetime('now') WHERE id = ?").run(data.image_url, existing.id);
        }
        if (!existing.category && data.category) {
          db.prepare("UPDATE products SET category = ?, updated_at = datetime('now') WHERE id = ?").run(data.category, existing.id);
        }
        return existing.id;
      }
      // Model mismatch — don't merge, create separate product
    }
  }

  // Pharmacy: merge SAME BRAND across different stores only.
  // Brand-based keys ensure Toradol only matches Toradol, not generic ketorolac.
  if (canonicalKey && data.store_type === 'pharmacy') {
    const existing = db.prepare(
      "SELECT id, name, source, image_url, size, category FROM products WHERE canonical_key = ? AND store_type = 'pharmacy' AND source != ? LIMIT 1"
    ).get(canonicalKey, data.source) as { id: number; name: string; source: string; image_url: string | null; size: string | null; category: string | null } | undefined;

    if (existing) {
      if (!existing.image_url && data.image_url) {
        db.prepare("UPDATE products SET image_url = ?, updated_at = datetime('now') WHERE id = ?").run(data.image_url, existing.id);
      }
      if (!existing.category && data.category) {
        db.prepare("UPDATE products SET category = ?, updated_at = datetime('now') WHERE id = ?").run(data.category, existing.id);
      }
      return existing.id;
    }
  }

  db.prepare(`
    INSERT INTO products (external_id, name, name_normalized, barcode, size, category, image_url, brand, source, store_type, canonical_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(external_id, source) DO UPDATE SET
      name = excluded.name,
      name_normalized = excluded.name_normalized,
      barcode = excluded.barcode,
      size = excluded.size,
      category = excluded.category,
      image_url = excluded.image_url,
      brand = excluded.brand,
      store_type = excluded.store_type,
      canonical_key = excluded.canonical_key,
      updated_at = datetime('now')
  `).run(data.external_id, displayName, displayName.toLowerCase().trim(), data.barcode || null, data.size || null, data.category || null, data.image_url || null, data.brand || null, data.source, data.store_type || 'grocery', canonicalKey);

  const row = db.prepare('SELECT id FROM products WHERE external_id = ? AND source = ?').get(data.external_id, data.source) as { id: number };
  return row.id;
}

export function upsertOffer(productId: number, store: string, price: number, url?: string): void {
  const db = getDb();

  db.prepare(`
    INSERT INTO store_offers (product_id, store, price, in_stock, url, last_seen_at)
    VALUES (?, ?, ?, 1, ?, datetime('now'))
    ON CONFLICT(product_id, store) DO UPDATE SET
      price = excluded.price,
      in_stock = 1,
      url = excluded.url,
      last_seen_at = datetime('now')
  `).run(productId, store, price, url || null);

  db.prepare('INSERT INTO price_history (product_id, store, price) VALUES (?, ?, ?)').run(productId, store, price);
}
