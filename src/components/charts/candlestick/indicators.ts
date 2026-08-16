import { VWAP, BollingerBands, RSI, MACD, ATR, PSAR } from "technicalindicators";
import type { Candle } from "./interfaces/Candle.interface";
import type { FundamentalDataPoint } from "./interfaces/FundamentalDataPoint.interface";
import type { IndicatorKind } from "./interfaces/IndicatorKind.interface";
import type { IndicatorBand } from "./interfaces/IndicatorBand.interface";
import type { IndicatorMACD } from "./interfaces/IndicatorMACD.interface";
import type { IndicatorZigZagPoint } from "./interfaces/IndicatorZigZagPoint.interface";
import type { IndicatorSupertrendPoint } from "./interfaces/IndicatorSupertrendPoint.interface";
import type { IndicatorIchimokuPoint } from "./interfaces/IndicatorIchimokuPoint.interface";
import type { IndicatorGapPoint } from "./interfaces/IndicatorGapPoint.interface";
import type { IndicatorValue } from "./interfaces/IndicatorValue.interface";
import type { Indicator } from "./interfaces/Indicator.interface";
import type { CustomIndicatorDef } from "./interfaces/CustomIndicatorDef.interface";
import { formatCompactNumber } from "./formatting";

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

/** How a fundamental indicator's own value reads — money (compact, e.g. "$1.20B", see
 *  `formatCompactNumber`), a percentage (one decimal, e.g. "21.5%"), or a plain ratio (two
 *  decimals, e.g. "24.30" for a P/E). RSI/CHOP/MACD keep their own existing plain `.toFixed(2)`
 *  wherever they're formatted — this is only reached for the eight kinds above. */
export function formatFundamentalValue(kind: IndicatorKind, value: number): string {
  switch (kind) {
    case "freeCashFlow":
    case "netIncome":
    case "totalRevenue":
      return `$${formatCompactNumber(value)}`;
    case "netMargin":
    case "grossMargin":
      return `${value.toFixed(1)}%`;
    case "eps":
      return `$${value.toFixed(2)}`;
    default:
      return value.toFixed(2);
  }
}

/** Forward-fills a sparse, date-keyed series (quarterly reports, any other "one number per
 *  period" data) onto every candle — the most recent point on or before that candle's own date, a
 *  step function, `null` before the first point exists yet. Shared by `computeFundamentalValues`
 *  (the built-in eight) and `computeCustomIndicatorValues` (a caller-supplied `CustomIndicatorDef`
 *  — see its own doc) so both read exactly the same way despite one being baked into the library
 *  and the other entirely external to it. `points` doesn't need to be pre-sorted. */
function forwardFillSeries(data: Candle[], points: { date: Date; value: number }[]): (number | null)[] {
  if (points.length === 0) return data.map(() => null);
  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  let cursor = 0;
  return data.map((d) => {
    while (cursor + 1 < sorted.length && sorted[cursor + 1].date.getTime() <= d.date.getTime()) cursor++;
    const point = sorted[cursor];
    return point.date.getTime() > d.date.getTime() ? null : point.value;
  });
}

/** A fundamental's own value at each candle — see `forwardFillSeries`. */
export function computeFundamentalValues(data: Candle[], fundamentals: FundamentalDataPoint[] | undefined, kind: IndicatorKind): (number | null)[] {
  if (!fundamentals || fundamentals.length === 0) return data.map(() => null);
  const points = fundamentals
    .map((f) => ({ date: f.date, value: f[kind as keyof Omit<FundamentalDataPoint, "date">] }))
    .filter((p): p is { date: Date; value: number } => typeof p.value === "number");
  return forwardFillSeries(data, points);
}

