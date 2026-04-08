// Canonical key extraction for matching pharmacy products across stores
// Key format: brandName-dose-form-quantity
//
// Uses brand/trade name instead of active ingredient to avoid misleading
// merges between different brands of the same molecule.
// e.g. Toradol (50₾) won't merge with generic ketorolac (1.85₾)

// Dosage form normalization
const FORM_ALIASES: Record<string, string> = {
  // Georgian
  'ტაბლეტი': 'tab', 'ტაბლეტები': 'tab', 'ტაბ': 'tab', 'აბი': 'tab',
  'კაფსულა': 'caps', 'კაფსულები': 'caps', 'კაფს': 'caps',
  'სიროფი': 'syrup', 'სიროფ': 'syrup',
  'ამპულა': 'amp', 'ამპულები': 'amp', 'ამპ': 'amp',
  'მალამო': 'oint', 'კრემი': 'cream',
  'წვეთები': 'drops', 'წვეთ': 'drops',
  'სუსპენზია': 'susp', 'სუსპ': 'susp',
  'სპრეი': 'spray',
  'საინჰალაციო': 'inhal', 'აეროზოლი': 'spray',
  'სუპოზიტორია': 'supp', 'სანთელი': 'supp', 'სანთლები': 'supp',
  'ფხვნილი': 'powder', 'გრანულა': 'granule', 'გრანულები': 'granule',
  'გელი': 'gel', 'ემულგელი': 'gel', 'ჟელე': 'gel',
  'ხსნარი': 'sol', 'საინექციო': 'inj', 'ფლაკონი': 'vial', 'ფლ': 'vial',
  'სავლები': 'rinse', 'დროფსი': 'drops',
  'სპირტი': 'sol', 'სპირტხსნარი': 'sol',
  'პაკეტი': 'granule', 'პაკეტ': 'granule',
  // English
  'tablet': 'tab', 'tablets': 'tab', 'tab': 'tab', 'tabs': 'tab',
  'capsule': 'caps', 'capsules': 'caps', 'caps': 'caps',
  'syrup': 'syrup', 'sirup': 'syrup', 'syr': 'syrup',
  'ampule': 'amp', 'ampoule': 'amp', 'amp': 'amp',
  'ointment': 'oint', 'cream': 'cream',
  'drops': 'drops', 'drop': 'drops',
  'suspension': 'susp', 'susp': 'susp',
  'suppository': 'supp', 'suppositories': 'supp', 'supp': 'supp',
  'powder': 'powder', 'granule': 'granule', 'granules': 'granule', 'gran': 'granule', 'pack': 'granule',
  'gel': 'gel', 'emulgel': 'gel', 'jelly': 'gel',
  'solution': 'sol', 'injection': 'inj',
  'inhaler': 'inhal',
  'spray': 'spray', 'aerosol': 'spray',
  'rinse': 'rinse', 'mouthwash': 'rinse',
  'spiritus': 'sol', 'spirituosa': 'sol',
};

