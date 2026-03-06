// Canonical key extraction for matching electronics products across stores
// e.g. "Apple iPhone 17 Pro Max e-SIM Only | 256GB Cosmic Orange" → "apple-iphone-17-pro-max-256gb"

// Brand words: if found in name, set brand to the canonical value
// These are pure brand names that get REMOVED from model words and prepended
const PURE_BRANDS: Record<string, string> = {
  // Electronics
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
  // Home appliances
  'dyson': 'dyson',
  'bosch': 'bosch',
  'siemens': 'siemens',
  'electrolux': 'electrolux',
  'whirlpool': 'whirlpool',
  'braun': 'braun',
  'tefal': 'tefal',
  'moulinex': 'moulinex',
  'delonghi': 'delonghi',
  "de'longhi": 'delonghi',
  'gorenje': 'gorenje',
  'midea': 'midea',
  'haier': 'haier',
  'beko': 'beko',
  'indesit': 'indesit',
  'zanussi': 'zanussi',
  'candy': 'candy',
  'ariston': 'ariston',
  'hotpoint': 'hotpoint',
  'hitachi': 'hitachi',
  'daewoo': 'daewoo',
  'sharp': 'sharp',
  'kenwood': 'kenwood',
  'rowenta': 'rowenta',
  'remington': 'remington',
  'babyliss': 'babyliss',
  'grundig': 'grundig',
  'karcher': 'karcher',
  'dreame': 'dreame',
  'roborock': 'roborock',
  'ecovacs': 'ecovacs',
  'tineco': 'tineco',
  'roidmi': 'roidmi',
  'vitek': 'vitek',
  'scarlett': 'scarlett',
  'polaris': 'polaris',
  'kitchenaid': 'kitchenaid',
  'smeg': 'smeg',
  'imetec': 'imetec',
  'redmond': 'redmond',
  'franke': 'franke',
  'faber': 'faber',
  'elica': 'elica',
  'neff': 'neff',
  'gaggenau': 'gaggenau',
  'miele': 'miele',
  'aeg': 'aeg',
  'liebherr': 'liebherr',
  'daikin': 'daikin',
  'gree': 'gree',
  'vivax': 'vivax',
  'sencor': 'sencor',
  'pioneer': 'pioneer',
  'hmd': 'hmd',
  'nothing': 'nothing',
  'anker': 'anker',
  'baseus': 'baseus',
  'ugreen': 'ugreen',
  'amazfit': 'amazfit',
  'garmin': 'garmin',
  'gopro': 'gopro',
  'dji': 'dji',
  'canon': 'canon',
  'nikon': 'nikon',
  'fujifilm': 'fujifilm',
  'benq': 'benq',
  'aoc': 'aoc',
  'segway': 'segway',
  'a4tech': 'a4tech',
  'bloody': 'a4tech',
  'hama': 'hama',
  'trust': 'trust',
  'arzum': 'arzum',
  'sven': 'sven',
  'defender': 'defender',
  'havit': 'havit',
  'rapoo': 'rapoo',
  'coolermaster': 'coolermaster',
  'thermaltake': 'thermaltake',
  'insta360': 'insta360',
  'osram': 'osram',
  'hiper': 'hiper',
  'crucial': 'crucial',
  'kingston': 'kingston',
  'sandisk': 'sandisk',
  'seagate': 'seagate',
  'western': 'western',
  'tplink': 'tplink',
  'tp-link': 'tplink',
  'netgear': 'netgear',
  'dlink': 'dlink',
  'd-link': 'dlink',
  'keychron': 'keychron',
  'redragon': 'redragon',
  'cougar': 'cougar',
  'genesis': 'genesis',
  'nzxt': 'nzxt',
  'deepcool': 'deepcool',
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
  'tuf': 'asus',
  'nitro': 'acer',
  'aspire': 'acer',
  'swift': 'acer',
  'extensa': 'acer',
  'bravia': 'sony',
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
  // Additional colors from store data
  'arctic', 'luna', 'cool', 'jet', 'titan', 'icy', 'bright', 'vivid',
  'cafe', 'latte', 'panda', 'punk', 'frost', 'shadow', 'plum', 'smoke', 'ultramarine',
  'lunar', 'matte', 'jaeger', 'pure', 'quiet', 'mecha', 'steel',
  'carbon', 'charcoal', 'platinum', 'mercury', 'obsidian', 'emerald',
  'ruby', 'sapphire', 'amber', 'cyan', 'magenta', 'crimson', 'scarlet',
  'taupe', 'khaki', 'mahogany', 'hazel', 'stormy', 'pastel', 'neon',
  'gradient', 'satin', 'glossy', 'denim', 'ceramic', 'crystal',
  'mocha', 'luna', 'stardust', 'starry', 'misty', 'foggy', 'clouded',
]);

