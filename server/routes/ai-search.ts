import { Router } from 'express';
import { getAI, isAIAvailable, SYSTEM_PROMPT } from '../services/gemini-service.js';
import { searchProductsForAI, searchProducts } from '../services/product-service.js';

const router = Router();

// Retry helper for Gemini API calls (handles temporary 429 rate limits)
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable = err.status === 429 || err.status === 503 || err.message?.includes('429') || err.message?.includes('503') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('UNAVAILABLE') || err.message?.includes('high demand');
      if (!isRetryable || attempt === maxRetries) throw err;
      const delay = (attempt + 1) * 3000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

// POST /api/ai/image — Image-based product search
router.post('/image', async (req, res) => {
  if (!isAIAvailable()) {
    return res.status(503).json({ error: 'AI service unavailable' });
  }

  const { image } = req.body as { image: string };
  if (!image) {
    return res.status(400).json({ error: 'Image is required (base64 data URL)' });
  }

  try {
    const ai = getAI()!;

    // Extract base64 data and mime type
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image format. Expected data:image/...;base64,...' });
    }
    const mimeType = match[1];
    const base64Data = match[2];

    // Ask Gemini to identify the product
    const identifyResponse = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `შენ ხარ ექსპერტი პროდუქტის ამომცნობი ქართული სუპერმარკეტებისთვის.

დავალება: წაიკითხე ეტიკეტზე დაწერილი ყველა ტექსტი და ამოიცანი პროდუქტი.

ნაბიჯები:
1. პირველ რიგში წაიკითხე ეტიკეტზე/შეფუთვაზე ყველა ტექსტი — ბრენდი, სახელი, მოცულობა
2. თუ ქართული ტექსტი წერია, ის არის მთავარი
3. თუ მხოლოდ ლათინური წერია, ქართულად გადმოწერე ტრანსლიტერაციით
4. მოცულობა/წონა ძალიან მნიშვნელოვანია — 0.5ლ, 1ლ, 1.5ლ, 200გრ, 1კგ...

დააბრუნე JSON:
{"product_name": "ბრენდი + პროდუქტი + მოცულობა ქართულად", "size": "მოცულობა (მაგ: 0.5ლ)", "search_queries": ["query1", "query2", "query3", "query4", "query5", "query6"], "category": null, "store_type": "grocery"}

search_queries (6 ცალი, ზუსტიდან ზოგადისკენ):
1. ბრენდი ქართულად + მოცულობა (მაგ: "ბორჯომი 0.5")
2. ბრენდი ქართულად (მაგ: "ბორჯომი")
3. ბრენდი ლათინურად ზუსტად როგორც ეტიკეტზეა (მაგ: "Borjomi")
4. ბრენდი + პროდუქტის ტიპი (მაგ: "ბორჯომი მინერალური")
5. პროდუქტის სრული სახელი ქართულად (მაგ: "მინერალური წყალი ბორჯომი")
6. პროდუქტის ტიპი (მაგ: "მინერალური წყალი")

ტრანსლიტერაცია (აუცილებლად!):
Coca-Cola→კოკა კოლა, Fanta→ფანტა, Pepsi→პეპსი, Sprite→სპრაიტი, Borjomi→ბორჯომი, Nabeghlavi→ნაბეღლავი, Natakhtari→ნატახტარი, Bakuriani→ბაკურიანი, Sante→სანტე, Lactis→ლაქტისი, President→პრეზიდენტი, Nescafe→ნესკაფე, Lipton→ლიპტონი, Jacobs→ჯეკობსი, Barilla→ბარილა, Bonduelle→ბონდუელი, Orbit→ორბიტი, Milka→მილკა, Snickers→სნიკერსი, Lay's→ლეისი, Pringles→პრინგლსი, Domestos→დომესტოსი, Fairy→ფეირი, Persil→პერსილი, Colgate→კოლგეიტი

მხოლოდ JSON! სხვა ტექსტის გარეშე!`,
          },
        ],
      }],
      config: {
        thinkingConfig: { thinkingBudget: 2048 },
      },
    }));

    const identifyText = identifyResponse.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('') || '';

    // Parse identified product
    let identified = { product_name: '', search_queries: [] as string[], category: null as string | null, store_type: 'grocery' };
    try {
      const jsonMatch = identifyText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        identified = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If parsing fails, use raw text as search query
      identified.search_queries = [identifyText.trim().slice(0, 50)];
    }

    // Search for products — try all queries and merge results with dedup
    let allProducts: any[] = [];
    const seenIds = new Set<string>();
    const queries = identified.search_queries.length > 0
      ? identified.search_queries
      : [identified.product_name].filter(Boolean);

    for (const query of queries.slice(0, 6)) {
      if (!query) continue;
      const results = searchProductsForAI(
        query,
        identified.category || undefined,
        identified.store_type || undefined,
        10
      );
      for (const p of results) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          allProducts.push(p);
        }
      }
      // If first query found good results, prioritize those
      if (allProducts.length >= 5) break;
    }

    // Fallback: if nothing found, try product_name and also without store_type filter
    if (allProducts.length === 0 && identified.product_name) {
      // Try product_name directly
      allProducts = searchProductsForAI(identified.product_name, undefined, identified.store_type || undefined, 5);
    }
    if (allProducts.length === 0) {
      // Try each query without store_type filter
      for (const query of queries.slice(0, 4)) {
        const results = searchProductsForAI(query, undefined, undefined, 5);
        if (results.length > 0) { allProducts = results; break; }
      }
    }
    if (allProducts.length === 0 && identified.product_name) {
      // Last resort: split product_name into individual words and try each
      const words = identified.product_name.split(/[\s\-_]+/).filter((w: string) => w.length > 2);
      for (const word of words) {
        const results = searchProductsForAI(word, undefined, undefined, 5);
        if (results.length > 0) { allProducts = results; break; }
      }
    }

    // Sort results: prioritize matching size from product_name
    const sizeMatch = (identified.product_name || '').match(/(\d+(?:[.,]\d+)?)\s*(მლ|მგ|ლ|კგ|გრ|ml|mg|l|kg|g)/i);
    if (sizeMatch && allProducts.length > 1) {
      const targetSize = sizeMatch[1].replace(',', '.');
      const targetUnit = sizeMatch[2].toLowerCase();
      // Convert to ml/g for comparison
      const toBase = (val: string, unit: string) => {
        const n = parseFloat(val);
        const u = unit.toLowerCase();
        if (u === 'ლ' || u === 'l') return n * 1000;
        if (u === 'კგ' || u === 'kg') return n * 1000;
        return n;
      };
      const targetBase = toBase(targetSize, targetUnit);

      allProducts.sort((a: any, b: any) => {
        const aMatch = (a.name + ' ' + a.size).match(/(\d+(?:[.,]\d+)?)\s*(მლ|მგ|ლ|კგ|გრ|ml|mg|l|kg|g)/i);
        const bMatch = (b.name + ' ' + b.size).match(/(\d+(?:[.,]\d+)?)\s*(მლ|მგ|ლ|კგ|გრ|ml|mg|l|kg|g)/i);
        const aBase = aMatch ? toBase(aMatch[1].replace(',', '.'), aMatch[2]) : 99999;
        const bBase = bMatch ? toBase(bMatch[1].replace(',', '.'), bMatch[2]) : 99999;
        // Closer to target size = higher priority
        return Math.abs(aBase - targetBase) - Math.abs(bBase - targetBase);
      });
    }

    // Generate user-friendly response
    let text: string;
    if (allProducts.length > 0) {
      const cheapest = allProducts[0];
      text = `ამოვიცანი: ${identified.product_name || 'პროდუქტი'}. ვიპოვე ${allProducts.length} შედეგი.`;
      if (cheapest.cheapest_store && cheapest.cheapest_price) {
        text += ` ყველაზე იაფი: ${cheapest.cheapest_price.toFixed(2)}₾ (${cheapest.cheapest_store})`;
      }
    } else {
      text = identified.product_name
        ? `ამოვიცანი "${identified.product_name}", მაგრამ ბაზაში ვერ ვიპოვე. სცადე ხელით ძიება.`
        : 'ვერ ამოვიცანი პროდუქტი. სცადე უფრო ნათელი ფოტო.';
    }

    res.json({
      text,
      products: allProducts,
      identified: identified.product_name || null,
    });
  } catch (err: any) {
    console.error('Image search error:', err);
    res.status(500).json({ error: 'Image analysis failed', details: err.message });
  }
});

