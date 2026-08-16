/** A price gap detected between one candle and the previous one — stored at the *later* candle's
 *  own index (the gap "starts" there), non-null only where a gap actually exists. Drawn as a
 *  shaded rectangle from the previous candle up to `endIndex` (see `computeGapValues`'s own doc
 *  for how that's chosen) rather than a line/value at every candle the way every other indicator
 *  here is. */
export interface IndicatorGapPoint {
  top: number;
  bottom: number;
  direction: "up" | "down";
  /** The candle index the shaded rectangle extends to — the first later candle whose own
   *  high/low range re-entered [bottom, top] (the gap "filled"), or the dataset's own last index
   *  if it never has. */
  endIndex: number;
  filled: boolean;
}
