/** Chandelier Exit's own value shape — both trailing stops are computed and ratcheted every bar
 *  regardless of which one is actually "active" (see `dir`), same as the Pine Script original
 *  keeps updating the plot it isn't currently drawing in the background; the renderer only ever
 *  draws whichever one `dir` currently selects, breaking the line entirely rather than connecting
 *  across a flip (unlike Supertrend's own single always-connected line). */
export interface IndicatorChandelierPoint {
  /** The trailing stop below price, ratcheting up only for as long as price stays above it. */
  longStop: number;
  /** The trailing stop above price, ratcheting down only for as long as price stays below it. */
  shortStop: number;
  /** Which stop is currently active — 1 once price has closed above the short stop (long/
   *  bullish), -1 once it's closed below the long stop (short/bearish) — unchanged on any bar
   *  that crosses neither. */
  dir: 1 | -1;
  /** True on exactly the bar `dir` flips from -1 to 1. */
  buySignal: boolean;
  /** True on exactly the bar `dir` flips from 1 to -1. */
  sellSignal: boolean;
}