// GET /api/ai/smart?q=... — Smart natural language search
router.get('/smart', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  // Fallback to regular search if AI is not available
  if (!isAIAvailable()) {
    const { results, total } = searchProducts(query, undefined, 1, 20);
    return res.json({ results, total, ai_parsed: false });
  }

  try {
    const ai = getAI()!;

    // Ask Gemini to parse the natural language query (thinkingBudget: 1024 for speed)
    const parseResponse = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `მომხმარებელი ეძებს: "${query}"

დააბრუნე JSON:
{"search_terms": ["ძიების სიტყვა"], "category": "კატეგორია ან null", "store_type": "grocery ან electronics ან pharmacy", "sort_by": "price_asc ან price_desc ან relevance", "size_filter": "ზომის ფილტრი ან null", "max_price": null ან რიცხვი}

მხოლოდ JSON, სხვა ტექსტის გარეშე.`,
        }],
      }],
      config: {
        thinkingConfig: { thinkingBudget: 1024 },
      },
    }));

    const parseText = parseResponse.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('') || '';

    let parsed = {
      search_terms: [query],
      category: null as string | null,
      store_type: null as string | null,
      sort_by: 'relevance',
      size_filter: null as string | null,
      max_price: null as number | null,
    };

    try {
      const jsonMatch = parseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const p = JSON.parse(jsonMatch[0]);
        parsed = { ...parsed, ...p };
      }
    } catch {
      // Use original query as fallback
    }

    // Execute search with parsed parameters
    const searchQuery = parsed.search_terms.join(' ');
    const { results, total } = searchProducts(
      searchQuery,
      parsed.category || undefined,
      1,
      30,
      false,
      parsed.store_type || undefined
    );

    // Post-process: filter by size if specified
    let filtered = results;
    if (parsed.size_filter) {
      const sizePattern = parsed.size_filter.toLowerCase();
      const sizeFiltered = results.filter(p =>
        p.size.toLowerCase().includes(sizePattern) ||
        p.name.toLowerCase().includes(sizePattern)
      );
      if (sizeFiltered.length > 0) {
        filtered = sizeFiltered;
      }
    }

    // Post-process: filter by max price
    if (parsed.max_price) {
      const maxPrice = parsed.max_price;
      const priceFiltered = filtered.filter(p => {
        const minPrice = Math.min(...Object.values(p.prices).filter(v => v > 0));
        return minPrice <= maxPrice;
      });
      if (priceFiltered.length > 0) {
        filtered = priceFiltered;
      }
    }

    // Post-process: sort
    if (parsed.sort_by === 'price_asc') {
      filtered.sort((a, b) => {
        const aMin = Math.min(...Object.values(a.prices).filter(v => v > 0));
        const bMin = Math.min(...Object.values(b.prices).filter(v => v > 0));
        return aMin - bMin;
      });
    } else if (parsed.sort_by === 'price_desc') {
      filtered.sort((a, b) => {
        const aMin = Math.min(...Object.values(a.prices).filter(v => v > 0));
        const bMin = Math.min(...Object.values(b.prices).filter(v => v > 0));
        return bMin - aMin;
      });
    }

    res.json({
      results: filtered.slice(0, 20),
      total: filtered.length,
      ai_parsed: true,
      parsed_query: parsed,
    });
  } catch (err: any) {
    console.error('Smart search error:', err);
    // Fallback to regular search
    const { results, total } = searchProducts(query, undefined, 1, 20);
    res.json({ results, total, ai_parsed: false });
  }
});

export default router;
