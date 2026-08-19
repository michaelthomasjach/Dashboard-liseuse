export type IndicatorKind =
  | "sma"
  | "ema"
  | "wma"
  | "vwap"
  | "bollinger"
  | "rsi"
  | "chop"
  | "macd"
  | "zigzag"
  | "atr"
  | "supertrend"
  | "parabolicSar"
  | "gaps"
  | "ichimoku"
  | "pivotPoints"
  | "adx"
  | "chandelierExit"
  /** Rolling Pearson correlation coefficient (-1 to +1) against a second, user-picked symbol —
   *  see `Indicator.correlationSymbol`/`correlationData`. */
  | "correlation"
  /** Reserved for an `Indicator` carrying its own `customData` (see that field's own doc) — this
   *  value itself is never actually read for those, just needed to satisfy the type. */
  | "custom"
  | "freeCashFlow"
  | "netIncome"
  | "totalRevenue"
  | "netMargin"
  | "grossMargin"
  | "peRatio"
  | "eps"
  | "debtToEquity";
