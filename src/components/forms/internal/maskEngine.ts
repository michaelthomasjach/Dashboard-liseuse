/**
 * Minimal digit-mask engine: `#` in the pattern is a digit slot, any other
 * character is a literal that's inserted automatically. Unfilled slots are
 * rendered as `maskChar` so the full pattern is always visible
 * (e.g. mask "## ## ## ## ##" + maskChar "_" → "06 __ __ __ __").
 */

export function countSlots(mask: string): number {
  let n = 0;
  for (const c of mask) if (c === "#") n++;
  return n;
}

export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function applyMask(digits: string, mask: string, maskChar: string): string {
  let out = "";
  let di = 0;
  for (const m of mask) {
    if (m === "#") {
      out += di < digits.length ? digits[di++] : maskChar;
    } else {
      out += m;
    }
  }
  return out;
}

/** Caret index right after the `count`-th digit slot (or the first slot if count is 0). */
export function caretIndexForDigitCount(mask: string, count: number): number {
  if (count <= 0) {
    const first = mask.indexOf("#");
    return first === -1 ? 0 : first;
  }
  let seen = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === "#") {
      seen++;
      if (seen === count) return i + 1;
    }
  }
  return mask.length;
}
