import * as d3 from "d3";
import { VWAP, BollingerBands, RSI, MACD } from "technicalindicators";
import type { Candle } from "./interfaces/Candle.interface";
import type { FundamentalDataPoint } from "./interfaces/FundamentalDataPoint.interface";
import type { IndicatorKind } from "./interfaces/IndicatorKind.interface";
import type { IndicatorBand } from "./interfaces/IndicatorBand.interface";
import type { IndicatorMACD } from "./interfaces/IndicatorMACD.interface";
import type { Indicator } from "./interfaces/Indicator.interface";

/** The eight fundamental `IndicatorKind`s, in one place — `computeIndicatorValues` reads
 *  `fundamentals` through this, the picker/axis/hover-readout use it to pick a formatter (see
 *  `formatFundamentalValue`). Kept as its own array (rather than checking `kind` against each
 *  catalog entry's `category` at every call site) since two of these call sites run on every
 *  frame of a pan/zoom and a plain array membership check is cheaper than re-deriving it from
 *  the catalog each time. */
export const FUNDAMENTAL_INDICATOR_KINDS: IndicatorKind[] = [
  "freeCashFlow",
  "netIncome",
  "totalRevenue",
  "netMargin",
  "grossMargin",
  "peRatio",
  "eps",
  "debtToEquity",
];

export function isFundamentalKind(kind: IndicatorKind): boolean {
  return FUNDAMENTAL_INDICATOR_KINDS.includes(kind);
}

/** How a fundamental indicator's own value reads — money (compact, e.g. "$1.2B"), a percentage
 *  (one decimal, e.g. "21.5%"), or a plain ratio (two decimals, e.g. "24.30" for a P/E). RSI/CHOP/
 *  MACD keep their own existing plain `.toFixed(2)` wherever they're formatted — this is only
 *  reached for the eight kinds above. */
export function formatFundamentalValue(kind: IndicatorKind, value: number): string {
  switch (kind) {
    case "freeCashFlow":
    case "netIncome":
    case "totalRevenue":
      return `$${d3.format(".2s")(value)}`;
    case "netMargin":
    case "grossMargin":
      return `${value.toFixed(1)}%`;
    case "eps":
      return `$${value.toFixed(2)}`;
    default:
      return value.toFixed(2);
  }
}

/** A fundamental's own value at each candle — forward-filled (step function) from the most recent
 *  `FundamentalDataPoint` whose `date` is on or before that candle's own date, `null` before the
 *  first report exists yet, same "null until ready" convention as an indicator's own warm-up
 *  period. `fundamentals` doesn't need to be pre-sorted — sorted once here, not by the caller. */
export function computeFundamentalValues(data: Candle[], fundamentals: FundamentalDataPoint[] | undefined, kind: IndicatorKind): (number | null)[] {
  if (!fundamentals || fundamentals.length === 0) return data.map(() => null);
  const sorted = [...fundamentals].sort((a, b) => a.date.getTime() - b.date.getTime());
  let cursor = 0;
  return data.map((d) => {
    while (cursor + 1 < sorted.length && sorted[cursor + 1].date.getTime() <= d.date.getTime()) cursor++;
    const point = sorted[cursor];
    if (point.date.getTime() > d.date.getTime()) return null;
    const value = point[kind as keyof Omit<FundamentalDataPoint, "date">];
    return typeof value === "number" ? value : null;
  });
}

export interface IndicatorCatalogEntry {
  kind: IndicatorKind;
  label: string;
  shortLabel: string;
  defaultPeriod: number;
  hasPeriod: boolean;
  hasStdDev: boolean;
  /** "price": overlaid on the price section, in the top-left legend (SMA/EMA/WMA/VWAP/Bollinger).
   *  "own": gets its own sub-pane below price/volume, with a pane header instead of a legend
   *  entry — an oscillator like RSI/CHOP/MACD isn't on the same scale as price at all. */
  pane: "price" | "own";
  /** Grouping shown in the picker modal — purely a display grouping, doesn't affect anything
   *  about how the indicator itself behaves. */
  category: "Moyennes mobiles" | "Volatilité" | "Momentum" | "Fondamentaux";
}

