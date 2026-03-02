import { Router, Request, Response } from 'express';
import { STORE_BRANCHES, StoreBranch } from '../data/store-branches.js';

const router = Router();

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * GET /api/stores/branches?store=Goodwill&lat=41.71&lng=44.82&limit=5
 *
 * Returns nearest branches sorted by distance.
 * - store (optional): filter by store name (SPAR, 2 Nabiji, Goodwill)
 * - lat, lng (required): user coordinates
 * - limit (optional, default 5): max results
 */
router.get('/branches', (req: Request, res: Response) => {
  const { store, lat, lng, limit } = req.query;

  const userLat = parseFloat(lat as string);
  const userLng = parseFloat(lng as string);

  if (isNaN(userLat) || isNaN(userLng)) {
    res.status(400).json({ error: 'lat and lng query parameters are required' });
    return;
  }

  const maxResults = Math.min(parseInt(limit as string) || 5, 50);

  let branches = STORE_BRANCHES;
  if (store) {
    branches = branches.filter((b) => b.store === store);
  }

  const withDistance = branches.map((b) => ({
    ...b,
    distance: haversineKm(userLat, userLng, b.lat, b.lng),
  }));

  withDistance.sort((a, b) => a.distance - b.distance);

  const result = withDistance.slice(0, maxResults).map((b) => ({
    store: b.store,
    name: b.name,
    lat: b.lat,
    lng: b.lng,
    address: b.address,
    distanceKm: Math.round(b.distance * 100) / 100,
  }));

  res.json({ branches: result });
});

export default router;
