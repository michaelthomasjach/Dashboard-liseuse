import type { IndicatorKind } from "./IndicatorKind.interface";
import type { CustomIndicatorDef } from "./CustomIndicatorDef.interface";
import type { OverlayDataPoint } from "./TrendLineDrawing.interface";

export interface Indicator {
  id: string;
  kind: IndicatorKind;
  /** Lookback window, in candles. Ignored by "vwap" (a cumulative, unwindowed average) and
   *  "macd"/"ichimoku" (their own multi-period settings below instead). Doubles as "atr"'s and
   *  "supertrend"'s own ATR period. */
  period: number;
  /** Band width, in standard deviations. Only used by "bollinger". Default 2. */
  stdDev?: number;
  /** "macd" only — defaults 12/26/9, the conventional parameters. */
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  /** "zigzag" only — minimum swing size, as a percentage move from the last confirmed pivot,
   *  before the next one confirms. Default 5. */
  zigzagDeviation?: number;
  /** "zigzag" only — shows each confirmed pivot's HH/HL/LH/LL label (see
   *  `IndicatorZigZagPoint.label`) next to it. Default true. */
  zigzagShowLabels?: boolean;
  /** "supertrend" only — band width, as a multiple of ATR (see `period` above for the ATR period
   *  itself). Default 3. */
  supertrendMultiplier?: number;
  /** "parabolicSar" only — the acceleration factor's own starting value/step per extreme-point
   *  update, and its cap. Defaults 0.02/0.2, the conventional parameters. */
  sarStep?: number;
  sarMax?: number;
  /** "gaps" only — the minimum jump between one candle's high/low and the next's, as a percentage
   *  of the earlier candle's own price, before it counts as a gap at all. Default 0.1. */
  gapsMinPercent?: number;
  /** "ichimoku" only — defaults 9/26/52/26, the conventional parameters (see
   *  `computeIchimokuValues`'s own doc for what `ichimokuDisplacement` does and its one
   *  limitation). */
  ichimokuConversionPeriod?: number;
  ichimokuBasePeriod?: number;
  ichimokuSpanPeriod?: number;
  ichimokuDisplacement?: number;
  /** "pivotPoints" only — which formula turns the reference period's own high/low/close into
   *  levels (see `computePivotPointsValues`'s own doc for each one's exact math). Default
   *  "classic". */
  pivotType?: "classic" | "fibonacci" | "woodie" | "camarilla";
  /** "pivotPoints" only — which prior period's own high/low/close the current period's levels are
   *  derived from. Default "weekly" — "daily" only reads as useful against intraday data; against
   *  the daily bars most charts here actually show, it produces a new (unreadable) segment every
   *  single candle. */
  pivotPeriod?: "daily" | "weekly" | "monthly";
  /** "chandelierExit" only — the ATR multiplier both stops are offset by (`period` above doubles
   *  as its own ATR length and the highest/lowest lookback, same reuse `supertrendMultiplier`'s
   *  own doc explains for Supertrend). Default 3, the Pine Script original's own default. */
  chandelierMultiplier?: number;
  /** "chandelierExit" only — highest/lowest *close* over the lookback (the Pine original's own
   *  default) instead of highest high / lowest low, before the ATR offset. Default true. */
  chandelierUseClose?: boolean;
  /** "chandelierExit" only — a pill badge at each direction flip ("Achat"/"Vente"). Default true. */
  chandelierShowLabels?: boolean;
  /** "chandelierExit" only — fills the region between price and whichever stop is currently
   *  active. Default true. */
  chandelierHighlightState?: boolean;
  /** Set once this indicator represents a `CustomIndicatorDef` the caller supplied via
   *  `CandlestickChartProps.customIndicators`, rather than one of the library's own built-in
   *  kinds — `kind` itself is meaningless in that case ("custom" exists in `IndicatorKind` purely
   *  to satisfy the type). Carries a full, self-contained copy of that def (not just its id) so
   *  this indicator keeps working correctly even if the caller later removes it from
   *  `customIndicators` or the array identity changes — same reasoning `Indicator` never re-reads
   *  its own settings from a live prop anywhere else either. */
  customData?: CustomIndicatorDef;
  /** "correlation" only — the second symbol its rolling coefficient is computed against, and that
   *  symbol's own fetched price series (same `OverlayDataPoint[]` shape/fetch path — see
   *  `CandlestickChartProps.onAddSymbolOverlay` — the "symbolOverlay" drawing type already uses to
   *  compare an instrument against the main one). Carried directly on the indicator, same
   *  "self-contained, not a second lookup" reasoning `customData` above already follows. */
  correlationSymbol?: string;
  correlationSymbolName?: string;
  correlationData?: OverlayDataPoint[];
  /** CSS color. Defaults to a color cycled from a small built-in palette. Ignored by "supertrend"
   *  (always the chart's own up/down colors, so its trend-flip reads consistently with candle
   *  coloring) and "parabolicSar" (same reasoning — its dots are colored per-point by which side
   *  of price they're on, not by a single indicator-wide color). */
  color?: string;
  /** When true, the indicator stays in the legend but its line isn't drawn — toggled from the
   *  legend's eye icon. Only meaningful for a `pane: "price"` indicator (see
   *  IndicatorCatalogEntry) — a `pane: "own"` one uses `paneCollapsed` instead, same as the
   *  volume pane. Default false. */
  hidden?: boolean;
  /** A `pane: "own"` indicator's pane, collapsed to a header-only strip — same mechanism/UI as
   *  the volume pane's own collapse. Default false (expanded). */
  paneCollapsed?: boolean;
}