/** Normalize dose to base unit in mg */
function normalizeDose(dose: string): string | null {
  if (!dose) return null;
  const s = dose.toLowerCase().replace(/\s+/g, '');

  // Handle combination doses: "5mg/5mg", "10მგ+10მგ", "5/5mg" (unit on one or both sides)
  const comboMatch = s.match(/^([\d.]+)\s*(mg|მგ)?\s*[\/+]\s*([\d.]+)\s*(mg|მგ)/i);
  if (comboMatch) {
    return `${comboMatch[1]}mg+${comboMatch[3]}mg`;
  }

  // Skip concentration notations where denominator is a volume: "667mg/ml", "667g/l"
  // But NOT combination doses like "5mg/5mg" (same unit → handled above)
  if (/\d+(mg|მგ|g|გ)\s*\/(ml|მლ|l|ლ|\d)/i.test(s)) return null;

  // Percentage doses (1%, 5%, 0.1%) — keep as-is, don't convert
  const pctMatch = s.match(/^([\d.]+)\s*%$/);
  if (pctMatch) return `${pctMatch[1]}pct`;

  // PSP provides percentages as decimals without unit (10% → "0.1", 5% → "0.05")
  // Detect bare decimals 0 < x < 1 and convert to percentage format
  const bareDecimal = s.match(/^(0\.[\d]+)$/);
  if (bareDecimal) {
    const pctValue = parseFloat(bareDecimal[1]) * 100;
    // Only convert clean percentages (1%, 2%, 5%, 10%, etc.), not arbitrary decimals
    if (pctValue >= 0.1 && pctValue <= 100 && Number.isFinite(pctValue)) {
      // Remove trailing zeros: 5.000 → 5, 0.5 → 0.5
      return `${parseFloat(pctValue.toFixed(4))}pct`;
    }
  }

  // Match number + unit patterns
  const match = s.match(/^([\d.]+)\s*(მგ|mg|გ|g|მკგ|mcg|ug|μg|მლ|ml|iul|iu|მე)$/);
  if (!match) {
    // Try just number+mg patterns without strict end
    const loose = s.match(/([\d.]+)\s*(მგ|mg|გ|g|მკგ|mcg|ug|μg)/);
    if (!loose) return s.replace(/[^a-z0-9.]/g, '') || null;
    return normalizeDoseValue(parseFloat(loose[1]), loose[2]);
  }

  // Safety: if unit is g/გ and value >= 10, it's likely tube weight (50g gel), not dose
  const value = parseFloat(match[1]);
  const unit = match[2];
  if ((unit === 'გ' || unit === 'g') && value >= 10) {
    return null; // Reject — likely tube/package weight, not drug dose
  }

  return normalizeDoseValue(value, unit);
}

function normalizeDoseValue(value: number, unit: string): string {
  switch (unit) {
    case 'გ': case 'g':
      return `${value * 1000}mg`;
    case 'მგ': case 'mg':
      return `${value}mg`;
    case 'მკგ': case 'mcg': case 'ug': case 'μg':
      return `${value}mcg`;
    case 'მლ': case 'ml':
      return `${value}ml`;
    case 'iu': case 'iul': case 'მე':
      return `${value}iu`;
    default:
      return `${value}${unit}`;
  }
}

/** Normalize dosage form */
function normalizeForm(form: string): string | null {
  if (!form) return null;
  const lower = form.toLowerCase().trim();
  // Direct match
  if (FORM_ALIASES[lower]) return FORM_ALIASES[lower];
  // Try partial match: check if input starts with any alias
  // Handles PSP's Georgian abbreviations like "ტაბლ" → matches "ტაბ" → tab
  for (const [alias, normalized] of Object.entries(FORM_ALIASES)) {
    if (lower.startsWith(alias) || alias.startsWith(lower)) {
      return normalized;
    }
  }
  // Latin-only fallback for English form names
  const latin = lower.replace(/[^a-z]/g, '');
  return FORM_ALIASES[latin] || latin || null;
}

/** Normalize quantity: #20, N20, x20, 20ц, №20 → 20 */
function normalizeQuantity(qty: string): string | null {
  if (!qty) return null;
  const match = qty.match(/(\d+)/);
  return match ? match[1] : null;
}

// ─── Cyrillic → Latin normalization ──────────────────────────────────────
// Some PSP names have Cyrillic lookalike characters mixed with Latin (e.g. "Сitramon")
const CYRILLIC_TO_LATIN: Record<string, string> = {
  'А': 'A', 'а': 'a', 'В': 'B', 'в': 'v', 'С': 'C', 'с': 'c',
  'Е': 'E', 'е': 'e', 'К': 'K', 'к': 'k', 'М': 'M', 'м': 'm',
  'Н': 'H', 'н': 'n', 'О': 'O', 'о': 'o', 'Р': 'P', 'р': 'p',
  'Т': 'T', 'т': 't', 'У': 'Y', 'у': 'y', 'Х': 'X', 'х': 'x',
};

