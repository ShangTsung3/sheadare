import { Router, Request, Response } from 'express';
import { compareProduct } from '../services/price-service.js';
import { getDb } from '../db/connection.js';

const router = Router();

router.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid product ID' });
    return;
  }

  const result = compareProduct(id);
  if (!result) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  // Track view
  try { const db = getDb(); db.prepare('INSERT INTO product_views (product_id) VALUES (?)').run(id); } catch {}

  res.json(result);
});

export default router;
