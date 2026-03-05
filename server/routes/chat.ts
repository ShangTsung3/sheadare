import { Router } from 'express';
import { getAI, isAIAvailable, SYSTEM_PROMPT, tools } from '../services/gemini-service.js';
import { searchProductsForAI, getProductById } from '../services/product-service.js';
import type { ProductDTO } from '../services/product-service.js';

const router = Router();

// Retry helper for Gemini API calls (handles temporary 429 rate limits)
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
      if (!is429 || attempt === maxRetries) throw err;
      const delay = (attempt + 1) * 3000; // 3s, 6s
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

function executeFunctionCall(name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case 'search_products': {
      const query = args.query as string;
      const category = args.category as string | undefined;
      const storeType = args.store_type as string | undefined;
      const limit = (args.limit as number) || 5;
      return searchProductsForAI(query, category, storeType, limit);
    }
    case 'get_product_details': {
      const id = args.product_id as string;
      return getProductById(Number(id));
    }
    default:
      return { error: `Unknown function: ${name}` };
  }
}

router.post('/', async (req, res) => {
  if (!isAIAvailable()) {
    return res.status(503).json({ error: 'AI service unavailable' });
  }

  const { message, history } = req.body as {
    message: string;
    history?: Array<{ role: string; text: string }>;
  };

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const ai = getAI()!;
    const allProducts: ProductDTO[] = [];

    // Build conversation contents
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (history) {
      for (const h of history) {
        contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // Call Gemini with function calling - max 3 rounds
    let response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools,
      },
    }));

    for (let round = 0; round < 3; round++) {
      const candidate = response.candidates?.[0];
      if (!candidate?.content?.parts) break;

      const functionCalls = candidate.content.parts.filter(
        (p: any) => p.functionCall
      );

      if (functionCalls.length === 0) break;

      // Execute all function calls
      const functionResponses: Array<{ role: string; parts: Array<{ functionResponse: { name: string; response: unknown } }> }> = [];
      for (const part of functionCalls) {
        const fc = (part as any).functionCall;
        const result = executeFunctionCall(fc.name, fc.args || {});

        // Collect products
        if (fc.name === 'search_products' && Array.isArray(result)) {
          for (const p of result) {
            if (!allProducts.find(x => x.id === p.id)) {
              allProducts.push(p as ProductDTO);
            }
          }
        } else if (fc.name === 'get_product_details' && result) {
          const prod = result as ProductDTO;
          if (!allProducts.find(x => x.id === prod.id)) {
            allProducts.push(prod);
          }
        }

        functionResponses.push({
          role: 'function',
          parts: [{ functionResponse: { name: fc.name, response: result as any } }],
        });
      }

      // Continue conversation with function results
      const newContents = [
        ...contents,
        candidate.content,
        ...functionResponses,
      ];

      response = await callWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: newContents as any,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools,
        },
      }));
    }

    // Extract final text response
    const finalText = response.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('\n') || 'ვერ მოვძებნე პასუხი';

    // Build actions from products
    const actions = allProducts.length > 0
      ? [{ type: 'add_to_basket' as const, label: 'კალათაში დამატება', product_ids: allProducts.map(p => p.id) }]
      : [];

    res.json({
      text: finalText,
      products: allProducts,
      actions,
    });
  } catch (err: any) {
    console.error('Chat error:', err);
    const msg = err.message || '';
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      return res.status(429).json({ text: 'AI სერვისის ლიმიტი ამოიწურა. გთხოვთ სცადოთ რამდენიმე წუთში.', products: [], actions: [] });
    }
    res.status(500).json({ text: 'AI სერვისი დროებით მიუწვდომელია. სცადეთ მოგვიანებით.', products: [], actions: [] });
  }
});

export default router;