function normalizeCyrillic(s: string): string {
  return s.replace(/[А-яЁё]/g, ch => CYRILLIC_TO_LATIN[ch] || '');
}

// ─── Brand modifier detection (Plus, Forte, Extra) ────────────────────
// "Zetor Plus" ≠ "Zetor" — modifier is part of the brand identity

const GEO_MODIFIERS: [string, string][] = [
  ['პლუსი', 'plus'], ['პლუს', 'plus'],
  ['ფორტე', 'forte'],
  ['ექსტრა', 'extra'],
  ['რეტარდი', 'retard'], ['რეტარდ', 'retard'],
  ['მაქსი', 'max'], ['მაქს', 'max'],
  ['ადვანსი', 'advance'], ['ადვანს', 'advance'],
  ['დუო', 'duo'],
];

/** Check if Latin text starts with a brand modifier */
function checkLatinModifier(textAfterBrand: string): string | null {
  // Order matters: check longer patterns first (hct before h, retard before r, advance before a)
  const m = textAfterBrand.trim().match(/^(plus|forte|extra|retard|advance|hct|hd|h|xr|sr|cr|mr|xl|er|dr|max|duo)\b/i);
  return m ? m[1].toLowerCase() : null;
}

/** Check if Georgian text starts with a brand modifier (პლუსი, ფორტე, ექსტრა) */
function checkGeoModifier(textAfterBrand: string): string | null {
  const trimmed = textAfterBrand.trim();
  for (const [geo, latin] of GEO_MODIFIERS) {
    if (trimmed.startsWith(geo)) {
      // Ensure complete word — not a prefix of a longer word (e.g. ექსტრაქტი ≠ ექსტრა)
      const after = trimmed[geo.length];
      if (!after || after === ' ' || !/[ა-ჰ]/.test(after)) {
        return latin;
      }
    }
  }
  return null;
}

// ─── Non-brand word filtering ─────────────────────────────────────────
// Generic pharmaceutical Latin terms that appear as first word but aren't brand names.
// e.g. "Sol iodi spirit" → brand = "iodi", not "sol"
const NON_BRAND_WORDS = new Set([
  'sol', 'solut', 'solution', 'tab', 'caps', 'amp', 'supp', 'inj',
  'ung', 'sir', 'susp', 'dr', 'tinct', 'extr', 'inf', 'dec',
  'pulv', 'gran', 'past', 'pil', 'lin', 'lot', 'emuls',
  'spirit', 'spiritus', 'spirituosa', 'tinctura', 'extractum', 'unguentum',
]);

/** Extract first real brand word from Latin text, skipping generic pharmaceutical terms */
function extractFirstBrandWord(text: string): { brand: string; mod: string | null } | null {
  const words = text.match(/[A-Za-z]+/g);
  if (!words) return null;
  for (const word of words) {
    const w = word.toLowerCase();
    if (NON_BRAND_WORDS.has(w)) continue;
    if (w.length < 2) continue;
    const wordEnd = text.indexOf(word) + word.length;
    const mod = checkLatinModifier(text.substring(wordEnd));
    return { brand: w, mod };
  }
  return null;
}

// ─── Brand name extraction ─────────────────────────────────────────────

/**
 * Build Georgian → Latin brand dictionary from PSP product names.
 * PSP format: "ქართული_სახელი - Latin_Name dose qty form"
 * Called once when processing pharmacy products, result is cached.
 */
