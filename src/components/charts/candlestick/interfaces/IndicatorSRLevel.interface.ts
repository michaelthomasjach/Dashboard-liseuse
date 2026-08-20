/** One auto-detected support/resistance level (see `computeSupportResistanceValues`'s own doc for
 *  how the lookback window is clustered into these) — held identically across every candle within
 *  that lookback window, same "one shared value repeated across a range" shape
 *  `IndicatorPivotPointsPoint` already uses, just as a flat ranked list instead of one fixed set
 *  per period. `startIndex` is where this level's own earliest touch was — its line is drawn from
 *  there, not from the lookback window's own start, so it doesn't visually claim to have existed
 *  before its first real touch. */
export interface IndicatorSRLevel {
  price: number;
  startIndex: number;
  touchCount: number;
}
