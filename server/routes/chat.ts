import { Router } from 'express';
import { getAI, isAIAvailable } from '../services/gemini-service.js';
import { searchProductsForAI } from '../services/product-service.js';
import type { ProductDTO } from '../services/product-service.js';

const router = Router();

const CHAT_PROMPT = `შენ ხარ "გამიგე"-ს (gamige.com) AI ასისტენტი — ქართული ფასების შედარების პლატფორმა.
შენი ამოცანაა დაეხმარო მომხმარებელს პროდუქტების ძებნაში, ფასების შედარებაში და საუკეთესო ვარიანტის შერჩევაში.

მაღაზიები:
სასურსათო: Goodwill, Europroduct, 2 Nabiji, Agrohub, Libre, Georgita
ტექნიკა: Zoomer, Alta, Kontakt, Megatechnica, MetroMart

წესები:
- ყოველთვის უპასუხე ქართულად, მეგობრულად
- მონაცემები მოგეცემა ძიების შედეგებით — არ გამოიგონო ფასები
- ფასები აჩვენე ლარებში (₾)
- ყოველთვის დაასახელე რომელ მაღაზიაშია ყველაზე იაფი და რამდენი ლარით
- თუ რამდენიმე ვარიანტი მოიძებნა, შეადარე ფასები ცხრილის სტილით
- მოკლედ და კონკრეტულად უპასუხე

მაგალითები:

მომხმარებელი: "ყველაზე იაფი ტელეფონი მომიძებნე"
→ მოძებნე ტელეფონები, დაალაგე ფასით და აჩვენე 3-5 ყველაზე იაფი ვარიანტი მაღაზიებით

მომხმარებელი: "სად ვიყიდი აიფონს ყველაზე იაფად?"
→ მოძებნე iPhone, შეადარე ფასები მაღაზიებს შორის, დაასახელე ყველაზე იაფი

მომხმარებელი: "1500 ლარამდე ლეპტოპი"
→ მოძებნე ლეპტოპები, გაფილტრე ფასით და აჩვენე ვარიანტები

მომხმარებელი: "რძე რამდენი ღირს?"
→ მოძებნე რძე, აჩვენე ფასები სხვადასხვა მაღაზიაში

მომხმარებელი: "ყველაზე იაფი ყავა"
→ მოძებნე ყავა, დაალაგე ფასით

მომხმარებელი: "samsung galaxy a რომელი ჯობია?"
→ მოძებნე Samsung Galaxy A სერია, შეადარე მოდელები ფასებით

მომხმარებელი: "პური სად არის იაფი?"
→ მოძებნე პური, აჩვენე სად არის ყველაზე იაფი

მომხმარებელი: "რა ტელევიზორს მირჩევ?"
→ მოძებნე ტელევიზორები, აჩვენე კარგი ვარიანტები ფასებით

მომხმარებელი: "airpods pro რამდენი ღირს?"
→ მოძებნე AirPods Pro, შეადარე ფასები მაღაზიებში

პასუხის ფორმატი:
1. მოკლე შესავალი (1 წინადადება)
2. პროდუქტები ფასებით და მაღაზიებით
3. რეკომენდაცია — რომელ მაღაზიაში ჯობია ყიდვა და რატომ`;

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
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err.status === 429 || err.status === 503 || err.message?.includes('429') || err.message?.includes('503') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('UNAVAILABLE') || err.message?.includes('high demand');
      if (!is429 || attempt === maxRetries) throw err;
      const delay = (attempt + 1) * 3000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