export function buildBrandDict(pspNames: string[]): Record<string, string> {
  const dict: Record<string, string> = {};
  for (const name of pspNames) {
    const dashIdx = name.indexOf(' - ');
    if (dashIdx === -1) continue;

    const left = name.substring(0, dashIdx).trim();
    const right = name.substring(dashIdx + 3).trim();

    // PSP uses both formats: "ქართული - Latin" and "Latin - ქართული"
    // Detect which side is Georgian and which is Latin
    let geoWord: string | null = null;
    let latinBrand: string | null = null;

    const leftGeo = left.match(/^([ა-ჰ][ა-ჰ\-]*)/);
    const rightGeo = right.match(/^([ა-ჰ][ა-ჰ\-]*)/);

    if (leftGeo) {
      // Standard: "ქართული - Latin" — extract first real brand word from right side
      geoWord = leftGeo[1];
      const r = extractFirstBrandWord(normalizeCyrillic(right));
      latinBrand = r?.brand || null;
    } else if (rightGeo) {
      // Reversed: "Latin - ქართული" — extract first real brand word from left side
      geoWord = rightGeo[1];
      const r = extractFirstBrandWord(normalizeCyrillic(left));
      latinBrand = r?.brand || null;
    }

    if (!geoWord || !latinBrand || latinBrand.length < 2) continue;

    if (!dict[geoWord]) {
      dict[geoWord] = latinBrand;
    }
  }
  return dict;
}

/**
 * Extract Latin brand key from a product name, using the source to determine format.
 * - PSP: "ქართული - Latin dose" → extract Latin word after " - "
 * - GPC: "ქართული ფორმა dose #qty" → extract Georgian word, look up in brandDict
 * - Aversi: "Latin dose #qty form" → extract first Latin word
 */
export function extractBrandKey(
  name: string,
  source: string,
  brandDict?: Record<string, string>,
): string | null {
  if (source === 'psp') {
    // PSP uses both: "ქართული - Latin dose" and "Latin - ქართული dose"
    const dashIdx = name.indexOf(' - ');
    if (dashIdx === -1) {
      // Latin-first name without dash
      const r = extractFirstBrandWord(normalizeCyrillic(name));
      if (r) return r.brand + (r.mod || '');
      // Fallback: Georgian-only name → look up in brandDict (same as GPC)
      // e.g. "ვიაგრა 100მგ 4ტაბლეტი" → brandDict["ვიაგრა"] → "viagra"
      if (brandDict) {
        const geoMatch = name.match(/^([ა-ჰ][ა-ჰ\-]*)/);
        if (geoMatch) {
          const brand = brandDict[geoMatch[1]];
          if (brand) {
            const textAfter = name.substring(geoMatch[0].length);
            const mod = checkGeoModifier(textAfter) || checkLatinModifier(textAfter);
            return brand + (mod || '');
          }
        }
      }
      return null;
    }
    const left = normalizeCyrillic(name.substring(0, dashIdx).trim());
    const right = normalizeCyrillic(name.substring(dashIdx + 3).trim());
    // Try right side first (standard: "ქართული - Latin"), then left (reversed)
    const result = extractFirstBrandWord(right) || extractFirstBrandWord(left);
    if (result) return result.brand + (result.mod || '');
    return null;
  }

  if (source === 'gpc') {
    // GPC: "პანადოლი ტაბლეტი 500მგ #24"
    if (!brandDict) return null;
    const geoMatch = name.match(/^([ა-ჰ][ა-ჰ\-]*)/);
    if (!geoMatch) return null;
    const geoWord = geoMatch[1];
    const brand = brandDict[geoWord];
    if (!brand) return null;
    // Check for Georgian modifier, then Latin modifier (e.g. "გლუკოფაჟი XR ტაბლეტი")
    const textAfter = name.substring(geoMatch[0].length);
    const mod = checkGeoModifier(textAfter) || checkLatinModifier(textAfter);
    return brand + (mod || '');
  }

  if (source === 'aversi') {
    // Aversi: "Toradol 10mg #20t"
    const r = extractFirstBrandWord(name);
    return r ? r.brand + (r.mod || '') : null;
  }

  return null;
}

// ─── Canonical key extraction ──────────────────────────────────────────

