/**
 * Pre-analyze all products and cache results
 * Run: npx tsx server/jobs/pre-analyze.ts
 *
 * - 2 second delay between requests (stays under Gemini free tier)
 * - Skips already cached products
 * - Processes barcode products first (Open Food Facts + Gemini)
 * - Then name-only products (Gemini only)
 */

import 'dotenv/config';
import Database from 'better-sqlite3';
import { GoogleGenAI } from '@google/genai';

const db = new Database('data/pricemap.db');
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('GEMINI_API_KEY not set'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey });

// Ensure cache table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS analysis_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lookup_key TEXT UNIQUE NOT NULL,
    result_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const DELAY_MS = 2500; // 2.5 seconds between requests
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const RISKY_INGREDIENTS: Record<string, { risk: string, reason: string }> = {
  'e150d': { risk: 'high', reason: 'კარამელის საღებავი' },
  'e951': { risk: 'medium', reason: 'ასპარტამი' },
  'e211': { risk: 'high', reason: 'ნატრიუმის ბენზოატი' },
  'e250': { risk: 'high', reason: 'ნატრიუმის ნიტრიტი' },
  'e338': { risk: 'medium', reason: 'ფოსფორმჟავა' },
  'e171': { risk: 'high', reason: 'ტიტანის დიოქსიდი' },
};

function analyzeIngredients(text: string | null) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const results: any[] = [];
  for (const [key, info] of Object.entries(RISKY_INGREDIENTS)) {
    if (lower.includes(key)) results.push({ name: key.toUpperCase(), ...info });
  }
  return results;
}

function isCached(key: string): boolean {
  const row = db.prepare('SELECT 1 FROM analysis_cache WHERE lookup_key = ?').get(key);
  return !!row;
}

function setCache(key: string, result: any) {
  db.prepare('INSERT OR REPLACE INTO analysis_cache (lookup_key, result_json, created_at) VALUES (?, ?, datetime(\'now\'))').run(key, JSON.stringify(result));
}

async function getAiAnalysis(name: string, ingredients: string | null, nutrition: any): Promise<string | null> {
  try {
    const nutrientInfo = [
      nutrition.calories != null ? `კალორია: ${nutrition.calories}კკალ` : null,
      nutrition.sugar != null ? `შაქარი: ${nutrition.sugar}გ` : null,
      nutrition.fat != null ? `ცხიმი: ${nutrition.fat}გ` : null,
      nutrition.protein != null ? `ცილა: ${nutrition.protein}გ` : null,
    ].filter(Boolean).join(', ');

    const prompt = `შენ ხარ კვების ექსპერტი. გააანალიზე ეს პროდუქტი ქართულად, მოკლედ:

პროდუქტი: ${name}
შემადგენლობა: ${ingredients || 'ზოგადი'}
100გ-ში: ${nutrientInfo || 'ზოგადი'}

ჩამოწერე:
🟢 კარგი: [1-2 წინადადება]
🔴 ცუდი: [1-2 წინადადება]
⚠️ ყურადღება: [ვისთვის არ არის რეკომენდებული]
💡 ალტერნატივა: [რა შეიძლება მის ნაცვლად]`;

    const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return result.text || null;
  } catch (e: any) {
    if (e?.message?.includes('429') || e?.message?.includes('quota')) {
      console.log('  ⏳ Rate limited, waiting 30s...');
      await sleep(30000);
      return getAiAnalysis(name, ingredients, nutrition); // retry
    }
    console.error('  Gemini error:', e?.message?.slice(0, 100));
    return null;
  }
}

