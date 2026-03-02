import { Router, Request, Response } from 'express';
import { getProductWithStores } from '../services/product-service.js';

const router = Router();

router.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid product ID' });
    return;
  }

  const product = getProductWithStores(id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  res.json(product);
});

export default router;