/** A `CustomIndicatorDef`'s own series, forward-filled the same way — see `forwardFillSeries`. */
export function computeCustomIndicatorValues(data: Candle[], def: CustomIndicatorDef): (number | null)[] {
  return forwardFillSeries(data, def.data);
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
   *  about how the indicator itself behaves. Every built-in entry uses one of "Moyennes
   *  mobiles"/"Volatilité"/"Momentum"/"Tendance"/"Structure"/"Fondamentaux" — a plain `string`
   *  (not a closed union of those) only so a custom indicator's own freeform `section` (see
   *  `CustomIndicatorDef`) can be synthesized into one of these too, in `indicatorCatalogEntry`. */
  category: string;
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
  // Its own value shape (IndicatorZigZagPoint, not a plain number/IndicatorBand) and its own
  // settings (zigzagDeviation/zigzagShowLabels on Indicator, not period/stdDev) — hasPeriod/
  // hasStdDev both false the same way vwap/macd's own extra settings sit outside them.
  {
    kind: "zigzag",
    label: "Zig Zag",
    shortLabel: "ZigZag",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "price",
    category: "Tendance",
  },
  {
    kind: "atr",
    label: "Average True Range (ATR)",
    shortLabel: "ATR",
    defaultPeriod: 14,
    hasPeriod: true,
    hasStdDev: false,
    pane: "own",
    category: "Volatilité",
  },
  // Its own value shape (IndicatorSupertrendPoint) and its own settings (period doubles as the
  // ATR period, supertrendMultiplier instead of stdDev) — hasStdDev false the same reasoning as
  // every other non-Bollinger indicator here.
  {
    kind: "supertrend",
    label: "Supertrend",
    shortLabel: "Supertrend",
    defaultPeriod: 10,
    hasPeriod: true,
    hasStdDev: false,
    pane: "price",
    category: "Tendance",
  },
  {
    kind: "parabolicSar",
    label: "Parabolic SAR",
    shortLabel: "PSAR",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "price",
    category: "Tendance",
  },
  // Own value shape (IndicatorGapPoint — a set of rectangles, not a line) and own setting
  // (gapsMinPercent, not period/stdDev).
  {
    kind: "gaps",
    label: "Gaps",
    shortLabel: "Gaps",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "price",
    category: "Structure",
  },
  // Own value shape (IndicatorIchimokuPoint — five components, one of them a filled cloud) and
  // its own four settings (ichimokuConversionPeriod/ichimokuBasePeriod/ichimokuSpanPeriod/
  // ichimokuDisplacement, not period/stdDev).
  {
    kind: "ichimoku",
    label: "Ichimoku Kinko Hyo",
    shortLabel: "Ichimoku",
    defaultPeriod: 0,
    hasPeriod: false,
    hasStdDev: false,
    pane: "price",
    category: "Tendance",
  },
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

// Accepts either a plain `IndicatorKind` (every existing call site, unaffected) or a full
// `Indicator` — only the latter can actually detect a custom one (`customData` lives on the
// `Indicator`, not on `kind` alone) and synthesize a matching entry on the fly, since a custom
// series was never added to the static `INDICATOR_CATALOG` array in the first place. A call site
// that only ever has a bare `kind` in scope (nothing custom-aware needs it) keeps working exactly
// as before; one that has the full indicator should pass that instead to get custom-aware pane/
// label/category — see the doc on `Indicator.customData` for why "custom" itself is never looked
// up by kind.
export function indicatorCatalogEntry(indicator: Indicator | IndicatorKind): IndicatorCatalogEntry {
  if (typeof indicator !== "string" && indicator.customData) {
    const def = indicator.customData;
    return {
      kind: "custom",
      label: def.label,
      shortLabel: def.shortLabel ?? def.label,
      defaultPeriod: 0,
      hasPeriod: false,
      hasStdDev: false,
      pane: def.type === "overlay" ? "price" : "own",
      category: def.section,
    };
  }
  const kind = typeof indicator === "string" ? indicator : indicator.kind;
  return INDICATOR_CATALOG.find((entry) => entry.kind === kind) ?? INDICATOR_CATALOG[0];
}