export interface PharmacyProductInfo {
  name: string;
  brandKey?: string;  // Pre-extracted Latin brand key
  activeIngredient?: string;  // Kept for data storage, not used in key
  dose?: string;
  form?: string;
  quantity?: string;
  volume?: string;  // Package volume for liquids/gels/creams (e.g. "30ml", "50g")
}

/**
 * Extract canonical key for pharmacy products.
 * Key = brandKey-dose-form-quantity
 * Safety rules:
 *   - Brand is always required
 *   - If dose exists: brand-dose[-form][-qty]
 *   - If dose missing: brand-form-qty (both form AND qty required for dose-less keys)
 *     This handles fixed-combination drugs like Citramon that have no dose in the name.
 */
export function extractPharmacyCanonicalKey(info: PharmacyProductInfo): string | null {
  const brand = info.brandKey;
  if (!brand || brand.length < 2) return null;

  const dose = normalizeDose(info.dose || '');
  const form = normalizeForm(info.form || '');
  const qty = normalizeQuantity(info.quantity || '');

  // Skip qty=1 for liquid/topical forms — GPC adds "#1" (1 bottle) but other stores don't,
  // causing key mismatches like spiritus-10pct-sol-1 vs spiritus-10pct-sol
  const LIQUID_FORMS = new Set(['sol', 'drops', 'syrup', 'spray', 'rinse', 'gel', 'cream', 'oint', 'vial', 'susp', 'inhal']);
  const effectiveQty = (qty === '1' && form && LIQUID_FORMS.has(form)) ? null : qty;

  // Extract volume for liquid/topical forms (differentiates 30ml vs 1000ml bottles)
  const volume = info.volume ? info.volume.toLowerCase().replace(/\s+/g, '') : null;

  if (dose) {
    // Standard path: brand + dose + optional form/qty/volume
    const parts = [brand, dose];
    if (form) parts.push(form);
    // For liquid/topical forms, use volume instead of bottle count
    if (form && LIQUID_FORMS.has(form) && volume) {
      parts.push(volume);
    } else if (effectiveQty) {
      parts.push(effectiveQty);
    }
    return parts.join('-');
  }

  // Dose-less path: require both form AND quantity for safety
  if (form && effectiveQty) {
    return [brand, form, effectiveQty].join('-');
  }

  return null;
}

/**
 * Try to parse pharmacy info from product name (for stores without structured data like Aversi).
 * Returns partial info — may not have all fields.
 */