// Noise words/patterns to remove
const NOISE_WORDS = new Set([
  'only', 'dual', 'sim', 'esim', 'e-sim', 'wifi', 'wi-fi',
  '5g', '4g', 'lte', 'nfc', 'gps', 'bluetooth',
  'with', 'without', 'for', 'and', 'new', 'global', 'version', 'eu', 'intl', "int'l",
  'inch', 'wireless', 'galaxy', 'charger', 'adapter', 'box', 'open',
  // English category/description words to remove for matching
  'smart', 'phone', 'smartphone', 'tablet', 'laptop', 'notebook', 'television',
  'monitor', 'headphone', 'headphones', 'earphone', 'earphones', 'earbuds', 'speaker',
  'console', 'computer', 'desktop', 'portable', 'professional', 'series',
  'washing', 'machine', 'refrigerator', 'fridge', 'freezer', 'dishwasher',
  'vacuum', 'cleaner', 'robot', 'cordless', 'handheld', 'stick',
  'iron', 'steam', 'generator', 'blender', 'mixer', 'toaster',
  'kettle', 'electric', 'coffee', 'maker', 'grinder', 'juicer',
  'hair', 'dryer', 'straightener', 'curler', 'trimmer', 'shaver',
  'epilator', 'toothbrush', 'air', 'conditioner', 'heater', 'fan',
  'purifier', 'humidifier', 'oven', 'microwave', 'grill', 'fryer',
  'hood', 'cooktop', 'hob', 'built', 'freestanding', 'induction',
  'inverter', 'compressor', 'motor', 'digital', 'automatic', 'manual',
  'premium',
  // Product type words — peripherals & accessories
  'gaming', 'mouse', 'keyboard', 'combo', 'set', 'kit', 'bundle',
  'bag', 'backpack', 'carry', 'case', 'cover', 'sleeve', 'pouch',
  'cable', 'charge', 'power', 'supply', 'stand', 'mount', 'holder',
  'dock', 'hub', 'dongle', 'receiver', 'transmitter',
  'lens', 'filter', 'tripod', 'strap', 'protector', 'film', 'guard',
  'router', 'extender', 'repeater', 'modem', 'switch', 'access', 'point',
  'external', 'internal', 'drive', 'storage', 'memory', 'card', 'reader',
  'printer', 'scanner', 'projector', 'camera', 'webcam', 'microphone',
  // Description qualifiers
  'extendable', 'band', 'layout', 'scissor', 'mechanical', 'membrane',
  'ergonomic', 'adjustable', 'foldable', 'collapsible', 'removable',
  'rechargeable', 'wired', 'optical', 'laser', 'sensor', 'rgb',
  'fire', 'model', 'standard', 'edition', 'pack', 'piece',
  'en', 'ru', 'carger',
  // WiFi/networking speed specs (inconsistently included across stores)
  'ax1800', 'ax3000', 'ax5400', 'ax6000', 'be3600', 'be7200',
  'ac1200', 'ac1900', 'ac2600', 'ac3200', 'n300', 'n600',
  // CPU/GPU specs (Zoomer includes full specs, others don't)
  'intel', 'amd', 'core', 'ryzen', 'snapdragon', 'qualcomm',
  'uhd', 'graphics', 'radeon', 'geforce', 'nvidia', 'adreno', 'gpu',
  'ram', 'ssd', 'hdd', 'ddr4', 'ddr5', 'free', 'dos', 'windows',
  'fhd', 'wuxga', 'ips', 'oled', 'amoled', 'led', 'lcd', 'qled',
  'slimbezel', 'nit', 'nits', 'hz',
  // Display size qualifiers (after inch normalization)
  '144hz', '165hz', '120hz', '60hz', '240hz', '300nit',
  // Georgian noise words — electronics
  'სმარტფონები', 'სმარტფონი', 'ტელეფონი', 'ტელეფონები',
  'ტაბლეტი', 'ტაბლეტები', 'ლეპტოპი', 'ლეპტოპები', 'ნოუთბუქი',
  'ტელევიზორი', 'ტელევიზორები', 'მონიტორი', 'მონიტორები',
  'ყურსასმენი', 'ყურსასმენები', 'დინამიკი', 'დინამიკები',
  'კონსოლი', 'კონსოლები', 'კომპიუტერი', 'კომპიუტერები',
  // Georgian noise words — home appliances
  'მაცივარი', 'მაცივრები', 'სარეცხი', 'მანქანა', 'მანქანები',
  'საშრობი', 'ჭურჭლის', 'გაზქურა', 'გაზქურები',
  'ღუმელი', 'ღუმელები', 'გამწოვი', 'გამწოვები',
  'მიკროტალღური', 'ჩასაშენებელი', 'ზედაპირი',
  // Georgian noise words — cleaning & ironing
  'მტვერსასრუტი', 'მტვერსასრუტები', 'უთო', 'უთოები',
  'რობოტი', 'უსადენო', 'ორთქლის',
  // Georgian noise words — kitchen
  'ბლენდერი', 'ბლენდერები', 'მიქსერი', 'მიქსერები',
  'ტოსტერი', 'ტოსტერები', 'ჩაიდანი', 'ჩაიდანები',
  'ელექტრო', 'წვენსაწური', 'ჩოფერი', 'კომბაინი',
  'სამზარეულო', 'აეროგრილი', 'მულტისახარში',
  'ყავის', 'აპარატი', 'აპარატები', 'საფქვავი',
  // Georgian noise words — beauty & personal care
  'ფენი', 'ფენები', 'წვერსაპარსი', 'წვერსაპარსები',
  'ეპილატორი', 'ეპილატორები', 'ტრიმერი', 'ტრიმერები',
  'თმის', 'სახვევი', 'გასასწორებელი', 'საკრეჭი',
  'ჯაგრისი', 'ჯაგრისები', 'ირიგატორი',
  // Georgian noise words — climate
  'კონდიციონერი', 'კონდიციონერები', 'ვენტილატორი',
  'გამათბობელი', 'გამათბობლები', 'გამაცხელებელი',
  'დამატენიანებელი', 'გამწმენდი',
  // Georgian noise words — grills, juicers, misc appliances
  'გრილი', 'ტოსტერი', 'ციტრუსის', 'საწური', 'საწურები',
  'პურის', 'საცხობი', 'სენდვიჩის', 'ვაფლის', 'წარმოება',
  // Georgian misc
  'სასწორი', 'სასწორები', 'პრინტერი', 'პრინტერები',
  'კლავიატურა', 'მაუსი', 'დრონი', 'დრონები',
  'სკუტერი', 'სკუტერები', 'ველოსიპედი',
  'რაუტერი', 'მოდემი', 'კამერა', 'კამერები',
  'ხარისხის', 'მაღალი', 'დაბალი', 'საშუალო',
  'ფასდაკლება', 'აქცია', 'ახალი', 'თაობა',
  // Georgian category prefixes (used by Megatechnica, Alta etc.)
  'მობილურის', 'აქსესუარი', 'აქსესუარები', 'ტექნიკა',
  'ქეისი', 'ქეისები', 'პლანშეტური', 'დამცავი', 'სტიკერი',
  'დამტენი', 'დამტენები', 'კაბელი', 'კაბელები', 'ადაპტერი',
  'პავერბანკი', 'პავერბანკები', 'ჩამრთველი', 'გადამყვანი',
  'ფილმი', 'მინა', 'დაცვა', 'სახელური', 'თანა',
  'საქაღალდე', 'ტელესკოპი', 'სტილუსი',
]);