export function indicatorLabel(indicator: Indicator): string {
  if (indicator.customData) return indicator.customData.label;
  const entry = indicatorCatalogEntry(indicator);
  if (indicator.kind === "macd") return `MACD(${indicator.fastPeriod ?? 12},${indicator.slowPeriod ?? 26},${indicator.signalPeriod ?? 9})`;
  if (indicator.kind === "zigzag") return `${entry.shortLabel}(${indicator.zigzagDeviation ?? 5}%)`;
  if (indicator.kind === "supertrend") return `${entry.shortLabel}(${indicator.period},${indicator.supertrendMultiplier ?? 3})`;
  if (indicator.kind === "parabolicSar") return `${entry.shortLabel}(${indicator.sarStep ?? 0.02},${indicator.sarMax ?? 0.2})`;
  if (indicator.kind === "gaps") return `${entry.shortLabel}(${indicator.gapsMinPercent ?? 0.1}%)`;
  if (indicator.kind === "ichimoku")
    return `${entry.shortLabel}(${indicator.ichimokuConversionPeriod ?? 9},${indicator.ichimokuBasePeriod ?? 26},${indicator.ichimokuSpanPeriod ?? 52})`;
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

// Percentage-deviation ZigZag, computed off closes (not high/low wicks — a simpler, still
// standard variant that avoids the two-tracker bookkeeping a wick-based version would need, and
// reads cleanly against a line chart of closes too). Confirms a pivot only once price has
// reversed by at least `deviationPercent` from the current provisional extreme — the most recent,
// still-unconfirmed leg is left off entirely rather than drawn as a repainting last segment, so
// the line only ever reaches the last *confirmed* pivot.
export function computeZigZagValues(data: Candle[], deviationPercent: number): (IndicatorZigZagPoint | null)[] {
  const n = data.length;
  const result: (IndicatorZigZagPoint | null)[] = new Array(n).fill(null);
  if (n < 2) return result;
  const threshold = Math.max(0.01, deviationPercent) / 100;

  let lastHighPrice: number | null = null;
  let lastLowPrice: number | null = null;
  function labelFor(kind: "high" | "low", price: number): IndicatorZigZagPoint["label"] {
    const prev = kind === "high" ? lastHighPrice : lastLowPrice;
    if (prev === null) return null;
    if (kind === "high") return price > prev ? "HH" : "LH";
    return price > prev ? "HL" : "LL";
  }
  function confirm(index: number, price: number, kind: "high" | "low") {
    result[index] = { price, kind, label: labelFor(kind, price) };
    if (kind === "high") lastHighPrice = price;
    else lastLowPrice = price;
  }

  // Phase 1: direction undetermined yet — track the running max and min simultaneously from the
  // very start. Whichever one first reverses by `threshold` from the other becomes the first
  // confirmed pivot (reversing *off* a high confirms that high as a pivot, and vice versa); the
  // index comparison guards against the rare case where both thresholds are crossed on the same
  // bar, preferring whichever extreme is chronologically the more recent of the two.
  let runningMaxPrice = data[0].close;
  let runningMaxIndex = 0;
  let runningMinPrice = data[0].close;
  let runningMinIndex = 0;
  let firstPivotKind: "high" | "low" | null = null;
  let i = 1;
  for (; i < n; i++) {
    const price = data[i].close;
    if (price > runningMaxPrice) {
      runningMaxPrice = price;
      runningMaxIndex = i;
    }
    if (price < runningMinPrice) {
      runningMinPrice = price;
      runningMinIndex = i;
    }
    if ((runningMaxPrice - price) / runningMaxPrice >= threshold && runningMaxIndex > runningMinIndex) {
      confirm(runningMaxIndex, runningMaxPrice, "high");
      firstPivotKind = "high";
      break;
    }
    if ((price - runningMinPrice) / runningMinPrice >= threshold && runningMinIndex > runningMaxIndex) {
      confirm(runningMinIndex, runningMinPrice, "low");
      firstPivotKind = "low";
      break;
    }
  }
  if (firstPivotKind === null) return result; // Never even reversed enough to confirm a first pivot.

  // Phase 2: alternate, hunting a pivot of the opposite kind each time, until the data ends. The
  // new pending leg starts from the *current* bar `i` (where the reversal was detected), not from
  // runningMaxIndex/runningMinIndex (where the just-confirmed pivot actually sits) — those are
  // two different bars whenever the reversal wasn't confirmed on the very next bar after the peak.
  let pendingKind: "high" | "low" = firstPivotKind === "high" ? "low" : "high";
  let pendingIndex = i;
  let pendingPrice = data[i].close;
  for (i = i + 1; i < n; i++) {
    const price = data[i].close;
    if (pendingKind === "low") {
      if (price < pendingPrice) {
        pendingPrice = price;
        pendingIndex = i;
      } else if ((price - pendingPrice) / pendingPrice >= threshold) {
        confirm(pendingIndex, pendingPrice, "low");
        pendingKind = "high";
        pendingPrice = price;
        pendingIndex = i;
      }
    } else {
      if (price > pendingPrice) {
        pendingPrice = price;
        pendingIndex = i;
      } else if ((pendingPrice - price) / pendingPrice >= threshold) {
        confirm(pendingIndex, pendingPrice, "high");
        pendingKind = "low";
        pendingPrice = price;
        pendingIndex = i;
      }
    }
  }
  return result;
}

export function computeATRValues(data: Candle[], period: number): (number | null)[] {
  if (data.length === 0) return [];
  const values = ATR.calculate({ high: data.map((d) => d.high), low: data.map((d) => d.low), close: data.map((d) => d.close), period });
  const offset = data.length - values.length;
  return new Array(offset).fill(null).concat(values);
}

// Standard ATR-band trend flip: a band hugs price on whichever side it's currently trending
// (finalLower while "up", finalUpper while "down"), only ever tightening toward price — never
// loosening back away from it — until price actually crosses to the other side, at which point
// the trend flips and the *other* band starts hugging instead. `value` (what's actually plotted)
// is always whichever band is currently active for the trend that bar settled into.
export function computeSupertrendValues(data: Candle[], period: number, multiplier: number): (IndicatorSupertrendPoint | null)[] {
  const n = data.length;
  const result: (IndicatorSupertrendPoint | null)[] = new Array(n).fill(null);
  if (n === 0) return result;
  const atrValues = computeATRValues(data, period);
  let prevFinalUpper: number | null = null;
  let prevFinalLower: number | null = null;
  let prevTrend: "up" | "down" = "up";
  for (let i = 0; i < n; i++) {
    const atr = atrValues[i];
    if (atr === null) continue;
    const hl2 = (data[i].high + data[i].low) / 2;
    const basicUpper = hl2 + multiplier * atr;
    const basicLower = hl2 - multiplier * atr;
    const prevClose = i > 0 ? data[i - 1].close : data[i].close;
    const finalUpper: number = prevFinalUpper === null || basicUpper < prevFinalUpper || prevClose > prevFinalUpper ? basicUpper : prevFinalUpper;
    const finalLower: number = prevFinalLower === null || basicLower > prevFinalLower || prevClose < prevFinalLower ? basicLower : prevFinalLower;
    let trend: "up" | "down";
    if (prevFinalUpper === null) trend = data[i].close >= finalLower ? "up" : "down";
    else if (prevTrend === "up" && data[i].close < finalLower) trend = "down";
    else if (prevTrend === "down" && data[i].close > finalUpper) trend = "up";
    else trend = prevTrend;
    result[i] = { value: trend === "up" ? finalLower : finalUpper, trend };
    prevFinalUpper = finalUpper;
    prevFinalLower = finalLower;
    prevTrend = trend;
  }
  return result;
}

export function computeParabolicSARValues(data: Candle[], step: number, max: number): (number | null)[] {
  if (data.length < 2) return new Array(data.length).fill(null);
  const values = PSAR.calculate({ high: data.map((d) => d.high), low: data.map((d) => d.low), step, max });
  const offset = data.length - values.length;
  return new Array(offset).fill(null).concat(values);
}

// A gap between candle i-1 and i, stored at i (see IndicatorGapPoint's own doc) once the jump is
// at least minPercent of the earlier candle's own reference price — filterable the same way a
// deviation threshold gates a ZigZag pivot, so a noisy intraday series doesn't flag every
// fractional-cent overlap as a "gap". Once found, scans forward for the first later candle whose
// own high/low range re-enters [bottom, top] to mark it filled and pick where the shaded
// rectangle stops — same "look forward, once, at compute time" shape ZigZag/Gaps' own detection
// otherwise wouldn't need, but a gap rectangle's very reason for existing is showing *whether and
// when* price came back to fill it, so unlike every other indicator here this one's rendering
// genuinely depends on bars after the point it's anchored to, not just before.
export function computeGapValues(data: Candle[], minPercent: number): (IndicatorGapPoint | null)[] {
  const n = data.length;
  const result: (IndicatorGapPoint | null)[] = new Array(n).fill(null);
  const threshold = Math.max(0, minPercent) / 100;
  for (let i = 1; i < n; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    let direction: "up" | "down" | null = null;
    let top = 0;
    let bottom = 0;
    if (curr.low > prev.high && (curr.low - prev.high) / prev.high >= threshold) {
      direction = "up";
      top = curr.low;
      bottom = prev.high;
    } else if (curr.high < prev.low && (prev.low - curr.high) / prev.low >= threshold) {
      direction = "down";
      top = prev.low;
      bottom = curr.high;
    }
    if (!direction) continue;
    let endIndex = n - 1;
    let filled = false;
    for (let j = i + 1; j < n; j++) {
      if (data[j].low <= top && data[j].high >= bottom) {
        endIndex = j;
        filled = true;
        break;
      }
    }
    result[i] = { top, bottom, direction, endIndex, filled };
  }
  return result;
}

// Hand-rolled rather than routed through `technicalindicators`' own IchimokuCloud (which trims
// its warm-up period from the front the same way RSI/MACD do, same convention every other
// indicator here null-pads back in) — the reason is the two Senkou spans' own *displacement*:
// classically plotted `displacement` bars *ahead* of the bar they're computed from, projecting
// into the still-blank space past the last candle. That's genuinely supportable here — the price
// scale already allows panning into empty space past data.length (see useZoomAndScales' own
// MAX_EMPTY_FRACTION) — but every indicator's own value array is one slot per *candle*, with
// nowhere to put a value meant for an index beyond data.length without widening that contract
// for this one indicator alone. Instead, each span is stored already shifted to the index it's
// *displayed* at (computed by looking `displacement` bars *back*, not projecting forward) — every
// past bar's cloud renders exactly like a real Ichimoku chart's, at the one cost of not showing
// the still-forming final `displacement` bars' worth of "future" cloud past the last candle.
// Chikou (the lagging span) needs no such trade-off — shifted *behind*, it only ever reads
// already-existing bars, so it's plotted in full.
export function computeIchimokuValues(
  data: Candle[],
  conversionPeriod: number,
  basePeriod: number,
  spanPeriod: number,
  displacement: number
): (IndicatorIchimokuPoint | null)[] {
  const n = data.length;
  if (n === 0) return [];
  function midpointSeries(period: number): (number | null)[] {
    return data.map((_, i) => {
      if (i < period - 1) return null;
      let hi = -Infinity;
      let lo = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        hi = Math.max(hi, data[j].high);
        lo = Math.min(lo, data[j].low);
      }
      return (hi + lo) / 2;
    });
  }
  const conversionAll = midpointSeries(conversionPeriod);
  const baseAll = midpointSeries(basePeriod);
  const spanBAll = midpointSeries(spanPeriod);

  return data.map((_, i) => {
    const conversion = conversionAll[i];
    const base = baseAll[i];
    const sourceIndex = i - displacement;
    let spanA: number | null = null;
    let spanB: number | null = null;
    if (sourceIndex >= 0) {
      const c = conversionAll[sourceIndex];
      const b = baseAll[sourceIndex];
      spanA = c !== null && b !== null ? (c + b) / 2 : null;
      spanB = spanBAll[sourceIndex];
    }
    const chikouSourceIndex = i + displacement;
    const chikou = chikouSourceIndex < n ? data[chikouSourceIndex].close : null;
    return { conversion, base, spanA, spanB, chikou };
  });
}

export function computeIndicatorValues(
  data: Candle[],
  indicator: Indicator,
  fundamentals: FundamentalDataPoint[] | undefined
): (IndicatorValue | null)[] {
  if (indicator.customData) return computeCustomIndicatorValues(data, indicator.customData);
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
    case "zigzag":
      return computeZigZagValues(data, indicator.zigzagDeviation ?? 5);
    case "atr":
      return computeATRValues(data, period);
    case "supertrend":
      return computeSupertrendValues(data, period, indicator.supertrendMultiplier ?? 3);
    case "parabolicSar":
      return computeParabolicSARValues(data, indicator.sarStep ?? 0.02, indicator.sarMax ?? 0.2);
    case "gaps":
      return computeGapValues(data, indicator.gapsMinPercent ?? 0.1);
    case "ichimoku":
      return computeIchimokuValues(
        data,
        indicator.ichimokuConversionPeriod ?? 9,
        indicator.ichimokuBasePeriod ?? 26,
        indicator.ichimokuSpanPeriod ?? 52,
        indicator.ichimokuDisplacement ?? 26
      );
    case "sma":
    default:
      return computeSMAValues(data, period);
  }
}
