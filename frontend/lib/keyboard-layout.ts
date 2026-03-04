/**
 * Keyboard layout mapping: Ukrainian (ЙЦУКЕН) ↔ English (QWERTY).
 * When a user types with the wrong layout active, this converts the input
 * so search still finds the intended results.
 */

const EN_CHARS = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>~";
const UA_CHARS = "йцукенгшщзхїфівапролджєячсмитьбю'ЙЦУКЕНГШЩЗХЇФІВАПРОЛДЖЄЯЧСМИТЬБЮ₴";

const enToUa = new Map<string, string>();
const uaToEn = new Map<string, string>();

for (let i = 0; i < EN_CHARS.length; i++) {
  enToUa.set(EN_CHARS[i], UA_CHARS[i]);
  uaToEn.set(UA_CHARS[i], EN_CHARS[i]);
}

function convertLayout(text: string, map: Map<string, string>): string {
  let result = '';
  for (const ch of text) {
    result += map.get(ch) ?? ch;
  }
  return result;
}

/** Convert text typed in EN layout → what it would be in UA layout */
export function enToUaLayout(text: string): string {
  return convertLayout(text, enToUa);
}

/** Convert text typed in UA layout → what it would be in EN layout */
export function uaToEnLayout(text: string): string {
  return convertLayout(text, uaToEn);
}

/**
 * Check if `haystack` includes `needle`, considering the user may have
 * typed with the wrong keyboard layout. Checks the original input
 * plus both layout conversions.
 */
export function matchesWithLayout(haystack: string, needle: string): boolean {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();

  if (h.includes(n)) return true;

  const nEn = uaToEnLayout(n).toLowerCase();
  if (nEn !== n && h.includes(nEn)) return true;

  const nUa = enToUaLayout(n).toLowerCase();
  if (nUa !== n && h.includes(nUa)) return true;

  return false;
}
