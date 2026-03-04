import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY not set — AI features will be disabled');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const SYSTEM_PROMPT = `შენ ხარ "შეადარე"-ს AI ასისტენტი — ქართული ფასების შედარების აპლიკაციის.
შენი ამოცანაა დაეხმარო მომხმარებელს პროდუქტების მოძიებაში და ფასების შედარებაში.

წესები:
- ყოველთვის უპასუხე ქართულად
- გამოიყენე search_products ფუნქცია რეალური მონაცემების მოსაძიებლად
- არ გამოიგონო ფასები — მხოლოდ რეალური მონაცემები ბაზიდან
- თუ პროდუქტი ვერ მოიძებნა, მოიხადე ბოდიში და შესთავაზე ალტერნატიული ძიება
- ფასები აჩვენე ლარებში (₾)
- თუ რამდენიმე პროდუქტს ეძებს, თითოეული ცალ-ცალკე მოძებნე
- მოკლედ და კონკრეტულად უპასუხე`;

export const searchProductsTool = {
  name: 'search_products',
  description: 'Search for products in the price comparison database. Use this to find real product prices across Georgian stores.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Search query for the product (e.g. "კოკა კოლა", "ყავა", "iPhone 15")',
      },
      category: {
        type: Type.STRING,
        description: 'Optional category filter (e.g. "რძ", "ხორც", "სასმელ", "ტელეფონ")',
      },
      store_type: {
        type: Type.STRING,
        description: 'Type of store: "grocery" or "electronics"',
      },
      limit: {
        type: Type.NUMBER,
        description: 'Max results to return (default 5)',
      },
    },
    required: ['query'],
  },
};

export const getProductDetailsTool = {
  name: 'get_product_details',
  description: 'Get detailed information about a specific product by its ID, including all store prices.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      product_id: {
        type: Type.STRING,
        description: 'The product ID to look up',
      },
    },
    required: ['product_id'],
  },
};

export const tools = [
  { functionDeclarations: [searchProductsTool, getProductDetailsTool] },
];

export function getAI() {
  return ai;
}

export function isAIAvailable(): boolean {
  return ai !== null;
}
