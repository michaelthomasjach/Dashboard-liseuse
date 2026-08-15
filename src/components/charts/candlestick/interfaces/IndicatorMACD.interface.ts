/** MACD's value shape: the MACD line always has a value once past its own warm-up, but `signal`
 *  (an EMA *of* the MACD line) and `histogram` (MACD − signal) both start out `null` for a
 *  further stretch until the signal EMA itself has enough history — same "null until ready"
 *  convention as everything else here, just per-field instead of the whole value. */
export interface IndicatorMACD {
  macd: number;
  signal: number | null;
  histogram: number | null;
}
