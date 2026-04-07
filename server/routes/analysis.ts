import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

const RISKY_INGREDIENTS: Record<string, { risk: 'high' | 'medium' | 'low', reason_ka: string }> = {
  'e150d': { risk: 'high', reason_ka: 'კარამელის საღებავი — შეიძლება შეიცავდეს კანცეროგენ 4-MEI-ს' },
  'e950': { risk: 'medium', reason_ka: 'ასესულფამი K — ხელოვნური დამატკბობელი' },
  'e951': { risk: 'medium', reason_ka: 'ასპარტამი — ხელოვნური დამატკბობელი' },
  'e952': { risk: 'medium', reason_ka: 'ციკლამატი — ხელოვნური დამატკბობელი' },
  'e211': { risk: 'high', reason_ka: 'ნატრიუმის ბენზოატი — კონსერვანტი' },
  'e320': { risk: 'high', reason_ka: 'BHA — შესაძლო კანცეროგენი' },
  'e621': { risk: 'low', reason_ka: 'MSG — გემოს გამაძლიერებელი' },
  'e338': { risk: 'medium', reason_ka: 'ფოსფორმჟავა — კბილების ემალს აზიანებს' },
  'e250': { risk: 'high', reason_ka: 'ნატრიუმის ნიტრიტი — შესაძლო კანცეროგენი' },
  'e171': { risk: 'high', reason_ka: 'ტიტანის დიოქსიდი — EU-ში აკრძალულია' },
};

function analyzeIngredients(ingredientsText: string | null) {
  if (!ingredientsText) return [];
  const lower = ingredientsText.toLowerCase();
  const results: { name: string; risk: string; reason: string }[] = [];
  for (const [key, info] of Object.entries(RISKY_INGREDIENTS)) {
    const spaced = key.replace(/^e(\d)/, 'e $1');
    if (lower.includes(key) || lower.includes(spaced)) {
      results.push({ name: key.toUpperCase(), risk: info.risk, reason: info.reason_ka });
    }
  }
  return results;
}

function getVerdict(score: number | null) {
  if (!score) return { emoji: '❓', text: 'მონაცემები არასაკმარისია', color: 'slate' };
  if (score >= 70) return { emoji: '✅', text: 'რეკომენდებულია', color: 'emerald' };
  if (score >= 50) return { emoji: '👍', text: 'მისაღებია', color: 'green' };
  if (score >= 30) return { emoji: '⚠️', text: 'ზომიერად', color: 'amber' };
  return { emoji: '🚫', text: 'არ არის რეკომენდებული', color: 'red' };
}

function getNovaDescription(nova: number | null) {
  if (nova === 1) return 'დაუმუშავებელი';
  if (nova === 2) return 'სამზარეულოს ინგრედიენტი';
  if (nova === 3) return 'დამუშავებული';
  if (nova === 4) return 'ულტრადამუშავებული';
  return null;
}

function getBadges(p: any, nutrition: any) {
  const badges: { label: string; color: string }[] = [];
  const labels = (p?.labels_tags || []).join(',').toLowerCase();
  if (labels.includes('bio') || labels.includes('organic')) badges.push({ label: 'BIO', color: 'emerald' });
  if (labels.includes('vegan')) badges.push({ label: 'ვეგანური', color: 'green' });
  if (labels.includes('gluten-free')) badges.push({ label: 'უგლუტენო', color: 'blue' });
  if (labels.includes('lactose-free')) badges.push({ label: 'ულაქტოზო', color: 'blue' });
  if (nutrition.sugar != null && nutrition.sugar > 15) badges.push({ label: 'მაღალი შაქარი', color: 'red' });
  if (nutrition.sugar != null && nutrition.sugar < 2) badges.push({ label: 'დაბალი შაქარი', color: 'emerald' });
  if (nutrition.fat != null && nutrition.fat > 20) badges.push({ label: 'მაღალი ცხიმი', color: 'red' });
  if (nutrition.fat != null && nutrition.fat < 3) badges.push({ label: 'დაბალი ცხიმი', color: 'emerald' });
  if (nutrition.salt != null && nutrition.salt > 1.5) badges.push({ label: 'მაღალი მარილი', color: 'red' });
  if (nutrition.protein != null && nutrition.protein > 15) badges.push({ label: 'მაღალი ცილა', color: 'blue' });
  return badges;
}

