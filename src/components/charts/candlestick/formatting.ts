/** Picks whichever of black/white reads better against `hex` (a "#rrggbb" background), by
 *  perceived luminance (ITU-R BT.601 weights) rather than a plain average — the eye is far more
 *  sensitive to green than red/blue, so that's the split that actually predicts legibility. Used
 *  to keep a drawing's text label background editable without ever landing on an unreadable
 *  text/background pairing by accident. */
export function contrastingTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#000000" : "#ffffff";
}

/** MM:SS, rounded up so a fresh 5-minute candle reads "05:00" (not "04:59") the instant it
 *  starts — ceil(ms / 1000) rather than floor. Negative/zero clamps to "00:00" rather than
 *  going negative, since nothing here forces a new candle to actually arrive on schedule. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** A raw price (or "equivalent price", see `overlayProjections`) reinterpreted as a % change from
 *  a reference price — what the whole price axis reads in once `compareMode` is active, instead
 *  of `pFmt`'s plain currency. Signed (a leading "+" on a gain, matching the OHLC readout's own
 *  `ohlcSign` convention) since "up or down from the reference" is the entire point of this view. */
export function formatPercentFromReference(value: number, reference: number): string {
  if (reference === 0) return "0.0%";
  const pct = (value / reference - 1) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateInputValue(text: string, fallback: Date): Date {
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return fallback;
  const next = new Date(fallback);
  next.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return next;
}
