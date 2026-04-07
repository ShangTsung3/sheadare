import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

const ADMIN_EMAILS = ['dzikiii.j@gmail.com'];

// Auth middleware
function requireAdmin(req: Request, res: Response): any | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const token = authHeader.slice(7);
  const db = getDb();
  const user = db.prepare('SELECT id, email FROM users WHERE device_id = ?').get(`token:${token}`) as any;
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return user;
}

router.get('/stats', (req: Request, res: Response) => {
  const user = requireAdmin(req, res);
  if (!user) return;

  const db = getDb();

  const totalProducts = (db.prepare("SELECT COUNT(*) as c FROM products WHERE store_type = 'grocery'").get() as any).c;
  const totalOffers = (db.prepare("SELECT COUNT(*) as c FROM store_offers WHERE in_stock = 1 AND price > 0").get() as any).c;
  const totalUsers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE email IS NOT NULL").get() as any).c;
  const totalAlerts = (db.prepare("SELECT COUNT(*) as c FROM alerts").get() as any).c;
  const activeAlerts = (db.prepare("SELECT COUNT(*) as c FROM alerts WHERE active = 1").get() as any).c;
  const triggeredAlerts = (db.prepare("SELECT COUNT(*) as c FROM alerts WHERE triggered_at IS NOT NULL").get() as any).c;
  const analysisCache = (db.prepare("SELECT COUNT(*) as c FROM analysis_cache").get() as any).c;

  // Store breakdown
  const storeBreakdown = db.prepare(`
    SELECT so.store, COUNT(DISTINCT so.product_id) as products, COUNT(*) as offers
    FROM store_offers so
    JOIN products p ON p.id = so.product_id
    WHERE p.store_type = 'grocery' AND so.in_stock = 1 AND so.price > 0
    GROUP BY so.store ORDER BY products DESC
  `).all();

  // Recent scraper runs
  const recentRuns = db.prepare(`
    SELECT store, status, products_found, prices_updated, error_message,
           started_at, finished_at
    FROM scraper_runs ORDER BY started_at DESC LIMIT 20
  `).all();

  // Users registered today
  const todayUsers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE email IS NOT NULL AND created_at >= date('now')").get() as any).c;

  // Recent users
  const recentUsers = db.prepare(`
    SELECT id, email, name, email_verified, created_at
    FROM users WHERE email IS NOT NULL
    ORDER BY created_at DESC LIMIT 10
  `).all();

  // Category breakdown
  const categories = db.prepare(`
    SELECT p.category, COUNT(DISTINCT p.id) as count
    FROM products p
    JOIN store_offers so ON so.product_id = p.id AND so.in_stock = 1 AND so.price > 0
    WHERE p.store_type = 'grocery'
    GROUP BY p.category ORDER BY count DESC LIMIT 20
  `).all();

  // Price stats
  const priceStats = db.prepare(`
    SELECT
      ROUND(AVG(price), 2) as avg_price,
      ROUND(MIN(price), 2) as min_price,
      ROUND(MAX(price), 2) as max_price
    FROM store_offers WHERE in_stock = 1 AND price > 0
  `).get();

  res.json({
    overview: {
      totalProducts,
      totalOffers,
      totalUsers,
      todayUsers,
      totalAlerts,
      activeAlerts,
      triggeredAlerts,
      analysisCache,
      analysisProgress: Math.round((analysisCache / Math.max(totalProducts, 1)) * 100),
    },
    storeBreakdown,
    recentRuns,
    recentUsers,
    categories,
    priceStats,
  });
});

export default router;
