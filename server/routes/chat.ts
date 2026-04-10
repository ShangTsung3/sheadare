import { Router } from 'express';
import { getAI, isAIAvailable } from '../services/gemini-service.js';
import { searchProductsForAI } from '../services/product-service.js';
import type { ProductDTO } from '../services/product-service.js';

const router = Router();

const CHAT_PROMPT = `შენ ხარ "გამიგე"-ს (gamige.com) AI ასისტენტი — ქართული ფასების შედარების პლატფორმის.
შენი ამოცანაა დაეხმარო მომხმარებელს პროდუქტების ძებნაში და ფასების შედარებაში.

რა მაღაზიები გვაქვს:
სასურსათო: Goodwill, Europroduct, 2 Nabiji, Agrohub, Libre, Georgita
ტექნიკა: Zoomer, Alta, Kontakt, Megatechnica, MetroMart

შენ შეგიძლია:
- სასურსათო პროდუქტების ძებნა და ფასების შედარება (რძე, პური, ხორცი, ხილი და ა.შ.)
- ტექნიკის ძებნა და ფასების შედარება (ტელეფონები, ლეპტოპები, ტელევიზორები, ყურსასმენები და ა.შ.)
- რჩევები რომელ მაღაზიაში ყიდვა ჯობია
- პროდუქტის ხარისხის შეფასება

წესები:
- ყოველთვის უპასუხე ქართულად
- ფასების მონაცემები მოგეცემა ძიების შედეგებით — არ გამოიგონო ფასები
- აჩვენე ყველაზე იაფი ვარიანტები და სად ყიდულობენ
- ფასები აჩვენე ლარებში (₾)
- მოკლედ და კონკრეტულად უპასუხე
- თუ ტექნიკაზე გეკითხებიან, მოძებნე ბაზაში და შეადარე ფასები მაღაზიებს შორის
- თუ სასურსათოზე გეკითხებიან, იგივე — მოძებნე და შეადარე
- იყავი მეგობრული და დამხმარე`;

const BASKET_PROMPT = `შენ ხარ "გამიგე"-ს (gamige.com) AI ასისტენტი — ქართული ფასების შედარების პლატფორმის.
მომხმარებელს უნდა სასურსათო კალათა შეადგინო ბიუჯეტის ფარგლებში.

წესები:
- ყოველთვის უპასუხე ქართულად
- გამოიყენე მხოლოდ მოცემული მონაცემები — არ გამოიგონო ფასები
- კალათა ლამაზად გაფორმე: თითოეული პროდუქტი ფასით და მაღაზიით
- ბოლოს აჩვენე ჯამი და დარჩენილი ნაშთი
- თუ ბიუჯეტში ყველაფერი ვერ ჩატია, მიუთითე რა გამოტოვე და რატომ
- დაამატე მოკლე რჩევა დაზოგვის შესახებ`;

// Essential grocery items with specific search queries for basket building
const ESSENTIALS = [
  { query: 'პური თეთრი', label: 'პური' },
  { query: 'რძე 1ლ', label: 'რძე (1ლ)' },
  { query: 'კვერცხი 10', label: 'კვერცხი (10ც)' },
  { query: 'მზესუმზირის ზეთი', label: 'მზესუმზირის ზეთი' },
  { query: 'შაქარი 1კგ', label: 'შაქარი (1კგ)' },
  { query: 'მაკარონი სპაგეტი', label: 'მაკარონი' },
  { query: 'ბრინჯი მრგვალი', label: 'ბრინჯი' },
  { query: 'ყველი სულგუნი', label: 'სულგუნი' },
  { query: 'კარაქი 82', label: 'კარაქი' },
  { query: 'ქათმის ბარკალი', label: 'ქათმის ხორცი' },
  { query: 'ფქვილი ხორბლის', label: 'ფქვილი (1კგ)' },
  { query: 'კარტოფილი ქართული', label: 'კარტოფილი (1კგ)' },
  { query: 'ხახვი ქართული', label: 'ხახვი (1კგ)' },
  { query: 'ჩაი 25', label: 'ჩაი (25 პაკეტი)' },
  { query: 'ბანანი', label: 'ბანანი' },
];

// Detect budget/basket query: "20 ლარით რა ვიყიდო", "50₾ კალათა", etc.
function parseBudgetQuery(msg: string): number | null {
  const lower = msg.toLowerCase();
  const basketWords = ['ვიყიდო', 'კალათ', 'შეადგინ', 'ბიუჯეტ', 'საბაზისო', 'პროდუქტებ', 'ოჯახ', 'სია', 'ვეყიდო'];
  const hasBasketWord = basketWords.some(w => lower.includes(w));
  if (!hasBasketWord) return null;

  // Match "20 ლარით", "20₾", "20 ლარი", "20ლარი"
  const budgetMatch = msg.match(/(\d+(?:[.,]\d+)?)\s*(?:₾|ლარ)/);
  return budgetMatch ? parseFloat(budgetMatch[1].replace(',', '.')) : null;
}

