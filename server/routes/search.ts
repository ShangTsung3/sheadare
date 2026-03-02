import { Router, Request, Response } from 'express';
import { searchProducts } from '../services/product-service.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const q = String(req.query.q || '');
  const category = req.query.category ? String(req.query.category) : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const allStores = req.query.allStores === 'true';
  const { results, total } = searchProducts(q, category, page, limit, allStores);
  res.json({ results, total, page, limit });
});

export default router;
