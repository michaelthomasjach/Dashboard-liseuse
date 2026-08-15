import type { IndicatorKind } from "./IndicatorKind.interface";

export interface Indicator {
  id: string;
  kind: IndicatorKind;
  /** Lookback window, in candles. Ignored by "vwap" (a cumulative, unwindowed average) and
   *  "macd" (uses fastPeriod/slowPeriod/signalPeriod instead). */
  period: number;
  /** Band width, in standard deviations. Only used by "bollinger". Default 2. */
  stdDev?: number;
  /** "macd" only — defaults 12/26/9, the conventional parameters. */
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  /** CSS color. Defaults to a color cycled from a small built-in palette. */
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
