/**
 * Construction product matching: extracts brand + model code to create canonical keys.
 * E.g. "ელ.სახრახნისი INGCO CDLI12202 (12 V)" → "INGCO|CDLI12202"
 */

const CONSTRUCTION_BRANDS = [
  'BOSCH', 'MAKITA', 'DEWALT', 'MILWAUKEE', 'TOTAL', 'INGCO', 'YATO', 'RONIX',
  'TOLSEN', 'STANLEY', 'KNIPEX', 'HIKOKI', 'METABO', 'EINHELL', 'FISKARS',
  'STIHL', 'HUSQVARNA', 'KARCHER', 'WOKIN', 'EMTOP', 'WADFOW', 'CROWN',
  'HARDY', 'CERESIT', 'KNAUF', 'BETEK', 'WEBER', 'MOMENT', 'TYTAN', 'PENOSIL',
  'MAKUTE', 'HUTER', 'JADEVER', 'BEOROL', 'TOPEX', 'VERTO', 'NEO', 'PROLINE',
  'AKFIX', 'PATTEX', 'QUILOSA', 'SOUDAL', 'HILTI', 'FESTOOL', 'DREMEL',
  'STERN', 'RAIDER', 'VIKO', 'LINUS', 'DURACELL', 'ENERGIZER', 'WERKER',
  'DEFORT', 'WERA', 'BAHCO', 'HANSA', 'ELCON', 'HENKEL', 'BELO', 'VESBO',
  'RAWLPLUG', 'FISCHER', 'MONSTER', 'BALTIKA', 'EDON', 'KINGTUL',
  'JIFA', 'MADIKA', 'TMK', 'GROHE', 'ROCA', 'HANSGROHE', 'GEBERIT',
  // Added from frequency analysis
  'FIXTEC', 'BERENT', 'HOGERT', 'UYUSTOOLS', 'RTRMAX', 'RODEX',
  'DINGQI', 'KETTLER', 'DNIPRO', 'KLAUS', 'GAUSS', 'FIRAT',
  'FORSAGE', 'TOPTUL', 'LEDEX', 'KUMTEL', 'HOTECHE', 'HAKAN', 'BURSEV',
  'KOSTER', 'LUMOX', 'REPAMOR',
];

// Patterns that are measurements, not model codes
const MEASUREMENT_RE = /^(\d+MM|\d+CM|\d+SM|\d+M|\d+W|\d+VT|\d+V|\d+KG|\d+GR|\d+L|\d+LT|\d+ML|\d+RPM|\d+HZ|\d+X\d+|\d+PCS|\d+BAR|\d+NM|\d+AMP)$/i;

// Words to strip before tokenizing (not model codes)
const NOISE_WORDS = ['PROFESSIONAL', 'INDUSTRIAL', 'PLUS', 'PRO', 'SDS', 'MAX', 'HEX'];

// Regional suffixes on DEWALT/BOSCH model codes: DWE349-QS, DT3713-XJ
const REGIONAL_SUFFIX_RE = /[-](QS|XJ|KR|GB|JP|EU|B5|B4|MY)$/i;

function extractBrand(name: string): string | null {
  const upper = name.toUpperCase();
  for (const b of CONSTRUCTION_BRANDS) {
    const idx = upper.indexOf(b);
    if (idx >= 0) {
      const before = idx > 0 ? upper[idx - 1] : ' ';
      const after = idx + b.length < upper.length ? upper[idx + b.length] : ' ';
      if (!/[A-Z0-9]/.test(before) && !/[A-Z0-9]/.test(after)) {
        return b;
      }
    }
  }
  return null;
}

/**
 * Extract model-code tokens from product name.
 * Model codes: alphanumeric strings with both letters and digits.
 * E.g. "CDLI12202", "SPG3508", "CT10113", "CE40", "HBNP08168"
 */
function extractModelCodes(name: string, brand: string | null): string[] {
  // Remove Georgian characters to isolate Latin+digit tokens
  let latin = name.replace(/[ა-ჰ]/g, ' ');

  // Remove brand name to prevent "INGCO 800W" → "INGCO800W"
  if (brand) {
    latin = latin.replace(new RegExp(brand, 'gi'), ' ');
  }

  // Remove noise words to prevent "SDS PLUS 14X160" → "PLUS14X160"
  for (const word of NOISE_WORDS) {
    latin = latin.replace(new RegExp(`\\b${word}\\b`, 'gi'), ' ');
  }

  // Pre-process: join letter-prefix + digit sequences separated by spaces
  // "GSR 185-LI" → "GSR185-LI", "GSB 180-LI" → "GSB180-LI"
  latin = latin.replace(/([A-Za-z]{2,4})\s+(\d)/g, '$1$2');

  // Find tokens with letters followed by digits (or vice versa)
  const pattern1 = latin.match(/[A-Za-z]+[-]?\d+[-]?[A-Za-z0-9]*/g) || [];
  const pattern2 = latin.match(/\d+[-]?[A-Za-z]+[-]?\d*/g) || [];

  const all = [...pattern1, ...pattern2]
    .map(t => {
      let tok = t.replace(/[-\s]/g, '').toUpperCase();
      // Strip regional suffixes: "DWE349QS" → "DWE349", "DT3713XJ" → "DT3713"
      tok = tok.replace(/(QS|XJ|KR|GB|JP|EU|B5|B4|MY)$/, '');
      return tok;
    })
    .filter(t => {
      if (t.length < 4 || t.length > 25) return false;
      // Must have both letters AND digits
      if (!/[A-Z]/.test(t) || !/\d/.test(t)) return false;
      // Exclude measurement patterns
      if (MEASUREMENT_RE.test(t)) return false;
      return true;
    });

  return [...new Set(all)];
}

/**
 * Extract canonical key for a construction product.
 * Returns "BRAND|MODEL_CODE" or null if not extractable.
 */
export function extractConstructionCanonicalKey(name: string): string | null {
  const brand = extractBrand(name);
  if (!brand) return null;

  const models = extractModelCodes(name, brand);
  if (models.length === 0) return null;

  // Prefer model codes starting with letters (GSR185LI) over order numbers (0601072Z0),
  // then prefer longest
  const bestModel = models.sort((a, b) => {
    const aLetter = /^[A-Z]/.test(a) ? 1 : 0;
    const bLetter = /^[A-Z]/.test(b) ? 1 : 0;
    if (aLetter !== bLetter) return bLetter - aLetter;
    return b.length - a.length;
  })[0];

  return `${brand}|${bestModel}`;
}
