/** One Ichimoku Kinko Hyo reading — every field individually nullable since the five components
 *  warm up at different rates (conversion needs `conversionPeriod` bars, base `basePeriod`, the
 *  spans a further `displacement` beyond whichever of `conversionPeriod`/`basePeriod`/
 *  `spanPeriod` they're built from), so an early candle can have some fields ready and others
 *  still `null`. `spanA`/`spanB` are stored already shifted to the index they're *displayed* at
 *  (see `computeIchimokuValues`'s own doc for why, and the one simplification that comes with
 *  it) — reading them here needs no further offsetting, unlike a naive port of the textbook
 *  formula. */
export interface IndicatorIchimokuPoint {
  conversion: number | null;
  base: number | null;
  spanA: number | null;
  spanB: number | null;
  chikou: number | null;
}
