import { Router, Request, Response } from 'express';

const router = Router();

router.get('/:filename', (req: Request, res: Response) => {
  // For MVP, redirect to a placeholder or the source URL
  // In the future, this could serve cached/proxied images
  res.status(404).json({ error: 'Image not found' });
});

export default router;