// Build a basket of essential groceries within budget
function buildBasket(budget: number) {
  let remaining = budget;
  const basket: Array<{ label: string; name: string; size: string; price: number; store: string; id: string }> = [];
  const skipped: Array<{ label: string; price: number }> = [];

  for (const item of ESSENTIALS) {
    const results = searchProductsForAI(item.query, undefined, 'grocery', 3);
    if (results.length === 0) continue;

    // Pick cheapest option
    const sorted = results
      .filter(r => r.cheapest_price && r.cheapest_price > 0)
      .sort((a, b) => (a.cheapest_price || Infinity) - (b.cheapest_price || Infinity));

    const cheapest = sorted[0];
    if (!cheapest?.cheapest_price) continue;

    if (cheapest.cheapest_price > remaining) {
      skipped.push({ label: item.label, price: cheapest.cheapest_price });
      continue;
    }

    basket.push({
      label: item.label,
      name: cheapest.name,
      size: cheapest.size || '',
      price: cheapest.cheapest_price,
      store: cheapest.cheapest_store || '',
      id: cheapest.id,
    });
    remaining -= cheapest.cheapest_price;

    if (remaining < 0.3) break;
  }

  const total = basket.reduce((sum, b) => sum + b.price, 0);
  return { basket, total, remaining, skipped };
}

// Retry helper for Gemini API calls
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
      if (!is429 || attempt === maxRetries) throw err;
      const delay = (attempt + 1) * 3000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

// Strip conversational Georgian phrases, keeping only product-related terms
function extractProductQuery(msg: string): string {
  // Remove common Georgian question phrases using regex
  let q = msg.trim();
  // "რამდენი ღირს" (how much does it cost), "რამდენია" (how much is it)
  q = q.replace(/\s*რამდენი\s+ღირს\s*/gi, ' ');
  q = q.replace(/\s*რამდენია\s*/gi, ' ');
  q = q.replace(/\s*რამდენი\s*/gi, ' ');
  q = q.replace(/\s*რამდენად\s*/gi, ' ');
  // "მიპოვე" (find me), "მოძებნე" (search for)
  q = q.replace(/\s*მიპოვე\s*/gi, ' ');
  q = q.replace(/\s*მოძებნე\s*/gi, ' ');
  q = q.replace(/\s*მოიძიე\s*/gi, ' ');
  // "ღირს" (costs), "ფასი" (price)
  q = q.replace(/\s*ღირს\s*/gi, ' ');
  q = q.replace(/\s*ფასი\s*/gi, ' ');
  q = q.replace(/\s*ფასები\s*/gi, ' ');
  // "მინდა" (I want), "მიჩვენე" (show me)
  q = q.replace(/\s*მინდა\s*/gi, ' ');
  q = q.replace(/\s*მიჩვენე\s*/gi, ' ');
  q = q.replace(/\s*აჩვენე\s*/gi, ' ');
  q = q.replace(/\s*მაჩვენე\s*/gi, ' ');
  // "ყველაზე იაფი" (cheapest)
  q = q.replace(/\s*ყველაზე\s+იაფი\s*/gi, ' ');
  q = q.replace(/\s*ყველაზე\s*/gi, ' ');
  q = q.replace(/\s*იაფი\s*/gi, ' ');
  // "სად არის" (where is)
  q = q.replace(/\s*სად\s+არის\s*/gi, ' ');
  q = q.replace(/\s*სად\s*/gi, ' ');
  q = q.replace(/\s*არის\s*/gi, ' ');
  // Other common words
  q = q.replace(/\s*შეადარე\s*/gi, ' ');
  q = q.replace(/\s*შეამოწმე\s*/gi, ' ');
  q = q.replace(/\s*გთხოვთ?\s*/gi, ' ');
  q = q.replace(/\s*დამეხმარე\s*/gi, ' ');

  q = q.trim().replace(/\s+/g, ' ');
  return q || msg.trim();
}