// Strip ALL conversational words, keep only product-related terms
function extractProductQuery(msg: string): string {
  // Remove punctuation
  let q = msg.replace(/[?!.,;:()\"']/g, ' ').trim();

  // Giant list of conversational Georgian words/prefixes to remove
  const stopWords = [
    // Questions & requests
    'რამდენი', 'რამდენია', 'რამდენად', 'ღირს', 'ფასი', 'ფასები', 'ფასია',
    'მინდა', 'მინდოდა', 'ვინდა', 'უნდა',
    'სად', 'არის', 'იყო', 'იქნება', 'არ', 'ვერ', 'ხო', 'რა', 'რომ', 'თუ', 'და', 'ან',
    // Commands — any word starting with these prefixes will be removed
    'მიპოვ', 'მოძებნ', 'მოიძი', 'მომიძებნ', 'მომიძბნ', 'მაპოვნინ', 'მაპოვე', 'მიშოვნინ',
    'მიჩვენ', 'აჩვენ', 'მაჩვენ', 'დამანახ',
    'მირჩი', 'მირჩევ', 'ურჩი', 'შემარჩი',
    'მაინტერესებ', 'ინტერესებ',
    'ვიყიდ', 'ვიშოვ', 'ვყიდულობ', 'შევიძინ',
    'დამეხმარ', 'დაეხმარ',
    'გამიგ', 'შეადარ', 'შეამოწმ',
    // Price/quality adjectives
    'ყველაზე', 'იაფი', 'იაფად', 'ძვირი', 'ძვირად', 'კარგი', 'საუკეთესო', 'უკეთესი',
    'ნორმალურ', 'ხარისხიან', 'ბიუჯეტურ',
    'ლარამდე', 'ლარი', 'ლარს', 'ლარით',
    // Conversational
    'გთხოვ', 'გეთაყვა', 'შეგიძლია', 'შეიძლება', 'გამარჯობა', 'მოგესალმები',
    'ბატონო', 'გენაცვალე', 'რომელი', 'ჯობია', 'ჯობს', 'რას', 'როგორი', 'რომელ',
    'აბა', 'ეხა', 'ახლა', 'მერე', 'კიდე', 'კიდევ', 'ისევ', 'უბრალოდ', 'ზოგადად',
    'მაღაზიაში', 'მაღაზია', 'ონლაინ',
  ];

  // Remove stop words (prefix matching — removes word if it starts with any stop word)
  const words = q.split(/\s+/);
  const filtered = words.filter(word => {
    const lower = word.toLowerCase();
    return !stopWords.some(sw => lower.startsWith(sw) || lower === sw);
  });

  q = filtered.join(' ').trim();

  // If nothing left, try extracting known product words from original
  if (!q || q.length < 2) {
    const productWords = [
      'ტელეფონ', 'სმარტფონ', 'მობილურ', 'iphone', 'samsung', 'galaxy', 'xiaomi', 'pixel', 'huawei', 'poco', 'redmi', 'realme', 'oppo',
      'ლეპტოპ', 'ნოუთბუქ', 'laptop', 'macbook', 'notebook', 'lenovo', 'asus', 'acer', 'dell',
      'ტაბლეტ', 'ipad', 'tablet',
      'ტელევიზორ', 'tv', 'მონიტორ', 'monitor',
      'ყურსასმენ', 'airpod', 'buds', 'headphone',
      'საათ', 'watch', 'სმარტ',
      'gaming', 'გეიმინგ', 'playstation', 'xbox', 'ps5',
      'პრინტერ', 'კლავიატურ', 'მაუს', 'დინამიკ', 'სპიკერ',
      'მაცივარ', 'სარეცხ', 'მტვერსასრუტ',
      'რძე', 'პური', 'ხორც', 'ყველი', 'კვერცხ', 'ზეთი', 'შაქარ', 'მაკარონ', 'ბრინჯ',
      'წყალი', 'წვენი', 'ლუდი', 'ღვინო', 'ყავა', 'ჩაი', 'კოკა', 'პეპსი', 'ფანტა',
      'შოკოლად', 'ტკბილეულ', 'ნაყინ', 'ჩიფს', 'ორცხობილ',
      'სარეცხი', 'საპონი', 'შამპუნი', 'პასტა', 'ტუალეტ',
    ];
    const msgLower = msg.toLowerCase();
    const found = productWords.filter(pw => msgLower.includes(pw));
    if (found.length > 0) {
      // Find the actual word in message that contains this product keyword
      const msgWords = msg.replace(/[?!.,;:()\"']/g, ' ').split(/\s+/);
      q = msgWords.filter(w => found.some(pw => w.toLowerCase().includes(pw))).join(' ');
    }
  }

  return q || msg.replace(/[?!.,;:()\"']/g, '').trim();
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

    // === REGULAR MODE: product search ===
    // Step 1: Extract product query and search
    const searchQuery = extractProductQuery(message);
    const storeType = isElectronicsQuery(message) ? 'electronics' : 'grocery';
    let products = searchProductsForAI(searchQuery, undefined, storeType, 10);

    // If no results in specific store type, try without filter
    if (products.length === 0) {
      products = searchProductsForAI(searchQuery, undefined, undefined, 10);
    }
    // Try original message if extraction removed too much
    if (products.length === 0) {
      products = searchProductsForAI(message.replace(/[?!.,]/g, '').trim(), undefined, undefined, 10);
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

    // Format fallback response without AI
    const formatFallback = () => {
      if (products.length === 0) return 'სამწუხაროდ, ვერ მოვძებნე "' + searchQuery + '". სცადე სხვა სახელით ძებნა.';
      const sorted = [...products].sort((a, b) => {
        const aMin = Math.min(...Object.values(a.prices).filter(v => v > 0));
        const bMin = Math.min(...Object.values(b.prices).filter(v => v > 0));
        return aMin - bMin;
      });
      let text = `ვიპოვე ${products.length} შედეგი "${searchQuery}"-ზე:\n\n`;
      for (const p of sorted.slice(0, 8)) {
        const prices = Object.entries(p.prices).filter(([,v]) => v > 0).sort((a,b) => a[1] - b[1]);
        const cheapest = prices[0];
        text += `📦 ${p.name}\n`;
        for (const [store, price] of prices) {
          text += `   ${store === cheapest[0] ? '✅' : '  '} ${store}: ${price}₾${store === cheapest[0] ? ' ← ყველაზე იაფი' : ''}\n`;
        }
        text += '\n';
      }
      const cheapestProduct = sorted[0];
      const cheapestPrice = Math.min(...Object.values(cheapestProduct.prices).filter(v => v > 0));
      const cheapestStore = Object.entries(cheapestProduct.prices).find(([,v]) => v === cheapestPrice)?.[0];
      text += `💡 რეკომენდაცია: "${cheapestProduct.name}" ყველაზე იაფად ${cheapestStore}-ში — ${cheapestPrice}₾`;
      return text;
    };

    let finalText = '';

    // Try AI first, fallback to local formatting
    if (ai) {
      try {
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

        finalText = response.candidates?.[0]?.content?.parts
          ?.filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join('\n') || '';
      } catch (aiErr) {
        console.log('[Chat] Gemini failed, using fallback:', (aiErr as Error).message?.substring(0, 80));
      }
    }

    // Fallback if AI failed or unavailable
    if (!finalText) {
      finalText = formatFallback();
    }

    const actions = products.length > 0
      ? [{ type: 'add_to_basket' as const, label: 'კალათაში დამატება', product_ids: products.map(p => p.id) }]
      : [];

    res.json({ text: finalText, products, actions });
  } catch (err: any) {
    console.error('Chat error:', err?.message?.substring(0, 100));
    // Try to still return search results even if something failed
    try {
      const sq = extractProductQuery(message);
      const st = isElectronicsQuery(message) ? 'electronics' : undefined;
      const fallbackProducts = searchProductsForAI(sq, undefined, st, 5);
      if (fallbackProducts.length > 0) {
        const sorted = fallbackProducts.sort((a, b) => Math.min(...Object.values(a.prices).filter(v => v > 0)) - Math.min(...Object.values(b.prices).filter(v => v > 0)));
        let text = `ვიპოვე ${fallbackProducts.length} შედეგი:\n\n`;
        for (const p of sorted) {
          const prices = Object.entries(p.prices).filter(([,v]) => v > 0).sort((a,b) => a[1] - b[1]);
          text += `📦 ${p.name} — ${prices.map(([s,pr]) => `${s}: ${pr}₾`).join(', ')}\n`;
        }
        return res.json({ text, products: fallbackProducts, actions: [] });
      }
    } catch {}
    res.status(500).json({ text: 'სამწუხაროდ ვერ მოვძებნე. სცადე სხვა სიტყვით.', products: [], actions: [] });
  }
});

export default router;
