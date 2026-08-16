/** One confirmed ZigZag pivot — a swing high or low, connected to the previous pivot by a
 *  straight line (see `drawPriceCandles`) rather than a value at every candle the way SMA/EMA/
 *  Bollinger are. `label` classifies it against the *previous pivot of the same kind* (the last
 *  high before this one, or the last low) — Higher High/Higher Low/Lower High/Lower Low, the
 *  standard swing-structure reading; `null` for the first high and first low, which have nothing
 *  yet to compare against. */
export interface IndicatorZigZagPoint {
  price: number;
  kind: "high" | "low";
  label: "HH" | "HL" | "LH" | "LL" | null;
}
