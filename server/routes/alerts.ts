import { Router, Request, Response } from 'express';
import { createAlert, getAlerts, deleteAlert } from '../services/alert-service.js';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { device_id, product_id, target_price, store } = req.body;

  if (!device_id || !product_id || !target_price) {
    res.status(400).json({ error: 'device_id, product_id, and target_price are required' });
    return;
  }

  const alert = createAlert(String(device_id), Number(product_id), Number(target_price), store ? String(store) : undefined);
  res.status(201).json(alert);
});

router.get('/', (req: Request, res: Response) => {
  const deviceId = String(req.query.device_id || '');
  if (!deviceId) {
    res.status(400).json({ error: 'device_id query param required' });
    return;
  }

  const alerts = getAlerts(deviceId);
  res.json({ alerts });
});

router.delete('/:id', (req: Request, res: Response) => {
  const alertId = Number(req.params.id);
  const deviceId = String(req.query.device_id || '');

  if (!deviceId) {
    res.status(400).json({ error: 'device_id query param required' });
    return;
  }

  const deleted = deleteAlert(deviceId, alertId);
  if (!deleted) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  res.json({ success: true });
});

export default router;
