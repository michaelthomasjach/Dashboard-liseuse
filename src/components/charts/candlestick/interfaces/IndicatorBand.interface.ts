/** A 3-line band value (Bollinger) instead of a single line's value — the draw effect tells the
 *  two apart with a plain `typeof value === "number"` check. */
export interface IndicatorBand {
  upper: number;
  middle: number;
  lower: number;
}