async function getAiAnalysis(productName: string, brand: string | null, ingredients: string | null, nutrition: any, nutriscore: string | null, nova: number | null): Promise<string | null> {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });

    const nutrientInfo = [
      nutrition.calories != null ? `კალორია: ${nutrition.calories}კკალ` : null,
      nutrition.sugar != null ? `შაქარი: ${nutrition.sugar}გ` : null,
      nutrition.fat != null ? `ცხიმი: ${nutrition.fat}გ` : null,
      nutrition.salt != null ? `მარილი: ${nutrition.salt}გ` : null,
      nutrition.protein != null ? `ცილა: ${nutrition.protein}გ` : null,
    ].filter(Boolean).join(', ');

    const prompt = `შენ ხარ Yuka-ს მსგავსი კვების ანალიზის ექსპერტი. გააანალიზე ეს პროდუქტი ქართულად. მოკლედ და გასაგებად.

პროდუქტი: ${productName}
ბრენდი: ${brand || ''}
შემადგენლობა: ${ingredients || 'ზოგადი ინფორმაცია'}
100გ-ში: ${nutrientInfo || 'ზოგადი მონაცემები'}
Nutriscore: ${nutriscore?.toUpperCase() || '?'}, Nova: ${nova || '?'}

ჩამოწერე ზუსტად ამ ფორმატით:

🟢 კარგი: [რა არის კარგი, 1-2 წინადადება]
🔴 ცუდი: [რა არის ცუდი, 1-2 წინადადება]
⚠️ ყურადღება: [ვისთვის არ არის რეკომენდებული]
💡 ალტერნატივა: [რა შეიძლება მის ნაცვლად]`;

    const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return result.text || null;
  } catch (e: any) {
    console.error('[Analysis] Gemini error:', e?.message || e);
    return null;
  }
}

// Check cache
function getCached(key: string): any | null {
  const db = getDb();
  const row = db.prepare('SELECT result_json, created_at FROM analysis_cache WHERE lookup_key = ?').get(key) as any;
  if (!row) return null;
  try { return JSON.parse(row.result_json); } catch { return null; }
}

function setCache(key: string, result: any) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO analysis_cache (lookup_key, result_json, created_at) VALUES (?, ?, datetime(\'now\'))').run(key, JSON.stringify(result));
}

