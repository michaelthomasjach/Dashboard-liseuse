/** A prior period's own high/low/close, turned into a pivot ("PP") and three resistance/support
 *  levels on each side (R1-R3/S1-S3), held flat across every candle of the *current* period (see
 *  `computePivotPointsValues`'s own doc for how each pivot type's own formula differs, and how a
 *  "period" is chosen). Non-null starting with the second period the data actually covers — the
 *  very first has no *previous* period to derive levels from yet.
 *
 *  `periodStart` is the current period's own first candle index, identical across every candle
 *  that shares the same 7 levels — the renderer groups consecutive points by it into one
 *  horizontal segment per period (the "staircase" every trading platform draws for this
 *  indicator) instead of comparing all 7 level values for equality on every candle. */
export interface IndicatorPivotPointsPoint {
  periodStart: number;
  pp: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}
