import { Router, Request, Response } from 'express';
import { searchProducts, getTopSavings, searchByBarcode } from '../services/product-service.js';
import { getDb } from '../db/connection.js';

const router = Router();

router.get('/top-savings', (_req: Request, res: Response) => {
  const results = getTopSavings(7);
  res.json({ results });
});

router.get('/barcode/:code', (req: Request, res: Response) => {
  const code = String(req.params.code).replace(/\D/g, '');
  if (!code) { res.json({ product: null }); return; }
  const product = searchByBarcode(code);
  res.json({ product });
});

router.get('/category-counts', (req: Request, res: Response) => {
  const db = getDb();
  const storeType = String(req.query.storeType || 'grocery');

  const prefixMap: Record<string, Record<string, string[]>> = {
    grocery: {
      'ყველა': [],
      'რძის პროდუქტი': ['რძ', 'კვერცხი და რძ'],
      'ხორცი': ['ხორც', 'ფრეშ ხორც'],
      'პური': ['პურ', 'საცხობ', 'საკონდიტრ'],
      'ხილი/ბოსტანი': ['ხილ', 'ბოსტ'],
      'სასმელი': ['სასმელ', 'უალკოჰოლო', 'წვენ', 'გამაგრილ', 'წყალი'],
      'ლუდი': ['ლუდი'],
      'ტკბილეული': ['ტკბილ', 'კანფეტ', 'ორცხობილა', 'ნაყინ'],
      'სნექი': ['სნექ', 'ჩიფს', 'ჩირ'],
      'ყავა/ჩაი': ['ყავა', 'ჩაი'],
      'ჰიგიენა': ['ჰიგიენ'],
    },
    electronics: {
      'ყველა': [],
      'ტელეფონები': ['ტელეფონ', 'სმარტფონ', 'მობილურ', 'iPhone', 'Samsung Galaxy', 'Xiaomi', 'Phone'],
      'ლეპტოპები': ['ლეპტოპ', 'ნოუთბუქ', 'Laptop', 'MacBook', 'Notebook'],
      'ტაბლეტები': ['ტაბლეტ', 'iPad', 'Tablet'],
      'ტელევიზორები': ['ტელევიზ', 'TV'],
      'მონიტორები': ['მონიტორ', 'Monitor'],
      'ყურსასმენები': ['ყურსასმენ', 'Headphone', 'Earphone', 'AirPod', 'Buds'],
      'სმარტ საათები': ['სმარტ საათ', 'Watch', 'საათ'],
      'გეიმინგი': ['გეიმინგ', 'Gaming', 'PlayStation', 'Xbox', 'Nintendo'],
      'აუდიო': ['აუდიო', 'Audio', 'Speaker', 'დინამიკ'],
      'სამზარეულო': ['სამზარეულო', 'Kitchen', 'მაცივარ', 'ღუმელ', 'სარეცხი'],
    },
  };

  const prefixes = prefixMap[storeType] || prefixMap.grocery;
  const stType = storeType === 'electronics' ? 'electronics' : 'grocery';

  const counts: Record<string, number> = {};
  for (const [key, pxs] of Object.entries(prefixes)) {
    if (pxs.length === 0) {
      counts[key] = (db.prepare(`SELECT COUNT(DISTINCT p.id) as c FROM products p JOIN store_offers so ON so.product_id = p.id WHERE (p.store_type = ? OR p.store_type IS NULL) AND so.in_stock = 1 AND so.price > 0`).get(stType) as any).c;
    } else {
      const where = pxs.map(() => 'p.category LIKE ?').join(' OR ');
      const params = pxs.map(p => '%' + p + '%');
      counts[key] = (db.prepare(`SELECT COUNT(DISTINCT p.id) as c FROM products p JOIN store_offers so ON so.product_id = p.id WHERE (p.store_type = ? OR p.store_type IS NULL) AND so.in_stock = 1 AND so.price > 0 AND (${where})`).get(stType, ...params) as any).c;
    }
  }
  res.json({ counts });
});

router.get('/', (req: Request, res: Response) => {
  const q = String(req.query.q || '');
  const category = req.query.category ? String(req.query.category) : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));

  const allStores = req.query.allStores === 'true';
  const storeType = req.query.storeType ? String(req.query.storeType) : undefined;
  const sort = req.query.sort ? String(req.query.sort) : undefined;
  const { results, total } = searchProducts(q, category, page, limit, allStores, storeType, sort);
  // Track search
  if (q && page === 1) {
    try { const db = getDb(); db.prepare('INSERT INTO search_log (query, results_count) VALUES (?, ?)').run(q, total); } catch {}
  }
  res.json({ results, total, page, limit });
});

export default router;
