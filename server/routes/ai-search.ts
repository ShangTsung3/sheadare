import { Router } from 'express';
import { getAI, isAIAvailable, SYSTEM_PROMPT } from '../services/gemini-service.js';
import { searchProductsForAI, searchProducts } from '../services/product-service.js';

const router = Router();

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
    const identifyResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
            text: `ამოიცანი ეს პროდუქტი და დააბრუნე JSON ფორმატით:
{"product_name": "პროდუქტის სახელი", "search_queries": ["ძიების სიტყვა 1", "ძიების სიტყვა 2"], "category": "კატეგორია ან null", "store_type": "grocery ან electronics"}
მხოლოდ JSON დააბრუნე, სხვა ტექსტის გარეშე.`,
          },
        ],
      }],
    });

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

    // Search for products using identified queries
    const allProducts: any[] = [];
    const queries = identified.search_queries.length > 0
      ? identified.search_queries
      : [identified.product_name].filter(Boolean);

    for (const query of queries.slice(0, 3)) {
      const results = searchProductsForAI(
        query,
        identified.category || undefined,
        identified.store_type || undefined,
        5
      );
      for (const p of results) {
        if (!allProducts.find(x => x.id === p.id)) {
          allProducts.push(p);
        }
      }
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

    // Ask Gemini to parse the natural language query
    const parseResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `მომხმარებელი ეძებს: "${query}"

დააბრუნე JSON:
{"search_terms": ["ძიების სიტყვა"], "category": "კატეგორია ან null", "store_type": "grocery ან electronics", "sort_by": "price_asc ან price_desc ან relevance", "size_filter": "ზომის ფილტრი ან null", "max_price": null ან რიცხვი}

მხოლოდ JSON, სხვა ტექსტის გარეშე.`,
        }],
      }],
    });

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