// Detect if query is about electronics
function isElectronicsQuery(msg: string): boolean {
  const keywords = ['ტელეფონ', 'iphone', 'samsung', 'galaxy', 'ლეპტოპ', 'laptop', 'კომპიუტერ',
    'ტელევიზორ', 'tv', 'მონიტორ', 'ტაბლეტ', 'ipad', 'airpods', 'macbook', 'ყურსასმენ',
    'playstation', 'xbox', 'nintendo', 'პრინტერ', 'ps5', 'სმარტფონ', 'xiaomi', 'pixel',
    'huawei', 'poco', 'redmi', 'realme', 'oppo', 'vivo', 'lenovo', 'asus', 'acer', 'dell', 'hp',
    'apple watch', 'საათ', 'watch', 'buds', 'headphone', 'speaker', 'დინამიკ', 'კლავიატურ',
    'მაუს', 'mouse', 'keyboard', 'gaming', 'გეიმინგ', 'ნოუთბუქ', 'notebook', 'smartwatch',
    'მაცივარ', 'სარეცხი', 'მტვერსასრუტ', 'ტოსტერ', 'მიქსერ', 'ბლენდერ'];
  const lower = msg.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

router.post('/', async (req, res) => {
  const { message, history } = req.body as {
    message: string;
    history?: Array<{ role: string; text: string }>;
  };

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const ai = getAI();

    // Check if this is a budget/basket query
    const budget = parseBudgetQuery(message);

    if (budget) {
      // === BASKET MODE: build a grocery basket within budget ===
      const { basket, total, remaining, skipped } = buildBasket(budget);

      // Format basket data for Gemini
      const basketInfo = basket.map(b =>
        `- ${b.label}: ${b.name} (${b.size}) → ${b.price.toFixed(2)}₾ (${b.store})`
      ).join('\n');

      const skippedInfo = skipped.length > 0
        ? `\nბიუჯეტში ვერ ჩატია:\n${skipped.map(s => `- ${s.label}: ${s.price.toFixed(2)}₾`).join('\n')}`
        : '';

      // Try Gemini for nice formatting, fallback to local formatting
      let finalText: string;
      try {
        const basketPrompt = `მომხმარებელი ითხოვს: "${message}"

ბიუჯეტი: ${budget.toFixed(2)}₾

შედგენილი კალათა (${basket.length} პროდუქტი):
${basketInfo}

ჯამი: ${total.toFixed(2)}₾
ნაშთი: ${remaining.toFixed(2)}₾
${skippedInfo}

ლამაზად გაფორმე ეს კალათა. აჩვენე თითოეული პროდუქტი emoji-ით, ფასით და მაღაზიით. ბოლოს ჯამი და ნაშთი.`;

        const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
        if (history) {
          for (const h of history) {
            contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] });
          }
        }
        contents.push({ role: 'user', parts: [{ text: basketPrompt }] });

        const response = await callWithRetry(() => ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction: BASKET_PROMPT,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }));

        finalText = response.candidates?.[0]?.content?.parts
          ?.filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join('\n') || '';
      } catch {
        finalText = '';
      }

      // Fallback: format locally if Gemini fails
      if (!finalText) {
        const lines = basket.map(b => `• ${b.label} — ${b.price.toFixed(2)}₾ (${b.store})`);
        finalText = `🛒 კალათა ${budget.toFixed(0)}₾ ბიუჯეტით:\n\n${lines.join('\n')}\n\n💰 ჯამი: ${total.toFixed(2)}₾\n💵 ნაშთი: ${remaining.toFixed(2)}₾`;
        if (skipped.length > 0) {
          finalText += `\n\n⚠️ ვერ ჩატია: ${skipped.map(s => `${s.label} (${s.price.toFixed(2)}₾)`).join(', ')}`;
        }
      }

      // Return basket products in the same format as regular search
      const products = basket.map(b => ({
        id: b.id,
        name: b.name,
        size: b.size,
        prices: { [b.store]: b.price } as Record<string, number>,
        cheapest_store: b.store,
        cheapest_price: b.price,
        image: null,
      }));

      return res.json({ text: finalText, products, actions: [], basket: { total, remaining, budget } });
    }

    // === REGULAR MODE: single product search (requires AI) ===
    if (!ai) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    // Step 1: Extract product query and search
    const searchQuery = extractProductQuery(message);
    const storeType = isElectronicsQuery(message) ? 'electronics' : 'grocery';
    let products = searchProductsForAI(searchQuery, undefined, storeType, 5);

    // If no results in specific store type, try without filter
    if (products.length === 0) {
      products = searchProductsForAI(searchQuery, undefined, undefined, 5);
    }

    // Step 2: Format product data for Gemini
    const productInfo = products.length > 0
      ? products.map(p => {
          const prices = Object.entries(p.prices)
            .filter(([, v]) => v > 0)
            .sort((a, b) => a[1] - b[1])
            .map(([store, price]) => `${store}: ${price}₾`)
            .join(', ');
          return `- ${p.name} (${p.size || ''}) → ${prices}`;
        }).join('\n')
      : null;

    // Step 3: Build conversation for Gemini to format response
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (history) {
      for (const h of history) {
        contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] });
      }
    }

    const userPrompt = productInfo
      ? `მომხმარებელი კითხულობს: "${message}"\n\nნაპოვნი პროდუქტები:\n${productInfo}\n\nამ მონაცემებით უპასუხე. აჩვენე ყველაზე იაფი ვარიანტები.`
      : `მომხმარებელი წერს: "${message}"\n\nბაზაში ვერ მოიძებნა. უპასუხე ქართულად.`;

    contents.push({ role: 'user', parts: [{ text: userPrompt }] });

    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: CHAT_PROMPT,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }));

    const finalText = response.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('\n') || 'ვერ მოვძებნე პასუხი';

    const actions = products.length > 0
      ? [{ type: 'add_to_basket' as const, label: 'კალათაში დამატება', product_ids: products.map(p => p.id) }]
      : [];

    res.json({ text: finalText, products, actions });
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