// === BARCODE ANALYSIS ===
router.get('/product/:barcode', async (req: Request, res: Response) => {
  const barcode = String(req.params.barcode).replace(/\D/g, '');
  if (!barcode) { res.json({ error: 'barcode required' }); return; }

  // Check cache
  const cached = getCached(`barcode:${barcode}`);
  if (cached) { res.json(cached); return; }

  try {
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!offRes.ok) { res.json({ found: false, barcode }); return; }
    const offText = await offRes.text();
    let offData: any;
    try { offData = JSON.parse(offText); } catch { res.json({ found: false, barcode }); return; }

    if (!offData.product || offData.status === 0) {
      // Barcode not in OFF — try name-based analysis from our DB
      const db = getDb();
      const product = db.prepare('SELECT name, barcode FROM products WHERE barcode = ?').get(barcode) as any;
      if (product) {
        const nameResult = await analyzeByName(product.name);
        setCache(`barcode:${barcode}`, nameResult);
        res.json(nameResult);
        return;
      }
      res.json({ found: false, barcode });
      return;
    }

    const p = offData.product;
    const nutrients = p.nutriments || {};
    const nutrition = {
      calories: nutrients['energy-kcal_100g'] ?? null,
      sugar: nutrients.sugars_100g ?? null,
      fat: nutrients.fat_100g ?? null,
      saturated_fat: nutrients['saturated-fat_100g'] ?? null,
      salt: nutrients.salt_100g ?? null,
      protein: nutrients.proteins_100g ?? null,
      fiber: nutrients.fiber_100g ?? null,
      carbs: nutrients.carbohydrates_100g ?? null,
    };

    const nutriscore = p.nutriscore_grade || null;
    const nova = p.nova_group || null;
    const ingredients = p.ingredients_text || null;
    const allergens = (p.allergens_tags || []).map((a: string) => a.replace('en:', ''));

    let yukaScore: number | null = null;
    if (nutriscore) {
      const base: Record<string, number> = { a: 85, b: 70, c: 50, d: 30, e: 15 };
      yukaScore = base[nutriscore] || 50;
      if (nova === 4) yukaScore -= 10;
      if (nova === 1) yukaScore += 10;
      if (nutrition.sugar != null && nutrition.sugar > 20) yukaScore -= 10;
      yukaScore = Math.max(0, Math.min(100, yukaScore));
    }

    const availableNutrients = Object.values(nutrition).filter(v => v != null && v !== 0).length;
    const aiAnalysis = await getAiAnalysis(p.product_name || barcode, p.brands, ingredients, nutrition, nutriscore, nova);

    const result = {
      found: true,
      barcode,
      name: p.product_name || null,
      image: p.image_url || null,
      brand: p.brands || null,
      nutrition,
      nutriscore,
      nova,
      novaDescription: getNovaDescription(nova),
      healthScore: nutriscore === 'a' ? 9 : nutriscore === 'b' ? 7 : nutriscore === 'c' ? 5 : nutriscore === 'd' ? 3 : nutriscore === 'e' ? 1 : null,
      yukaScore,
      verdict: getVerdict(yukaScore),
      betterThan: yukaScore != null ? Math.min(99, Math.max(1, Math.round(yukaScore * 0.9))) : null,
      ingredients,
      ingredientRisks: analyzeIngredients(ingredients),
      allergens,
      badges: getBadges(p, nutrition),
      aiAnalysis,
      partialData: availableNutrients < 3,
    };

    setCache(`barcode:${barcode}`, result);
    res.json(result);
  } catch (err) {
    console.error('[Analysis] Error:', err);
    res.status(500).json({ error: 'analysis failed' });
  }
});

// === NAME-BASED ANALYSIS (no barcode needed) ===
async function analyzeByName(productName: string): Promise<any> {
  const cached = getCached(`name:${productName.toLowerCase().trim()}`);
  if (cached) return cached;

  const aiAnalysis = await getAiAnalysis(productName, null, null, {}, null, null);

  const result = {
    found: true,
    barcode: null,
    name: productName,
    image: null,
    brand: null,
    nutrition: {},
    nutriscore: null,
    nova: null,
    novaDescription: null,
    healthScore: null,
    yukaScore: null,
    verdict: { emoji: '🔍', text: 'AI ანალიზი', color: 'blue' },
    betterThan: null,
    ingredients: null,
    ingredientRisks: [],
    allergens: [],
    badges: [],
    aiAnalysis,
    partialData: true,
    nameBasedAnalysis: true,
  };

  setCache(`name:${productName.toLowerCase().trim()}`, result);
  return result;
}

router.get('/by-name/:name', async (req: Request, res: Response) => {
  const name = String(req.params.name).trim();
  if (!name) { res.json({ error: 'name required' }); return; }
  try {
    const result = await analyzeByName(name);
    res.json(result);
  } catch (err) {
    console.error('[Analysis] Name error:', err);
    res.status(500).json({ error: 'analysis failed' });
  }
});

export default router;
