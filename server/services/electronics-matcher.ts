// Canonical key extraction for matching electronics products across stores
// e.g. "Apple iPhone 17 Pro Max e-SIM Only | 256GB Cosmic Orange" → "apple-iphone-17-pro-max-256gb"

// Brand words: if found in name, set brand to the canonical value
// These are pure brand names that get REMOVED from model words and prepended
const PURE_BRANDS: Record<string, string> = {
  'apple': 'apple',
  'samsung': 'samsung',
  'xiaomi': 'xiaomi',
  'sony': 'sony',
  'lg': 'lg',
  'dell': 'dell',
  'hp': 'hp',
  'lenovo': 'lenovo',
  'asus': 'asus',
  'acer': 'acer',
  'msi': 'msi',
  'huawei': 'huawei',
  'honor': 'honor',
  'oppo': 'oppo',
  'vivo': 'vivo',
  'realme': 'realme',
  'oneplus': 'oneplus',
  'google': 'google',
  'motorola': 'motorola',
  'nokia': 'nokia',
  'tcl': 'tcl',
  'hisense': 'hisense',
  'philips': 'philips',
  'panasonic': 'panasonic',
  'toshiba': 'toshiba',
  'jbl': 'jbl',
  'marshall': 'marshall',
  'bose': 'bose',
  'harman': 'harman',
  'logitech': 'logitech',
  'razer': 'razer',
  'corsair': 'corsair',
  'steelseries': 'steelseries',
  'hyperx': 'hyperx',
  'xbox': 'xbox',
  'nintendo': 'nintendo',
  'dyson': 'dyson',
  'bosch': 'bosch',
  'siemens': 'siemens',
  'electrolux': 'electrolux',
  'whirlpool': 'whirlpool',
};

// Brand-product words: set brand but KEEP the word in model (iphone → brand=apple, keep "iphone")
const BRAND_PRODUCT_WORDS: Record<string, string> = {
  'iphone': 'apple',
  'ipad': 'apple',
  'macbook': 'apple',
  'imac': 'apple',
  'airpods': 'apple',
  'galaxy': 'samsung',
  'redmi': 'xiaomi',
  'poco': 'xiaomi',
  'pixel': 'google',
  'playstation': 'sony',
  'xperia': 'sony',
  'thinkpad': 'lenovo',
  'ideapad': 'lenovo',
  'zenbook': 'asus',
  'vivobook': 'asus',
  'rog': 'asus',
  'predator': 'acer',
  'inspiron': 'dell',
  'latitude': 'dell',
  'xps': 'dell',
  'pavilion': 'hp',
  'envy': 'hp',
  'spectre': 'hp',
};

// Colors to remove from product names
const COLORS = new Set([
  'black', 'white', 'silver', 'gold', 'grey', 'gray', 'blue', 'red', 'green',
  'pink', 'purple', 'orange', 'yellow', 'brown', 'beige', 'cream', 'ivory',
  'titanium', 'graphite', 'midnight', 'starlight', 'cosmic', 'phantom',
  'mystic', 'aurora', 'nebula', 'desert', 'natural', 'teal', 'mint',
  'lavender', 'lilac', 'coral', 'rose', 'bronze', 'copper', 'navy',
  'cobalt', 'violet', 'indigo', 'aqua', 'sage', 'olive', 'burgundy',
  'maroon', 'peach', 'sand', 'stone', 'slate', 'onyx', 'pearl',
  'champagne', 'glacier', 'alpine', 'arctic', 'deep', 'light', 'dark',
  'ice', 'iceblue', 'moonlight', 'sunlight', 'ocean', 'sky', 'space',
  'sunny', 'oasis', 'mist', 'dusty', 'dreamy', 'moondust', 'cloudy',
]);

// Noise words/patterns to remove
const NOISE_WORDS = new Set([
  'only', 'dual', 'sim', 'esim', 'e-sim', 'wifi', 'wi-fi',
  '5g', '4g', 'lte', 'nfc', 'gps', 'bluetooth',
  'with', 'for', 'and', 'new', 'global', 'version', 'eu', 'intl', "int'l",
  'inch', 'wireless', 'galaxy',
  // Georgian noise words from Megatechnica product names
  'სმარტფონები', 'სმარტფონი', 'ტელეფონი', 'ტელეფონები',
  'ტაბლეტი', 'ტაბლეტები', 'ლეპტოპი', 'ლეპტოპები', 'ნოუთბუქი',
  'ტელევიზორი', 'ტელევიზორები', 'მონიტორი', 'მონიტორები',
  'ყურსასმენი', 'ყურსასმენები', 'დინამიკი', 'დინამიკები',
  'კონსოლი', 'კონსოლები', 'კომპიუტერი', 'კომპიუტერები',
]);

