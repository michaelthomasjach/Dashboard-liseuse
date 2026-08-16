/** One Supertrend value — a single price level, like an overlay moving average, but which side of
 *  price it sits on (and is drawn/colored) flips between an uptrend (below price) and a downtrend
 *  (above price) rather than always tracking the same side the way a moving average does. */
export interface IndicatorSupertrendPoint {
  value: number;
  trend: "up" | "down";
}
