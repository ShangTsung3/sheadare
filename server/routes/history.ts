import { Router, Request, Response } from 'express';
import { getProductHistory } from '../services/price-service.js';

const router = Router();

router.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid product ID' });
    return;
  }

  const result = getProductHistory(id);
  res.json(result);
});

export default router;