// Product-type words: these are in NOISE_WORDS but represent fundamental product categories.
// We extract the first match BEFORE noise filtering strips it, then include it in the key.
// This prevents e.g. "Xiaomi Mouse Lite 2" and "Xiaomi Kettle 2 Lite" from colliding.
const PRODUCT_TYPES: Record<string, string> = {
  // Peripherals & accessories
  'mouse': 'mouse',
  'keyboard': 'keyboard',
  'headphones': 'headphones',
  'headphone': 'headphones',
  'earphones': 'earbuds',
  'earphone': 'earbuds',
  'earbuds': 'earbuds',
  'speaker': 'speaker',
  'webcam': 'webcam',
  'microphone': 'mic',
  // Small kitchen appliances
  'kettle': 'kettle',
  'blender': 'blender',
  'mixer': 'mixer',
  'toaster': 'toaster',
  'juicer': 'juicer',
  'grinder': 'grinder',
  'fryer': 'fryer',
  // Climate
  'humidifier': 'humidifier',
  'purifier': 'purifier',
  'heater': 'heater',
  // Cleaning
  'vacuum': 'vacuum',
  'iron': 'iron',
  // Personal care
  'shaver': 'shaver',
  'trimmer': 'trimmer',
  'epilator': 'epilator',
  'toothbrush': 'toothbrush',
  'straightener': 'straightener',
  'curler': 'curler',
  'dryer': 'dryer',
  // Cooking
  'oven': 'oven',
  'microwave': 'microwave',
  'grill': 'grill',
  // Office & imaging
  'printer': 'printer',
  'scanner': 'scanner',
  'projector': 'projector',
  'camera': 'camera',
};