export const INDICATOR_CATALOG: IndicatorCatalogEntry[] = [
  {
    kind: "sma",
    label: "Moyenne mobile simple (SMA)",
    shortLabel: "SMA",
    defaultPeriod: 20,
    hasPeriod: true,
    hasStdDev: false,
    pane: "price",
    category: "Moyennes mobiles",
  },
  {
    kind: "ema",
    label: "Moyenne mobile exponentielle (EMA)",
    shortLabel: "EMA",
    defaultPeriod: 20,
    hasPeriod: true,
    hasStdDev: false,
    pane: "price",
    category: "Moyennes mobiles",
  },
  {
    kind: "wma",
    label: "Moyenne mobile pondérée (WMA)",
    shortLabel: "WMA",
    defaultPeriod: 20,
    hasPeriod: true,
    hasStdDev: false,
    pane: "price",
    category: "Moyennes mobiles",
  },
  {
    kind: "vwap",
    label: "Volume Weighted Average Price (VWAP)",
    shortLabel: "VWAP",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "price",
    category: "Moyennes mobiles",
  },
  {
    kind: "bollinger",
    label: "Bandes de Bollinger",
    shortLabel: "BB",
    defaultPeriod: 20,
    hasPeriod: true,
    hasStdDev: true,
    pane: "price",
    category: "Volatilité",
  },
  {
    kind: "rsi",
    label: "Relative Strength Index (RSI)",
    shortLabel: "RSI",
    defaultPeriod: 14,
    hasPeriod: true,
    hasStdDev: false,
    pane: "own",
    category: "Momentum",
  },
  {
    kind: "chop",
    label: "Choppiness Index (CHOP)",
    shortLabel: "CHOP",
    defaultPeriod: 14,
    hasPeriod: true,
    hasStdDev: false,
    pane: "own",
    category: "Volatilité",
  },
  { kind: "macd", label: "MACD", shortLabel: "MACD", defaultPeriod: 0, hasPeriod: false, hasStdDev: false, pane: "own", category: "Momentum" },
  // Fundamentals: reported-period figures (see `FundamentalDataPoint`), not computed from `data`
  // at all — `hasPeriod`/`hasStdDev` both false, same as VWAP/MACD, since there's no rolling
  // window to configure on a raw reported number.
  {
    kind: "freeCashFlow",
    label: "Free Cash Flow",
    shortLabel: "FCF",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "own",
    category: "Fondamentaux",
  },
  {
    kind: "netIncome",
    label: "Net Income",
    shortLabel: "Net Income",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "own",
    category: "Fondamentaux",
  },
  {
    kind: "totalRevenue",
    label: "Total Revenue",
    shortLabel: "Revenue",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "own",
    category: "Fondamentaux",
  },
  {
    kind: "netMargin",
    label: "Net Margin",
    shortLabel: "Net Margin",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "own",
    category: "Fondamentaux",
  },
  {
    kind: "grossMargin",
    label: "Gross Margin",
    shortLabel: "Gross Margin",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "own",
    category: "Fondamentaux",
  },
  {
    kind: "peRatio",
    label: "Price/Earnings (PER)",
    shortLabel: "P/E",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "own",
    category: "Fondamentaux",
  },
  {
    kind: "eps",
    label: "Earnings Per Share (EPS)",
    shortLabel: "EPS",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "own",
    category: "Fondamentaux",
  },
  {
    kind: "debtToEquity",
    label: "Debt/Equity",
    shortLabel: "D/E",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "own",
    category: "Fondamentaux",
  },
];

export function indicatorCatalogEntry(kind: IndicatorKind): IndicatorCatalogEntry {
  return INDICATOR_CATALOG.find((entry) => entry.kind === kind) ?? INDICATOR_CATALOG[0];
}

export function indicatorLabel(indicator: Indicator): string {
  const entry = indicatorCatalogEntry(indicator.kind);
  if (indicator.kind === "macd") return `MACD(${indicator.fastPeriod ?? 12},${indicator.slowPeriod ?? 26},${indicator.signalPeriod ?? 9})`;
  if (!entry.hasPeriod) return entry.shortLabel;
  if (entry.hasStdDev) return `${entry.shortLabel}(${indicator.period},${indicator.stdDev ?? 2})`;
  return `${entry.shortLabel}(${indicator.period})`;
}

export const INDICATOR_COLORS = ["#e0a95c", "#6c87c9", "#7fb37f", "#c96c8f", "#9a7fd1"];

export function defaultIndicatorColor(index: number): string {
  return INDICATOR_COLORS[((index % INDICATOR_COLORS.length) + INDICATOR_COLORS.length) % INDICATOR_COLORS.length];
}

// Each returns one value per candle (null during the warm-up period before enough history has
// accumulated), so the result stays index-aligned with `data` — the draw effect windows it down
// to the visible range the exact same way `visible` windows `data` itself.
export function computeSMAValues(data: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) sum -= data[i - period].close;
    if (i >= period - 1) result[i] = sum / period;
  }
  return result;
}

