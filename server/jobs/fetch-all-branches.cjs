// Fetches real branch data from all 3 stores and generates store-branches.ts
// Usage: node server/jobs/fetch-all-branches.cjs

async function main() {
  // 1. Fetch SPAR branches from spargeorgia.com/en/contact
  console.log('Fetching SPAR branches...');
  const sparRes = await fetch('https://spargeorgia.com/en/contact');
  const sparHtml = await sparRes.text();
  const match = sparHtml.match(/var features = (\{.+\});/s);
  let sparBranches = [];
  if (match) {
    const sparFeatures = JSON.parse(match[1]);
    sparBranches = Object.entries(sparFeatures).map(([id, data]) => ({
      store: 'SPAR',
      name: 'SPAR - ' + data.position.address,
      lat: data.position.lat,
      lng: data.position.lng,
      address: data.position.address || '',
    })).filter(b => b.lat > 0 && b.lng > 0);
  }
  console.log('SPAR branches:', sparBranches.length);

  // 2. Goodwill - 8 branches, manually geocoded from addresses
  const goodwillBranches = [
    { store: 'Goodwill', name: 'გუდვილი დიღომი', lat: 41.7490, lng: 44.7234, address: 'ფარნავაზ მეფის გამზირი N1' },
    { store: 'Goodwill', name: 'გუდვილი საბურთალო', lat: 41.7273, lng: 44.7476, address: 'კავტარაძის ქ. N1 (სითი მოლი)' },
    { store: 'Goodwill', name: 'გუდვილი ვაკე', lat: 41.7088, lng: 44.7639, address: 'ჭავჭავაძის გამზ. N34' },
    { store: 'Goodwill', name: 'გუდვილი რუსთაველი', lat: 41.6975, lng: 44.8015, address: 'რუსთაველის გამზ. N2/4 (გალერია თბილისი)' },
    { store: 'Goodwill', name: 'გუდვილი უნივერსიტეტი', lat: 41.7058, lng: 44.7727, address: 'უნივერსიტეტის ქ. N2' },
    { store: 'Goodwill', name: 'გუდვილი დოლიძე', lat: 41.7195, lng: 44.7802, address: 'დოლიძის ქ. N46' },
    { store: 'Goodwill', name: 'გუდვილი ბათუმი', lat: 41.6459, lng: 41.6366, address: 'გორგილაძის N88 (ბათუმი მოლი)' },
    { store: 'Goodwill', name: 'გუდვილი ბათუმი 2', lat: 41.6468, lng: 41.6418, address: 'რეჟებ ნიჟარაძის N18' },
  ];
  console.log('Goodwill branches:', goodwillBranches.length);

  // 3. Fetch 2 Nabiji branches from API
  console.log('Fetching 2 Nabiji branches...');
  const nabijiRes = await fetch('https://kari-api.orinabiji.ge/kari/api/branches?page=0&pageSize=2000');
  const nabijiResp = await nabijiRes.json();
  const nabijiItems = nabijiResp.data?.branches || [];
  const nabijiBranches = nabijiItems
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
  console.log('2 Nabiji branches:', nabijiBranches.length);

  // Combine all
  const all = [...sparBranches, ...goodwillBranches, ...nabijiBranches];
  console.log('Total branches:', all.length);

  // Generate TS file
  let ts = `export interface StoreBranch {\n`;
  ts += `  store: string;\n`;
  ts += `  name: string;\n`;
  ts += `  lat: number;\n`;
  ts += `  lng: number;\n`;
  ts += `  address: string;\n`;
  ts += `}\n\n`;
  ts += `// Auto-generated from real store APIs\n`;
  ts += `// Last updated: ${new Date().toISOString().split('T')[0]}\n`;
  ts += `// SPAR: ${sparBranches.length} branches (from spargeorgia.com/en/contact)\n`;
  ts += `// Goodwill: ${goodwillBranches.length} branches (manually geocoded)\n`;
  ts += `// 2 Nabiji: ${nabijiBranches.length} branches (from kari-api.orinabiji.ge)\n`;
  ts += `// To refresh: node server/jobs/fetch-all-branches.cjs\n`;
  ts += `export const STORE_BRANCHES: StoreBranch[] = [\n`;

  for (const b of all) {
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    ts += `  { store: '${b.store}', name: '${esc(b.name)}', lat: ${b.lat}, lng: ${b.lng}, address: '${esc(b.address)}' },\n`;
  }
  ts += `];\n`;

  const fs = require('fs');
  fs.writeFileSync('server/data/store-branches.ts', ts);
  console.log('Written to server/data/store-branches.ts');
}

main().catch(console.error);