// Full Samsung model codes like SM-A065FZKDCAU, SM-S948B
const SAMSUNG_FULL_MODEL_RE = /\bsm-[a-z0-9]+\b/gi;
// Realme model codes like RMX3890
const REALME_MODEL_RE = /\brmx\d+\b/gi;
// Samsung bare internal codes: appears AFTER known Samsung series pattern
// e.g. "S26 Ultra S948B" → strip "S948B" but keep "S26"
// Only strip if it looks like a Samsung internal code (letter + exactly 3 digits + optional letters)
// and the product is Samsung (checked in extractCanonicalKey)
const SAMSUNG_BARE_CODE_RE = /\b[sa]\d{3}[a-z]{0,6}\b/gi;

/** Strip color words from electronics product name for cleaner display */
export function stripColorsFromName(name: string): string {
  // Step 1: Remove trailing parenthetical model codes like (SM-S942BZKCCAU)
  let cleaned = name.replace(/\s*\([A-Z]{2}-[A-Z0-9]+\)\s*$/, '');
  // Remove trailing model codes like MFYP4ZD/A
  cleaned = cleaned.replace(/\s+[A-Z]{3,}[0-9]+[A-Z]*\/[A-Z]\s*$/, '');

  // Step 2: Walk backwards and strip trailing color words
  const words = cleaned.split(/\s+/);
  let end = words.length;
  while (end > 0) {
    const w = words[end - 1].toLowerCase().replace(/[^a-z]/g, '');
    if (w && COLORS.has(w)) {
      end--;
    } else if (/^[-|/,]+$/.test(words[end - 1])) {
      // Also skip trailing separators
      end--;
    } else {
      break;
    }
  }
  // Don't strip if we'd remove too much
  if (end < words.length * 0.4) return name;
  const result = words.slice(0, end).join(' ').replace(/\s*[-|/,]+\s*$/, '').trim();
  return result || name;
}

