import { Router, Request, Response } from 'express';
import { optimizeBasket } from '../services/basket-service.js';

const router = Router();

router.post('/optimize', (req: Request, res: Response) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'items must be an array of { product_id, quantity }' });
    return;
  }

  const parsed = items.map((item: { product_id?: unknown; quantity?: unknown }) => ({
    product_id: Number(item.product_id),
    quantity: Math.max(1, Number(item.quantity) || 1),
  }));

  const result = optimizeBasket(parsed);
  res.json(result);
});

export default router;
