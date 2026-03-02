/**
 * One-time script to fetch store branch locations from APIs.
 * Usage: npx tsx server/jobs/fetch-branches.ts
 *
 * Fetches from:
 *   - Goodwill:  GET https://api.goodwill.ge/v1/Shops   (Bearer token)
 *   - 2 Nabiji:  GET https://kari-api.orinabiji.ge/kari/api/branches?page=0&pageSize=2000
 *   - SPAR:      GET https://api.spargeorgia.com/v1/Shops (Bearer token)
 *
 * Outputs TypeScript-ready data you can paste into server/data/store-branches.ts
 */

interface RawBranch {
  store: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
}

async function fetchGoodwill(token: string): Promise<RawBranch[]> {
  const res = await fetch('https://api.goodwill.ge/v1/Shops', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Goodwill API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : data.data ?? []).map((s: any) => ({
    store: 'Goodwill',
    name: `Goodwill - ${s.name || s.title || s.address || ''}`.trim(),
    lat: Number(s.latitude ?? s.lat ?? 0),
    lng: Number(s.longitude ?? s.lng ?? s.lon ?? 0),
    address: s.address || s.fullAddress || '',
  })).filter((b: RawBranch) => b.lat !== 0 && b.lng !== 0);
}

async function fetch2Nabiji(): Promise<RawBranch[]> {
  const res = await fetch('https://kari-api.orinabiji.ge/kari/api/branches?page=0&pageSize=2000');
  if (!res.ok) throw new Error(`2 Nabiji API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.content ?? data.data ?? [];
  return items.map((s: any) => ({
    store: '2 Nabiji',
    name: `2 ნაბიჯი - ${s.name || s.title || s.address || ''}`.trim(),
    lat: Number(s.latitude ?? s.lat ?? 0),
    lng: Number(s.longitude ?? s.lng ?? s.lon ?? 0),
    address: s.address || s.fullAddress || '',
  })).filter((b: RawBranch) => b.lat !== 0 && b.lng !== 0);
}

async function fetchSpar(token: string): Promise<RawBranch[]> {
  const res = await fetch('https://api.spargeorgia.com/v1/Shops', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`SPAR API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : data.data ?? []).map((s: any) => ({
    store: 'SPAR',
    name: `SPAR - ${s.name || s.title || s.address || ''}`.trim(),
    lat: Number(s.latitude ?? s.lat ?? 0),
    lng: Number(s.longitude ?? s.lng ?? s.lon ?? 0),
    address: s.address || s.fullAddress || '',
  })).filter((b: RawBranch) => b.lat !== 0 && b.lng !== 0);
}

async function main() {
  const goodwillToken = process.env.GOODWILL_TOKEN || '';
  const sparToken = process.env.SPAR_TOKEN || '';

  console.log('Fetching store branches...\n');

  const results: RawBranch[] = [];

  // Goodwill
  try {
    const branches = await fetchGoodwill(goodwillToken);
    console.log(`Goodwill: ${branches.length} branches`);
    results.push(...branches);
  } catch (e: any) {
    console.error(`Goodwill failed: ${e.message}`);
  }

  // 2 Nabiji
  try {
    const branches = await fetch2Nabiji();
    console.log(`2 Nabiji: ${branches.length} branches`);
    results.push(...branches);
  } catch (e: any) {
    console.error(`2 Nabiji failed: ${e.message}`);
  }

  // SPAR
  try {
    const branches = await fetchSpar(sparToken);
    console.log(`SPAR: ${branches.length} branches`);
    results.push(...branches);
  } catch (e: any) {
    console.error(`SPAR failed: ${e.message}`);
  }

  console.log(`\nTotal: ${results.length} branches\n`);

  // Output as TypeScript
  console.log('// Paste this into server/data/store-branches.ts');
  console.log('export const STORE_BRANCHES: StoreBranch[] = [');
  for (const b of results) {
    console.log(`  { store: '${b.store}', name: '${b.name.replace(/'/g, "\\'")}', lat: ${b.lat}, lng: ${b.lng}, address: '${b.address.replace(/'/g, "\\'")}' },`);
  }
  console.log('];');
}

main().catch(console.error);