export function parsePharmacyFromName(name: string): Partial<PharmacyProductInfo> {
  const result: Partial<PharmacyProductInfo> = { name };

  // Try to extract dose: combination doses first, then dose/weight, then percentage, then single dose
  // Combination doses: "5mg/5mg", "10მგ+10მგ", "5/5mg" (unit on one or both sides)
  const comboMatch = name.match(/([\d.]+)\s*(mg|მგ)?\s*[\/+]\s*([\d.]+)\s*(mg|მგ)/i);
  // Dose/weight pattern: "100mg/2g" → extract numerator (100mg) as the real dose
  const dosePerWeight = !comboMatch ? name.match(/([\d.]+)\s*(mg|მგ)\s*\/\s*[\d.]+\s*(g|გ)/i) : null;
  if (comboMatch) {
    result.dose = comboMatch[0].trim();
  } else if (dosePerWeight) {
    result.dose = dosePerWeight[1] + dosePerWeight[2];
  } else {
    const pctMatch = name.match(/([\d.]+)\s*%/);
    if (pctMatch) {
      result.dose = pctMatch[0].trim();
    } else {
      // Skip concentration notations (667mg/ml) with negative lookahead
      const doseMatch = name.match(/([\d.]+)\s*(mg|მგ|mcg|მკგ|ml|მლ|iu)(?!\s*\/)/i);
      if (doseMatch) {
        result.dose = doseMatch[0].trim();
      } else {
        // Try g/გ but only for small values (real doses, not tube weights)
        const gMatch = name.match(/([\d.]+)\s*(g|გ)(?:\s|$|[^a-zა-ჰ\/])/i);
        if (gMatch && parseFloat(gMatch[1]) < 10) {
          result.dose = gMatch[1] + gMatch[2];
        }
      }
    }
  }

  // Try to extract volume for liquid/topical forms (e.g. 50გ, 30ml, 120მლ, 100გრ)
  // This differentiates packages like Voltaren 50g vs 20g, Betadine 30ml vs 1000ml
  // Use matchAll to skip small values (doses) and find the real package volume
  const volRegex = /([\d.]+)\s*(მლ|ml|გრ|gr)(?:\s|$|[^a-zა-ჰ])/gi;
  const volRegex2 = /([\d.]+)\s*(მლ|ml|გ|g)(?:\s|$|[^a-zა-ჰ\/])/gi;
  for (const volMatch of [...name.matchAll(volRegex), ...name.matchAll(volRegex2)]) {
    const volValue = parseFloat(volMatch[1]);
    const volUnit = volMatch[2].toLowerCase();
    if (volValue >= 5) {
      const normalizedUnit = (volUnit === 'მლ' || volUnit === 'ml') ? 'ml'
        : (volUnit === 'გრ' || volUnit === 'gr' || volUnit === 'გ' || volUnit === 'g') ? 'g'
        : volUnit;
      result.volume = `${volValue}${normalizedUnit}`;
      break;
    }
  }

  // Try to extract quantity: #20, N20, №20, x20, 20ц, 20t
  // Also extract form suffix: #24t → qty=24, form=tab; #5a → qty=5, form=amp
  // Note: # and № are unambiguous quantity markers, but N/n/x need a lookbehind
  // to avoid matching inside words (e.g. "Ibuprofe*n* 400mg" → n isn't a qty prefix)
  const qtyMatch = name.match(/[#№]\s*(\d+)([a-z]{1,4})?/)
    || name.match(/(?<![a-zA-Zა-ჰ])[Nnx×]\s*(\d+)([a-z]{1,4})?/)
    || name.match(/(\d+)\s*ც(?:\s|$)/)
    // Georgian: bare number directly before a form word: "4ტაბლეტი", "10კაფსულა", "30სანთელი"
    || name.match(/(?<![a-zA-Z\d])(\d+)\s*(?=ტაბ|კაფს|ამპულ|სუპოზ|სანთ|ფლაკ|პაკეტ|გრანულ)/);
  if (qtyMatch) {
    result.quantity = qtyMatch[1];
    // Aversi-style form suffix: t=tab, a=amp, fl=vial
    const suffix = qtyMatch[2]?.toLowerCase();
    if (suffix && !result.form) {
      const suffixForms: Record<string, string> = {
        't': 'tab', 'tab': 'tab', 'a': 'amp', 'amp': 'amp',
        'fl': 'vial', 'caps': 'caps', 'supp': 'supp',
      };
      if (suffixForms[suffix]) result.form = suffixForms[suffix];
    }
  }

  // Try to extract form from name
  const nameLower = name.toLowerCase();
  for (const [alias, normalized] of Object.entries(FORM_ALIASES)) {
    if (/^[a-z]+$/.test(alias)) {
      // English aliases: use word boundary to avoid matching inside words
      // e.g. "amp" must not match inside "shampoo" or "camphoratus"
      if (new RegExp(`\\b${alias}\\b`).test(nameLower)) {
        result.form = normalized;
        break;
      }
    } else {
      // Georgian aliases: require left word boundary to prevent matching inside words
      // e.g. "ამპ" must not match inside "შამპუნი" (shampoo)
      const idx = nameLower.indexOf(alias);
      if (idx !== -1) {
        const before = idx > 0 ? nameLower[idx - 1] : ' ';
        if (before === ' ' || !/[ა-ჰ]/.test(before)) {
          result.form = normalized;
          break;
        }
      }
    }
  }

  return result;
}