export function computeEMAValues(data: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return result;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let ema = sum / period;
  result[period - 1] = ema;
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

export function computeWMAValues(data: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < data.length; i++) {
    let weighted = 0;
    for (let j = 0; j < period; j++) weighted += data[i - period + 1 + j].close * (j + 1);
    result[i] = weighted / denom;
  }
  return result;
}

// VWAP (from the `technicalindicators` npm package) is cumulative rather than windowed, so it
// returns one value per input bar with no warm-up gap — still routed through the same
// null-padding shape as the hand-rolled indicators above purely so every `IndicatorKind` shares
// one result type.
export function computeVWAPValues(data: Candle[]): (number | null)[] {
  if (data.length === 0) return [];
  const values = VWAP.calculate({
    high: data.map((d) => d.high),
    low: data.map((d) => d.low),
    close: data.map((d) => d.close),
    volume: data.map((d) => d.volume ?? 0),
  });
  const offset = data.length - values.length;
  const result: (number | null)[] = new Array(offset).fill(null);
  return result.concat(values);
}

// `technicalindicators`'s calculate() trims the warm-up period off the front of its result
// instead of null-padding it (e.g. 10 closes at period 5 comes back as 6 values, not 10) — every
// indicator here left-pads by that same trimmed amount so the result stays index-aligned with
// `data`, same convention as the hand-rolled SMA/EMA/WMA above.
export function computeBollingerValues(data: Candle[], period: number, stdDev: number): (IndicatorBand | null)[] {
  if (data.length === 0) return [];
  const values = BollingerBands.calculate({ period, stdDev, values: data.map((d) => d.close) });
  const offset = data.length - values.length;
  const result: (IndicatorBand | null)[] = new Array(offset).fill(null);
  return result.concat(values.map((v) => ({ upper: v.upper, middle: v.middle, lower: v.lower })));
}

export function computeRSIValues(data: Candle[], period: number): (number | null)[] {
  if (data.length === 0) return [];
  const values = RSI.calculate({ period, values: data.map((d) => d.close) });
  const offset = data.length - values.length;
  return new Array(offset).fill(null).concat(values);
}

// Not in `technicalindicators` (no Choppiness Index there), so hand-rolled from its plain
// definition: 100 * log10(sum of true range over `period`) / (highest high − lowest low over the
// same window), scaled by log10(period) — same O(n·period) shape as the hand-rolled WMA above,
// there's no rolling-window shortcut without also tracking a separate max/min structure.
export function computeCHOPValues(data: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length === 0) return result;
  const trueRanges = data.map((d, i) => {
    const prevClose = i > 0 ? data[i - 1].close : d.close;
    return Math.max(d.high - d.low, Math.abs(d.high - prevClose), Math.abs(d.low - prevClose));
  });
  for (let i = period - 1; i < data.length; i++) {
    let trSum = 0;
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      trSum += trueRanges[j];
      highest = Math.max(highest, data[j].high);
      lowest = Math.min(lowest, data[j].low);
    }
    const range = highest - lowest;
    result[i] = range > 0 ? (100 * Math.log10(trSum / range)) / Math.log10(period) : null;
  }
  return result;
}

export function computeMACDValues(data: Candle[], fastPeriod: number, slowPeriod: number, signalPeriod: number): (IndicatorMACD | null)[] {
  if (data.length === 0) return [];
  const values = MACD.calculate({
    values: data.map((d) => d.close),
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const offset = data.length - values.length;
  const result: (IndicatorMACD | null)[] = new Array(offset).fill(null);
  return result.concat(values.map((v) => ({ macd: v.MACD ?? 0, signal: v.signal ?? null, histogram: v.histogram ?? null })));
}

export function computeIndicatorValues(
  data: Candle[],
  indicator: Indicator,
  fundamentals: FundamentalDataPoint[] | undefined
): (number | IndicatorBand | IndicatorMACD | null)[] {
  const period = Math.max(1, Math.round(indicator.period));
  if (isFundamentalKind(indicator.kind)) return computeFundamentalValues(data, fundamentals, indicator.kind);
  switch (indicator.kind) {
    case "ema":
      return computeEMAValues(data, period);
    case "wma":
      return computeWMAValues(data, period);
    case "vwap":
      return computeVWAPValues(data);
    case "bollinger":
      return computeBollingerValues(data, period, indicator.stdDev ?? 2);
    case "rsi":
      return computeRSIValues(data, period);
    case "chop":
      return computeCHOPValues(data, period);
    case "macd":
      return computeMACDValues(data, indicator.fastPeriod ?? 12, indicator.slowPeriod ?? 26, indicator.signalPeriod ?? 9);
    case "sma":
    default:
      return computeSMAValues(data, period);
  }
}
