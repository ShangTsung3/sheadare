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
  'საინჰალაციო': 'inhal', 'აეროზოლი': 'aerosol',
  'სუპოზიტორია': 'supp', 'სანთელი': 'supp', 'სანთლები': 'supp',
  'ფხვნილი': 'powder', 'გრანულა': 'granule', 'გრანულები': 'granule',
  'გელი': 'gel', 'ხსნარი': 'sol', 'საინექციო': 'inj', 'ფლაკონი': 'vial', 'ფლ': 'vial',
  // English
  'tablet': 'tab', 'tablets': 'tab', 'tab': 'tab', 'tabs': 'tab',
  'capsule': 'caps', 'capsules': 'caps', 'caps': 'caps',
  'syrup': 'syrup', 'sirup': 'syrup', 'syr': 'syrup',
  'ampule': 'amp', 'ampoule': 'amp', 'amp': 'amp',
  'ointment': 'oint', 'cream': 'cream',
  'drops': 'drops', 'drop': 'drops',
  'suspension': 'susp', 'susp': 'susp',
  'suppository': 'supp', 'suppositories': 'supp', 'supp': 'supp',
  'powder': 'powder', 'granule': 'granule', 'granules': 'granule',
  'gel': 'gel', 'solution': 'sol', 'injection': 'inj',
  'inhaler': 'inhal',
};

/** Normalize dose to base unit in mg */
function normalizeDose(dose: string): string | null {
  if (!dose) return null;
  const s = dose.toLowerCase().replace(/\s+/g, '');

  // Percentage doses (1%, 5%, 0.1%) — keep as-is, don't convert
  const pctMatch = s.match(/^([\d.]+)\s*%$/);
  if (pctMatch) return `${pctMatch[1]}pct`;

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
  return FORM_ALIASES[lower] || lower.replace(/[^a-z]/g, '') || null;
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

    const geoPart = name.substring(0, dashIdx).trim();
    const latinPart = name.substring(dashIdx + 3).trim();

    // Extract first Georgian word (brand)
    const geoMatch = geoPart.match(/^([ა-ჰ][ა-ჰ\-]*)/);
    if (!geoMatch) continue;
    const geoWord = geoMatch[1];

    // Extract first Latin word (brand), normalizing Cyrillic lookalikes
    const latinMatch = normalizeCyrillic(latinPart).match(/^([A-Za-z][A-Za-z]*)/);
    if (!latinMatch) continue;
    const latinBrand = latinMatch[1].toLowerCase();
    if (latinBrand.length < 2) continue;

    // Store mapping (first occurrence wins — PSP data is consistent)
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
    // PSP: "ტორადოლი - Toradol 10მგ 20 ტაბლეტი"
    const dashIdx = name.indexOf(' - ');
    if (dashIdx === -1) {
      const m = name.match(/^([A-Za-z][A-Za-z]*)/);
      return m ? m[1].toLowerCase() : null;
    }
    // Normalize Cyrillic lookalikes (e.g. "Сitramon" → "Citramon")
    const latinPart = normalizeCyrillic(name.substring(dashIdx + 3).trim());
    const m = latinPart.match(/^([A-Za-z][A-Za-z]*)/);
    return m ? m[1].toLowerCase() : null;
  }

  if (source === 'gpc') {
    // GPC: "პანადოლი ტაბლეტი 500მგ #24"
    if (!brandDict) return null;
    const geoMatch = name.match(/^([ა-ჰ][ა-ჰ\-]*)/);
    if (!geoMatch) return null;
    const geoWord = geoMatch[1];
    return brandDict[geoWord] || null;
  }

  if (source === 'aversi') {
    // Aversi: "Toradol 10mg #20t"
    const m = name.match(/^([A-Za-z][A-Za-z]*)/);
    return m ? m[1].toLowerCase() : null;
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

  if (dose) {
    // Standard path: brand + dose + optional form/qty
    const parts = [brand, dose];
    if (form) parts.push(form);
    if (qty) parts.push(qty);
    return parts.join('-');
  }

  // Dose-less path: require both form AND quantity for safety
  if (form && qty) {
    return [brand, form, qty].join('-');
  }

  return null;
}

/**
 * Try to parse pharmacy info from product name (for stores without structured data like Aversi).
 * Returns partial info — may not have all fields.
 */
export function parsePharmacyFromName(name: string): Partial<PharmacyProductInfo> {
  const result: Partial<PharmacyProductInfo> = { name };

  // Try to extract dose: percentage first, then number + unit
  const pctMatch = name.match(/([\d.]+)\s*%/);
  if (pctMatch) {
    result.dose = pctMatch[0].trim();
  } else {
    const doseMatch = name.match(/([\d.]+)\s*(mg|მგ|mcg|მკგ|ml|მლ|iu)/i);
    if (doseMatch) {
      result.dose = doseMatch[0].trim();
    } else {
      // Try g/გ but only for small values (real doses, not tube weights)
      const gMatch = name.match(/([\d.]+)\s*(g|გ)(?:\s|$|[^a-zა-ჰ])/i);
      if (gMatch && parseFloat(gMatch[1]) < 10) {
        result.dose = gMatch[1] + gMatch[2];
      }
    }
  }

  // Try to extract quantity: #20, N20, №20, x20, 20ц, 20t
  // Also extract form suffix: #24t → qty=24, form=tab; #5a → qty=5, form=amp
  const qtyMatch = name.match(/[#Nn№x×]\s*(\d+)([a-z]{1,4})?/) || name.match(/(\d+)\s*ც(?:\s|$)/);
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
    if (nameLower.includes(alias)) {
      result.form = normalized;
      break;
    }
  }

  return result;
}