export function extractCanonicalKey(name: string): string | null {
  if (!name || name.trim().length === 0) return null;

  let s = name.toLowerCase().trim();

  // Normalize quotes
  s = s.replace(/["""'']/g, '');

  // 1. Extract storage and RAM BEFORE normalizing delimiters (so 12/256GB stays intact)
  let storage = '';
  let ram = '';

  // RAM/storage combo: "12/256GB", "8/128GB", "12GB/256GB", "12/256 GB"
  const ramStorageRe = /\b(\d{1,2})\s*(?:gb)?\s*[/]\s*(\d+)\s*(gb|tb)\b/i;
  const ramMatch = ramStorageRe.exec(s);
  if (ramMatch) {
    ram = `${ramMatch[1]}gb`;
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

  // Remove Philips-style /00, /10, /12 etc. suffixes (product variant codes)
  s = s.replace(/\/\d{2}\b/g, ' ');

  // Extract pack/multi-pack quantity BEFORE removing parentheses
  // e.g. "(4 Pack)", "4-Pack", "4 pack", "pack of 4", "4ცალიანი", "4 ცალი"
  let packSize = 0;
  const packPatterns = [
    /\((\d+)\s*[-]?\s*(?:pack|piece|pieces|pcs|ცალი|ცალიანი|კომპლექტი)\)/i,
    /\b(\d+)\s*[-]?\s*(?:pack)\b/i,
    /\bpack\s+of\s+(\d+)\b/i,
    /\b(\d+)\s*[-]?\s*(?:ცალიანი|ცალი)\b/i,
  ];
  for (const re of packPatterns) {
    const m = re.exec(s);
    if (m && parseInt(m[1]) > 1) {
      packSize = parseInt(m[1]);
      // Remove the matched pack pattern from string to avoid duplicate tokens
      s = s.replace(re, ' ');
      break;
    }
  }

  // e-SIM Only is stripped via NOISE_WORDS; not included in key since stores
  // label the same product inconsistently (Zoomer: "e-SIM Only", Megatechnica: nothing)

  // Remove content in parentheses (SKU numbers, model suffixes, part numbers)
  // e.g. "(13045)", "(MWW43ZE/A)", "(NP.ACC11.02A)", "(90IG06P0-MO3510)"
  s = s.replace(/\([^)]*\)/g, ' ');

  // Now normalize delimiters
  s = s.replace(/[|/\\,;:()[\]{}]/g, ' ');

  // Remove Apple-style part numbers: tokens ending in region codes (ZM, ZE, AM, MZ)
  // e.g. MWW43ZE, MX2D3AM, MQKJ3MZ, MGPG4ZE, MD818ZM, MW2G3ZM
  // Also Apple A-model numbers: A2795, A3610, etc.
  const isApple = /\b(?:apple|iphone|ipad|macbook|airpods|airtag|pencil|magic|magsafe)\b/i.test(s);
  if (isApple) {
    s = s.replace(/\b[a-z0-9]{4,8}(?:zm|ze|am|mz|qa|ru|hx|hb|tx|ll|hn|rk|vc|zd|af|zp)\b/gi, ' ');
    s = s.replace(/\ba\d{4}\b/gi, ' ');
  }
  // Acer/Asus NX.XXXXX.NNN, NH.XXXXX.NNN style part numbers
  s = s.replace(/\b(?:nx|nh|gp|np)\.[a-z0-9]+\.[a-z0-9]+\b/gi, ' ');
  // Asus-style 90XXXXXX-XXXXXX codes
  s = s.replace(/\b90[a-z0-9]{4,}-[a-z0-9]+\b/gi, ' ');

  // 3. Extract Samsung model base from SM codes BEFORE removing them
  // SM-R410NZKACIS → "r410", SM-S938BZKDCAU → "s938b"
  // This keeps different product models distinguishable (Buds Core R410 vs Buds 3 R530)
  let samsungModelBase = '';
  const smCodeMatch = s.match(/\bsm-([a-z]\d{3,4}[a-z]?)/i);
  if (smCodeMatch) {
    samsungModelBase = smCodeMatch[1].toLowerCase();
  }

  // Remove device model numbers (Samsung SM-xxx, Realme RMX, etc.)
  s = s.replace(SAMSUNG_FULL_MODEL_RE, ' ');
  SAMSUNG_FULL_MODEL_RE.lastIndex = 0;
  s = s.replace(REALME_MODEL_RE, ' ');
  REALME_MODEL_RE.lastIndex = 0;
  // Only strip Samsung bare codes (S948B, A365F) for Samsung products
  const isSamsung = /\bsamsung\b/i.test(s) || /\bgalaxy\b/i.test(s);
  if (isSamsung) {
    s = s.replace(SAMSUNG_BARE_CODE_RE, ' ');
    SAMSUNG_BARE_CODE_RE.lastIndex = 0;
  }

  // 4. Remove e-SIM and Wi-Fi patterns before word splitting
  s = s.replace(/e-?sim\s*(only)?/gi, ' ');
  s = s.replace(/wi-?fi/gi, 'wifi');
  // Remove CPU speed specs like "2.8GHz", "3.2 GHz"
  s = s.replace(/\d+\.?\d*\s*(?:ghz|mhz)\b/gi, ' ');
  // Remove CPU model codes: i3-1315U, i5-13420H, i7-12650H, r7-5825U, Core 5-210H, etc.
  s = s.replace(/\b[ir]\d[-]\d{3,5}[a-z]{0,3}\b/gi, ' ');
  // Remove standalone CPU numbers like "7-5825U" (from "Ryzen 7-5825U" after Ryzen is stripped)
  s = s.replace(/\b\d[-]\d{4,5}[a-z]{0,2}\b/gi, ' ');
  // Remove Intel N-series: N305, N355, N100, etc.
  s = s.replace(/\bn\d{3}\b/gi, ' ');
  // Remove GPU codes: RTX 3050, RTX 4050, RTX 5070, GTX 1650, etc.
  s = s.replace(/\b(?:rtx|gtx)\s*\d{4}\b/gi, ' ');

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

  // 8b. Identify product type BEFORE noise filtering strips it.
  // This prevents different product categories from colliding on the same key.
  let productType = '';
  for (const w of words) {
    if (PRODUCT_TYPES[w]) {
      productType = PRODUCT_TYPES[w];
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

    // Skip standalone 0 and 1 (usually leftover noise, not product series)
    if (/^\d+$/.test(w) && parseInt(w) < 2) continue;

    filtered.push(w);
  }

  // 10. Combine: brand + product type + model words + ram + storage + pack size
  // Note: samsungModelBase NOT appended — SM codes appear inconsistently across stores
  // (Megatechnica includes SM-S948BZKBCAU, Zoomer has bare S948 which gets stripped)
  const parts: string[] = [];
  if (brand) parts.push(brand);
  if (productType) parts.push(productType);
  parts.push(...filtered);
  // Include RAM for non-Apple products to distinguish RAM variants (e.g. 8GB vs 12GB Honor X9d).
  // Apple products skip RAM because stores inconsistently include it (Alta: "8GB/256GB", others: "256GB")
  // and Apple doesn't have RAM variants per storage tier.
  if (ram && brand !== 'apple') parts.push(ram);
  if (storage) parts.push(storage);
  if (packSize > 1) parts.push(`${packSize}pack`);

  const key = parts.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return key.length > 3 ? key : null;
}