async function analyzeWithBarcode(productId: number, name: string, barcode: string) {
  const cacheKey = `barcode:${barcode}`;
  if (isCached(cacheKey)) return 'cached';

  try {
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!offRes.ok) return analyzeByNameOnly(productId, name);

    const text = await offRes.text();
    let offData: any;
    try { offData = JSON.parse(text); } catch { return analyzeByNameOnly(productId, name); }

    if (!offData.product || offData.status === 0) {
      return analyzeByNameOnly(productId, name);
    }

    const p = offData.product;
    const n = p.nutriments || {};
    const nutrition = {
      calories: n['energy-kcal_100g'] ?? null,
      sugar: n.sugars_100g ?? null,
      fat: n.fat_100g ?? null,
      salt: n.salt_100g ?? null,
      protein: n.proteins_100g ?? null,
      fiber: n.fiber_100g ?? null,
      carbs: n.carbohydrates_100g ?? null,
      saturated_fat: n['saturated-fat_100g'] ?? null,
    };

    const nutriscore = p.nutriscore_grade || null;
    const nova = p.nova_group || null;
    const ingredients = p.ingredients_text || null;

    let yukaScore: number | null = null;
    if (nutriscore) {
      const base: Record<string, number> = { a: 85, b: 70, c: 50, d: 30, e: 15 };
      yukaScore = base[nutriscore] || 50;
      if (nova === 4) yukaScore -= 10;
      if (nova === 1) yukaScore += 10;
      yukaScore = Math.max(0, Math.min(100, yukaScore));
    }

    const aiAnalysis = await getAiAnalysis(p.product_name || name, ingredients, nutrition);

    const result = {
      found: true, barcode, name: p.product_name || name, brand: p.brands || null,
      nutrition, nutriscore, nova, yukaScore,
      verdict: !yukaScore ? { emoji: '❓', text: 'უცნობი', color: 'slate' } :
        yukaScore >= 70 ? { emoji: '✅', text: 'რეკომენდებულია', color: 'emerald' } :
        yukaScore >= 50 ? { emoji: '👍', text: 'მისაღებია', color: 'green' } :
        yukaScore >= 30 ? { emoji: '⚠️', text: 'ზომიერად', color: 'amber' } :
        { emoji: '🚫', text: 'არ არის რეკომენდებული', color: 'red' },
      betterThan: yukaScore ? Math.min(99, Math.round(yukaScore * 0.9)) : null,
      healthScore: nutriscore === 'a' ? 9 : nutriscore === 'b' ? 7 : nutriscore === 'c' ? 5 : nutriscore === 'd' ? 3 : nutriscore === 'e' ? 1 : null,
      ingredients, ingredientRisks: analyzeIngredients(ingredients),
      allergens: (p.allergens_tags || []).map((a: string) => a.replace('en:', '')),
      badges: [], aiAnalysis, partialData: false,
    };

    setCache(cacheKey, result);
    return 'analyzed-barcode';
  } catch (e: any) {
    return analyzeByNameOnly(productId, name);
  }
}

async function analyzeByNameOnly(productId: number, name: string) {
  const cacheKey = `name:${name.toLowerCase().trim()}`;
  if (isCached(cacheKey)) return 'cached';

  const aiAnalysis = await getAiAnalysis(name, null, {});

  const result = {
    found: true, barcode: null, name, brand: null,
    nutrition: {}, nutriscore: null, nova: null, yukaScore: null,
    verdict: { emoji: '🔍', text: 'AI ანალიზი', color: 'blue' },
    betterThan: null, healthScore: null, ingredients: null,
    ingredientRisks: [], allergens: [], badges: [],
    aiAnalysis, partialData: true, nameBasedAnalysis: true,
  };

  setCache(cacheKey, result);
  return 'analyzed-name';
}

async function main() {
  console.log('🔬 Pre-analyzing all grocery products...\n');

  // Phase 1: Products with barcodes
  const withBarcode = db.prepare(`
    SELECT id, name, barcode FROM products
    WHERE store_type = 'grocery' AND barcode IS NOT NULL AND barcode != ''
    ORDER BY id
  `).all() as { id: number; name: string; barcode: string }[];

  console.log(`📦 Phase 1: ${withBarcode.length} products with barcodes\n`);

  let done = 0, cached = 0, analyzed = 0, errors = 0;

  for (const p of withBarcode) {
    done++;
    const status = await analyzeWithBarcode(p.id, p.name, p.barcode);
    if (status === 'cached') { cached++; }
    else { analyzed++; }

    if (done % 10 === 0 || status !== 'cached') {
      console.log(`[${done}/${withBarcode.length}] ${status === 'cached' ? '⏩' : '✅'} ${p.name.slice(0, 50)} (${status})`);
    }

    if (status !== 'cached') await sleep(DELAY_MS);
  }

  console.log(`\n📦 Phase 1 done: ${analyzed} analyzed, ${cached} cached\n`);

  // Phase 2: Products without barcodes
  const withoutBarcode = db.prepare(`
    SELECT id, name FROM products
    WHERE store_type = 'grocery' AND (barcode IS NULL OR barcode = '')
    ORDER BY id
  `).all() as { id: number; name: string }[];

  console.log(`📦 Phase 2: ${withoutBarcode.length} products without barcodes\n`);

  let done2 = 0, cached2 = 0, analyzed2 = 0;

  for (const p of withoutBarcode) {
    done2++;
    const status = await analyzeByNameOnly(p.id, p.name);
    if (status === 'cached') { cached2++; }
    else { analyzed2++; }

    if (done2 % 10 === 0 || status !== 'cached') {
      console.log(`[${done2}/${withoutBarcode.length}] ${status === 'cached' ? '⏩' : '✅'} ${p.name.slice(0, 50)} (${status})`);
    }

    if (status !== 'cached') await sleep(DELAY_MS);
  }

  console.log(`\n✅ All done!`);
  console.log(`Phase 1: ${analyzed} analyzed, ${cached} cached (barcode)`);
  console.log(`Phase 2: ${analyzed2} analyzed, ${cached2} cached (name)`);
  console.log(`Total cached: ${db.prepare('SELECT COUNT(*) as c FROM analysis_cache').get()?.c || 0}`);
}

main().catch(console.error);
