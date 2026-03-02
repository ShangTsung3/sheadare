// Fetches real 2 Nabiji branch data and generates store-branches.ts
// Usage: node server/jobs/update-branches.cjs

async function main() {
  // 2 Nabiji - public API, no token needed
  const res = await fetch('https://kari-api.orinabiji.ge/kari/api/branches?page=0&pageSize=2000');
  const resp = await res.json();
  const items = resp.data?.branches || [];

  const branches = items
    .filter(b => b.isActive && b.geolocation && b.geolocation.coordinates)
    .map(b => {
      const [lat, lng] = b.geolocation.coordinates;
      const addr = (b.address || '').replace(/#\d+#\s*/, '').trim();
      return {
        store: '2 Nabiji',
        name: '2 ნაბიჯი - ' + (b.branchName || ''),
        lat,
        lng,
        address: addr,
      };
    })
    .filter(b => b.lat > 0 && b.lng > 0);

  console.log('2 Nabiji branches fetched:', branches.length);

  // Generate TS file
  let ts = `export interface StoreBranch {
  store: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
}

// Auto-generated from real store APIs
// Last updated: ${new Date().toISOString().split('T')[0]}
// To refresh: node server/jobs/update-branches.cjs
export const STORE_BRANCHES: StoreBranch[] = [\n`;

  for (const b of branches) {
    ts += `  { store: '${b.store}', name: '${b.name.replace(/'/g, "\\'")}', lat: ${b.lat}, lng: ${b.lng}, address: '${b.address.replace(/'/g, "\\'")}' },\n`;
  }

  ts += `];\n`;

  const fs = require('fs');
  fs.writeFileSync('server/data/store-branches.ts', ts);
  console.log('Written to server/data/store-branches.ts');
}

main().catch(console.error);