// Samsung/device model number patterns to strip: S948, S948B, SM-S948B, SM-A065FZKDCAU, RMX3890, etc.
const MODEL_NUMBER_RE = /\b(sm-)?[a-z]\d{3,4}[a-z]{0,10}\b/gi;
// Full Samsung model codes like SM-A065FZKDCAU
const SAMSUNG_FULL_MODEL_RE = /\bsm-[a-z0-9]+\b/gi;
// Realme model codes like RMX3890
const REALME_MODEL_RE = /\brmx\d+\b/gi;

export function extractCanonicalKey(name: string): string | null {
  if (!name || name.trim().length === 0) return null;

  let s = name.toLowerCase().trim();

  // Normalize quotes
  s = s.replace(/["""'']/g, '');

  // 1. Extract storage BEFORE normalizing delimiters (so 12/256GB stays intact)
  let storage = '';

  // RAM/storage combo: "12/256GB", "8/128GB", "12GB/256GB", "12/256 GB"
  const ramStorageRe = /\b(\d{1,2})\s*(?:gb)?\s*[/]\s*(\d+)\s*(gb|tb)\b/i;
  const ramMatch = ramStorageRe.exec(s);
  if (ramMatch) {
    storage = `${ramMatch[2]}${ramMatch[3].toLowerCase()}`;
  }

  if (!storage) {
    // Find all NNNgb/tb mentions
    const storageMatches: { value: number; unit: string }[] = [];
    const storageRe = /\b(\d+)\s*(gb|tb)\b/gi;
    let m;
    while ((m = storageRe.exec(s)) !== null) {
      storageMatches.push({ value: parseInt(m[1]), unit: m[2].toLowerCase() });
    }
    if (storageMatches.length > 0) {
      // Pick the largest storage-sized value (>=32GB or TB)
      const storageSized = storageMatches.filter(st => st.unit === 'tb' || st.value >= 32);
      const pick = storageSized.length > 0 ? storageSized[0] : storageMatches[storageMatches.length - 1];
      storage = `${pick.value}${pick.unit}`;
    }
  }

  // 2. Remove storage/RAM patterns from string (we extracted what we need)
  s = s.replace(/\b\d{1,2}\s*(?:gb\s*)?[/]\s*\d+\s*(?:gb|tb)\b/gi, ' ');
  s = s.replace(/\b\d+\s*(?:gb|tb)\b/gi, ' ');

  // Now normalize delimiters
  s = s.replace(/[|/\\,;:()[\]{}]/g, ' ');

  // 3. Remove device model numbers (Samsung SM-xxx, Realme RMX, etc.)
  s = s.replace(SAMSUNG_FULL_MODEL_RE, ' ');
  SAMSUNG_FULL_MODEL_RE.lastIndex = 0;
  s = s.replace(REALME_MODEL_RE, ' ');
  REALME_MODEL_RE.lastIndex = 0;
  s = s.replace(MODEL_NUMBER_RE, ' ');
  MODEL_NUMBER_RE.lastIndex = 0;

  // 4. Remove e-SIM patterns before word splitting
  s = s.replace(/e-?sim\s*(only)?/gi, ' ');

  // 5. Remove year numbers (2020-2030)
  s = s.replace(/\b20[2-3]\d\b/g, ' ');

  // 6. Normalize inch: 14" → 14
  s = s.replace(/(\d+)["″]/g, '$1');

  // 7. Split into words
  const words = s.split(/[\s\-_]+/).filter(w => w.length > 0);

  // 8. Identify brand
  let brand = '';
  for (const w of words) {
    if (PURE_BRANDS[w]) {
      brand = PURE_BRANDS[w];
      break;
    }
    if (BRAND_PRODUCT_WORDS[w]) {
      brand = BRAND_PRODUCT_WORDS[w];
      break;
    }
  }

  // 9. Filter words
  const filtered: string[] = [];
  for (const w of words) {
    // Skip pure brand words (will be prepended)
    if (PURE_BRANDS[w] === brand && PURE_BRANDS[w]) continue;

    // Skip colors
    if (COLORS.has(w)) continue;

    // Skip noise words
    if (NOISE_WORDS.has(w)) continue;

    // Skip single non-digit chars
    if (w.length <= 1 && !/\d/.test(w)) continue;

    // Skip standalone small numbers < 5 (usually RAM like "8" or "12" leftover)
    if (/^\d+$/.test(w) && parseInt(w) < 5) continue;

    filtered.push(w);
  }

  // 10. Combine: brand + model words + storage
  const parts: string[] = [];
  if (brand) parts.push(brand);
  parts.push(...filtered);
  if (storage) parts.push(storage);

  const key = parts.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return key.length > 3 ? key : null;
}
