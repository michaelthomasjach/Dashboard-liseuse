import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { VWAP, BollingerBands, RSI, MACD, ATR } from "technicalindicators";
import { useChartDimensions, type ChartMargin } from "./internal/useChartDimensions";
import { useD3Zoom } from "./internal/useD3Zoom";
import { useAxisDragRescale } from "./internal/useAxisDragRescale";
import { useAxisWheelZoom } from "./internal/useAxisWheelZoom";
import { useFullscreen } from "./internal/useFullscreen";
import { ChartAxis } from "./ChartAxis";
import { Popover } from "../forms/Popover";
import { TextField } from "../forms/TextField";
import { NumberField } from "../forms/NumberField";
import { Checkbox } from "../forms/Checkbox";
import { Select } from "../forms/Select";
import { Modal } from "../primitives/Modal";
import { Tabs } from "../primitives/Tabs";
import {
  MaximizeIcon,
  MinimizeIcon,
  TrendLineIcon,
  HorizontalLineIcon,
  VerticalLineIcon,
  HorizontalRayIcon,
  ExtendedLineIcon,
  ChannelIcon,
  DisjointChannelIcon,
  FibonacciIcon,
  FibonacciExtensionIcon,
  ElliottImpulseIcon,
  ElliottCorrectionIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  ActivityIcon,
  SettingsIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  CandleModeIcon,
  LineCloseModeIcon,
  HeikinAshiModeIcon,
  RenkoModeIcon,
  LineBreakModeIcon,
  TpoModeIcon,
  MeasureIcon,
  MagnetIcon,
  RectangleShapeIcon,
  ElbowArrowIcon,
  BrushIcon,
  ArrowLineIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StarIcon,
  CloseIcon,
  LockIcon,
} from "../icons";
import "./charts-shared.css";

export interface Candle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** A marker shown at the bottom of the price plot (earnings, dividends, product updates…) — see
 *  `CandlestickChartProps.events`. `kind` is a free-form app-defined string (not a fixed enum, so
 *  a caller can introduce new event categories without a library change) grouping related events
 *  for the per-kind show/hide toggle in the chart-settings modal; its first letter (uppercased)
 *  is what actually renders on the badge unless `symbol` overrides it. */
export interface ChartEvent {
  date: Date;
  kind: string;
  /** Shown in the badge's tooltip, alongside the date. */
  label: string;
  /** 1-2 characters drawn inside the badge instead of `kind`'s own first letter. */
  symbol?: string;
  color?: string;
}

/** One pill in the symbol-search modal's category filter row — "all" and "favorites" are
 *  never a result's own `category` (they're just filter views over the same results), every
 *  other value can be. */
export type SymbolSearchCategory =
  | "all"
  | "stocks"
  | "futures"
  | "forex"
  | "crypto"
  | "indices"
  | "bonds"
  | "economy"
  | "options"
  | "favorites";

/** One row in the symbol-search modal's results list — see `CandlestickChartProps.symbolSearchResults`. */
export interface SymbolSearchResult {
  id: string;
  ticker: string;
  name: string;
  category: Exclude<SymbolSearchCategory, "all" | "favorites">;
  /** Exchange/data source, e.g. "NASDAQ", "EURONEXT" — shown right-aligned, just before the
   *  favorite star. */
  source: string;
  /** Small square logo. Omit to fall back to a colored placeholder (`logoColor`, or one cycled
   *  from a small palette) showing the ticker's first 1-2 letters instead. */
  logoUrl?: string;
  logoColor?: string;
}

export interface TrendLineDrawing {
  id: string;
  x1: Date;
  y1: number;
  x2: Date;
  y2: number;
  /** Optional label rendered near the line — see textHorizontalAlign/textVerticalAlign for where
   *  exactly, and textSize/textBold/textItalic/textAlignWithLine/textBackgroundColor for how. */
  text?: string;
  /** CSS color. Defaults to the theme's accent color. Also the text's own color. */
  color?: string;
  /** Line thickness in px. Default 1.5. */
  strokeWidth?: number;
  /** @deprecated Superseded by `lineStyle` — kept only so a `dashed: true` drawing saved before
   *  `lineStyle` existed keeps rendering dashed. Only read as a fallback when `lineStyle` itself
   *  is unset; setting `lineStyle` at all (including to `"solid"`) always wins over this. */
  dashed?: boolean;
  /** Solid or one of a few dash patterns. Default "solid" — except when unset *and* `dashed` is
   *  true, which reads as "dashed" (see `dashed` above). */
  lineStyle?: "solid" | "dashed" | "dotted" | "dashdot";
  /** How far past its own two defining points (x1/y1–x2/y2) the line is drawn — "none" stops
   *  exactly on them (a regular trend line's default), "left"/"right" extend past just that one
   *  edge, "both" past both (what the "extended" tool sets at creation). Kept independent of
   *  `lineType` so any two-point line can be extended after the fact from the edit modal's Style
   *  tab, not only ones drawn with the dedicated tool — rendering falls back to `lineType ===
   *  "extended" ? "both" : "none"` when this itself is unset, for the same saved-before-this-
   *  field-existed reason as `dashed`/`lineStyle` above. Only meaningful for a free two-point
   *  line (no lineType, or "extended"); ignored by every other lineType. */
  extend?: "none" | "left" | "right" | "both";
  /** Arrowhead at whichever endpoint sits further left/right *on screen* (not tied to which one
   *  is x1/y1 vs x2/y2 — a line drawn right-to-left still gets "arrowLeft" at its visual left
   *  end), same screen-space convention as `extend`. Only offered in the edit modal when `extend`
   *  is "none" — an infinitely-extended end has nothing meaningful to put an arrowhead on.
   *  Ignored by every lineType except a free two-point line (undefined, or "extended"). */
  arrowLeft?: boolean;
  arrowRight?: boolean;
  /** Font size, in px, for `text`. Default 11. */
  textSize?: number;
  /** Default true (matches the weight text has always rendered at). */
  textBold?: boolean;
  textItalic?: boolean;
  /** Rotates the text to match the line's own on-screen slope instead of staying upright.
   *  Default false. */
  textAlignWithLine?: boolean;
  /** Position along the line's own length. Default "center". */
  textHorizontalAlign?: "left" | "center" | "right";
  /** Position relative to the line itself — "top"/"bottom" sit just clear of it, "center" sits
   *  right on it. Default "top". */
  textVerticalAlign?: "top" | "center" | "bottom";
  /** Painted behind the text as a small padded rect. Unset (default): no background. */
  textBackgroundColor?: string;
  /** Constrains the line to one axis instead of a free-form two-point line: "horizontal" keeps
   *  y1 === y2 and can only be dragged vertically (its price/volume changes, never its date
   *  span, which always covers the full width); "vertical" keeps x1 === x2 and can only be
   *  dragged horizontally (its date changes, never its price span, which always covers the full
   *  height); "ray" is a "horizontal" that starts at x1 instead of the dataset's own start —
   *  drawn from there to the right edge only, not spanning the full width — draggable in both
   *  price and its start date, unlike "horizontal"/"vertical"'s single-axis handle. "extended" is
   *  a free two-point line like a regular trend line, except it's drawn all the way to the
   *  price section's left/right edges instead of stopping at x1/x2 — those two points still
   *  define its slope and are still what's draggable, the line just keeps going past them.
   *  "channel" draws a second line parallel to x1/y1–x2/y2, offset by `channelOffset` (a plain
   *  price delta, not a true perpendicular distance — same convention most trading platforms
   *  use for this tool) — both lines are segments matching x1/x2's own date span, neither
   *  extends. Omitted for a regular hand-drawn trend line — set automatically by the axis "+"
   *  buttons. "fibonacci" is a free two-point line like a regular trend line (same two draggable
   *  endpoints, no extra points needed) whose price range between y1 (0%) and y2 (100%) is
   *  sliced into the standard retracement ratios (see FIBONACCI_LEVELS) — each drawn as its own
   *  horizontal segment spanning x1/x2's date range, labeled with its ratio and price.
   *  "fibonacciExtension"/"elliottCorrection"/"elliottImpulse"/"disjointChannel" need more than
   *  two points — x1/y1 and x2/y2 are still the first two (placed the same way), the rest live
   *  in `extraPoints`, in click order. "disjointChannel" is a "channel" whose second line isn't
   *  forced parallel: the 3rd click still sets a price offset exactly like "channel", but instead
   *  of applying it as a constant shift, the offset's *far* point (extraPoints[0], lined up with
   *  x2/y2) is computed the same way channel's line 2 would be, while the *near* point
   *  (extraPoints[1], lined up with x1/y1) is mirrored — reflected across that far point's own
   *  price level — so line 2 slopes the opposite way from line 1 instead of running parallel to
   *  it. Both extraPoints are then just regular, independently draggable points like any other
   *  multi-point tool's, letting the mirrored angle be reshaped by hand afterward. "rectangle" is
   *  a free two-point shape (x1/y1 and x2/y2 as opposite corners) drawn as a stroked box with a
   *  faint fill of its own `color`. "elbowArrow" is an open-ended polyline (x1/y1, x2/y2, then as
   *  many `extraPoints` as were clicked — unlike every other multi-point tool, which needs a
   *  fixed number of clicks known in advance, the tool stays active and keeps appending a point
   *  per click until Escape commits whatever's been placed so far, same as an app's usual
   *  "polyline"/pen tool) drawn as a straight segment between each consecutive point, with a
   *  single arrowhead at the last one. "brush" is a freehand stroke: x1/y1 is where the drag
   *  started, x2/y2 where it ended, every point sampled in between lives in `extraPoints`, in
   *  order — unlike elbowArrow's clicked vertices, its points aren't independently draggable one
   *  at a time (there can be dozens of them), only the whole stroke together. "arrowUp"/
   *  "arrowDown" are single-point markers (x2/y2 always mirrors x1/y1, same convention as
   *  "horizontal") drawn as a small triangle pointing up/down, anchored just clear of the point
   *  itself. */
  lineType?:
    | "horizontal"
    | "vertical"
    | "ray"
    | "extended"
    | "channel"
    | "disjointChannel"
    | "fibonacci"
    | "fibonacciExtension"
    | "elliottImpulse"
    | "elliottCorrection"
    | "rectangle"
    | "elbowArrow"
    | "brush"
    | "arrowUp"
    | "arrowDown";
  /** Which value scale a "horizontal"/"ray" line's y is expressed in. Ignored for "vertical"
   *  lines and regular trend lines. Default "price". */
  valueAxis?: "price" | "volume";
  /** "channel" only: the second line's constant price offset from the first (x1/y1–x2/y2),
   *  set by the tool's third click. */
  channelOffset?: number;
  /** Points beyond x1/y1 (the 1st) and x2/y2 (the 2nd), in click order — "fibonacciExtension"
   *  needs 1 (its 3rd point), "elliottCorrection" 2, "elliottImpulse" 4, "disjointChannel" 2
   *  (line 2's own two points — see `lineType` above for how they're derived). Unused otherwise. */
  extraPoints?: { x: Date; y: number }[];
}

/** Standard Fibonacci retracement ratios, 0 (y1) to 1 (y2) — the same default set most trading
 *  platforms show (TradingView included). Not configurable per drawing: there was no request for
 *  that, and hand-rolling a "which levels" UI for one tool would be a lot of surface area for a
 *  set virtually everyone leaves at the defaults anyway. */
const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/** Standard Fibonacci extension ratios — projected from the 3rd point (C) by this fraction of
 *  the 1st-to-2nd (A-to-B) leg's own price span, the conventional "trend-based Fib extension"
 *  formula most trading platforms use. */
const FIBONACCI_EXTENSION_LEVELS = [0, 0.382, 0.618, 1, 1.382, 1.618, 2, 2.618];

/** How many points *beyond* x1/y1 and x2/y2 each multi-point tool collects before committing,
 *  and what each of those extra points (plus the first two) is labeled in the edit modal.
 *  Governs two different things depending on the tool: for fibonacciExtension/elliottCorrection/
 *  elliottImpulse, `handleOverlayClick` uses `extraPoints` to drive the actual generic
 *  click-collection loop (each click becomes one more raw point, verbatim). "disjointChannel" is
 *  here *only* for its edit-modal labels — its own placement flow is entirely custom (see
 *  handleOverlayClick's dedicated branch, checked before the generic one below it ever runs) since
 *  its 4th point is computed, not clicked. Tools not listed here (trendline/extended/fibonacci: 2
 *  points total; channel: 3, but its 3rd click sets `channelOffset` instead of a raw point,
 *  handled separately) don't use this at all. */
const MULTI_POINT_TOOLS: Partial<Record<DrawingToolType, { extraPoints: number; labels: string[] }>> = {
  fibonacciExtension: { extraPoints: 1, labels: ["Point A", "Point B", "Point C"] },
  elliottCorrection: { extraPoints: 2, labels: ["Point 0", "Point A", "Point B", "Point C"] },
  elliottImpulse: { extraPoints: 4, labels: ["Point 0", "Point 1", "Point 2", "Point 3", "Point 4", "Point 5"] },
  disjointChannel: { extraPoints: 2, labels: ["Point 1", "Point 2", "Point 3", "Point 4"] },
};

// Short vertex labels drawn directly on the chart next to each point — distinct from
// MULTI_POINT_TOOLS' longer "Point X" labels, which are for the edit modal's field list instead.
const ELLIOTT_IMPULSE_VERTEX_LABELS = ["0", "1", "2", "3", "4", "5"];
const ELLIOTT_CORRECTION_VERTEX_LABELS = ["0", "A", "B", "C"];

/** All of a drawing's points in click order (x1/y1, x2/y2, then extraPoints) — the shape every
 *  multi-point tool's rendering/hit-testing/dragging works off of instead of the named fields
 *  directly. */
function allPointsOf(dr: TrendLineDrawing): DataPoint[] {
  return [{ x: dr.x1, y: dr.y1 }, { x: dr.x2, y: dr.y2 }, ...(dr.extraPoints ?? [])];
}

interface DataPoint {
  x: Date;
  y: number;
}

export type IndicatorKind = "sma" | "ema" | "wma" | "vwap" | "bollinger" | "rsi" | "chop" | "macd";

/** A 3-line band value (Bollinger) instead of a single line's value — the draw effect tells the
 *  two apart with a plain `typeof value === "number"` check. */
export interface IndicatorBand {
  upper: number;
  middle: number;
  lower: number;
}

/** MACD's value shape: the MACD line always has a value once past its own warm-up, but `signal`
 *  (an EMA *of* the MACD line) and `histogram` (MACD − signal) both start out `null` for a
 *  further stretch until the signal EMA itself has enough history — same "null until ready"
 *  convention as everything else here, just per-field instead of the whole value. */
export interface IndicatorMACD {
  macd: number;
  signal: number | null;
  histogram: number | null;
}

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

interface IndicatorCatalogEntry {
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
  category: "Moyennes mobiles" | "Volatilité" | "Momentum";
}

const INDICATOR_CATALOG: IndicatorCatalogEntry[] = [
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
];

function indicatorCatalogEntry(kind: IndicatorKind): IndicatorCatalogEntry {
  return INDICATOR_CATALOG.find((entry) => entry.kind === kind) ?? INDICATOR_CATALOG[0];
}

function indicatorLabel(indicator: Indicator): string {
  const entry = indicatorCatalogEntry(indicator.kind);
  if (indicator.kind === "macd") return `MACD(${indicator.fastPeriod ?? 12},${indicator.slowPeriod ?? 26},${indicator.signalPeriod ?? 9})`;
  if (!entry.hasPeriod) return entry.shortLabel;
  if (entry.hasStdDev) return `${entry.shortLabel}(${indicator.period},${indicator.stdDev ?? 2})`;
  return `${entry.shortLabel}(${indicator.period})`;
}

const INDICATOR_COLORS = ["#e0a95c", "#6c87c9", "#7fb37f", "#c96c8f", "#9a7fd1"];

function defaultIndicatorColor(index: number): string {
  return INDICATOR_COLORS[((index % INDICATOR_COLORS.length) + INDICATOR_COLORS.length) % INDICATOR_COLORS.length];
}

// Distinct from INDICATOR_COLORS so an event badge never accidentally matches an indicator
// line's own color at a glance.
const EVENT_COLORS = ["#d18b3d", "#4f8fd1", "#3ea377", "#c15d7a", "#8a6fd6", "#c9a13a"];

function defaultEventColor(index: number): string {
  return EVENT_COLORS[((index % EVENT_COLORS.length) + EVENT_COLORS.length) % EVENT_COLORS.length];
}

// Each returns one value per candle (null during the warm-up period before enough history has
// accumulated), so the result stays index-aligned with `data` — the draw effect windows it down
// to the visible range the exact same way `visible` windows `data` itself.
function computeSMAValues(data: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) sum -= data[i - period].close;
    if (i >= period - 1) result[i] = sum / period;
  }
  return result;
}

function computeEMAValues(data: Candle[], period: number): (number | null)[] {
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

function computeWMAValues(data: Candle[], period: number): (number | null)[] {
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
function computeVWAPValues(data: Candle[]): (number | null)[] {
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
function computeBollingerValues(data: Candle[], period: number, stdDev: number): (IndicatorBand | null)[] {
  if (data.length === 0) return [];
  const values = BollingerBands.calculate({ period, stdDev, values: data.map((d) => d.close) });
  const offset = data.length - values.length;
  const result: (IndicatorBand | null)[] = new Array(offset).fill(null);
  return result.concat(values.map((v) => ({ upper: v.upper, middle: v.middle, lower: v.lower })));
}

function computeRSIValues(data: Candle[], period: number): (number | null)[] {
  if (data.length === 0) return [];
  const values = RSI.calculate({ period, values: data.map((d) => d.close) });
  const offset = data.length - values.length;
  return new Array(offset).fill(null).concat(values);
}

// Not in `technicalindicators` (no Choppiness Index there), so hand-rolled from its plain
// definition: 100 * log10(sum of true range over `period`) / (highest high − lowest low over the
// same window), scaled by log10(period) — same O(n·period) shape as the hand-rolled WMA above,
// there's no rolling-window shortcut without also tracking a separate max/min structure.
function computeCHOPValues(data: Candle[], period: number): (number | null)[] {
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

function computeMACDValues(data: Candle[], fastPeriod: number, slowPeriod: number, signalPeriod: number): (IndicatorMACD | null)[] {
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

function computeIndicatorValues(data: Candle[], indicator: Indicator): (number | IndicatorBand | IndicatorMACD | null)[] {
  const period = Math.max(1, Math.round(indicator.period));
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

export type ChartDisplayMode = "candle" | "line" | "heikinAshi" | "renko" | "lineBreak" | "tpo";

/** Heikin Ashi keeps a 1:1 index/date correspondence with `data` (unlike Renko/Line Break
 *  below) — each output candle just replaces the OHLC values the regular candle-drawing loop
 *  reads at the same index, so it needs no changes to the index-based scale/zoom/crosshair
 *  machinery that everything else in this file assumes `data` provides. */
function computeHeikinAshiCandles(data: Candle[]): Candle[] {
  const out: Candle[] = [];
  let prevOpen = 0;
  let prevClose = 0;
  data.forEach((d, i) => {
    const haClose = (d.open + d.high + d.low + d.close) / 4;
    const haOpen = i === 0 ? (d.open + d.close) / 2 : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(d.high, haOpen, haClose);
    const haLow = Math.min(d.low, haOpen, haClose);
    out.push({ ...d, open: haOpen, high: haHigh, low: haLow, close: haClose });
    prevOpen = haOpen;
    prevClose = haClose;
  });
  return out;
}

/** A Renko/Line Break "brick": unlike a candle, it doesn't own a single index — it forms over a
 *  run of source candles, from the one right after the previous brick closed (`startIndex`) to
 *  the one whose close confirmed it (`endIndex`). Rendered as a rectangle spanning exactly that
 *  index range on the existing index-based X scale, so bricks stay perfectly in sync with
 *  zoom/pan/volume/indicators/drawings instead of needing a separate scale of their own — the
 *  tradeoff is that brick width varies with how many source candles it took to form, rather than
 *  the uniform width Renko/Line Break charts have on a dedicated (non-time) axis. */
interface PriceBrick {
  open: number;
  close: number;
  direction: 1 | -1;
  startIndex: number;
  endIndex: number;
}

/** Brick size = ATR(period) over the whole dataset — the standard, volatility-adaptive way to
 *  size Renko bricks (vs. a fixed price or a % of price, neither of which adapts to how much the
 *  instrument actually moves). Falls back to the plain average true range over however much data
 *  exists when there's not enough of it for the ATR library to warm up (period + 1 candles),
 *  rather than leaving Renko with zero bricks on a short dataset. */
function computeRenkoBrickSize(data: Candle[], period: number): number {
  if (data.length < 2) return 0;
  const values = ATR.calculate({ period, high: data.map((d) => d.high), low: data.map((d) => d.low), close: data.map((d) => d.close) });
  const last = values.length > 0 ? values[values.length - 1] : undefined;
  if (last && last > 0) return last;
  const trueRanges = data.map((d, i) => {
    const prevClose = i > 0 ? data[i - 1].close : d.close;
    return Math.max(d.high - d.low, Math.abs(d.high - prevClose), Math.abs(d.low - prevClose));
  });
  const avg = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  return avg > 0 ? avg : 1;
}

/** Traditional close-based Renko: a new brick forms every time the close moves `brickSize` past
 *  the last brick's own close, one brick per `brickSize` of movement (a single big move can spawn
 *  several bricks between two candles) — reverses direction on a single opposite brick, the same
 *  simplification most retail platforms use instead of the stricter "2 bricks to reverse" rule.
 *
 *  BUG FIXED: an earlier version gated each direction's check on the *current* `direction` itself
 *  (`while (direction >= 0 && price >= basePrice + brickSize)`, and the mirror image below it) —
 *  meant to stop the very first candle from qualifying for both directions at once, but it also
 *  permanently locked out reversals: once direction settled to -1 after the first down-brick,
 *  `direction >= 0` could never be true again for the rest of the dataset, so no up-brick could
 *  ever form again either (and symmetrically for 1). On real (non-monotonic) data this collapsed
 *  the whole series to just its first brick — exactly the "Renko doesn't work" symptom. Checking
 *  the *price* against both thresholds unconditionally (whichever qualifies first) instead of
 *  gating on the brick's own last direction fixes this — direction is now purely a label on each
 *  brick, not a one-way gate on what can happen next. */
function computeRenkoBricks(data: Candle[], brickSize: number): PriceBrick[] {
  if (brickSize <= 0 || data.length === 0) return [];
  const bricks: PriceBrick[] = [];
  let basePrice = data[0].close;
  let startIndex = 0;
  for (let i = 1; i < data.length; i++) {
    const price = data[i].close;
    // A single candle can confirm more than one brick if it moves far enough — keep peeling
    // bricks off the same candle until it's no longer past the next threshold in either
    // direction. Checked as if/else-if (not two independent whiles) since after moving basePrice
    // one way, the opposite threshold is now further away, never closer — so at most one of the
    // two conditions can ever be true on a given pass.
    let moved = true;
    while (moved) {
      moved = false;
      if (price >= basePrice + brickSize) {
        bricks.push({ open: basePrice, close: basePrice + brickSize, direction: 1, startIndex, endIndex: i });
        basePrice += brickSize;
        startIndex = i;
        moved = true;
      } else if (price <= basePrice - brickSize) {
        bricks.push({ open: basePrice, close: basePrice - brickSize, direction: -1, startIndex, endIndex: i });
        basePrice -= brickSize;
        startIndex = i;
        moved = true;
      }
    }
  }
  return bricks;
}

/** N-line break (classic "Three Line Break" at lineCount = 3): a new line extends the run
 *  whenever the close makes a new high (uptrend) / low (downtrend) past the last line's own
 *  close; it only reverses once the close breaks past the extreme of the last `lineCount` lines
 *  in the opposite direction — closes that do neither (inside the last line's range) produce no
 *  new line at all, unlike Renko where every candle is at least checked against a fixed step. */
function computeLineBreakBricks(data: Candle[], lineCount: number): PriceBrick[] {
  if (data.length < 2) return [];
  const closes = data.map((d) => d.close);
  const lines: PriceBrick[] = [];
  let startIndex = 0;
  for (let i = 1; i < closes.length; i++) {
    const price = closes[i];
    if (lines.length === 0) {
      const direction: 1 | -1 = price >= closes[0] ? 1 : -1;
      lines.push({ open: closes[0], close: price, direction, startIndex: 0, endIndex: i });
      startIndex = i;
      continue;
    }
    const last = lines[lines.length - 1];
    const extendsRun = last.direction === 1 ? price > last.close : price < last.close;
    if (extendsRun) {
      lines.push({ open: last.close, close: price, direction: last.direction, startIndex, endIndex: i });
      startIndex = i;
      continue;
    }
    const window = lines.slice(-lineCount);
    const extreme =
      last.direction === 1
        ? Math.min(...window.map((l) => Math.min(l.open, l.close)))
        : Math.max(...window.map((l) => Math.max(l.open, l.close)));
    const reverses = last.direction === 1 ? price < extreme : price > extreme;
    if (reverses) {
      lines.push({ open: last.close, close: price, direction: last.direction === 1 ? -1 : 1, startIndex, endIndex: i });
      startIndex = i;
    }
  }
  return lines;
}

interface TpoProfile {
  bins: { priceLow: number; priceHigh: number; count: number }[];
  poc: number;
  vah: number;
  val: number;
}

/** "Time Price Opportunities": approximates time-spent-at-price (real TPO needs intrabar/tick
 *  data, not available here) by spreading one unit of weight across every price bin a candle's
 *  [low, high] range overlaps — a reasonable stand-in given only OHLC. POC is the busiest bin;
 *  the value area expands outward from it, always toward whichever neighboring bin holds more,
 *  until it encloses ≥70% of the total weight — the standard Market Profile definition. */
function computeTPOProfile(candles: Candle[], binCount: number): TpoProfile | null {
  if (candles.length === 0) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const d of candles) {
    lo = Math.min(lo, d.low);
    hi = Math.max(hi, d.high);
  }
  if (!(hi > lo)) return null;
  const binSize = (hi - lo) / binCount;
  const counts = new Array(binCount).fill(0);
  for (const d of candles) {
    const startBin = Math.min(binCount - 1, Math.max(0, Math.floor((d.low - lo) / binSize)));
    const endBin = Math.min(binCount - 1, Math.max(0, Math.floor((d.high - lo) / binSize)));
    for (let b = startBin; b <= endBin; b++) counts[b] += 1;
  }
  const total = counts.reduce((a: number, b: number) => a + b, 0);
  if (total === 0) return null;
  let pocIndex = 0;
  for (let b = 1; b < binCount; b++) if (counts[b] > counts[pocIndex]) pocIndex = b;
  let areaLow = pocIndex;
  let areaHigh = pocIndex;
  let areaSum = counts[pocIndex];
  while (areaSum / total < 0.7 && (areaLow > 0 || areaHigh < binCount - 1)) {
    const below = areaLow > 0 ? counts[areaLow - 1] : -1;
    const above = areaHigh < binCount - 1 ? counts[areaHigh + 1] : -1;
    if (above >= below) {
      areaHigh++;
      areaSum += counts[areaHigh];
    } else {
      areaLow--;
      areaSum += counts[areaLow];
    }
  }
  const bins = counts.map((count: number, b: number) => ({ priceLow: lo + b * binSize, priceHigh: lo + (b + 1) * binSize, count }));
  return {
    bins,
    poc: lo + (pocIndex + 0.5) * binSize,
    vah: lo + (areaHigh + 1) * binSize,
    val: lo + areaLow * binSize,
  };
}

type DrawingToolType =
  | "trendline"
  | "horizontal"
  | "vertical"
  | "ray"
  | "extended"
  | "channel"
  | "disjointChannel"
  | "fibonacci"
  | "fibonacciExtension"
  | "elliottImpulse"
  | "elliottCorrection"
  | "measure"
  | "rectangle"
  | "elbowArrow"
  | "brush"
  | "arrowUp"
  | "arrowDown"
  | "arrowLine";

interface DrawingToolDef {
  type: DrawingToolType;
  label: string;
  icon: typeof TrendLineIcon;
}

interface DrawingToolCategory {
  /** Stable key — also what tracks each category's own "last picked tool" and open/closed
   *  dropdown state, so it has to stay unique and never change once shipped. */
  id: string;
  tools: DrawingToolDef[];
}

// Each category gets its own button + chevron + dropdown in the rail (see the JSX below) —
// the button represents whichever of its own tools was picked last (defaulting to the first),
// same as the single button used to for the whole flat list before categories existed.
const DRAWING_TOOL_CATEGORIES: DrawingToolCategory[] = [
  {
    id: "lines",
    tools: [
      { type: "trendline", label: "Ligne de tendance", icon: TrendLineIcon },
      { type: "extended", label: "Ligne étendue", icon: ExtendedLineIcon },
      { type: "channel", label: "Canal", icon: ChannelIcon },
      { type: "disjointChannel", label: "Canal disjoint", icon: DisjointChannelIcon },
      { type: "horizontal", label: "Ligne horizontale", icon: HorizontalLineIcon },
      { type: "ray", label: "Ligne horizontale (à partir d'une date)", icon: HorizontalRayIcon },
      { type: "vertical", label: "Ligne verticale", icon: VerticalLineIcon },
    ],
  },
  {
    id: "fibonacci",
    tools: [
      { type: "fibonacci", label: "Retracement de Fibonacci", icon: FibonacciIcon },
      { type: "fibonacciExtension", label: "Extension de Fibonacci", icon: FibonacciExtensionIcon },
    ],
  },
  {
    id: "elliott",
    tools: [
      { type: "elliottImpulse", label: "Vague d'Elliott (impulsive)", icon: ElliottImpulseIcon },
      { type: "elliottCorrection", label: "Vague d'Elliott (correctrice)", icon: ElliottCorrectionIcon },
    ],
  },
  {
    id: "shapes",
    tools: [
      { type: "rectangle", label: "Rectangle", icon: RectangleShapeIcon },
      { type: "elbowArrow", label: "Flèche coudée", icon: ElbowArrowIcon },
      { type: "brush", label: "Pinceau", icon: BrushIcon },
      { type: "arrowUp", label: "Flèche haut", icon: ArrowUpIcon },
      { type: "arrowDown", label: "Flèche bas", icon: ArrowDownIcon },
      { type: "arrowLine", label: "Ligne fléchée", icon: ArrowLineIcon },
    ],
  },
  {
    id: "measure",
    tools: [{ type: "measure", label: "Mesure", icon: MeasureIcon }],
  },
];

function categoryOfTool(type: DrawingToolType): DrawingToolCategory {
  return DRAWING_TOOL_CATEGORIES.find((c) => c.tools.some((t) => t.type === type)) ?? DRAWING_TOOL_CATEGORIES[0];
}

interface ChartDisplayModeDef {
  mode: ChartDisplayMode;
  label: string;
  icon: typeof CandleModeIcon;
}

const CHART_DISPLAY_MODES: ChartDisplayModeDef[] = [
  { mode: "candle", label: "Bougies", icon: CandleModeIcon },
  { mode: "line", label: "Ligne de clôture", icon: LineCloseModeIcon },
  { mode: "heikinAshi", label: "Heikin Ashi", icon: HeikinAshiModeIcon },
  { mode: "renko", label: "Renko", icon: RenkoModeIcon },
  { mode: "lineBreak", label: "Line Break", icon: LineBreakModeIcon },
  { mode: "tpo", label: "Time Price Opportunities (VAH/POC/VAL)", icon: TpoModeIcon },
];

const SYMBOL_SEARCH_CATEGORIES: { value: SymbolSearchCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stocks", label: "Stocks" },
  { value: "futures", label: "Futures" },
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
  { value: "indices", label: "Indices" },
  { value: "bonds", label: "Bonds" },
  { value: "economy", label: "Economy" },
  { value: "options", label: "Options" },
  { value: "favorites", label: "Favoris" },
];

// Distinct from EVENT_COLORS/INDICATOR_COLORS so a symbol's own logo placeholder never
// accidentally matches an indicator line or event badge's color at a glance.
const SYMBOL_LOGO_COLORS = ["#5c7cd1", "#3ea377", "#c9a13a", "#c15d7a", "#8a6fd6", "#4f9fc9"];

function defaultSymbolLogoColor(index: number): string {
  return SYMBOL_LOGO_COLORS[((index % SYMBOL_LOGO_COLORS.length) + SYMBOL_LOGO_COLORS.length) % SYMBOL_LOGO_COLORS.length];
}

export interface TimeframeOption {
  label: string;
  value: string;
}

export interface TimeframeGroup {
  group: string;
  options: TimeframeOption[];
}

export type TimeframeEntry = TimeframeOption | TimeframeGroup;

function isTimeframeGroup(entry: TimeframeEntry): entry is TimeframeGroup {
  return "options" in entry;
}

function findTimeframeLabel(entries: TimeframeEntry[] | undefined, value: string | undefined): string | null {
  if (!entries || !value) return null;
  for (const entry of entries) {
    if (isTimeframeGroup(entry)) {
      const found = entry.options.find((o) => o.value === value);
      if (found) return found.label;
    } else if (entry.value === value) {
      return entry.label;
    }
  }
  return null;
}

export interface CandlestickChartProps {
  data: Candle[];
  /** Fixed pixel width. Omitted (default): fills 100% of the parent container's width, like
   *  every other chart in this library — pass a number only to opt out of that. Ignored while
   *  in fullscreen (the toggle always fills the viewport). */
  width?: number;
  /** Fixed pixel height. Default 380. Ignored while in fullscreen (the toggle always fills the
   *  viewport). */
  height?: number;
  zoomable?: boolean;
  showVolume?: boolean;
  formatDate?: (d: Date) => string;
  formatPrice?: (v: number) => string;
  formatVolume?: (v: number) => string;
  /** Shows a fullscreen toggle button in the header. Default true. */
  fullscreenToggle?: boolean;
  /** Shows a left-docked toolbar for drawing annotations directly on the chart (currently: trend line). Default false. */
  drawingTools?: boolean;
  /** Uncontrolled initial set of trend-line drawings. */
  defaultDrawings?: TrendLineDrawing[];
  /** Fires whenever a drawing is added, moved, or edited. */
  onDrawingsChange?: (drawings: TrendLineDrawing[]) => void;
  /** Shows a header button that opens the technical-indicator picker (SMA, EMA, WMA…) and the
   *  active-indicator legend in the plot's top-left corner. Default false. */
  showIndicators?: boolean;
  /** Uncontrolled initial set of technical indicators. */
  defaultIndicators?: Indicator[];
  /** Fires whenever an indicator is added, edited, or removed. */
  onIndicatorsChange?: (indicators: Indicator[]) => void;
  /** How many of the most recent candles are visible when the chart first mounts (applied once,
   *  as an initial zoom/pan — the user can still zoom/pan freely afterward). `undefined`/0/a
   *  value ≥ `data.length` shows the whole dataset, same as before this prop existed. Default 500. */
  initialVisibleCandles?: number;
  /** When true, the price axis continuously auto-fits to the min/max of whatever candles are
   *  currently visible on the X axis (recalculated on every pan/zoom), instead of a single
   *  static domain sized to the whole dataset — until the user manually zooms/pans the Y axis
   *  themselves (wheel or drag on the axis, or dragging the plot vertically), at which point
   *  auto-fit stops so their adjustment isn't immediately overwritten. Clicking "Réinitialiser
   *  le zoom" re-engages it. Default false. Also toggleable live from the chart-settings modal
   *  (double-click the symbol/chart-type label, top-left of the price plot) — that toggle owns
   *  an internal copy seeded from this prop, same uncontrolled pattern as `drawings`/
   *  `indicators`, reported back via `onYAutoScalingChange`. */
  YAutoScaling?: boolean;
  onYAutoScalingChange?: (value: boolean) => void;
  /** Timeframe/interval options shown as a dropdown in the header — flat, or grouped (e.g. one
   *  group per "Minutes"/"Heures"/"Jours"), matching a typical trading-platform interval menu.
   *  This only renders the picker and reports the choice via `onTimeframeChange`; resampling
   *  `data` into the new interval is left to the caller. */
  timeframes?: TimeframeEntry[];
  /** Currently selected timeframe's `value`, to highlight it in the menu. */
  timeframe?: string;
  onTimeframeChange?: (value: string) => void;
  /** How the price series itself is drawn — bougies japonaises (défaut), ligne de clôture,
   *  Heikin Ashi, Renko, Line Break, ou Time Price Opportunities (bougies + histogramme de
   *  distribution des prix avec VAH/POC/VAL). Shown as a header button (icône du mode courant)
   *  juste à côté du sélecteur de timeframe, ouvrant un menu des six modes. Uncontrolled, like
   *  `drawings`/`indicators` — see `defaultChartDisplayMode`/`onChartDisplayModeChange`. */
  defaultChartDisplayMode?: ChartDisplayMode;
  onChartDisplayModeChange?: (mode: ChartDisplayMode) => void;
  /** ATR period used to size Renko bricks (a new brick forms every time the close moves this
   *  many candles' worth of average true range past the last one) — recomputed from the whole
   *  dataset, not just what's visible. Default 14. */
  renkoAtrPeriod?: number;
  /** Instrument name shown top-left of the price plot, followed by the current chart-type label
   *  (e.g. "AAPL · Bougies") — double-clicking that label opens the chart-settings modal (up/down
   *  bar colors, auto-rescale, event visibility). Omit to show just the chart-type label on its
   *  own (the settings modal is still reachable by double-clicking it). */
  symbol?: string;
  /** Markers shown as small badges along the bottom of the price plot (earnings, dividends,
   *  product updates…) — each `kind` groups related events and can be shown/hidden independently
   *  from the chart-settings modal (double-click the symbol/chart-type label). Purely
   *  presentational: positions are derived from `date` via the same index-based X scale
   *  everything else uses, so they pan/zoom with the candles. */
  events?: ChartEvent[];
  /** Makes `symbol` its own hoverable/clickable zone (background on hover, separate from the
   *  chart-type label right next to it) — clicking it opens a "Symbol search" modal (search
   *  field + category filter pills + a results list you provide). Default false — with
   *  `symbol` set but this left off, the label still renders, just as inert text. Ignored
   *  entirely if `symbol` itself is omitted (nothing to click). */
  symbolSearch?: boolean;
  /** Results currently shown in the symbol-search modal. Searching/filtering — including for
   *  the "Favoris" pill, see `defaultFavoriteSymbolIds` — is entirely the caller's job: this is
   *  only what actually renders, driven by `onSymbolSearchChange`. */
  symbolSearchResults?: SymbolSearchResult[];
  /** Fires whenever the search modal's query text or category pill changes (including once,
   *  right when the modal opens, with the query/category at their defaults) so the caller can
   *  fetch/filter and update `symbolSearchResults` accordingly. `category: "favorites"` asks
   *  for whichever results the caller currently considers favorited — `query` is meaningless in
   *  that case and should be ignored. */
  onSymbolSearchChange?: (query: string, category: SymbolSearchCategory) => void;
  /** Fires when a result row is clicked — the modal closes automatically right after. */
  onSymbolSelect?: (result: SymbolSearchResult) => void;
  /** Uncontrolled set of favorited result ids — the star toggle at the far right of each result
   *  row (visible on hover, or always once favorited). Persisted the same way as `drawings`/
   *  `indicators`: seeds initial state, changes reported back via `onFavoriteSymbolIdsChange`. */
  defaultFavoriteSymbolIds?: string[];
  onFavoriteSymbolIdsChange?: (ids: string[]) => void;
  /** A dashed line across the price plot at the last candle's close, its price on the Y axis
   *  (colored up/down against the previous close), and — right below that badge — a MM:SS
   *  countdown to the next candle, ticking down every second. The countdown's interval is
   *  inferred from the gap between the last two candles (so a 5-minute series counts down from
   *  05:00), not a separate prop — pass data with at least 2 candles for it to show at all.
   *  Meant for genuinely live-updating `data` (see the "Marché ouvert (simulation)" story); on
   *  static historical data the countdown will just sit at 00:00 once it reaches it, since
   *  nothing here fetches new candles on its own. Default false. */
  livePrice?: boolean;
  margin?: Partial<ChartMargin>;
  className?: string;
}

const DEFAULT_MARGIN: Partial<ChartMargin> = { top: 0, right: 56, bottom: 24, left: 0 };
/** Screen-space distance (px) under which the pointer counts as "hovering" a drawn line. */
const DRAWING_HIT_DISTANCE = 8;
/** Width of the drawing-tools rail. Added to the left margin so the plot/axes never draw
 *  under it — the rail gets its own reserved strip instead of overlaying the chart. */
const TOOLS_RAIL_WIDTH = 40;
/** Height of the (non-floating) header row holding the timeframe picker and reset/fullscreen
 *  buttons — subtracted from the available height before laying out the plot itself. */
const HEADER_HEIGHT = 40;
/** Distance (px) the date "+" button sits inset from the plot's own bottom edge — close to the
 *  date axis it mirrors (but clear of the date label's own badge just below the plot), and
 *  still inside the interactive rect so hovering it never counts as leaving the plot (see
 *  .lq-chart__plot's onPointerLeave). */
const CROSSHAIR_ADD_INSET = 20;
/** How far the price/volume value badges' own left edge overlaps the chart, so their background
 *  englobes the "+" button living at its start instead of the button sitting outside it. */
const AXIS_VALUE_Y_OVERLAP = 20;
/** Vertical gap between the live-price badge and the countdown badge sitting right below it. */
const LIVE_COUNTDOWN_OFFSET = 20;
/** Half the rendered height of a `.lq-chart__axis-value--y` badge — see clampToPriceAxis. */
const AXIS_BADGE_HALF_HEIGHT = 10;
/** Single drag-handle position for an axis-constrained line, as a fraction of the plot's own
 *  size along the axis it doesn't move on: a horizontal line's handle sits 1/4 of the width in
 *  from the right edge, a vertical line's handle 1/4 of the height down from the top. */
const AXIS_HANDLE_FRACTION_X = 0.75;
const AXIS_HANDLE_FRACTION_Y = 0.25;
/** Event badges (see `ChartEvent`) sit in a fixed row this many px above the price/volume
 *  divider — always tied to the divider, never to whatever's currently the tallest/shortest
 *  visible candle, so the row doesn't jump around while panning/zooming. */
const EVENT_MARKER_OFFSET = 14;
const EVENT_MARKER_RADIUS = 8;
/** Upper bound on how many date labels the bottom axis shows at once, regardless of how many
 *  candles are actually in view — matches BarChart/DeltaChart's own categorical-axis throttle. */
const MAX_DATE_TICKS = 12;
const DEFAULT_DRAWING_COLOR = "#6c87c9";
// Stable reference (not a fresh `[]` every render) for `visibleDrawings` to fall back to while
// drawings are hidden — avoids retriggering effects/memos keyed on it purely from array identity.
const EMPTY_DRAWINGS: TrendLineDrawing[] = [];
/** How far past the data's own edges panning can reveal empty "future"/"past" space, as a
 *  fraction of the *current* viewport width — not a fixed candle count, which would feel
 *  enormous zoomed in (a handful of real candles next to a huge empty block) and negligible
 *  zoomed out. See the custom `constrain` passed to useD3Zoom below for the derivation: it
 *  caps how far each edge of the visible domain can sit past [0, data.length] to this fraction
 *  of the viewport, at every zoom level. */
const MAX_EMPTY_FRACTION = 0.5;
/** Height (px) of a sub-pane's (volume, or an "own"-pane indicator — RSI/CHOP/MACD) header strip
 *  when collapsed — the full pane shrinks to exactly this, full width, showing just its name and
 *  an expand button. */
const SUB_PANE_COLLAPSED_HEIGHT = 40;
/** Default height of an expanded sub-pane, as a fraction of the plot's own bounded height — the
 *  starting point before any manual resize (see paneHeightFractions/startPaneResize). */
const DEFAULT_PANE_HEIGHT_FRACTION = 0.22;
/** Drag-to-resize bounds for a sub-pane, same fraction units as DEFAULT_PANE_HEIGHT_FRACTION. */
const MIN_PANE_HEIGHT_FRACTION = 0.08;
const MAX_PANE_HEIGHT_FRACTION = 0.6;

// A canvas 1px line drawn at an integer y (e.g. moveTo(0, 40)) straddles two physical pixel rows
// half-and-half, so it rasterizes as a ~2px anti-aliased blur instead of a crisp line — unlike an
// SVG/CSS border at the same nominal position, which renders crisp. Offsetting to the pixel's
// center (y + 0.5) keeps the 1px stroke entirely within one row, matching the SVG-drawn dividers
// these canvas lines are meant to continue seamlessly into.
function snapPixel(v: number): number {
  return Math.round(v) + 0.5;
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Rounded at the *source* — every place a price gets computed from a pixel position (a new
 *  point's placement, any kind of drag) — not just when the edit modal's own fields are typed
 *  into, so a freshly-drawn or freshly-dragged line's coordinates never carry more precision
 *  than the modal shows in the first place (a raw scale.invert() pixel→price conversion easily
 *  produces a dozen-plus decimal digits). */
function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/** MM:SS, rounded up so a fresh 5-minute candle reads "05:00" (not "04:59") the instant it
 *  starts — ceil(ms / 1000) rather than floor. Negative/zero clamps to "00:00" rather than
 *  going negative, since nothing here forces a new candle to actually arrive on schedule. */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// "extended" lines keep their own two defining points (x1/y1/x2/y2, still what's draggable) but
// draw all the way to the price section's left/right edges instead of stopping at them —
// screen-space linear extrapolation along the same slope. A perfectly vertical segment (in
// screen space) has nothing to extend into on the X axis, so it's returned unchanged. `direction`
// picks which edge(s) actually move — "left"/"right" only push the one endpoint on that side out
// to xMin/xMax respectively, leaving the other exactly where it was; "both" does what the
// original two-direction-only version always did.
function extendSegmentToEdges(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  xMin: number,
  xMax: number,
  direction: "left" | "right" | "both" = "both"
): { x1: number; y1: number; x2: number; y2: number } {
  if (x1 === x2) return { x1, y1, x2, y2 };
  const slope = (y2 - y1) / (x2 - x1);
  const left = direction === "right" ? { x1, y1 } : { x1: xMin, y1: y1 + slope * (xMin - x1) };
  const right = direction === "left" ? { x2, y2 } : { x2: xMax, y2: y1 + slope * (xMax - x1) };
  return { ...left, ...right };
}

// A drawing's actual extend setting, folding in the "extended" tool's own implicit "both" for a
// drawing saved before the `extend` field existed (see TrendLineDrawing.extend's own doc for why
// it's independent of lineType instead of just always being "extended" vs. not).
function effectiveExtendOf(dr: TrendLineDrawing): "none" | "left" | "right" | "both" {
  return dr.extend ?? (dr.lineType === "extended" ? "both" : "none");
}

// Shared by "channel" and "disjointChannel": the 3rd click's own vertical distance from line 1
// (p1→p2) at that click's date — a constant applied uniformly to line 2 rather than a true
// perpendicular distance, the same simplification most trading platforms use for this tool.
function channelOffsetFromClick(p1: DataPoint, p2: DataPoint, click: DataPoint, indexForDate: (d: Date) => number): number {
  const x1i = indexForDate(p1.x);
  const x2i = indexForDate(p2.x);
  const onLineY = x2i === x1i ? p1.y : p1.y + (p2.y - p1.y) * ((indexForDate(click.x) - x1i) / (x2i - x1i));
  return click.y - onLineY;
}

// `lineStyle` supersedes the older `dashed` boolean (kept for drawings saved before it existed —
// see its own doc on TrendLineDrawing).
function lineDashArray(dr: TrendLineDrawing): number[] {
  switch (dr.lineStyle ?? (dr.dashed ? "dashed" : "solid")) {
    case "dashed":
      return [6, 4];
    case "dotted":
      return [1.5, 3];
    case "dashdot":
      return [6, 3, 1.5, 3];
    case "solid":
    default:
      return [];
  }
}

// Shared by every drawing type's `dr.text` label instead of each duplicating its own
// font/alignment/positioning — anchored along the line's own length (textHorizontalAlign) and
// offset to one side of it or centered on it (textVerticalAlign), optionally rotated to match the
// line's own on-screen slope (textAlignWithLine) and/or painted over its own background rect.
// (x1,y1)-(x2,y2) is whatever segment the caller considers "the line" for anchoring purposes —
// for multi-point tools that's usually just the first two points, not literally everything drawn.
function drawDrawingText(
  ctx: CanvasRenderingContext2D,
  dr: TrendLineDrawing,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fallbackColor: string,
  fontFamily: string
) {
  if (!dr.text) return;
  const hAlign = dr.textHorizontalAlign ?? "center";
  const vAlign = dr.textVerticalAlign ?? "top";
  const t = hAlign === "left" ? 0 : hAlign === "right" ? 1 : 0.5;
  const anchorX = x1 + (x2 - x1) * t;
  const anchorY = y1 + (y2 - y1) * t;
  const size = dr.textSize ?? 11;
  const weight = dr.textBold === false ? 400 : 600;
  const style = dr.textItalic ? "italic" : "normal";
  const offset = 6;

  ctx.save();
  ctx.font = `${style} ${weight} ${size}px ${fontFamily}`;
  ctx.textAlign = hAlign;
  ctx.textBaseline = vAlign === "top" ? "bottom" : vAlign === "bottom" ? "top" : "middle";

  let angle = 0;
  if (dr.textAlignWithLine) {
    angle = Math.atan2(y2 - y1, x2 - x1);
    // Keeps the text upright (never upside-down) regardless of which of the two points is
    // actually "first" on screen.
    if (angle > Math.PI / 2) angle -= Math.PI;
    else if (angle < -Math.PI / 2) angle += Math.PI;
  }

  ctx.translate(anchorX, anchorY);
  if (angle !== 0) ctx.rotate(angle);
  const drawY = vAlign === "top" ? -offset : vAlign === "bottom" ? offset : 0;

  if (dr.textBackgroundColor) {
    // actualBoundingBoxAscent/Descent are already relative to whatever textBaseline is
    // currently set, so this works out regardless of vAlign.
    const metrics = ctx.measureText(dr.text);
    const ascent = metrics.actualBoundingBoxAscent ?? size * 0.8;
    const descent = metrics.actualBoundingBoxDescent ?? size * 0.25;
    const pad = 3;
    let bgX = 0;
    if (hAlign === "center") bgX = -metrics.width / 2;
    else if (hAlign === "right") bgX = -metrics.width;
    ctx.fillStyle = dr.textBackgroundColor;
    ctx.fillRect(bgX - pad, drawY - ascent - pad, metrics.width + pad * 2, ascent + descent + pad * 2);
  }

  ctx.fillStyle = dr.color ?? fallbackColor;
  ctx.fillText(dr.text, 0, drawY);
  ctx.restore();
}

/** A small filled triangle at (toX, toY), pointing away from (fromX, fromY) — the shared
 *  arrowhead shape for arrowLeft/arrowRight on plain trend lines, the elbow-arrow tool's end,
 *  and the arrow-line tool (a trend line with arrowRight preset). */
function drawArrowhead(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string, size = 9) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const spread = Math.PI / 7;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - spread), toY - size * Math.sin(angle - spread));
  ctx.lineTo(toX - size * Math.cos(angle + spread), toY - size * Math.sin(angle + spread));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromDateInputValue(text: string, fallback: Date): Date {
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return fallback;
  const next = new Date(fallback);
  next.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return next;
}

export function CandlestickChart({
  data,
  width,
  height = 380,
  zoomable = true,
  showVolume = true,
  formatDate,
  formatPrice,
  formatVolume,
  fullscreenToggle = true,
  drawingTools = false,
  defaultDrawings,
  onDrawingsChange,
  showIndicators = false,
  defaultIndicators,
  onIndicatorsChange,
  initialVisibleCandles = 500,
  YAutoScaling = false,
  onYAutoScalingChange,
  timeframes,
  timeframe,
  onTimeframeChange,
  defaultChartDisplayMode,
  onChartDisplayModeChange,
  renkoAtrPeriod = 14,
  symbol,
  events,
  symbolSearch = false,
  symbolSearchResults,
  onSymbolSearchChange,
  onSymbolSelect,
  defaultFavoriteSymbolIds,
  onFavoriteSymbolIdsChange,
  livePrice = false,
  margin,
  className,
}: CandlestickChartProps) {
  const clipId = useId();
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [yTransform, setYTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  // Set the moment the user manually zooms/pans the Y axis themselves (wheel/drag on the axis,
  // or the Y component of the 2D plot-drag) — while true, `YAutoScaling` stops overwriting their
  // adjustment. Cleared by resetZoom/resetYAxis, which re-engages auto-fit.
  const [yManuallyAdjusted, setYManuallyAdjusted] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const [drawings, setDrawings] = useState<TrendLineDrawing[]>(defaultDrawings ?? []);
  const [activeTool, setActiveTool] = useState<DrawingToolType | null>(null);
  // Which tool each category's own rail button currently represents — stays selected across
  // draws, independent of whether drawing is actually active right now, and independent of the
  // other categories' own selection. Changed via that category's own flyout menu, which (unlike
  // the button itself) also activates the tool immediately — see handleSelectToolType.
  const [selectedToolByCategory, setSelectedToolByCategory] = useState<Record<string, DrawingToolType>>(() =>
    Object.fromEntries(DRAWING_TOOL_CATEGORIES.map((c) => [c.id, c.tools[0].type]))
  );
  // Which category's dropdown is open, if any — at most one at a time.
  const [openToolMenu, setOpenToolMenu] = useState<string | null>(null);
  const [pendingPoint, setPendingPoint] = useState<DataPoint | null>(null);
  const [previewPoint, setPreviewPoint] = useState<DataPoint | null>(null);
  // "channel"'s second point (fixing line 1), set between the tool's 2nd and 3rd clicks — plain
  // pendingPoint/previewPoint alone are enough for every 2-point tool's flow, channel needs a
  // 3rd click. Every *other* multi-point tool (fibonacciExtension/elliottCorrection/
  // elliottImpulse) also passes through this same 2nd-point stage before collecting the rest
  // into pendingExtraPoints below — they don't diverge from channel until after it.
  const [pendingSecondPoint, setPendingSecondPoint] = useState<DataPoint | null>(null);
  // 3rd point onward for tools needing more than two (see MULTI_POINT_TOOLS) — irrelevant to
  // channel, which computes channelOffset from its 3rd click directly instead of collecting it
  // here.
  const [pendingExtraPoints, setPendingExtraPoints] = useState<DataPoint[]>([]);
  // When on, every new point placed by any drawing tool (via toDataPoint) snaps to whichever of
  // the nearest candle's open/high/low/close is closest — a persistent modifier rather than a
  // tool of its own, so it stays on across tool switches until toggled off again.
  const [magnetActive, setMagnetActive] = useState(false);
  // Hides every drawing (canvas render, hover/hit-testing, handles, axis badges) without
  // touching `drawings` itself — toggling it back off brings everything back exactly as it
  // was, unlike deleting. See `visibleDrawings` below, the single point every drawing-reading
  // codepath was switched to read from instead of `drawings` directly.
  const [drawingsHidden, setDrawingsHidden] = useState(false);
  // Blocks *starting* a body/endpoint/axis-handle drag (handleOverlayPointerDown/
  // handleEndpointPointerDown/handleAxisHandlePointerDown all bail out early while this is on)
  // — hover, the delete key, and double-click-to-edit are all untouched, so a locked drawing
  // stays selectable/deletable/editable, just not draggable.
  const [drawingsLocked, setDrawingsLocked] = useState(false);
  // Every codepath that reads drawn shapes for rendering, hit-testing, or handles reads this
  // instead of `drawings` directly — hiding never mutates `drawings` itself (toggling back on
  // restores everything exactly as it was), it just makes that read empty in the meantime.
  const visibleDrawings = drawingsHidden ? EMPTY_DRAWINGS : drawings;
  // The measure tool's own last completed 2-click measurement (not a `drawings` entry — it's
  // ephemeral, cleared on Escape/tool switch instead of persisted). `pendingPoint`/`previewPoint`
  // still drive its live 1st-click-to-cursor preview, same as every other 2-point tool.
  const [measurePoints, setMeasurePoints] = useState<{ p1: DataPoint; p2: DataPoint } | null>(null);
  // The brush tool's current in-progress stroke, for live preview only — the committed drawing
  // (on pointer up) is built from brushPointsRef below, not from this state, so a stroke can be
  // sampled at pointermove speed without every sample racing a stale closure over React state.
  const [brushPreview, setBrushPreview] = useState<DataPoint[] | null>(null);
  const brushPointsRef = useRef<DataPoint[]>([]);
  const brushDrawingRef = useRef(false);
  const [hoveredDrawingId, setHoveredDrawingId] = useState<string | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const [hoverVolumeY, setHoverVolumeY] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TrendLineDrawing | null>(null);
  const [editModalTab, setEditModalTab] = useState<"coords" | "text" | "style">("coords");
  const [tfOpen, setTfOpen] = useState(false);
  const [chartDisplayMode, setChartDisplayMode] = useState<ChartDisplayMode>(defaultChartDisplayMode ?? "candle");
  const [displayModeOpen, setDisplayModeOpen] = useState(false);
  const displayModeAnchorRef = useRef<HTMLButtonElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Per-chart color overrides for up/down bars — `undefined` (the default) means "use the
  // theme's own --lq-color-up/--lq-color-down", same as before this modal existed.
  const [upColorOverride, setUpColorOverride] = useState<string | undefined>(undefined);
  const [downColorOverride, setDownColorOverride] = useState<string | undefined>(undefined);
  // Seeded from the `YAutoScaling` prop, then owned locally once the settings-modal checkbox can
  // change it — same uncontrolled pattern as `drawings`/`indicators`, not a live mirror of the
  // prop after mount.
  const [yAutoScalingState, setYAutoScalingState] = useState(YAutoScaling);
  const [hiddenEventKinds, setHiddenEventKinds] = useState<Set<string>>(new Set());
  const [symbolSearchOpen, setSymbolSearchOpen] = useState(false);
  const [symbolSearchQuery, setSymbolSearchQuery] = useState("");
  const [symbolSearchCategory, setSymbolSearchCategory] = useState<SymbolSearchCategory>("all");
  const [favoriteSymbolIds, setFavoriteSymbolIds] = useState<string[]>(defaultFavoriteSymbolIds ?? []);
  // Ticks once a second, only while `livePrice` is on — its only job is giving the countdown
  // badge (a plain DOM element, not part of the canvas draw effect) a reason to re-render each
  // second; the dashed line/price badge themselves only depend on `data` and don't need this.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!livePrice) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [livePrice]);
  const [indicators, setIndicators] = useState<Indicator[]>(defaultIndicators ?? []);
  const [indicatorPickerOpen, setIndicatorPickerOpen] = useState(false);
  const [indicatorSearchQuery, setIndicatorSearchQuery] = useState("");
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);
  const [indicatorDraft, setIndicatorDraft] = useState<Indicator | null>(null);
  const [hoveredIndicatorId, setHoveredIndicatorId] = useState<string | null>(null);
  // Ctrl/Cmd+C over a legend item copies it here (a ref, not state — it's never read during
  // render, so there's no reason to pay for a re-render just to remember it); Ctrl/Cmd+V pastes
  // a fresh copy (new id) appended to `indicators` from wherever this last got set. Deliberately
  // chart-local (not the real OS clipboard) — copying between two *different* chart instances on
  // the same page isn't a scenario this was built for.
  const copiedIndicatorRef = useRef<Indicator | null>(null);
  // pointIndex: 0 = x1/y1, 1 = x2/y2, 2+ = extraPoints[pointIndex - 2] — see allPointsOf.
  const dragEndpointRef = useRef<{ id: string; pointIndex: number } | null>(null);
  const dragAxisRef = useRef<{ id: string } | null>(null);
  // Which of the measure tool's two completed points (not a `drawings` entry, see measurePoints
  // above) is currently being dragged — same generic pointer-capture pattern as dragEndpointRef,
  // just keyed by "p1"/"p2" instead of a drawing id + pointIndex since there's only ever one.
  const dragMeasureRef = useRef<"p1" | "p2" | null>(null);
  const drawingIdRef = useRef(0);
  const indicatorIdRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tfAnchorRef = useRef<HTMLButtonElement>(null);
  // One per category (a fixed, known-at-compile-time list, so plain individual refs rather than
  // a dynamic map — Popover needs a real RefObject per anchor, and refs can't be created in a
  // loop).
  const linesMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const fibonacciMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const elliottMenuAnchorRef = useRef<HTMLButtonElement>(null);
  function menuAnchorRefFor(categoryId: string) {
    if (categoryId === "fibonacci") return fibonacciMenuAnchorRef;
    if (categoryId === "elliott") return elliottMenuAnchorRef;
    return linesMenuAnchorRef;
  }
  const [themeTick, setThemeTick] = useState(0);
  // Local view state for the volume pane's own header (name/collapse/remove), layered on top of
  // the `showVolume` prop rather than replacing it: `showVolume` is the caller's own on/off
  // switch, this is the user's in-session view preference once it's on. Not lifted to a prop —
  // no request for the app to control or persist it, same as the other UI-only toggles here
  // (tool menu open, timeframe menu open…).
  const [volumePaneState, setVolumePaneState] = useState<"expanded" | "collapsed" | "hidden">("expanded");
  // Manually-resized sub-pane heights (volume, or an "own"-pane indicator, keyed by "volume" or
  // the indicator's own id), as a fraction of the plot's own bounded height — set by dragging a
  // pane's own top divider (see startPaneResize). Missing entries fall back to
  // DEFAULT_PANE_HEIGHT_FRACTION, same as before per-pane resize existed at all.
  const [paneHeightFractions, setPaneHeightFractions] = useState<Record<string, number>>({});

  // Mirrors hoveredDrawingId so useD3Zoom's filter (a plain callback, run outside React) can
  // read it synchronously at pointerdown time, without re-attaching the zoom behavior on
  // every hover change.
  const hoveredDrawingIdRef = useRef<string | null>(null);
  function updateHoveredDrawingId(id: string | null) {
    hoveredDrawingIdRef.current = id;
    setHoveredDrawingId(id);
  }

  // Set while dragging a whole drawing (pointer down directly on its body, not an endpoint).
  const dragLineRef = useRef<{ id: string; startClientX: number; startClientY: number; orig: TrendLineDrawing } | null>(null);

  // True while dragging the plot body to pan the price axis vertically, independent of
  // d3-zoom's own horizontal pan (see handleOverlayPointerDown) — only used to have
  // handlePointerMove skip its hover-detection work while this drag is live.
  const isPanningYRef = useRef(false);

  function commitDrawings(next: TrendLineDrawing[]) {
    setDrawings(next);
    onDrawingsChange?.(next);
  }

  function commitIndicators(next: Indicator[]) {
    setIndicators(next);
    onIndicatorsChange?.(next);
  }

  function toggleFavoriteSymbol(id: string) {
    setFavoriteSymbolIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      onFavoriteSymbolIdsChange?.(next);
      return next;
    });
  }

  // `onSymbolSearchChange` deliberately isn't a dependency below — a typical caller passes an
  // inline (non-memoized) handler, which is a fresh function identity on every one of *its own*
  // renders; if this effect re-ran every time that identity changed, and that handler calls back
  // into state (e.g. setResults after searching, exactly what the story demonstrating this does),
  // the resulting re-render would produce yet another fresh identity — an infinite loop. A ref
  // always holding the latest callback sidesteps this while still calling the current version.
  const onSymbolSearchChangeRef = useRef(onSymbolSearchChange);
  useEffect(() => {
    onSymbolSearchChangeRef.current = onSymbolSearchChange;
  });

  // Fires once right when the modal opens (query/category at their defaults) and again on every
  // later change — searching/filtering itself (including resolving "favorites") is entirely the
  // caller's job, this just reports what the modal's own controls are currently asking for.
  useEffect(() => {
    if (!symbolSearchOpen) return;
    onSymbolSearchChangeRef.current?.(symbolSearchQuery, symbolSearchCategory);
  }, [symbolSearchOpen, symbolSearchQuery, symbolSearchCategory]);

  function addIndicator(entry: IndicatorCatalogEntry) {
    commitIndicators([
      ...indicators,
      {
        id: `indicator-${indicatorIdRef.current++}`,
        kind: entry.kind,
        period: entry.defaultPeriod,
        stdDev: entry.hasStdDev ? 2 : undefined,
        ...(entry.kind === "macd" ? { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } : {}),
      },
    ]);
  }

  function openIndicatorSettings(id: string) {
    const indicator = indicators.find((i) => i.id === id);
    if (!indicator) return;
    setEditingIndicatorId(id);
    setIndicatorDraft(indicator);
  }

  function closeIndicatorSettings() {
    setEditingIndicatorId(null);
    setIndicatorDraft(null);
  }

  function saveIndicatorSettings() {
    if (!editingIndicatorId || !indicatorDraft) return;
    commitIndicators(indicators.map((i) => (i.id === editingIndicatorId ? indicatorDraft : i)));
    closeIndicatorSettings();
  }

  function deleteEditingIndicator() {
    if (!editingIndicatorId) return;
    commitIndicators(indicators.filter((i) => i.id !== editingIndicatorId));
    closeIndicatorSettings();
  }

  function toggleIndicatorHidden(id: string) {
    commitIndicators(indicators.map((i) => (i.id === id ? { ...i, hidden: !i.hidden } : i)));
  }

  function removeIndicator(id: string) {
    commitIndicators(indicators.filter((i) => i.id !== id));
  }

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const baseMargin = margin ?? DEFAULT_MARGIN;
  const resolvedMargin = drawingTools
    ? { ...baseMargin, left: (baseMargin.left ?? DEFAULT_MARGIN.left ?? 0) + TOOLS_RAIL_WIDTH }
    : baseMargin;
  const [ref, dims] = useChartDimensions(resolvedMargin, {
    width: isFullscreen ? undefined : width,
    height: isFullscreen ? undefined : height,
  });

  const showHeader = fullscreenToggle || zoomable || !!timeframes?.length || showIndicators;
  const headerSpace = showHeader ? HEADER_HEIGHT : 0;
  const plotHeight = Math.max(0, dims.height - headerSpace);
  const plotBoundedHeight = Math.max(0, plotHeight - dims.margin.top - dims.margin.bottom);

  // The candles/volume/crosshair/drawings are drawn on a <canvas> for performance with large
  // datasets (versus one SVG node per candle). Canvas has no live binding to CSS custom
  // properties, so redraws re-read them from the DOM — this observer just triggers that redraw
  // whenever the active palette/surface actually changes.
  useEffect(() => {
    const el = ref.current;
    const root = el?.closest(".lq-root");
    if (!root) return;
    const observer = new MutationObserver(() => setThemeTick((t) => t + 1));
    observer.observe(root, { attributes: true, attributeFilter: ["data-lq-palette", "data-lq-surface"] });
    return () => observer.disconnect();
  }, [ref]);

  const volumeVisible = showVolume && volumePaneState !== "hidden";
  const volumeCollapsed = volumeVisible && volumePaneState === "collapsed";

  function paneHeightFraction(key: string): number {
    return paneHeightFractions[key] ?? DEFAULT_PANE_HEIGHT_FRACTION;
  }

  // Drag-to-resize a sub-pane via its own top divider: grow/shrink that one pane's height
  // fraction directly, same window-pointermove-listener pattern the plot's own 2D-pan-Y drag
  // uses (see handleOverlayPointerDown) rather than a second setPointerCapture on top of
  // whatever's already attached to this element.
  function startPaneResize(paneKey: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startClientY = e.clientY;
    const startFraction = paneHeightFraction(paneKey);
    const onMove = (ev: PointerEvent) => {
      if (plotBoundedHeight <= 0) return;
      const deltaFraction = (ev.clientY - startClientY) / plotBoundedHeight;
      const next = Math.min(MAX_PANE_HEIGHT_FRACTION, Math.max(MIN_PANE_HEIGHT_FRACTION, startFraction - deltaFraction));
      setPaneHeightFractions((prev) => ({ ...prev, [paneKey]: next }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // No breathing room between the price section and the volume section below it: the divider
  // line itself is the only separation, flush against both (same "the border delimits the
  // content" rule applied to the tools rail and the header above). Collapsed reduces the pane to
  // its own fixed-height header strip instead of the usual proportional split.
  const volumeHeight = !volumeVisible ? 0 : volumeCollapsed ? SUB_PANE_COLLAPSED_HEIGHT : Math.round(plotBoundedHeight * paneHeightFraction("volume"));

  // "own"-pane indicators (RSI/CHOP/MACD) stack below volume, in the order they were added —
  // each sized/collapsed exactly like the volume pane, just keyed by the indicator's own id
  // instead of the fixed "volume" key.
  // Memoized (not just plain derived consts) so the canvas draw effect below can depend on
  // these three directly instead of their own wider, less-stable sources (indicators,
  // paneHeightFractions) — without this they'd be a fresh array/reference every render, which
  // would make an "only these deps" dependency array pointless (always "changed").
  const { ownPaneIndicators, indicatorPaneHeights, indicatorPaneTops } = useMemo(() => {
    const owned = indicators.filter((ind) => indicatorCatalogEntry(ind.kind).pane === "own");
    const heights = owned.map((ind) =>
      ind.paneCollapsed ? SUB_PANE_COLLAPSED_HEIGHT : Math.round(plotBoundedHeight * (paneHeightFractions[ind.id] ?? DEFAULT_PANE_HEIGHT_FRACTION))
    );
    let cursor = 0; // relative to right after volume — added to priceHeight + volumeHeight below
    const tops = heights.map((h) => {
      const top = cursor;
      cursor += h;
      return top;
    });
    return { ownPaneIndicators: owned, indicatorPaneHeights: heights, indicatorPaneTops: tops };
  }, [indicators, paneHeightFractions, plotBoundedHeight]);
  const indicatorPanesTotalHeight = indicatorPaneHeights.reduce((sum, h) => sum + h, 0);

  const priceHeight = Math.max(0, plotBoundedHeight - volumeHeight - indicatorPanesTotalHeight);

  // Positions candles by INDEX, not by literal calendar time — each candle i occupies the slot
  // [i, i+1], centered at i+0.5. A real d3.scaleTime() (mapping actual elapsed time to pixels)
  // was tried first, but real trading data has uneven gaps (weekends, holidays): time-proportional
  // spacing left visible empty gaps between Friday and Monday, clustering weekday candles
  // together instead of the flush, evenly-spaced rendering every trading platform actually uses.
  // Same index-scale approach as BarChart/DeltaChart's categorical axis. The [0, n] domain (vs.
  // [0, n-1]) reserves half a slot on each edge for free, so the first/last candle isn't clipped
  // — no separate padding step needed, unlike the old time-scale version. Panning past [0, n]
  // into "future"/"past" empty space is handled separately (see MAX_EMPTY_FRACTION and the
  // custom zoom `constrain` below) rather than baked into this domain — that keeps `xScale`
  // itself a simple, stable 1:1 mapping of the real data, and the empty-space allowance adaptive
  // to zoom level instead of a fixed slot count.
  const xScale = useMemo(
    () => d3.scaleLinear().domain([0, Math.max(1, data.length)]).range([0, dims.boundedWidth]),
    [data.length, dims.boundedWidth]
  );

  const zoomedXScale = transform.rescaleX(xScale);

  // Bridges the index-space scale above and the Date-based coordinates drawings/indicators are
  // actually stored in (a real Date is meaningful to consumers of the public API in a way a raw
  // index isn't — defaultDrawings, onDrawingsChange, etc. all deal in dates). indexForDate is
  // used at render time (a stored date -> where it sits among today's candles); dateForIndex at
  // interaction time (a pixel position, inverted to a fractional index -> the nearest candle's
  // actual date, to store).
  const indexForDate = useCallback(
    (date: Date): number => {
      if (data.length === 0) return 0;
      const idx = d3.bisector<Candle, Date>((d) => d.date).left(data, date);
      return Math.min(data.length - 1, Math.max(0, idx));
    },
    [data]
  );

  const dateForIndex = useCallback(
    (rawIndex: number): Date => {
      if (data.length === 0) return new Date();
      const clamped = Math.min(data.length - 1, Math.max(0, Math.round(rawIndex - 0.5)));
      return data[clamped].date;
    },
    [data]
  );

  // Precise (unpadded) index range of candles actually inside the zoomed domain — used to size
  // candles (see `visible` below, which pads a couple extra candles on each side so
  // partially-visible edge candles still render instead of popping in/out) and to drive
  // `YAutoScaling` (see below).
  const visibleRange = useMemo(() => {
    if (data.length === 0) return { start: 0, end: 0 };
    const [i0, i1] = zoomedXScale.domain();
    return { start: Math.max(0, Math.floor(i0)), end: Math.min(data.length, Math.ceil(i1)) };
  }, [data.length, zoomedXScale]);

  // Always the full dataset's own domain — deliberately NOT reactive to pan/zoom, so it stays a
  // stable base for `zoomedPriceScale` below. `YAutoScaling` doesn't change this scale itself;
  // instead a separate effect derives an equivalent `yTransform` that makes the *zoomed* scale
  // fit the currently visible candles, leaving this one untouched (see below).
  const priceScale = useMemo(() => {
    const highs = data.map((d) => d.high);
    const lows = data.map((d) => d.low);
    const min = d3.min(lows) ?? 0;
    const max = d3.max(highs) ?? 1;
    const pad = (max - min) * 0.08 || 1;
    return d3.scaleLinear().domain([min - pad, max + pad]).range([priceHeight, 0]);
  }, [data, priceHeight]);

  const zoomedPriceScale = yTransform.rescaleY(priceScale);

  // Permanent price-axis badges (live price, indicator values, horizontal/ray drawing lines)
  // are positioned from a *value*, not from the mouse — unlike the hover badge, which can never
  // leave the pane because it's driven by a pointer position already inside it. Once the price
  // axis is zoomed/panned far enough that a value's pixel position falls outside the price
  // pane, its badge would otherwise render past the axis (over the toolbar above, or into the
  // volume/indicator panes below) instead of pinned to the edge like every trading platform
  // does. `AXIS_BADGE_HALF_HEIGHT` keeps the (vertically centered, `translateY(-50%)`) badge
  // fully inside the pane at the clamp, not just its center pixel.
  const clampToPriceAxis = (y: number) => Math.min(priceHeight - AXIS_BADGE_HALF_HEIGHT, Math.max(AXIS_BADGE_HALF_HEIGHT, y));

  // When YAutoScaling is on and the user hasn't manually adjusted the Y axis themselves (see
  // yManuallyAdjusted, set by yAxisDrag/yAxisWheelRef/the 2D-pan-Y handler below, and cleared by
  // resetZoom/resetYAxis), continuously fit the Y axis to whatever candles are currently visible
  // on X — recomputing a `yTransform` that makes `priceScale.rescaleY(...)` land exactly on that
  // range, rather than changing `priceScale` itself. Depends on the visible *indices*
  // (`visibleRange.start`/`.end`, plain numbers) rather than `zoomedXScale` itself, which is a
  // fresh object every render (even ones triggered by unrelated state like hover) — indices only
  // actually change on a real pan/zoom, so this skips needless recomputation the rest of the time.
  useEffect(() => {
    if (!yAutoScalingState || yManuallyAdjusted || data.length === 0) return;
    const slice = data.slice(Math.max(0, visibleRange.start), Math.min(data.length, visibleRange.end));
    const source = slice.length > 0 ? slice : data;
    const highs = source.map((d) => d.high);
    const lows = source.map((d) => d.low);
    const min = d3.min(lows) ?? 0;
    const max = d3.max(highs) ?? 1;
    const pad = (max - min) * 0.08 || 1;
    const targetMin = min - pad;
    const targetMax = max + pad;
    const denom = priceScale(targetMin) - priceScale(targetMax);
    if (denom <= 0) return;
    const k = priceHeight / denom;
    const y = -k * priceScale(targetMax);
    setYTransform(new d3.ZoomTransform(k, 0, y));
  }, [yAutoScalingState, yManuallyAdjusted, data, visibleRange.start, visibleRange.end, priceScale, priceHeight]);

  // 10% headroom on top of the tallest bar, so it doesn't reach all the way up to the
  // price/volume divider — leaves a small visual gap between the bars and the line.
  const volumeScale = useMemo(() => {
    const max = d3.max(data, (d) => d.volume ?? 0) ?? 0;
    return d3.scaleLinear().domain([0, (max || 1) * 1.1]).range([volumeHeight, 0]);
  }, [data, volumeHeight]);

  // High enough that zooming all the way in leaves roughly one candle's slot filling the
  // viewport, regardless of how many candles are in `data` (a fixed cap like 20 would only
  // ever reveal ~20 candles at max zoom on a large dataset).
  const maxXZoom = Math.max(20, data.length);

  // Lets panning reveal empty space past the data's own edges (index 0 and data.length), capped
  // at MAX_EMPTY_FRACTION of the *current* viewport width on either side — derived by requiring
  // zoomedXScale(0) (the screen x where index 0 sits) to stay within [0, W] such that at most
  // MAX_EMPTY_FRACTION*W of empty space is visible to its left, and symmetrically for
  // zoomedXScale(data.length) and empty space to its right. Since zoomedXScale(v) = k*xScale(v)+tx
  // and xScale(0)=0, xScale(data.length)=W (by construction), both conditions reduce to plain
  // bounds on tx alone — a fixed d3-zoom translateExtent can't express this (it clamps in
  // constant world units, so the same padding would be a tiny sliver zoomed out and enormous
  // zoomed in), hence the custom constrain instead of relying on useD3Zoom's default.
  function constrainXPan(transform: d3.ZoomTransform, extent: [[number, number], [number, number]]): d3.ZoomTransform {
    const w = extent[1][0] - extent[0][0];
    if (w <= 0) return transform;
    const maxTx = w * MAX_EMPTY_FRACTION;
    const minTx = -(transform.k - 1 + MAX_EMPTY_FRACTION) * w;
    const tx = Math.min(maxTx, Math.max(minTx, transform.x));
    return new d3.ZoomTransform(transform.k, tx, transform.y);
  }

  const { ref: zoomRef, reset: resetX, setTransform: setXTransformViaZoom } = useD3Zoom<SVGRectElement>({
    width: dims.boundedWidth,
    height: plotBoundedHeight,
    enabled: zoomable && activeTool === null,
    scaleExtent: [1, maxXZoom],
    onZoom: setTransform,
    filter: () => hoveredDrawingIdRef.current === null,
    constrain: constrainXPan,
  });

  // Applied once, the first time the plot has a real measured width (and the zoom behavior
  // above is attached) — not on every resize, which would otherwise keep yanking the user back
  // to the last-N-candles view whenever the window changes size.
  const initialViewAppliedRef = useRef(false);
  useEffect(() => {
    if (initialViewAppliedRef.current) return;
    if (dims.boundedWidth <= 0 || data.length === 0) return;
    initialViewAppliedRef.current = true;
    if (!initialVisibleCandles || initialVisibleCandles <= 0 || initialVisibleCandles >= data.length) return;

    const start = Math.max(0, data.length - initialVisibleCandles);
    const x0 = xScale(start);
    const x1 = xScale(data.length);
    if (x1 - x0 <= 0) return;
    const k = Math.min(maxXZoom, Math.max(1, dims.boundedWidth / (x1 - x0)));
    setXTransformViaZoom(new d3.ZoomTransform(k, -k * x0, 0));
  }, [dims.boundedWidth, data.length, initialVisibleCandles, xScale, maxXZoom, setXTransformViaZoom]);

  const xAxisDrag = useAxisDragRescale({
    axis: "x",
    size: dims.boundedWidth,
    transform,
    onChange: setXTransformViaZoom,
    scaleExtent: [1, maxXZoom],
  });
  // Wraps setYTransform for the axis's own drag/wheel controls specifically — these are always
  // a deliberate manual Y adjustment, so they also flag `yManuallyAdjusted` to stop
  // `YAutoScaling` from overwriting them (see the effect above). The 2D-pan-Y handler further
  // down sets the flag itself instead, since it isn't a plain onChange callback.
  function handleManualYChange(t: d3.ZoomTransform) {
    setYManuallyAdjusted(true);
    setYTransform(t);
  }

  const yAxisDrag = useAxisDragRescale({
    axis: "y",
    size: priceHeight,
    transform: yTransform,
    onChange: handleManualYChange,
  });

  const xAxisWheelRef = useAxisWheelZoom<SVGRectElement>({
    axis: "x",
    transform,
    onChange: setXTransformViaZoom,
    enabled: zoomable,
    scaleExtent: [1, maxXZoom],
    size: dims.boundedWidth,
  });
  const yAxisWheelRef = useAxisWheelZoom<SVGRectElement>({
    axis: "y",
    transform: yTransform,
    onChange: handleManualYChange,
    enabled: zoomable,
    size: priceHeight,
  });

  // While YAutoScaling drives yTransform on its own, that alone shouldn't count as "zoomed" —
  // otherwise the reset button would stay permanently visible even without the user ever
  // touching the Y axis. It only counts once they've manually overridden it.
  const yIsZoomed = yAutoScalingState ? yManuallyAdjusted : yTransform.k !== 1 || yTransform.y !== 0;
  const isZoomed = transform.k !== 1 || transform.x !== 0 || yIsZoomed;

  function resetZoom() {
    resetX();
    setYTransform(d3.zoomIdentity);
    setYManuallyAdjusted(false);
  }

  function resetYAxis() {
    setYTransform(d3.zoomIdentity);
    setYManuallyAdjusted(false);
  }

  // All three span the dataset's own (unzoomed) extent rather than the currently visible one,
  // so they still reach edge to edge after the user zooms/pans away from where they were added
  // — a price alert or a session marker shouldn't disappear just because the view moved. Marked
  // with `lineType` so they drag along one axis only (see handlePointerMove/handleAxisHandle*)
  // and render full-span instead of between their stored x1/x2 (see the canvas draw effect).
  function addPriceLine() {
    if (hoverY === null) return;
    const price = zoomedPriceScale.invert(hoverY);
    commitDrawings([
      ...drawings,
      { id: `drawing-${drawingIdRef.current++}`, x1: data[0].date, y1: price, x2: data[data.length - 1].date, y2: price, lineType: "horizontal" },
    ]);
  }

  function addVolumeLine() {
    if (hoverVolumeY === null) return;
    const volume = volumeScale.invert(hoverVolumeY);
    commitDrawings([
      ...drawings,
      {
        id: `drawing-${drawingIdRef.current++}`,
        x1: data[0].date,
        y1: volume,
        x2: data[data.length - 1].date,
        y2: volume,
        lineType: "horizontal",
        valueAxis: "volume",
      },
    ]);
  }

  function addDateLine() {
    if (!hovered) return;
    const [p0, p1] = priceScale.domain() as [number, number];
    commitDrawings([...drawings, { id: `drawing-${drawingIdRef.current++}`, x1: hovered.date, y1: p0, x2: hovered.date, y2: p1, lineType: "vertical" }]);
  }

  function cancelDrawingTool() {
    setActiveTool(null);
    setPendingPoint(null);
    setPreviewPoint(null);
    setPendingSecondPoint(null);
    setPendingExtraPoints([]);
    setMeasurePoints(null);
  }

  function handleToolClick(tool: DrawingToolType) {
    if (activeTool === tool) {
      cancelDrawingTool();
    } else {
      setActiveTool(tool);
      setPendingPoint(null);
      setPreviewPoint(null);
      setPendingSecondPoint(null);
      setPendingExtraPoints([]);
      setMeasurePoints(null);
    }
  }

  // Picking a tool from a category's flyout menu both changes what that category's own rail
  // button represents *and* activates it immediately, ready to draw — unlike clicking the
  // button itself to toggle the already-represented tool on/off, there's no extra confirmation
  // click needed here since picking a specific tool from the menu is already a deliberate choice.
  function handleSelectToolType(type: DrawingToolType) {
    setSelectedToolByCategory((prev) => ({ ...prev, [categoryOfTool(type).id]: type }));
    setOpenToolMenu(null);
    setActiveTool(type);
    setPendingPoint(null);
    setPreviewPoint(null);
    setPendingSecondPoint(null);
    setPendingExtraPoints([]);
    setMeasurePoints(null);
  }

  useEffect(() => {
    // Also armed while only a completed measurement lingers (activeTool already back to null by
    // then, see the "measure" branch of handleOverlayClick above) so Escape can still dismiss it —
    // every other tool only needs this while still active, since none of them outlive their own
    // deselection the way a finished measurement does.
    if (!activeTool && !measurePoints) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // "elbowArrow" is the one tool Escape *finalizes* instead of discarding — it has no fixed
      // point count to reach on its own (see handleOverlayClick), so Escape is the only way it
      // ever completes. Needs at least 2 points to be a line at all; fewer and there's nothing
      // to commit, same as cancelling any other half-placed tool.
      if (activeTool === "elbowArrow" && pendingPoint && pendingExtraPoints.length >= 1) {
        const points = [pendingPoint, ...pendingExtraPoints];
        const next: TrendLineDrawing[] = [
          ...drawings,
          {
            id: `drawing-${drawingIdRef.current++}`,
            x1: points[0].x,
            y1: points[0].y,
            x2: points[1].x,
            y2: points[1].y,
            lineType: "elbowArrow",
            extraPoints: points.slice(2),
          },
        ];
        setDrawings(next);
        onDrawingsChange?.(next);
      }
      cancelDrawingTool();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTool, pendingPoint, pendingExtraPoints, drawings, onDrawingsChange, measurePoints]);

  // Deletes whichever drawing is currently hovered (there's no separate "select" state — hover
  // already tracks the one line the user is pointing at, same thing a click-to-select would give
  // here) when Delete/Backspace is pressed — skipped while the edit modal is open (its own
  // "Supprimer" button is the deliberate action there) or while a text input has focus (typing a
  // label in the Texte tab shouldn't delete the drawing out from under it).
  useEffect(() => {
    if (!hoveredDrawingId || editingId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const active = document.activeElement;
      const isEditableFocused = active instanceof HTMLElement && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      if (isEditableFocused) return;
      e.preventDefault();
      const next = drawings.filter((d) => d.id !== hoveredDrawingId);
      setDrawings(next);
      onDrawingsChange?.(next);
      setHoveredDrawingId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hoveredDrawingId, editingId, drawings, onDrawingsChange]);

  // Ctrl/Cmd+C over a hovered legend item copies that indicator (copiedIndicatorRef); Ctrl/Cmd+V
  // pastes a duplicate of whatever was last copied (new id, everything else — kind/period/
  // color/etc. — unchanged) appended to the list. Mirrors the browser's own shortcuts rather than
  // inventing new ones, so it's skipped while a text input has focus for the same reason the
  // drawing-delete effect above is.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key !== "c" && key !== "v") return;
      const active = document.activeElement;
      const isEditableFocused = active instanceof HTMLElement && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      if (isEditableFocused) return;
      if (key === "c") {
        if (!hoveredIndicatorId) return;
        const indicator = indicators.find((i) => i.id === hoveredIndicatorId);
        if (indicator) copiedIndicatorRef.current = indicator;
        return;
      }
      if (!copiedIndicatorRef.current) return;
      e.preventDefault();
      const next = [...indicators, { ...copiedIndicatorRef.current, id: `indicator-${indicatorIdRef.current++}` }];
      setIndicators(next);
      onIndicatorsChange?.(next);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hoveredIndicatorId, indicators, onIndicatorsChange]);

  // Snaps a raw price to whichever of the nearest candle's open/high/low/close sits closest —
  // the magnet toggle's whole effect, applied wherever a new point gets placed (see toDataPoint).
  // No-op when the magnet is off, so every call site stays correct without its own branch.
  function magnetSnapPrice(rawIndex: number, rawY: number): number {
    if (!magnetActive || data.length === 0) return rawY;
    const idx = Math.min(data.length - 1, Math.max(0, Math.round(rawIndex - 0.5)));
    const candle = data[idx];
    const candidates = [candle.open, candle.high, candle.low, candle.close];
    return candidates.reduce((closest, v) => (Math.abs(v - rawY) < Math.abs(closest - rawY) ? v : closest), candidates[0]);
  }

  function toDataPoint(e: { clientX: number; clientY: number }): DataPoint {
    const rect = zoomRef.current!.getBoundingClientRect();
    const rawIndex = zoomedXScale.invert(e.clientX - rect.left);
    const rawY = zoomedPriceScale.invert(e.clientY - rect.top);
    return { x: dateForIndex(rawIndex), y: round4(magnetSnapPrice(rawIndex, rawY)) };
  }

  function handleOverlayClick(e: React.MouseEvent<SVGRectElement>) {
    if (!activeTool) return;
    const point = toDataPoint(e);

    // Axis-constrained lines only have one degree of freedom, so a single click places them —
    // no pending/preview step like the free trend line below.
    if (activeTool === "horizontal") {
      const rect = zoomRef.current!.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const d0 = data[0].date;
      const d1 = data[data.length - 1].date;
      const roundedVolumeY = round4(volumeScale.invert(mouseY - priceHeight));
      const drawing: TrendLineDrawing =
        volumeVisible && mouseY > priceHeight
          ? {
              id: `drawing-${drawingIdRef.current++}`,
              x1: d0,
              y1: roundedVolumeY,
              x2: d1,
              y2: roundedVolumeY,
              lineType: "horizontal",
              valueAxis: "volume",
            }
          : { id: `drawing-${drawingIdRef.current++}`, x1: d0, y1: point.y, x2: d1, y2: point.y, lineType: "horizontal" };
      commitDrawings([...drawings, drawing]);
      cancelDrawingTool();
      return;
    }
    if (activeTool === "vertical") {
      const [p0, p1] = priceScale.domain() as [number, number];
      commitDrawings([
        ...drawings,
        { id: `drawing-${drawingIdRef.current++}`, x1: point.x, y1: p0, x2: point.x, y2: p1, lineType: "vertical" },
      ]);
      cancelDrawingTool();
      return;
    }
    // Arrow markers are single-point, like horizontal/vertical — x2/y2 just mirrors x1/y1 (kept
    // in sync by both the generic whole-body drag and a dedicated single-handle case, see
    // handleEndpointPointerMove) so there's nothing meaningful a second point could add.
    if (activeTool === "arrowUp" || activeTool === "arrowDown") {
      commitDrawings([
        ...drawings,
        { id: `drawing-${drawingIdRef.current++}`, x1: point.x, y1: point.y, x2: point.x, y2: point.y, lineType: activeTool },
      ]);
      cancelDrawingTool();
      return;
    }
    // "elbowArrow" is an open-ended polyline: every click appends another point (1st into
    // pendingPoint, everything after into pendingExtraPoints) and the tool stays active — unlike
    // every other multi-point tool, there's no fixed point count to reach, so nothing here ever
    // commits or calls cancelDrawingTool(). Escape is what finalizes it (see the keydown effect
    // below), using however many points have been placed by then.
    if (activeTool === "elbowArrow") {
      if (!pendingPoint) {
        setPendingPoint(point);
        setPreviewPoint(point);
        return;
      }
      setPendingExtraPoints((prev) => [...prev, point]);
      setPreviewPoint(point);
      return;
    }
    // Measure doesn't create a `drawings` entry — its result is ephemeral (measurePoints, cleared
    // on Escape/tool switch). The tool deselects itself right after the 2nd click (unlike every
    // other tool, which stays active until Escape/reclick) — the completed measurement then stays
    // on screen with its own draggable handles (see the measure-handle drag functions below)
    // instead of disappearing, so re-clicking the tool button is what starts a fresh one.
    if (activeTool === "measure") {
      if (!pendingPoint) {
        setPendingPoint(point);
        setPreviewPoint(point);
        return;
      }
      setMeasurePoints({ p1: pendingPoint, p2: point });
      setPendingPoint(null);
      setPreviewPoint(null);
      setActiveTool(null);
      return;
    }
    // Same price/volume detection as "horizontal" above, but anchored at the clicked date
    // instead of the dataset's own start (see the "ray" rendering/hit-testing below, which draws
    // from that anchor to the plot's right edge only).
    if (activeTool === "ray") {
      const rect = zoomRef.current!.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const roundedVolumeY = round4(volumeScale.invert(mouseY - priceHeight));
      const drawing: TrendLineDrawing =
        volumeVisible && mouseY > priceHeight
          ? {
              id: `drawing-${drawingIdRef.current++}`,
              x1: point.x,
              y1: roundedVolumeY,
              x2: point.x,
              y2: roundedVolumeY,
              lineType: "ray",
              valueAxis: "volume",
            }
          : { id: `drawing-${drawingIdRef.current++}`, x1: point.x, y1: point.y, x2: point.x, y2: point.y, lineType: "ray" };
      commitDrawings([...drawings, drawing]);
      cancelDrawingTool();
      return;
    }

    // "channel" needs a 3rd click (the tool's whole point): the first two fix line 1 exactly
    // like a regular trend line, the third sets a constant price offset for a second line
    // parallel to it — measured as the clicked point's own vertical distance from line 1 at
    // that same date, not a true perpendicular distance (same simplification most trading
    // platforms use for this tool).
    if (activeTool === "channel") {
      if (!pendingPoint) {
        setPendingPoint(point);
        setPreviewPoint(point);
        return;
      }
      if (!pendingSecondPoint) {
        setPendingSecondPoint(point);
        setPreviewPoint(point);
        return;
      }
      commitDrawings([
        ...drawings,
        {
          id: `drawing-${drawingIdRef.current++}`,
          x1: pendingPoint.x,
          y1: pendingPoint.y,
          x2: pendingSecondPoint.x,
          y2: pendingSecondPoint.y,
          lineType: "channel",
          channelOffset: round4(channelOffsetFromClick(pendingPoint, pendingSecondPoint, point, indexForDate)),
        },
      ]);
      cancelDrawingTool();
      return;
    }

    // "disjointChannel": same first three clicks as "channel" (line 1's two points, then a 3rd
    // that sets a price offset the same way) — but instead of applying that offset as a constant
    // shift to a *parallel* line 2, it computes two independent points: extraPoints[0] (lined up
    // with x2/y2, "point 3") sits at the offset exactly like channel's line 2 would, and
    // extraPoints[1] (lined up with x1/y1, "point 4") is that same offset applied to point1's
    // price *mirrored* across point2's price level — 2*y2 - y1 + offset instead of plain y1 +
    // offset — so line 2 slopes the opposite way from line 1 instead of running parallel to it.
    // Both points are then ordinary, independently draggable ones (handled generically by
    // allPointsOf/the endpoint-drag system) for reshaping the angle by hand afterward.
    if (activeTool === "disjointChannel") {
      if (!pendingPoint) {
        setPendingPoint(point);
        setPreviewPoint(point);
        return;
      }
      if (!pendingSecondPoint) {
        setPendingSecondPoint(point);
        setPreviewPoint(point);
        return;
      }
      const offset = round4(channelOffsetFromClick(pendingPoint, pendingSecondPoint, point, indexForDate));
      commitDrawings([
        ...drawings,
        {
          id: `drawing-${drawingIdRef.current++}`,
          x1: pendingPoint.x,
          y1: pendingPoint.y,
          x2: pendingSecondPoint.x,
          y2: pendingSecondPoint.y,
          lineType: "disjointChannel",
          extraPoints: [
            { x: pendingSecondPoint.x, y: round4(pendingSecondPoint.y + offset) },
            { x: pendingPoint.x, y: round4(2 * pendingSecondPoint.y - pendingPoint.y + offset) },
          ],
        },
      ]);
      cancelDrawingTool();
      return;
    }

    // "fibonacciExtension"/"elliottCorrection"/"elliottImpulse" all collect more than two points
    // — the first two go through the same pendingPoint/pendingSecondPoint stages "channel" uses
    // above, the rest accumulate into pendingExtraPoints until MULTI_POINT_TOOLS' count for this
    // tool is reached, then commit with everything gathered.
    const multiPoint = MULTI_POINT_TOOLS[activeTool];
    if (multiPoint) {
      if (!pendingPoint) {
        setPendingPoint(point);
        setPreviewPoint(point);
        return;
      }
      if (!pendingSecondPoint) {
        setPendingSecondPoint(point);
        setPreviewPoint(point);
        return;
      }
      const nextExtra = [...pendingExtraPoints, point];
      if (nextExtra.length < multiPoint.extraPoints) {
        setPendingExtraPoints(nextExtra);
        setPreviewPoint(point);
        return;
      }
      commitDrawings([
        ...drawings,
        {
          id: `drawing-${drawingIdRef.current++}`,
          x1: pendingPoint.x,
          y1: pendingPoint.y,
          x2: pendingSecondPoint.x,
          y2: pendingSecondPoint.y,
          // MULTI_POINT_TOOLS only has entries for these three, guaranteed by `multiPoint` above
          // — narrower than what TS can infer just from the (wider-keyed) lookup being truthy.
          lineType: activeTool as "fibonacciExtension" | "elliottCorrection" | "elliottImpulse",
          extraPoints: nextExtra,
        },
      ]);
      cancelDrawingTool();
      return;
    }

    // "trendline", "extended", "fibonacci" and "rectangle" all share the same 2-click flow —
    // they only differ in how they're drawn (see the canvas draw effect) and, for "rectangle",
    // hit-tested, not in how they're placed. "arrowLine" is the same flow again but stays
    // lineType-less like a plain trend line, just with arrowRight preset.
    if (!pendingPoint) {
      setPendingPoint(point);
      setPreviewPoint(point);
      return;
    }
    const drawing: TrendLineDrawing = {
      id: `drawing-${drawingIdRef.current++}`,
      x1: pendingPoint.x,
      y1: pendingPoint.y,
      x2: point.x,
      y2: point.y,
      ...(activeTool === "extended" || activeTool === "fibonacci" || activeTool === "rectangle" ? { lineType: activeTool } : {}),
      ...(activeTool === "arrowLine" ? { arrowRight: true } : {}),
    };
    commitDrawings([...drawings, drawing]);
    cancelDrawingTool();
  }

  function handleOverlayDoubleClick() {
    if (activeTool) return;
    // Double-clicking a drawing edits it (existing behavior) — double-clicking empty plot space
    // resets the zoom instead, same gesture the axis strips already use for their own axis.
    if (!hoveredDrawingId) {
      resetZoom();
      return;
    }
    const dr = drawings.find((d) => d.id === hoveredDrawingId);
    if (!dr) return;
    setEditingId(dr.id);
    setDraft(dr);
    setEditModalTab("coords");
  }

  function closeEditModal() {
    setEditingId(null);
    setDraft(null);
  }

  function saveEditModal() {
    if (!editingId || !draft) return;
    commitDrawings(drawings.map((d) => (d.id === editingId ? draft : d)));
    closeEditModal();
  }

  function deleteEditingDrawing() {
    if (!editingId) return;
    commitDrawings(drawings.filter((d) => d.id !== editingId));
    closeEditModal();
  }

  // pointIndex: 0 = x1/y1, 1 = x2/y2, 2+ = extraPoints[pointIndex - 2] — every multi-point tool
  // (fibonacciExtension/elliottCorrection/elliottImpulse) shares this one generic handler instead
  // of each needing its own, same as a regular trend line's two endpoints always have.
  function handleEndpointPointerDown(drawingId: string, pointIndex: number) {
    return (e: React.PointerEvent<SVGCircleElement>) => {
      // Still stops propagation while locked — otherwise the blocked click would bubble up to
      // the overlay underneath and start a whole-body drag instead, defeating the lock entirely.
      e.stopPropagation();
      if (drawingsLocked) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragEndpointRef.current = { id: drawingId, pointIndex };
    };
  }

  function handleEndpointPointerMove(e: React.PointerEvent<SVGCircleElement>) {
    const drag = dragEndpointRef.current;
    if (!drag) return;
    const point = toDataPoint(e);
    commitDrawings(
      drawings.map((d) => {
        if (d.id !== drag.id) return d;
        if (drag.pointIndex === 0) return { ...d, x1: point.x, y1: point.y };
        if (drag.pointIndex === 1) return { ...d, x2: point.x, y2: point.y };
        const extraPoints = [...(d.extraPoints ?? [])];
        extraPoints[drag.pointIndex - 2] = point;
        return { ...d, extraPoints };
      })
    );
  }

  function handleEndpointPointerUp(e: React.PointerEvent<SVGCircleElement>) {
    dragEndpointRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  // Redefines one of the measure tool's two completed points by dragging its handle — same
  // pointer-capture-on-the-handle pattern as a drawing endpoint above, just writing to
  // measurePoints instead of `drawings` (a measurement was never one to begin with).
  function handleMeasureHandlePointerDown(point: "p1" | "p2") {
    return (e: React.PointerEvent<SVGCircleElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragMeasureRef.current = point;
    };
  }

  function handleMeasureHandlePointerMove(e: React.PointerEvent<SVGCircleElement>) {
    const point = dragMeasureRef.current;
    if (!point) return;
    const next = toDataPoint(e);
    setMeasurePoints((mp) => (mp ? { ...mp, [point]: next } : mp));
  }

  function handleMeasureHandlePointerUp(e: React.PointerEvent<SVGCircleElement>) {
    dragMeasureRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  // Single-handle drag for an axis-constrained line: sets its value directly from the pointer's
  // absolute position (like the two-endpoint drag above), but along one axis only — a
  // "horizontal" line's handle only ever changes y1/y2 (kept equal), a "vertical" line's handle
  // only ever changes x1/x2 (kept equal).
  function handleAxisHandlePointerDown(drawingId: string) {
    return (e: React.PointerEvent<SVGCircleElement>) => {
      // Still stops propagation while locked — same reasoning as handleEndpointPointerDown above.
      e.stopPropagation();
      if (drawingsLocked) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragAxisRef.current = { id: drawingId };
    };
  }

  function handleAxisHandlePointerMove(e: React.PointerEvent<SVGCircleElement>) {
    const drag = dragAxisRef.current;
    if (!drag) return;
    const dr = drawings.find((d) => d.id === drag.id);
    if (!dr) return;
    const rect = zoomRef.current!.getBoundingClientRect();
    if (dr.lineType === "horizontal") {
      const mouseY = e.clientY - rect.top;
      const value = round4(dr.valueAxis === "volume" ? volumeScale.invert(mouseY - priceHeight) : zoomedPriceScale.invert(mouseY));
      commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, y1: value, y2: value } : d)));
    } else if (dr.lineType === "vertical") {
      const mouseX = e.clientX - rect.left;
      const dateValue = dateForIndex(zoomedXScale.invert(mouseX));
      commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, x1: dateValue, x2: dateValue } : d)));
    } else if (dr.lineType === "ray" || dr.lineType === "arrowUp" || dr.lineType === "arrowDown") {
      // Both a ray's anchor and an arrow marker's single point have both degrees of freedom,
      // unlike horizontal/vertical's single axis — an arrow marker just never reads from the
      // volume scale (it's always price-anchored).
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const dateValue = dateForIndex(zoomedXScale.invert(mouseX));
      const value = round4(dr.valueAxis === "volume" ? volumeScale.invert(mouseY - priceHeight) : zoomedPriceScale.invert(mouseY));
      commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, x1: dateValue, x2: dateValue, y1: value, y2: value } : d)));
    } else if (dr.lineType === "channel") {
      // A channel's 3rd handle only adjusts channelOffset (single axis, vertical) — line 1's own
      // two endpoints already have their own draggable handles, same as a regular trend line.
      // Recomputes the offset so line 2 passes through the new mouseY at the handle's own X (its
      // line 2 midpoint) — the midpoint's line-1 price simplifies to a plain average of y1/y2.
      const mouseY = e.clientY - rect.top;
      const midPrice = (dr.y1 + dr.y2) / 2;
      commitDrawings(
        drawings.map((d) => (d.id === drag.id ? { ...d, channelOffset: round4(zoomedPriceScale.invert(mouseY) - midPrice) } : d))
      );
    }
  }

  function handleAxisHandlePointerUp(e: React.PointerEvent<SVGCircleElement>) {
    dragAxisRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  // Each entry carries its absolute index in `data` (not just its position within this slice)
  // — that's what positions it on the index-based `zoomedXScale` (as `i + 0.5`, the slot center).
  const visible = useMemo(() => {
    if (data.length === 0) return [];
    const start = Math.max(0, visibleRange.start - 2);
    const end = Math.min(data.length, visibleRange.end + 2);
    return data.slice(start, end).map((d, k) => ({ d, i: start + k }));
  }, [data, visibleRange]);

  // Gated on the active mode (not just `data`) so the other two never do their O(n) pass while
  // unused — cheap to flip back and forth since switching modes just recomputes the one that's
  // now active instead of paying for all three on every data change.
  const heikinAshiCandles = useMemo(
    () => (chartDisplayMode === "heikinAshi" ? computeHeikinAshiCandles(data) : null),
    [data, chartDisplayMode]
  );
  const renkoBricks = useMemo(() => {
    if (chartDisplayMode !== "renko") return [];
    const brickSize = computeRenkoBrickSize(data, Math.max(1, Math.round(renkoAtrPeriod)));
    return computeRenkoBricks(data, brickSize);
  }, [data, chartDisplayMode, renkoAtrPeriod]);
  const lineBreakBricks = useMemo(
    () => (chartDisplayMode === "lineBreak" ? computeLineBreakBricks(data, 3) : []),
    [data, chartDisplayMode]
  );
  // Recomputed on pan/zoom (not just `data`), same as `YAutoScaling` above — the profile
  // describes whatever's currently on screen, not the whole dataset.
  const tpoProfile = useMemo(() => {
    if (chartDisplayMode !== "tpo") return null;
    const start = Math.max(0, visibleRange.start);
    const end = Math.min(data.length, visibleRange.end);
    if (end <= start) return null;
    return computeTPOProfile(data.slice(start, end), 24);
  }, [data, visibleRange, chartDisplayMode]);

  // First-seen order (not alphabetical) so the settings modal's checkbox list matches whatever
  // order the caller's own `events` array introduces each kind in.
  const eventKinds = useMemo(() => {
    const kinds: string[] = [];
    for (const e of events ?? []) if (!kinds.includes(e.kind)) kinds.push(e.kind);
    return kinds;
  }, [events]);

  const visibleEvents = useMemo(() => {
    if (!events || events.length === 0) return [];
    const start = Math.max(0, visibleRange.start - 2);
    const end = Math.min(data.length, visibleRange.end + 2);
    return events
      .map((event, idx) => ({ event, idx, i: indexForDate(event.date) }))
      .filter(({ event, i }) => !hiddenEventKinds.has(event.kind) && i >= start && i <= end);
  }, [events, hiddenEventKinds, visibleRange, data.length, indexForDate]);

  // The bottom axis's own scale is index-based now, so its automatic tick generator would label
  // ticks with raw indices (0, 100, 200…) instead of dates. Same fix BarChart/DeltaChart already
  // use for their categorical axis: supply explicit tickValues (slot centers, i + 0.5) throttled
  // to a readable count regardless of zoom, and a tickFormat that looks the date up by index.
  const dateTickValues = useMemo(() => {
    const start = Math.max(0, visibleRange.start);
    const end = Math.min(data.length, visibleRange.end);
    const count = end - start;
    if (count <= 0) return [];
    const step = Math.max(1, Math.ceil(count / MAX_DATE_TICKS));
    const values: number[] = [];
    for (let i = start; i < end; i += step) values.push(i + 0.5);
    return values;
  }, [visibleRange, data.length]);

  function dateTickFormat(v: number): string {
    const idx = Math.min(data.length - 1, Math.max(0, Math.round(v - 0.5)));
    return dFmt(data[idx].date);
  }

  // Each candle fills up to 80% of the space actually available to it at the current zoom —
  // with a single candle visible, that's 80% of the whole plot width. Deliberately no minimum
  // pixel floor: with many candles crammed into a narrow view (e.g. fully zoomed out on a
  // 10,000-candle dataset), 80% of their slot is still less than the slot itself, so neighbors
  // never overlap — a floor like `max(1, ...)` would force overlap once the slot itself was
  // narrower than that floor. Sized off the zoomed scale's own (unclamped) domain span rather
  // than `visibleRange` (which clamps to `data.length`) — otherwise, panned into the reserved
  // future space with only a few real candles peeking in from the left, `visibleRange` would
  // undercount the visible slots and render those candles too wide for the current zoom level.
  const zoomedSlotCount = useMemo(() => {
    const [i0, i1] = zoomedXScale.domain();
    return Math.max(1, i1 - i0);
  }, [zoomedXScale]);
  const candleWidth = Math.max(0.1, (dims.boundedWidth / zoomedSlotCount) * 0.8);

  // Expensive (O(data.length) per indicator) — recomputed only when the data or the indicator
  // list itself changes, never on pan/zoom (which would otherwise redo this every frame).
  const indicatorValues = useMemo(
    () => indicators.map((indicator) => ({ indicator, values: computeIndicatorValues(data, indicator) })),
    [data, indicators]
  );

  // Cheap: slices the precomputed arrays down to the same padded visible window `visible` uses,
  // dropping the null (warm-up period) entries.
  const visibleIndicators = useMemo(() => {
    const start = Math.max(0, visibleRange.start - 2);
    const end = Math.min(data.length, visibleRange.end + 2);
    return indicatorValues.map(({ indicator, values }) => {
      const points: { i: number; value: number | IndicatorBand | IndicatorMACD }[] = [];
      for (let i = start; i < end; i++) {
        const v = values[i];
        if (v !== null) points.push({ i, value: v });
      }
      return { indicator, points };
    });
  }, [indicatorValues, data.length, visibleRange]);

  // One Y-scale per "own"-pane indicator, shared between the canvas draw effect and the SVG axis
  // ticks below it (computed once here instead of duplicated in both places, which would risk
  // the two drifting out of sync). RSI/CHOP are always 0-100 by definition; MACD auto-fits to
  // whatever's currently visible (macd/signal/histogram together), same spirit as YAutoScaling
  // for price.
  const ownPaneScales = useMemo(() => {
    const scales: Record<string, d3.ScaleLinear<number, number>> = {};
    ownPaneIndicators.forEach((ind, idx) => {
      const height = indicatorPaneHeights[idx];
      if (ind.kind === "macd") {
        const points = (visibleIndicators.find((v) => v.indicator.id === ind.id)?.points ?? []) as { i: number; value: IndicatorMACD }[];
        let lo = 0;
        let hi = 0;
        for (const p of points) {
          lo = Math.min(lo, p.value.macd, p.value.signal ?? p.value.macd, p.value.histogram ?? 0);
          hi = Math.max(hi, p.value.macd, p.value.signal ?? p.value.macd, p.value.histogram ?? 0);
        }
        const pad = (hi - lo) * 0.1 || 1;
        scales[ind.id] = d3.scaleLinear().domain([lo - pad, hi + pad]).range([height, 0]);
      } else {
        scales[ind.id] = d3.scaleLinear().domain([0, 100]).range([height, 0]);
      }
    });
    return scales;
  }, [ownPaneIndicators, indicatorPaneHeights, visibleIndicators]);

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Freehand capture: samples points into brushPointsRef (a ref, not state — pointermove can
    // fire faster than React re-renders, and the committed drawing on pointer up reads straight
    // from the ref instead of racing a stale closure over React state) throttled to roughly every
    // 3px of on-screen movement, so a slow stroke isn't hundreds of near-duplicate points. Mirrors
    // the same array into brushPreview state purely so the draw effect has something to render
    // live — the ref stays the single source of truth for what actually gets committed.
    if (brushDrawingRef.current) {
      const last = brushPointsRef.current[brushPointsRef.current.length - 1];
      if (last) {
        const lastX = zoomedXScale(indexForDate(last.x) + 0.5);
        const lastY = zoomedPriceScale(last.y);
        if (Math.hypot(mouseX - lastX, mouseY - lastY) < 3) return;
      }
      const point = toDataPoint(e);
      brushPointsRef.current = [...brushPointsRef.current, point];
      setBrushPreview(brushPointsRef.current);
      return;
    }

    if (dragLineRef.current) {
      const drag = dragLineRef.current;
      const dxPixels = e.clientX - drag.startClientX;
      const dyPixels = e.clientY - drag.startClientY;
      if (drag.orig.lineType === "horizontal") {
        // Dragging the body moves it exactly like its single handle would — only the
        // perpendicular axis (here, price/volume) can change.
        const scale = drag.orig.valueAxis === "volume" ? volumeScale : zoomedPriceScale;
        const newValue = round4(scale.invert(scale(drag.orig.y1) + dyPixels));
        commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, y1: newValue, y2: newValue } : d)));
      } else if (drag.orig.lineType === "vertical") {
        const origX = zoomedXScale(indexForDate(drag.orig.x1) + 0.5);
        const newDate = dateForIndex(zoomedXScale.invert(origX + dxPixels));
        commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, x1: newDate, x2: newDate } : d)));
      } else if (drag.orig.lineType === "ray") {
        // A ray has both degrees of freedom (unlike horizontal/vertical), so dragging its body
        // moves its one anchor point in both date and price/volume at once.
        const origX = zoomedXScale(indexForDate(drag.orig.x1) + 0.5);
        const newDate = dateForIndex(zoomedXScale.invert(origX + dxPixels));
        const scale = drag.orig.valueAxis === "volume" ? volumeScale : zoomedPriceScale;
        const newValue = round4(scale.invert(scale(drag.orig.y1) + dyPixels));
        commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, x1: newDate, x2: newDate, y1: newValue, y2: newValue } : d)));
      } else {
        const origX1 = zoomedXScale(indexForDate(drag.orig.x1) + 0.5);
        const origX2 = zoomedXScale(indexForDate(drag.orig.x2) + 0.5);
        const newX1 = dateForIndex(zoomedXScale.invert(origX1 + dxPixels));
        const newY1 = round4(zoomedPriceScale.invert(zoomedPriceScale(drag.orig.y1) + dyPixels));
        const newX2 = dateForIndex(zoomedXScale.invert(origX2 + dxPixels));
        const newY2 = round4(zoomedPriceScale.invert(zoomedPriceScale(drag.orig.y2) + dyPixels));
        // Any extraPoints (fibonacciExtension/elliottCorrection/elliottImpulse) move by the same
        // pixel delta as x1/x2, keeping the whole multi-point shape intact.
        const newExtraPoints = drag.orig.extraPoints?.map((p) => {
          const origX = zoomedXScale(indexForDate(p.x) + 0.5);
          return {
            x: dateForIndex(zoomedXScale.invert(origX + dxPixels)),
            y: round4(zoomedPriceScale.invert(zoomedPriceScale(p.y) + dyPixels)),
          };
        });
        commitDrawings(
          drawings.map((d) =>
            d.id === drag.id
              ? { ...d, x1: newX1, y1: newY1, x2: newX2, y2: newY2, ...(newExtraPoints ? { extraPoints: newExtraPoints } : {}) }
              : d
          )
        );
      }
      return;
    }

    if (isPanningYRef.current) return;

    const index = Math.min(data.length - 1, Math.max(0, Math.round(zoomedXScale.invert(mouseX) - 0.5)));
    setHoverIndex(index);
    setHoverY(mouseY <= priceHeight ? mouseY : null);
    setHoverVolumeY(volumeVisible && !volumeCollapsed && mouseY > priceHeight ? mouseY - priceHeight : null);

    if (activeTool && pendingPoint) {
      setPreviewPoint({ x: dateForIndex(zoomedXScale.invert(mouseX)), y: zoomedPriceScale.invert(mouseY) });
    } else if (!activeTool && visibleDrawings.length > 0) {
      let closestId: string | null = null;
      let closestDist = DRAWING_HIT_DISTANCE;
      for (const dr of visibleDrawings) {
        // Axis-constrained lines render full-span (see the canvas draw effect below) rather
        // than between their stored x1/x2 pixel positions, so hit-testing has to match that.
        let d: number;
        if (dr.lineType === "horizontal") {
          const y = dr.valueAxis === "volume" ? priceHeight + volumeScale(dr.y1) : zoomedPriceScale(dr.y1);
          d = distanceToSegment(mouseX, mouseY, 0, y, dims.boundedWidth, y);
        } else if (dr.lineType === "ray") {
          const x = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const y = dr.valueAxis === "volume" ? priceHeight + volumeScale(dr.y1) : zoomedPriceScale(dr.y1);
          d = distanceToSegment(mouseX, mouseY, x, y, dims.boundedWidth, y);
        } else if (dr.lineType === "vertical") {
          const x = zoomedXScale(indexForDate(dr.x1) + 0.5);
          d = distanceToSegment(mouseX, mouseY, x, 0, x, plotBoundedHeight);
        } else if (dr.lineType === "channel") {
          const cx1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const cy1 = zoomedPriceScale(dr.y1);
          const cx2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
          const cy2 = zoomedPriceScale(dr.y2);
          const offsetPx = zoomedPriceScale(dr.y1 + (dr.channelOffset ?? 0)) - zoomedPriceScale(dr.y1);
          d = Math.min(
            distanceToSegment(mouseX, mouseY, cx1, cy1, cx2, cy2),
            distanceToSegment(mouseX, mouseY, cx1, cy1 + offsetPx, cx2, cy2 + offsetPx)
          );
        } else if (dr.lineType === "fibonacci") {
          const fx1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const fx2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
          d = Math.min(
            // The diagonal x1/y1–x2/y2 line itself, same as a regular trend line...
            distanceToSegment(mouseX, mouseY, fx1, zoomedPriceScale(dr.y1), fx2, zoomedPriceScale(dr.y2)),
            // ...plus whichever retracement level line is closest.
            ...FIBONACCI_LEVELS.map((ratio) => {
              const y = zoomedPriceScale(dr.y1 + (dr.y2 - dr.y1) * ratio);
              return distanceToSegment(mouseX, mouseY, fx1, y, fx2, y);
            })
          );
        } else if (
          dr.lineType === "elliottImpulse" ||
          dr.lineType === "elliottCorrection" ||
          dr.lineType === "brush" ||
          dr.lineType === "elbowArrow"
        ) {
          // Same "polyline through every point" distance for a freehand stroke or an open-ended
          // elbow-arrow polyline as for an Elliott wave's own fixed vertices.
          const screenPoints = allPointsOf(dr).map((p) => ({ x: zoomedXScale(indexForDate(p.x) + 0.5), y: zoomedPriceScale(p.y) }));
          let minSegmentDist = Infinity;
          for (let i = 1; i < screenPoints.length; i++) {
            minSegmentDist = Math.min(
              minSegmentDist,
              distanceToSegment(mouseX, mouseY, screenPoints[i - 1].x, screenPoints[i - 1].y, screenPoints[i].x, screenPoints[i].y)
            );
          }
          d = minSegmentDist;
        } else if (dr.lineType === "rectangle") {
          const rx1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const ry1 = zoomedPriceScale(dr.y1);
          const rx2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
          const ry2 = zoomedPriceScale(dr.y2);
          d = Math.min(
            distanceToSegment(mouseX, mouseY, rx1, ry1, rx2, ry1),
            distanceToSegment(mouseX, mouseY, rx2, ry1, rx2, ry2),
            distanceToSegment(mouseX, mouseY, rx2, ry2, rx1, ry2),
            distanceToSegment(mouseX, mouseY, rx1, ry2, rx1, ry1)
          );
        } else if (dr.lineType === "arrowUp" || dr.lineType === "arrowDown") {
          d = Math.hypot(mouseX - zoomedXScale(indexForDate(dr.x1) + 0.5), mouseY - zoomedPriceScale(dr.y1));
        } else if (dr.lineType === "fibonacciExtension") {
          const ax = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const ay = zoomedPriceScale(dr.y1);
          const bx = zoomedXScale(indexForDate(dr.x2) + 0.5);
          const by = zoomedPriceScale(dr.y2);
          const distances = [distanceToSegment(mouseX, mouseY, ax, ay, bx, by)];
          const pointC = dr.extraPoints?.[0];
          if (pointC) {
            const cx = zoomedXScale(indexForDate(pointC.x) + 0.5);
            const cy = zoomedPriceScale(pointC.y);
            distances.push(distanceToSegment(mouseX, mouseY, bx, by, cx, cy));
            const legDelta = dr.y2 - dr.y1;
            const levelX1 = Math.min(bx, cx);
            const levelX2 = Math.max(bx, cx);
            for (const ratio of FIBONACCI_EXTENSION_LEVELS) {
              const y = zoomedPriceScale(pointC.y + legDelta * ratio);
              distances.push(distanceToSegment(mouseX, mouseY, levelX1, y, levelX2, y));
            }
          }
          d = Math.min(...distances);
        } else if (dr.lineType === "disjointChannel") {
          const jx1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const jy1 = zoomedPriceScale(dr.y1);
          const jx2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
          const jy2 = zoomedPriceScale(dr.y2);
          const distances = [distanceToSegment(mouseX, mouseY, jx1, jy1, jx2, jy2)];
          const [p3, p4] = dr.extraPoints ?? [];
          if (p3 && p4) {
            distances.push(
              distanceToSegment(
                mouseX,
                mouseY,
                zoomedXScale(indexForDate(p3.x) + 0.5),
                zoomedPriceScale(p3.y),
                zoomedXScale(indexForDate(p4.x) + 0.5),
                zoomedPriceScale(p4.y)
              )
            );
          }
          d = Math.min(...distances);
        } else {
          const x1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const y1 = zoomedPriceScale(dr.y1);
          const x2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
          const y2 = zoomedPriceScale(dr.y2);
          // A regular trend line ("extended" included — see effectiveExtendOf) can be extended
          // past x1/x2 via the Style tab, not only when drawn with the dedicated tool.
          const extend = effectiveExtendOf(dr);
          if (extend === "none") {
            d = distanceToSegment(mouseX, mouseY, x1, y1, x2, y2);
          } else {
            const extended = extendSegmentToEdges(x1, y1, x2, y2, 0, dims.boundedWidth, extend);
            d = distanceToSegment(mouseX, mouseY, extended.x1, extended.y1, extended.x2, extended.y2);
          }
        }
        if (d < closestDist) {
          closestDist = d;
          closestId = dr.id;
        }
      }
      updateHoveredDrawingId(closestId);
    }
  }

  // When hovering a drawing, starts a "drag the whole line" gesture — d3-zoom already backs off
  // in that case via the filter above, so capturing the pointer here doesn't compete with
  // anything. Otherwise starts an independent Y-pan via plain window listeners (same pattern
  // RangeSlider's drag uses) rather than a second setPointerCapture on the SAME overlay d3-zoom
  // is attached to — an earlier attempt did that, and it raced with d3-zoom's own native pointer
  // handling and broke X panning entirely. Window listeners never touch this element's pointer
  // capture, so d3-zoom's own gesture (handling X) is completely unaffected by this running
  // alongside it for Y.
  function handleOverlayPointerDown(e: React.PointerEvent<SVGRectElement>) {
    // Brush is the one drawing tool that places points by dragging instead of clicking — starts
    // capturing here instead of falling through to the click-based tools' shared handleOverlayClick.
    if (activeTool === "brush") {
      e.currentTarget.setPointerCapture(e.pointerId);
      const point = toDataPoint(e);
      brushDrawingRef.current = true;
      brushPointsRef.current = [point];
      setBrushPreview(brushPointsRef.current);
      return;
    }
    if (activeTool) return;
    if (hoveredDrawingId) {
      // Locked: absorb the gesture instead of dragging the line OR falling through to Y-pan —
      // otherwise panning would shift the price scale under the (unmoved) line, breaking hit
      // testing at the original screen position. The drawing stays selectable/deletable/editable
      // (all driven by hover/double-click, untouched here), just not draggable.
      if (drawingsLocked) return;
      const dr = drawings.find((d) => d.id === hoveredDrawingId);
      if (dr) {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragLineRef.current = { id: dr.id, startClientX: e.clientX, startClientY: e.clientY, orig: dr };
        return;
      }
    }
    if (!zoomable) return;
    const startClientY = e.clientY;
    const startYTransform = yTransform;
    isPanningYRef.current = true;
    const onMove = (ev: PointerEvent) => {
      const dy = ev.clientY - startClientY;
      // Only flagged here (once actual movement happens), not at pointerdown — a plain click
      // with no drag shouldn't disable YAutoScaling.
      setYManuallyAdjusted(true);
      setYTransform(d3.zoomIdentity.scale(startYTransform.k).translate(0, startYTransform.y / startYTransform.k + dy / startYTransform.k));
    };
    const onUp = () => {
      isPanningYRef.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleOverlayPointerUp(e: React.PointerEvent<SVGRectElement>) {
    if (brushDrawingRef.current) {
      brushDrawingRef.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      const points = brushPointsRef.current;
      brushPointsRef.current = [];
      setBrushPreview(null);
      if (points.length >= 2) {
        const first = points[0];
        const last = points[points.length - 1];
        commitDrawings([
          ...drawings,
          { id: `drawing-${drawingIdRef.current++}`, x1: first.x, y1: first.y, x2: last.x, y2: last.y, lineType: "brush", extraPoints: points.slice(1, -1) },
        ]);
      }
      cancelDrawingTool();
      return;
    }
    if (!dragLineRef.current) return;
    dragLineRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = ref.current;
    if (!canvas || !wrapper || dims.boundedWidth <= 0 || plotBoundedHeight <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.boundedWidth * dpr;
    canvas.height = plotBoundedHeight * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, dims.boundedWidth, plotBoundedHeight);

    const style = getComputedStyle(wrapper);
    const colorUp = upColorOverride ?? style.getPropertyValue("--lq-color-up").trim();
    const colorDown = downColorOverride ?? style.getPropertyValue("--lq-color-down").trim();
    const colorBg = style.getPropertyValue("--lq-color-bg").trim();
    const colorText = style.getPropertyValue("--lq-color-text").trim();
    const colorMuted = style.getPropertyValue("--lq-color-text-muted").trim();
    const colorAccent = style.getPropertyValue("--lq-color-accent").trim();
    const colorGrid = style.getPropertyValue("--lq-color-border-subtle").trim();
    const fontFamily = style.getPropertyValue("--lq-font-family").trim() || "sans-serif";
    const isEink = wrapper.closest('[data-lq-palette="eink"]') !== null;

    // Everything in price space (gridlines, candles, drawings, the price hover line) is clipped
    // to the price section's own rectangle — without this, panning/zooming the price axis could
    // push candles/drawings visually down into the volume area below, since rescaling the scale
    // doesn't clamp the pixels it produces to any particular range.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, dims.boundedWidth, priceHeight);
    ctx.clip();

    // Drawn first, underneath everything else — mirrors ChartAxis's own grid (same `ticks(5)`
    // the SVG price axis would otherwise use), kept on canvas so it stays behind the candles
    // instead of the SVG (which paints on top of the canvas) covering them.
    ctx.save();
    ctx.strokeStyle = colorGrid;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    for (const tick of zoomedPriceScale.ticks(5)) {
      const y = snapPixel(zoomedPriceScale(tick));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dims.boundedWidth, y);
      ctx.stroke();
    }
    ctx.restore();

    if (chartDisplayMode === "line") {
      // A plain close-price line, same treatment as the light area fill under an indicator
      // band (globalAlpha 0.08) rather than a fully opaque fill, so gridlines/drawings under it
      // stay legible.
      if (visible.length > 0) {
        ctx.save();
        ctx.strokeStyle = colorAccent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        visible.forEach(({ d, i }, k) => {
          const x = zoomedXScale(i + 0.5);
          const y = zoomedPriceScale(d.close);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        if (visible.length > 1) {
          ctx.lineTo(zoomedXScale(visible[visible.length - 1].i + 0.5), priceHeight);
          ctx.lineTo(zoomedXScale(visible[0].i + 0.5), priceHeight);
          ctx.closePath();
          ctx.globalAlpha = 0.08;
          ctx.fillStyle = colorAccent;
          ctx.fill();
        }
        ctx.restore();
      }
    } else if (chartDisplayMode === "renko" || chartDisplayMode === "lineBreak") {
      // Bricks are positioned on the *existing* index-based X scale (see PriceBrick's own
      // comment) rather than a dedicated brick-index axis, so they zoom/pan in lockstep with
      // everything else instead of needing a parallel scale threaded through the whole file.
      const bricks = chartDisplayMode === "renko" ? renkoBricks : lineBreakBricks;
      const rangeStart = Math.max(0, visibleRange.start - 2);
      const rangeEnd = Math.min(data.length, visibleRange.end + 2);
      for (let bi = 0; bi < bricks.length; bi++) {
        const brick = bricks[bi];
        if (brick.endIndex < rangeStart || brick.startIndex > rangeEnd) continue;
        const up = brick.direction > 0;
        const hueColor = up ? colorUp : colorDown;
        // A brick's own `startIndex` is set to the *previous* brick's `endIndex` (see
        // computeRenkoBricks/computeLineBreakBricks) — both bricks legitimately claim that same
        // candle when it's the one that confirmed the earlier brick AND kicked off this one, so
        // rendering both from that literal index doubled up one full candle-slot's width of
        // overlap at every single transition, painting the new brick's color over part of the
        // old one. Bumped forward by one slot here (render-only — the stored index driving the
        // price math is untouched) whenever that overlap actually applies, i.e. never for the
        // very first brick and never for one of several bricks confirmed within the same candle
        // (startIndex === endIndex there already renders as a single deliberate 1-slot sliver).
        const prevBrick = bi > 0 ? bricks[bi - 1] : null;
        const sharesBoundaryWithPrev = prevBrick !== null && brick.startIndex === prevBrick.endIndex && brick.startIndex !== brick.endIndex;
        const renderStartIndex = sharesBoundaryWithPrev ? brick.startIndex + 1 : brick.startIndex;
        const x1 = zoomedXScale(renderStartIndex);
        const x2 = zoomedXScale(brick.endIndex + 1);
        const top = zoomedPriceScale(Math.max(brick.open, brick.close));
        const bottom = zoomedPriceScale(Math.min(brick.open, brick.close));
        const inset = Math.min(1.5, (x2 - x1) / 4);
        const rectX = x1 + inset;
        const rectWidth = Math.max(1, x2 - x1 - inset * 2);
        const rectHeight = Math.max(1, bottom - top);

        ctx.lineWidth = 1;
        ctx.fillStyle = isEink ? (up ? colorBg : colorText) : hueColor;
        ctx.strokeStyle = isEink ? colorText : hueColor;
        ctx.fillRect(rectX, top, rectWidth, rectHeight);
        ctx.strokeRect(rectX, top, rectWidth, rectHeight);
      }
    } else {
      // "candle"/"tpo" (TPO overlays its histogram + VAH/POC/VAL on top of ordinary candles
      // rather than replacing them — a profile with nothing to show it against wouldn't mean
      // much) and "heikinAshi" (same candle body/wick drawing, just fed transformed OHLC values
      // that stay 1:1 with `data`'s own indices).
      const useHA = chartDisplayMode === "heikinAshi" && heikinAshiCandles;
      for (const { d: rawD, i } of visible) {
        const d = useHA ? heikinAshiCandles![i] : rawD;
        const cx = zoomedXScale(i + 0.5);
        const up = d.close >= d.open;
        const bodyTop = zoomedPriceScale(Math.max(d.open, d.close));
        const bodyBottom = zoomedPriceScale(Math.min(d.open, d.close));
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);
        const hueColor = up ? colorUp : colorDown;

        ctx.lineWidth = 1;
        ctx.strokeStyle = isEink ? colorText : hueColor;
        ctx.beginPath();
        ctx.moveTo(cx, zoomedPriceScale(d.high));
        ctx.lineTo(cx, zoomedPriceScale(d.low));
        ctx.stroke();

        // E-ink can't code up/down by hue, so it falls back to the standard hollow/filled OHLC convention.
        ctx.fillStyle = isEink ? (up ? colorBg : colorText) : hueColor;
        ctx.strokeStyle = isEink ? colorText : hueColor;
        ctx.fillRect(cx - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
        ctx.strokeRect(cx - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      }
    }

    if (chartDisplayMode === "tpo" && tpoProfile) {
      const { bins, poc, vah, val } = tpoProfile;
      const maxCount = Math.max(1, ...bins.map((b) => b.count));
      const histMaxWidth = dims.boundedWidth * 0.16;
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = colorAccent;
      for (const bin of bins) {
        if (bin.count <= 0) continue;
        const barWidth = (bin.count / maxCount) * histMaxWidth;
        const yTop = zoomedPriceScale(bin.priceHigh);
        const yBottom = zoomedPriceScale(bin.priceLow);
        ctx.fillRect(dims.boundedWidth - barWidth, yTop, barWidth, Math.max(1, yBottom - yTop));
      }
      ctx.restore();

      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.font = `600 10px ${fontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      for (const level of [
        { price: vah, label: "VAH" },
        { price: poc, label: "POC" },
        { price: val, label: "VAL" },
      ]) {
        const y = snapPixel(zoomedPriceScale(level.price));
        ctx.strokeStyle = colorMuted;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(dims.boundedWidth, y);
        ctx.stroke();
        ctx.fillStyle = colorMuted;
        ctx.fillText(level.label, 4, y - 2);
      }
      ctx.restore();
    }

    // Only price-overlay indicators (SMA/EMA/WMA/VWAP/Bollinger) draw here — "own"-pane ones
    // (RSI/CHOP/MACD) get their own clipped section further down, alongside volume.
    visibleIndicators.forEach(({ indicator, points }, index) => {
      if (indicator.hidden || points.length < 2 || indicatorCatalogEntry(indicator.kind).pane !== "price") return;
      const color = indicator.color ?? defaultIndicatorColor(index);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.setLineDash([]);

      if (typeof points[0].value === "number") {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        points.forEach((p, k) => {
          const x = zoomedXScale(p.i + 0.5);
          const y = zoomedPriceScale(p.value as number);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      } else {
        // Band indicator (Bollinger): translucent fill between the bands, thin upper/lower
        // lines, and a solid middle line — the conventional "channel" rendering.
        const bandPoints = points as { i: number; value: IndicatorBand }[];
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = color;
        ctx.beginPath();
        bandPoints.forEach((p, k) => {
          const x = zoomedXScale(p.i + 0.5);
          const y = zoomedPriceScale(p.value.upper);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        for (let k = bandPoints.length - 1; k >= 0; k--) {
          ctx.lineTo(zoomedXScale(bandPoints[k].i + 0.5), zoomedPriceScale(bandPoints[k].value.lower));
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.lineWidth = 1;
        (["upper", "lower"] as const).forEach((key) => {
          ctx.beginPath();
          bandPoints.forEach((p, k) => {
            const x = zoomedXScale(p.i + 0.5);
            const y = zoomedPriceScale(p.value[key]);
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        });

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        bandPoints.forEach((p, k) => {
          const x = zoomedXScale(p.i + 0.5);
          const y = zoomedPriceScale(p.value.middle);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      ctx.restore();
    });

    if (hovered && hoverY !== null) {
      ctx.save();
      ctx.strokeStyle = colorMuted;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, hoverY);
      ctx.lineTo(dims.boundedWidth, hoverY);
      ctx.stroke();
      ctx.restore();
    }

    // Regular trend lines plus "horizontal" price lines (volume ones are drawn in the volume
    // section below, "vertical" ones are drawn full-height further down, outside any clip).
    for (const dr of visibleDrawings) {
      // "rectangle"/"elbowArrow"/"brush"/"arrowUp"/"arrowDown" have their own geometry entirely
      // unlike the "diagonal x1/y1–x2/y2, optionally extended, plus per-lineType extras" shape
      // every other type below shares — drawn in their own dedicated loops further down instead,
      // same reasoning "vertical" (full-height, outside this clip) already skips this one for.
      if (
        dr.lineType === "vertical" ||
        dr.lineType === "rectangle" ||
        dr.lineType === "elbowArrow" ||
        dr.lineType === "brush" ||
        dr.lineType === "arrowUp" ||
        dr.lineType === "arrowDown" ||
        ((dr.lineType === "horizontal" || dr.lineType === "ray") && dr.valueAxis === "volume")
      )
        continue;
      const lineColor = dr.color ?? colorAccent;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      ctx.setLineDash(lineDashArray(dr));
      const startsFromEdge = dr.lineType === "horizontal";
      let x1: number, y1: number, x2: number, y2: number;
      if (dr.lineType === "horizontal" || dr.lineType === "ray") {
        // "ray" starts at its own anchor date instead of the plot's left edge — everything else
        // about it (ends at the right edge, single price/volume value) matches "horizontal".
        x1 = startsFromEdge ? 0 : zoomedXScale(indexForDate(dr.x1) + 0.5);
        x2 = dims.boundedWidth;
        y1 = y2 = zoomedPriceScale(dr.y1);
      } else {
        x1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
        y1 = zoomedPriceScale(dr.y1);
        x2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
        y2 = zoomedPriceScale(dr.y2);
      }

      // A regular trend line ("extended" included — see effectiveExtendOf) can be extended past
      // x1/x2 (fully, or just one side) via the Style tab, not only when drawn with the dedicated
      // "extended" tool — computed separately from x1/y1/x2/y2 themselves, which stay the two
      // defining (and draggable, and text-anchoring) points regardless of how far the line
      // itself actually reaches.
      const extend = effectiveExtendOf(dr);
      let drawX1 = x1,
        drawY1 = y1,
        drawX2 = x2,
        drawY2 = y2;
      if (extend !== "none") {
        const extended = extendSegmentToEdges(x1, y1, x2, y2, 0, dims.boundedWidth, extend);
        drawX1 = extended.x1;
        drawY1 = extended.y1;
        drawX2 = extended.x2;
        drawY2 = extended.y2;
      }
      ctx.beginPath();
      ctx.moveTo(drawX1, drawY1);
      ctx.lineTo(drawX2, drawY2);
      ctx.stroke();

      // arrowLeft/arrowRight only apply to a free two-point line — always drawn at x1/y1–x2/y2
      // themselves (never the extended edges above, since the two are mutually exclusive in the
      // edit modal anyway) and identified by screen position, not by which of x1/x2 is smaller.
      if ((!dr.lineType || dr.lineType === "extended") && (dr.arrowLeft || dr.arrowRight)) {
        const leftPoint = x1 <= x2 ? { x: x1, y: y1 } : { x: x2, y: y2 };
        const rightPoint = x1 <= x2 ? { x: x2, y: y2 } : { x: x1, y: y1 };
        if (dr.arrowLeft) drawArrowhead(ctx, rightPoint.x, rightPoint.y, leftPoint.x, leftPoint.y, lineColor);
        if (dr.arrowRight) drawArrowhead(ctx, leftPoint.x, leftPoint.y, rightPoint.x, rightPoint.y, lineColor);
      }

      // "channel" draws a second segment parallel to x1/x2, offset by channelOffset (a price
      // delta — constant in pixel terms too, since zoomedPriceScale is linear).
      if (dr.lineType === "channel") {
        const offsetPx = zoomedPriceScale(dr.y1 + (dr.channelOffset ?? 0)) - zoomedPriceScale(dr.y1);
        ctx.beginPath();
        ctx.moveTo(x1, y1 + offsetPx);
        ctx.lineTo(x2, y2 + offsetPx);
        ctx.stroke();
      }

      // "disjointChannel"'s line 2 is just its own two stored, independently-draggable points
      // (extraPoints[0]/[1]) — no offset/mirror math needed here, that only happens once, at
      // placement time (see handleOverlayClick).
      if (dr.lineType === "disjointChannel" && dr.extraPoints?.length === 2) {
        const [p3, p4] = dr.extraPoints;
        ctx.beginPath();
        ctx.moveTo(zoomedXScale(indexForDate(p3.x) + 0.5), zoomedPriceScale(p3.y));
        ctx.lineTo(zoomedXScale(indexForDate(p4.x) + 0.5), zoomedPriceScale(p4.y));
        ctx.stroke();
      }

      // "fibonacci" slices y1 (0%) to y2 (100%) into the standard retracement ratios, each its
      // own horizontal segment spanning x1/x2 — on top of the diagonal x1/y1–x2/y2 already drawn
      // above, which is unaffected (drawX*/drawY* only differ from x1/y1/x2/y2 when extended).
      // Labeled directly (not through the `formatPrice` prop's pFmt — that's declared after this
      // effect in source order, and pulling it in as a dependency would rerun the whole effect
      // on every render since it's a fresh function each time, unless the caller memoizes it).
      if (dr.lineType === "fibonacci") {
        ctx.save();
        ctx.setLineDash(lineDashArray(dr));
        ctx.font = `600 10px ${fontFamily}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        for (const ratio of FIBONACCI_LEVELS) {
          const price = dr.y1 + (dr.y2 - dr.y1) * ratio;
          const y = zoomedPriceScale(price);
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
          ctx.fillStyle = lineColor;
          ctx.fillText(`${(ratio * 100).toFixed(1)}% · ${price.toFixed(2)}`, Math.max(x1, x2) - 4, y - 3);
        }
        ctx.restore();
      }

      // "elliottImpulse"/"elliottCorrection": x1/x2 (already drawn above as the diagonal) is
      // just the first of several segments — draws the rest of the polyline through
      // extraPoints, then labels every vertex (0-1-2-3-4-5 or 0-A-B-C).
      if ((dr.lineType === "elliottImpulse" || dr.lineType === "elliottCorrection") && dr.extraPoints?.length) {
        const restScreen = dr.extraPoints.map((p) => ({ x: zoomedXScale(indexForDate(p.x) + 0.5), y: zoomedPriceScale(p.y) }));
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        for (const p of restScreen) ctx.lineTo(p.x, p.y);
        ctx.stroke();

        const vertexLabels = dr.lineType === "elliottImpulse" ? ELLIOTT_IMPULSE_VERTEX_LABELS : ELLIOTT_CORRECTION_VERTEX_LABELS;
        const allScreen = [{ x: x1, y: y1 }, { x: x2, y: y2 }, ...restScreen];
        ctx.save();
        ctx.setLineDash([]);
        ctx.font = `700 10px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = lineColor;
        allScreen.forEach((p, i) => ctx.fillText(vertexLabels[i] ?? "", p.x, p.y - 6));
        ctx.restore();
      }

      // "fibonacciExtension": x1/x2 (the A-B leg, already drawn above) is followed by a B-C
      // segment to its 3rd point, then extension levels projected from C by each ratio's share
      // of the A-B leg's own price span — the conventional "trend-based" extension formula.
      if (dr.lineType === "fibonacciExtension" && dr.extraPoints?.length) {
        const pointC = dr.extraPoints[0];
        const cx = zoomedXScale(indexForDate(pointC.x) + 0.5);
        const cy = zoomedPriceScale(pointC.y);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(cx, cy);
        ctx.stroke();

        ctx.save();
        ctx.setLineDash(lineDashArray(dr));
        ctx.font = `600 10px ${fontFamily}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        const legDelta = dr.y2 - dr.y1;
        const levelX1 = Math.min(x2, cx);
        const levelX2 = Math.max(x2, cx);
        for (const ratio of FIBONACCI_EXTENSION_LEVELS) {
          const price = pointC.y + legDelta * ratio;
          const y = zoomedPriceScale(price);
          ctx.beginPath();
          ctx.moveTo(levelX1, y);
          ctx.lineTo(levelX2, y);
          ctx.stroke();
          ctx.fillStyle = lineColor;
          ctx.fillText(`${(ratio * 100).toFixed(1)}% · ${price.toFixed(2)}`, levelX2 - 4, y - 3);
        }
        ctx.restore();
      }

      // "horizontal"/"ray" ignore textHorizontalAlign/textAlignWithLine — they're always
      // perfectly flat and span to the plot's own right edge, so anchoring "with the line" or at
      // its "left"/"right" wouldn't mean anything different from what this already does.
      if (dr.lineType === "horizontal" || dr.lineType === "ray") {
        if (dr.text) {
          ctx.save();
          ctx.font = `${dr.textBold === false ? 400 : 600} ${dr.textSize ?? 11}px ${fontFamily}`;
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillStyle = dr.color ?? lineColor;
          ctx.fillText(dr.text, dims.boundedWidth - 4, Math.min(y1, y2) - 6);
          ctx.restore();
        }
      } else {
        drawDrawingText(ctx, dr, x1, y1, x2, y2, lineColor, fontFamily);
      }
    }

    // "rectangle": x1/y1 and x2/y2 as opposite corners — stroked, plus a faint fill of its own
    // color so it reads as a filled region instead of just an outline.
    for (const dr of visibleDrawings) {
      if (dr.lineType !== "rectangle") continue;
      const lineColor = dr.color ?? colorAccent;
      const rx1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
      const ry1 = zoomedPriceScale(dr.y1);
      const rx2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
      const ry2 = zoomedPriceScale(dr.y2);
      const rectX = Math.min(rx1, rx2);
      const rectY = Math.min(ry1, ry2);
      const rectW = Math.abs(rx2 - rx1);
      const rectH = Math.abs(ry2 - ry1);
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = lineColor;
      ctx.fillRect(rectX, rectY, rectW, rectH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      ctx.setLineDash(lineDashArray(dr));
      ctx.strokeRect(rectX, rectY, rectW, rectH);
      ctx.restore();
      drawDrawingText(ctx, dr, rx1, ry1, rx2, ry2, lineColor, fontFamily);
    }

    // "elbowArrow": an open-ended polyline (x1/y1, x2/y2, then however many extraPoints were
    // clicked before Escape finalized it — see handleOverlayClick/the keydown effect), drawn as
    // a straight segment between each consecutive point, with a single arrowhead at the last one
    // pointing in that final segment's own direction.
    for (const dr of visibleDrawings) {
      if (dr.lineType !== "elbowArrow") continue;
      const lineColor = dr.color ?? colorAccent;
      const screenPoints = allPointsOf(dr).map((p) => ({ x: zoomedXScale(indexForDate(p.x) + 0.5), y: zoomedPriceScale(p.y) }));
      if (screenPoints.length < 2) continue;
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      ctx.lineJoin = "round";
      ctx.setLineDash(lineDashArray(dr));
      ctx.beginPath();
      screenPoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
      const last = screenPoints[screenPoints.length - 1];
      const secondToLast = screenPoints[screenPoints.length - 2];
      drawArrowhead(ctx, secondToLast.x, secondToLast.y, last.x, last.y, lineColor);
      drawDrawingText(ctx, dr, screenPoints[0].x, screenPoints[0].y, last.x, last.y, lineColor, fontFamily);
    }

    // "brush": a freehand polyline through x1/y1, extraPoints (in order), then x2/y2 — no
    // per-point handles/hit-testing (see allPointsOf's callers), the whole stroke only moves or
    // deletes as one piece.
    for (const dr of visibleDrawings) {
      if (dr.lineType !== "brush") continue;
      const lineColor = dr.color ?? colorAccent;
      const screenPoints = allPointsOf(dr).map((p) => ({ x: zoomedXScale(indexForDate(p.x) + 0.5), y: zoomedPriceScale(p.y) }));
      if (screenPoints.length < 2) continue;
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 2.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.setLineDash(lineDashArray(dr));
      ctx.beginPath();
      screenPoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
    }

    // "arrowUp"/"arrowDown": a single-point marker, drawn as a small triangle just clear of its
    // own point (below it pointing up, above it pointing down) rather than centered on it, so it
    // doesn't sit on top of whatever candle it's marking.
    for (const dr of visibleDrawings) {
      if (dr.lineType !== "arrowUp" && dr.lineType !== "arrowDown") continue;
      const lineColor = dr.color ?? colorAccent;
      const ax = zoomedXScale(indexForDate(dr.x1) + 0.5);
      const ay = zoomedPriceScale(dr.y1);
      const markerSize = (dr.strokeWidth ?? 1.5) * 6 + 6;
      const gap = 4;
      if (dr.lineType === "arrowUp") {
        drawArrowhead(ctx, ax, ay + gap + markerSize, ax, ay + gap, lineColor, markerSize);
      } else {
        drawArrowhead(ctx, ax, ay - gap - markerSize, ax, ay - gap, lineColor, markerSize);
      }
      if (dr.text) {
        ctx.save();
        ctx.font = `${dr.textBold === false ? 400 : 600} ${dr.textSize ?? 11}px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = dr.lineType === "arrowUp" ? "top" : "bottom";
        ctx.fillStyle = dr.color ?? lineColor;
        ctx.fillText(dr.text, ax, dr.lineType === "arrowUp" ? ay + gap + markerSize + 4 : ay - gap - markerSize - 4);
        ctx.restore();
      }
    }

    if (activeTool && pendingPoint && previewPoint) {
      ctx.save();
      ctx.strokeStyle = colorAccent;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      if (activeTool === "channel" && pendingSecondPoint) {
        // Line 1 is fixed now (points 1 and 2 already placed) — the live cursor (previewPoint)
        // instead previews line 2's offset, the tool's 3rd/final click.
        const x1 = zoomedXScale(indexForDate(pendingPoint.x) + 0.5);
        const y1 = zoomedPriceScale(pendingPoint.y);
        const x2 = zoomedXScale(indexForDate(pendingSecondPoint.x) + 0.5);
        const y2 = zoomedPriceScale(pendingSecondPoint.y);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const x1i = indexForDate(pendingPoint.x);
        const x2i = indexForDate(pendingSecondPoint.x);
        const onLineY =
          x2i === x1i
            ? pendingPoint.y
            : pendingPoint.y + (pendingSecondPoint.y - pendingPoint.y) * ((indexForDate(previewPoint.x) - x1i) / (x2i - x1i));
        const offsetPx = zoomedPriceScale(pendingPoint.y + (previewPoint.y - onLineY)) - zoomedPriceScale(pendingPoint.y);
        ctx.beginPath();
        ctx.moveTo(x1, y1 + offsetPx);
        ctx.lineTo(x2, y2 + offsetPx);
        ctx.stroke();
      } else if (activeTool === "disjointChannel" && pendingSecondPoint) {
        // Same 3rd-click offset preview as "channel" above, but line 2 is the point-2-centered
        // mirror of line 1 (opposite slope) rather than a parallel copy — matches the commit
        // branch's channelOffsetFromClick + mirror math in handleOverlayClick.
        const x1 = zoomedXScale(indexForDate(pendingPoint.x) + 0.5);
        const y1 = zoomedPriceScale(pendingPoint.y);
        const x2 = zoomedXScale(indexForDate(pendingSecondPoint.x) + 0.5);
        const y2 = zoomedPriceScale(pendingSecondPoint.y);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const offset = channelOffsetFromClick(pendingPoint, pendingSecondPoint, previewPoint, indexForDate);
        const p3 = { x: pendingSecondPoint.x, y: pendingSecondPoint.y + offset };
        const p4 = { x: pendingPoint.x, y: 2 * pendingSecondPoint.y - pendingPoint.y + offset };
        ctx.beginPath();
        ctx.moveTo(zoomedXScale(indexForDate(p3.x) + 0.5), zoomedPriceScale(p3.y));
        ctx.lineTo(zoomedXScale(indexForDate(p4.x) + 0.5), zoomedPriceScale(p4.y));
        ctx.stroke();
      } else if (activeTool === "rectangle") {
        const x1 = zoomedXScale(indexForDate(pendingPoint.x) + 0.5);
        const y1 = zoomedPriceScale(pendingPoint.y);
        const x2 = zoomedXScale(indexForDate(previewPoint.x) + 0.5);
        const y2 = zoomedPriceScale(previewPoint.y);
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      } else if (activeTool === "elbowArrow") {
        // Open-ended — same "polyline through whatever's placed so far, plus a live segment to
        // the cursor" preview as the fixed-count multi-point tools below, just without a point
        // count to stop at (Escape is what ends it, see the keydown effect).
        const placed = [pendingPoint, ...pendingExtraPoints];
        ctx.beginPath();
        placed.forEach((p, i) => {
          const x = zoomedXScale(indexForDate(p.x) + 0.5);
          const y = zoomedPriceScale(p.y);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(zoomedXScale(indexForDate(previewPoint.x) + 0.5), zoomedPriceScale(previewPoint.y));
        ctx.stroke();
      } else if (MULTI_POINT_TOOLS[activeTool]) {
        // fibonacciExtension/elliottCorrection/elliottImpulse: preview the polyline through
        // whatever points have been placed so far, plus one more segment out to the live cursor
        // for whichever point comes next.
        const placed = [pendingPoint, pendingSecondPoint, ...pendingExtraPoints].filter((p): p is DataPoint => p !== null);
        ctx.beginPath();
        placed.forEach((p, i) => {
          const x = zoomedXScale(indexForDate(p.x) + 0.5);
          const y = zoomedPriceScale(p.y);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(zoomedXScale(indexForDate(previewPoint.x) + 0.5), zoomedPriceScale(previewPoint.y));
        ctx.stroke();
      } else {
        const x1 = zoomedXScale(indexForDate(pendingPoint.x) + 0.5);
        const y1 = zoomedPriceScale(pendingPoint.y);
        const x2 = zoomedXScale(indexForDate(previewPoint.x) + 0.5);
        const y2 = zoomedPriceScale(previewPoint.y);
        let drawX1 = x1,
          drawY1 = y1,
          drawX2 = x2,
          drawY2 = y2;
        if (activeTool === "extended") {
          const extended = extendSegmentToEdges(x1, y1, x2, y2, 0, dims.boundedWidth);
          drawX1 = extended.x1;
          drawY1 = extended.y1;
          drawX2 = extended.x2;
          drawY2 = extended.y2;
        }
        ctx.beginPath();
        ctx.moveTo(drawX1, drawY1);
        ctx.lineTo(drawX2, drawY2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Brush's own in-progress stroke — driven by brushPreview state (mirrored from
    // brushPointsRef on every sampled point, see handlePointerMove) rather than
    // pendingPoint/previewPoint, since it's a drag gesture, not a click sequence.
    if (brushPreview && brushPreview.length >= 2) {
      ctx.save();
      ctx.strokeStyle = colorAccent;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      brushPreview.forEach((p, i) => {
        const x = zoomedXScale(indexForDate(p.x) + 0.5);
        const y = zoomedPriceScale(p.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // Measure's own last completed measurement — a translucent box between the two points (green
    // if the price went up from p1 to p2, red if down, same up/down convention as candles) plus a
    // small stats panel: % change, price delta ("points"), bar count and calendar-day count
    // between them.
    if (measurePoints) {
      const { p1, p2 } = measurePoints;
      const mx1 = zoomedXScale(indexForDate(p1.x) + 0.5);
      const my1 = zoomedPriceScale(p1.y);
      const mx2 = zoomedXScale(indexForDate(p2.x) + 0.5);
      const my2 = zoomedPriceScale(p2.y);
      const up = p2.y >= p1.y;
      const boxColor = up ? colorUp : colorDown;

      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = boxColor;
      ctx.fillRect(Math.min(mx1, mx2), Math.min(my1, my2), Math.abs(mx2 - mx1), Math.abs(my2 - my1));
      ctx.globalAlpha = 1;
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(mx1, my1);
      ctx.lineTo(mx2, my2);
      ctx.stroke();

      const bars = Math.abs(indexForDate(p2.x) - indexForDate(p1.x));
      const days = Math.round(Math.abs(p2.x.getTime() - p1.x.getTime()) / 86_400_000);
      const priceDelta = p2.y - p1.y;
      const pct = p1.y !== 0 ? (priceDelta / p1.y) * 100 : 0;
      const sign = priceDelta >= 0 ? "+" : "";
      const lines = [
        `${sign}${pct.toFixed(2)}%`,
        `${bars} barre${bars > 1 ? "s" : ""}`,
        `${days} jour${days > 1 ? "s" : ""}`,
        `${sign}${priceDelta.toFixed(2)} points`,
      ];
      ctx.setLineDash([]);
      ctx.font = `600 11px ${fontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const padding = 6;
      const lineHeight = 14;
      const boxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2;
      const boxHeight = lines.length * lineHeight + padding * 2;
      const labelX = Math.max(mx1, mx2) + 8;
      const labelY = Math.min(my1, my2);
      ctx.fillStyle = colorBg;
      ctx.fillRect(labelX, labelY, boxWidth, boxHeight);
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(labelX, labelY, boxWidth, boxHeight);
      ctx.fillStyle = boxColor;
      lines.forEach((line, i) => ctx.fillText(line, labelX + padding, labelY + padding + i * lineHeight));
      ctx.restore();
    }

    // Live last-close reference line — drawn last (on top of candles/indicators/TPO) so it's
    // never obscured. Its own Y-axis price badge and the countdown-to-next-candle badge below it
    // are plain DOM (not canvas), see the JSX further down — this is only the dashed line itself.
    if (livePrice && data.length > 0) {
      const lastCandle = data[data.length - 1];
      const prevCandle = data.length > 1 ? data[data.length - 2] : null;
      const up = prevCandle ? lastCandle.close >= prevCandle.close : true;
      const y = snapPixel(zoomedPriceScale(lastCandle.close));
      ctx.save();
      ctx.strokeStyle = up ? colorUp : colorDown;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dims.boundedWidth, y);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // end price-section clip

    if (volumeVisible) {
      // Divider between the price plot and the volume plot below it — flush against both,
      // no padding on either side (the line itself is the only separation). Drawn even
      // collapsed, separating price from the pane's own header strip.
      ctx.save();
      ctx.strokeStyle = colorGrid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const dividerY = snapPixel(priceHeight);
      ctx.moveTo(0, dividerY);
      ctx.lineTo(dims.boundedWidth, dividerY);
      ctx.stroke();
      ctx.restore();

      // Collapsed, the pane is just its own header strip (an HTML overlay, see the JSX below) —
      // nothing left to draw on the canvas underneath it.
      if (!volumeCollapsed) {
        // Clipped to its own rectangle for the same reason as the price section above.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, priceHeight, dims.boundedWidth, volumeHeight);
        ctx.clip();
        ctx.translate(0, priceHeight);
        for (const { d, i } of visible) {
          const cx = zoomedXScale(i + 0.5);
          const up = d.close >= d.open;
          const barHeight = Math.max(0, volumeHeight - volumeScale(d.volume ?? 0));
          ctx.globalAlpha = isEink ? (up ? 0.15 : 0.35) : 0.55;
          ctx.fillStyle = isEink ? colorText : up ? colorUp : colorDown;
          ctx.fillRect(cx - candleWidth / 2, volumeHeight - barHeight, candleWidth, barHeight);
        }
        ctx.globalAlpha = 1;
        if (hoverVolumeY !== null) {
          ctx.strokeStyle = colorMuted;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(0, hoverVolumeY);
          ctx.lineTo(dims.boundedWidth, hoverVolumeY);
          ctx.stroke();
        }
        for (const dr of visibleDrawings) {
          if (!((dr.lineType === "horizontal" || dr.lineType === "ray") && dr.valueAxis === "volume")) continue;
          const lineColor = dr.color ?? colorAccent;
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
          ctx.setLineDash(lineDashArray(dr));
          const y = volumeScale(dr.y1);
          const x = dr.lineType === "ray" ? zoomedXScale(indexForDate(dr.x1) + 0.5) : 0;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(dims.boundedWidth, y);
          ctx.stroke();
          if (dr.text) {
            ctx.save();
            ctx.font = `${dr.textBold === false ? 400 : 600} ${dr.textSize ?? 11}px ${fontFamily}`;
            ctx.textAlign = "right";
            ctx.textBaseline = "bottom";
            ctx.fillStyle = dr.color ?? lineColor;
            ctx.fillText(dr.text, dims.boundedWidth - 4, y - 6);
            ctx.restore();
          }
        }
        ctx.restore();
      }
    }

    // "own"-pane indicators (RSI/CHOP/MACD) — one clipped section each, stacked below volume in
    // the order they were added, each with its own scale (RSI/CHOP are always 0-100 by
    // definition; MACD auto-fits to whatever's currently visible, same spirit as YAutoScaling
    // for price). No hover-value badge for these (unlike price/volume) — not asked for, and
    // wiring up N more of them was a lot of additional plumbing for its own sake.
    ownPaneIndicators.forEach((ind, idx) => {
      const paneTop = priceHeight + volumeHeight + indicatorPaneTops[idx];
      const paneHeight = indicatorPaneHeights[idx];

      ctx.save();
      ctx.strokeStyle = colorGrid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const dividerY = snapPixel(paneTop);
      ctx.moveTo(0, dividerY);
      ctx.lineTo(dims.boundedWidth, dividerY);
      ctx.stroke();
      ctx.restore();

      if (ind.paneCollapsed) return;

      const entry = visibleIndicators.find((v) => v.indicator.id === ind.id);
      const points = entry?.points ?? [];
      if (points.length === 0) return;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, paneTop, dims.boundedWidth, paneHeight);
      ctx.clip();
      ctx.translate(0, paneTop);

      const color = ind.color ?? defaultIndicatorColor(indicators.indexOf(ind));
      const scale = ownPaneScales[ind.id];
      if (!scale) {
        ctx.restore();
        return;
      }

      if (ind.kind === "rsi" || ind.kind === "chop") {
        ctx.save();
        ctx.strokeStyle = colorGrid;
        ctx.setLineDash([2, 3]);
        ctx.lineWidth = 1;
        for (const level of ind.kind === "rsi" ? [30, 70] : [38.2, 61.8]) {
          const y = scale(level);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(dims.boundedWidth, y);
          ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        points.forEach((p, k) => {
          const x = zoomedXScale(p.i + 0.5);
          const y = scale(p.value as number);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      } else if (ind.kind === "macd") {
        const macdPoints = points as { i: number; value: IndicatorMACD }[];
        const zeroY = scale(0);

        ctx.save();
        ctx.strokeStyle = colorGrid;
        ctx.setLineDash([2, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(dims.boundedWidth, zeroY);
        ctx.stroke();
        ctx.restore();

        for (const p of macdPoints) {
          if (p.value.histogram === null) continue;
          const x = zoomedXScale(p.i + 0.5);
          const y = scale(p.value.histogram);
          const up = p.value.histogram >= 0;
          ctx.globalAlpha = isEink ? (up ? 0.25 : 0.45) : 0.6;
          ctx.fillStyle = isEink ? colorText : up ? colorUp : colorDown;
          ctx.fillRect(x - candleWidth / 2, Math.min(y, zeroY), Math.max(candleWidth, 1), Math.abs(y - zeroY));
        }
        ctx.globalAlpha = 1;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        macdPoints.forEach((p, k) => {
          const x = zoomedXScale(p.i + 0.5);
          const y = scale(p.value.macd);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.strokeStyle = colorMuted;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let started = false;
        for (const p of macdPoints) {
          if (p.value.signal === null) continue;
          const x = zoomedXScale(p.i + 0.5);
          const y = scale(p.value.signal);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      ctx.restore();
    });

    // "Vertical" drawn lines span the full plot height (price and volume together), same as the
    // hover crosshair below — deliberately outside either section's clip above.
    for (const dr of visibleDrawings) {
      if (dr.lineType !== "vertical") continue;
      const lineColor = dr.color ?? colorAccent;
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      ctx.setLineDash(lineDashArray(dr));
      const x = zoomedXScale(indexForDate(dr.x1) + 0.5);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, plotBoundedHeight);
      ctx.stroke();
      ctx.restore();
      // textHorizontalAlign positions along the line's own length here (top/center/bottom of it,
      // default "right" below to match the old fixed-at-the-bottom behavior since "left"/"center"
      // would otherwise default to the vertical line's own top, a less useful default), and
      // textVerticalAlign offsets to one side of it instead of above/below — same generic anchor
      // logic as every other line type, just rotated 90° along with the line itself.
      drawDrawingText(ctx, dr, x, 0, x, plotBoundedHeight, lineColor, fontFamily);
    }

    // Vertical crosshair spans the full plot (price and volume together) — deliberately drawn
    // outside either section's clip above.
    if (hovered) {
      ctx.save();
      ctx.strokeStyle = colorMuted;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      const hx = zoomedXScale(hoverIndex! + 0.5);
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, plotBoundedHeight);
      ctx.stroke();
      ctx.restore();
    }
  }, [
    visible,
    zoomedXScale,
    zoomedPriceScale,
    candleWidth,
    chartDisplayMode,
    heikinAshiCandles,
    renkoBricks,
    lineBreakBricks,
    tpoProfile,
    data,
    visibleRange,
    upColorOverride,
    downColorOverride,
    volumeVisible,
    volumeCollapsed,
    volumeScale,
    volumeHeight,
    priceHeight,
    ownPaneIndicators,
    indicatorPaneHeights,
    indicatorPaneTops,
    ownPaneScales,
    indicators,
    hovered,
    hoverY,
    hoverVolumeY,
    hoverIndex,
    visibleDrawings,
    hoveredDrawingId,
    activeTool,
    pendingPoint,
    previewPoint,
    pendingSecondPoint,
    pendingExtraPoints,
    brushPreview,
    measurePoints,
    livePrice,
    visibleIndicators,
    indexForDate,
    dims.boundedWidth,
    plotBoundedHeight,
    themeTick,
    ref,
  ]);

  if (dims.width === 0)
    return <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")} style={{ width: isFullscreen ? undefined : width, height: isFullscreen ? undefined : height }} />;
  if (data.length === 0) {
    return (
      <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")} style={{ width: isFullscreen ? undefined : width, height: isFullscreen ? undefined : height }}>
        <div className="lq-chart__empty">Aucune donnée</div>
      </div>
    );
  }

  const dFmt = formatDate ?? d3.timeFormat("%d %b %Y");
  const pFmt = formatPrice ?? ((v: number) => v.toFixed(2));
  const vFmt = formatVolume ?? ((v: number) => d3.format(".2s")(v));
  const currentTimeframeLabel = findTimeframeLabel(timeframes, timeframe);
  const currentModeEntry = CHART_DISPLAY_MODES.find((m) => m.mode === chartDisplayMode) ?? CHART_DISPLAY_MODES[0];

  // Live OHLC readout, top-left of the price plot — the hovered candle while hovering, the most
  // recent one otherwise (so the readout is never blank). % is against the *previous* candle's
  // close (not this candle's own open), matching how a trading platform's own top-bar readout
  // reads "change since last close" rather than "change within this bar".
  const ohlcIndex = hoverIndex !== null ? hoverIndex : data.length - 1;
  const ohlcCandle = data[ohlcIndex];
  const ohlcPrevClose = ohlcIndex > 0 ? data[ohlcIndex - 1].close : ohlcCandle.open;
  const ohlcDelta = ohlcCandle.close - ohlcPrevClose;
  const ohlcDeltaPct = ohlcPrevClose !== 0 ? (ohlcDelta / ohlcPrevClose) * 100 : 0;
  const ohlcSign = ohlcDelta >= 0 ? "+" : "";

  return (
    <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")} style={{ width: isFullscreen ? undefined : width }}>
      {showHeader && (
        <div className="lq-chart__header" style={{ width: dims.width }}>
          {timeframes && timeframes.length > 0 && (
            <>
              <button ref={tfAnchorRef} type="button" className="lq-chart__timeframe-trigger" onClick={() => setTfOpen((o) => !o)}>
                {currentTimeframeLabel ?? "Intervalle"}
                <ChevronDownIcon size={12} />
              </button>
              <Popover open={tfOpen} onClose={() => setTfOpen(false)} anchorRef={tfAnchorRef} placement="bottom">
                <div className="lq-chart__timeframe-menu">
                  {timeframes.map((entry) =>
                    isTimeframeGroup(entry) ? (
                      <div key={entry.group} className="lq-chart__timeframe-group">
                        <div className="lq-chart__timeframe-group-label">{entry.group}</div>
                        {entry.options.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={["lq-chart__timeframe-option", opt.value === timeframe && "lq-chart__timeframe-option--selected"]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => {
                              onTimeframeChange?.(opt.value);
                              setTfOpen(false);
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        key={entry.value}
                        type="button"
                        className={["lq-chart__timeframe-option", entry.value === timeframe && "lq-chart__timeframe-option--selected"]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => {
                          onTimeframeChange?.(entry.value);
                          setTfOpen(false);
                        }}
                      >
                        {entry.label}
                      </button>
                    )
                  )}
                </div>
              </Popover>
            </>
          )}
          {/* No dedicated prop gates this (unlike `showIndicators`/`drawingTools`) — it rides on
              `showHeader` same as zoomable/fullscreenToggle, so it's on by default and only
              disappears in the edge case where a caller has already opted out of every other
              header feature too. */}
          <button
            ref={displayModeAnchorRef}
            type="button"
            className="lq-chart__icon-button"
            onClick={() => setDisplayModeOpen((o) => !o)}
            aria-label="Mode d'affichage"
            title="Mode d'affichage"
          >
            <currentModeEntry.icon size={14} />
          </button>
          <Popover open={displayModeOpen} onClose={() => setDisplayModeOpen(false)} anchorRef={displayModeAnchorRef} placement="bottom">
            <div className="lq-chart__display-mode-menu">
              {CHART_DISPLAY_MODES.map((entry) => (
                <button
                  key={entry.mode}
                  type="button"
                  className={["lq-chart__display-mode-option", entry.mode === chartDisplayMode && "lq-chart__display-mode-option--selected"]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    setChartDisplayMode(entry.mode);
                    onChartDisplayModeChange?.(entry.mode);
                    setDisplayModeOpen(false);
                  }}
                >
                  <entry.icon size={15} />
                  {entry.label}
                </button>
              ))}
            </div>
          </Popover>
          {showIndicators && (
            <button
              type="button"
              className="lq-chart__icon-button"
              onClick={() => {
                setIndicatorSearchQuery("");
                setIndicatorPickerOpen(true);
              }}
              aria-label="Ajouter un indicateur"
            >
              <ActivityIcon size={14} />
            </button>
          )}
          {zoomable && isZoomed && (
            <button type="button" className="lq-chart__reset-button" onClick={resetZoom}>
              Réinitialiser le zoom
            </button>
          )}
          {fullscreenToggle && (
            <button
              type="button"
              className="lq-chart__icon-button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />}
            </button>
          )}
        </div>
      )}

      <div
        className="lq-chart__plot"
        style={{ width: dims.width, height: plotHeight }}
        onPointerLeave={() => {
          setHoverIndex(null);
          setHoverY(null);
          setHoverVolumeY(null);
        }}
      >
        {/* Positioned relative to .lq-chart__plot (not the outer .lq-chart), same reason the
            canvas is: .lq-chart carries fullscreen's own position:fixed/border and only
            .lq-chart__plot's box lines up with where the svg/canvas content actually starts.
            Explicitly sized (not left to intrinsic sizing from its svg child) so it can never
            drift from `dims` regardless of how the fullscreen flex container's own
            stretch/centering behaves. */}
        {/* Width is the *entire* reserved left margin (not just TOOLS_RAIL_WIDTH) so its
            right border lands exactly where the plot content starts — sizing it to the
            constant alone left an unstyled gap equal to the base margin between the rail
            and the first candle. Height spans the full plot (candles + volume + the date-axis
            label strip below them), reaching all the way down to the chart's own bottom border. */}
        {drawingTools && (
          <div className="lq-chart__tools-rail" style={{ width: dims.margin.left, height: plotHeight }}>
            <div className="lq-chart__tools-rail-items">
              {/* One group per category (Lignes/Fibonacci/Vagues d'Elliott) — each button
                  represents whichever of its own tools was picked last (defaulting to the
                  first). The chevron is invisible until its own group (button or chevron) is
                  hovered — see .lq-chart__tool-chevron in charts-shared.css. Picking a tool from
                  a category's menu both changes what its button represents *and* activates it
                  immediately (see handleSelectToolType) — clicking the button itself afterward
                  just toggles that same tool on/off, same as any other tool selection. */}
              {DRAWING_TOOL_CATEGORIES.map((category) => {
                const selectedType = selectedToolByCategory[category.id] ?? category.tools[0].type;
                const selectedInCategory = category.tools.find((t) => t.type === selectedType) ?? category.tools[0];
                const CategoryIcon = selectedInCategory.icon;
                const menuOpen = openToolMenu === category.id;
                return (
                  <Fragment key={category.id}>
                    {/* A thin rule ahead of "Mesure" only — visually separates the shape/marker
                        tools above from the standalone measuring tool, which doesn't add a
                        drawing to the chart the way every category above it does. */}
                    {category.id === "measure" && <div className="lq-chart__tool-separator" aria-hidden="true" />}
                    <div className="lq-chart__tool-group">
                    <button
                      type="button"
                      className={["lq-chart__icon-button", activeTool === selectedInCategory.type && "lq-chart__icon-button--active"]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => handleToolClick(selectedInCategory.type)}
                      aria-label={selectedInCategory.label}
                      aria-pressed={activeTool === selectedInCategory.type}
                    >
                      <CategoryIcon size={14} />
                    </button>
                    {/* Only worth a dropdown once there's actually something to pick between —
                        a single-tool category (e.g. "Mesure" today) has nowhere else for the
                        chevron to lead, so it stays off entirely instead of opening an empty-ish
                        one-item menu. Adding a 2nd tool to that category later makes this
                        reappear on its own, no extra wiring needed. */}
                    {category.tools.length > 1 && (
                      <>
                        <button
                          ref={menuAnchorRefFor(category.id)}
                          type="button"
                          className={["lq-chart__tool-chevron", menuOpen && "lq-chart__tool-chevron--visible"].filter(Boolean).join(" ")}
                          onClick={() => setOpenToolMenu((o) => (o === category.id ? null : category.id))}
                          aria-label={`Autres outils — ${category.id}`}
                        >
                          <ChevronDownIcon size={8} />
                        </button>
                        <Popover
                          open={menuOpen}
                          onClose={() => setOpenToolMenu(null)}
                          anchorRef={menuAnchorRefFor(category.id)}
                          placement="bottom"
                        >
                          <div className="lq-chart__tool-menu">
                            {category.tools.map((opt) => {
                              const OptionIcon = opt.icon;
                              return (
                                <button
                                  key={opt.type}
                                  type="button"
                                  className={["lq-chart__tool-menu-option", opt.type === selectedType && "lq-chart__tool-menu-option--selected"]
                                    .filter(Boolean)
                                    .join(" ")}
                                  onClick={() => handleSelectToolType(opt.type)}
                                >
                                  <OptionIcon size={14} />
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </Popover>
                      </>
                    )}
                    </div>
                  </Fragment>
                );
              })}
              {/* A persistent modifier, not a tool of its own — stays on across tool switches
                  (see toDataPoint/magnetSnapPrice) until toggled off again, so it lives outside
                  DRAWING_TOOL_CATEGORIES' button+chevron+menu pattern as a plain toggle. */}
              <button
                type="button"
                className={["lq-chart__icon-button", magnetActive && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
                onClick={() => setMagnetActive((a) => !a)}
                aria-label="Aimant"
                aria-pressed={magnetActive}
                title="Aimant : accroche les nouveaux points au prix (O/H/L/C) le plus proche"
              >
                <MagnetIcon size={14} />
              </button>
              {/* Hides every drawing without deleting any of them — same eye/eye-off convention
                  the indicator legend already uses for a single indicator, applied here to all
                  of `drawings` at once. */}
              <button
                type="button"
                className={["lq-chart__icon-button", drawingsHidden && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
                onClick={() => setDrawingsHidden((h) => !h)}
                aria-label={drawingsHidden ? "Afficher les dessins" : "Masquer les dessins"}
                aria-pressed={drawingsHidden}
                title="Masquer/afficher tous les dessins"
              >
                {drawingsHidden ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
              </button>
              {/* Blocks dragging (body, endpoints, and axis handles all check this before
                  starting) without touching selectability — hover, Delete, and double-click to
                  edit all keep working on a locked drawing, only click-and-drag is refused. */}
              <button
                type="button"
                className={["lq-chart__icon-button", drawingsLocked && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
                onClick={() => setDrawingsLocked((l) => !l)}
                aria-label={drawingsLocked ? "Déverrouiller les dessins" : "Verrouiller les dessins"}
                aria-pressed={drawingsLocked}
                title="Verrouiller/déverrouiller le déplacement des dessins"
              >
                <LockIcon size={14} />
              </button>
            </div>
          </div>
        )}
        {/* Symbol/chart-type label + live OHLC readout, then the indicator legend right below it
            — one shared top-left column instead of two independently-positioned corners, so
            neither has to guess the other's height to avoid overlapping it. */}
        <div className="lq-chart__plot-topleft" style={{ top: dims.margin.top + 6, left: dims.margin.left + 6 }}>
          <div className="lq-chart__symbol-info">
            {/* Its own hoverable zone (background on hover) only once `symbolSearch` opts in —
                otherwise `symbol` still renders, just as inert text, same as before this
                existed. Double-click only (not single), matching the chart-type label right
                next to it — deliberately NOT also wired to onClick: Modal's own overlay closes
                on click, covering the full viewport once open, so a single click that opened it
                would leave the *second* click of the same double-click gesture landing on that
                overlay instead of this button, closing the modal again immediately. */}
            {symbol &&
              (symbolSearch ? (
                <button
                  type="button"
                  className="lq-chart__symbol-info-name lq-chart__symbol-info-name--clickable"
                  onDoubleClick={() => setSymbolSearchOpen(true)}
                  aria-label="Rechercher un symbole"
                  title="Double-clic : rechercher un symbole"
                >
                  {symbol}
                </button>
              ) : (
                <span className="lq-chart__symbol-info-name">{symbol}</span>
              ))}
            {symbol && <span className="lq-chart__symbol-info-sep">·</span>}
            <button
              type="button"
              className="lq-chart__symbol-info-name lq-chart__symbol-info-name--clickable"
              onDoubleClick={() => setSettingsOpen(true)}
              title="Double-clic : paramètres du graphique"
            >
              {currentModeEntry.label}
            </button>
            <span className={["lq-chart__symbol-info-ohlc", ohlcDelta >= 0 ? "lq-chart__symbol-info-ohlc--up" : "lq-chart__symbol-info-ohlc--down"].join(" ")}>
              O {pFmt(ohlcCandle.open)} H {pFmt(ohlcCandle.high)} L {pFmt(ohlcCandle.low)} C {pFmt(ohlcCandle.close)} {ohlcSign}
              {pFmt(ohlcDelta)} ({ohlcSign}
              {ohlcDeltaPct.toFixed(2)}%)
            </span>
          </div>
          {showIndicators && indicators.length > 0 && (
          <div className="lq-chart__indicator-legend">
            {indicators.map((indicator, i) => (
              <div
                key={indicator.id}
                className="lq-chart__indicator-legend-item"
                style={{ color: indicator.color ?? defaultIndicatorColor(i) }}
                onDoubleClick={() => openIndicatorSettings(indicator.id)}
                onMouseEnter={() => setHoveredIndicatorId(indicator.id)}
                onMouseLeave={() => setHoveredIndicatorId((id) => (id === indicator.id ? null : id))}
              >
                <span
                  className={["lq-chart__indicator-legend-label", indicator.hidden && "lq-chart__indicator-legend-label--hidden"]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {indicatorLabel(indicator)}
                </span>
                {/* Invisible until this item is hovered (see charts-shared.css) — double-click
                    the label itself opens the settings modal too, so the gear is a discoverable
                    shortcut, not the only way in. */}
                <div className="lq-chart__indicator-legend-actions">
                  <button
                    type="button"
                    className="lq-chart__indicator-legend-action"
                    onClick={() => toggleIndicatorHidden(indicator.id)}
                    aria-label={indicator.hidden ? `Afficher ${indicatorLabel(indicator)}` : `Masquer ${indicatorLabel(indicator)}`}
                  >
                    {indicator.hidden ? <EyeOffIcon size={11} /> : <EyeIcon size={11} />}
                  </button>
                  <button
                    type="button"
                    className="lq-chart__indicator-legend-action"
                    onClick={() => removeIndicator(indicator.id)}
                    aria-label={`Supprimer ${indicatorLabel(indicator)}`}
                  >
                    <TrashIcon size={11} />
                  </button>
                  <button
                    type="button"
                    className="lq-chart__indicator-legend-action"
                    onClick={() => openIndicatorSettings(indicator.id)}
                    aria-label={`Paramètres ${indicatorLabel(indicator)}`}
                  >
                    <SettingsIcon size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
        {/* Header strip for the volume pane — a fixed-height row pinned to the top of the pane
            (whether expanded or collapsed, hence sharing SUB_PANE_COLLAPSED_HEIGHT: when
            collapsed the pane *is* this row, when expanded it's just the top slice of it). Name
            always visible; the remove/collapse actions only reveal on hover of the pane itself
            (hoverVolumeY, already tracked by handlePointerMove — reused here instead of a CSS
            :hover, since the hoverable zone is the whole pane, much bigger than this row).
            pointer-events: none on the row itself so it never blocks the zoom/pan overlay or
            drawing-tool clicks underneath — same pattern as .lq-chart__indicator-legend. */}
        {volumeVisible && (
          <div
            className={["lq-chart__pane-header", volumeCollapsed && "lq-chart__pane-header--collapsed"].filter(Boolean).join(" ")}
            style={{ top: dims.margin.top + priceHeight, left: dims.margin.left, width: dims.boundedWidth, height: SUB_PANE_COLLAPSED_HEIGHT }}
          >
            {/* Drag-to-resize: a thin strip straddling the divider above this pane, only while
                expanded (collapsed panes are a fixed height, nothing to resize). */}
            {!volumeCollapsed && (
              <div
                className="lq-chart__pane-resize-handle"
                onPointerDown={(e) => startPaneResize("volume", e)}
                aria-hidden="true"
              />
            )}
            <div className="lq-chart__pane-header-primary">
              <span className="lq-chart__pane-header-label">Volume</span>
              {!volumeCollapsed && (
                <div
                  className={["lq-chart__pane-header-actions", hoverVolumeY !== null && "lq-chart__pane-header-actions--visible"]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <button
                    type="button"
                    className="lq-chart__pane-header-action"
                    onClick={() => setVolumePaneState("hidden")}
                    aria-label="Supprimer le panneau Volume"
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              )}
            </div>
            <div
              className={["lq-chart__pane-header-actions", (volumeCollapsed || hoverVolumeY !== null) && "lq-chart__pane-header-actions--visible"]
                .filter(Boolean)
                .join(" ")}
            >
              {volumeCollapsed ? (
                <button
                  type="button"
                  className="lq-chart__pane-header-action"
                  onClick={() => setVolumePaneState("expanded")}
                  aria-label="Agrandir le panneau Volume"
                >
                  <ChevronUpIcon size={12} />
                </button>
              ) : (
                <button
                  type="button"
                  className="lq-chart__pane-header-action"
                  onClick={() => setVolumePaneState("collapsed")}
                  aria-label="Réduire le panneau Volume"
                >
                  <ChevronDownIcon size={12} />
                </button>
              )}
            </div>
          </div>
        )}
        {/* One header per "own"-pane indicator (RSI/CHOP/MACD), same strip as volume's above —
            actions stay at a constant reduced opacity instead of hover-revealed (there's no
            existing hover-tracking state covering these panes' own screen area the way
            hoverVolumeY already did for volume, and building one just for this would be a lot of
            plumbing for a cosmetic difference). Gear opens the same settings modal price-overlay
            indicators use (period, or MACD's fast/slow/signal) — double-clicking the label does
            the same, matching that same legend's convention. */}
        {ownPaneIndicators.map((ind, idx) => (
          <div
            key={ind.id}
            className={["lq-chart__pane-header", "lq-chart__pane-header--always-visible", ind.paneCollapsed && "lq-chart__pane-header--collapsed"]
              .filter(Boolean)
              .join(" ")}
            style={{
              top: dims.margin.top + priceHeight + volumeHeight + indicatorPaneTops[idx],
              left: dims.margin.left,
              width: dims.boundedWidth,
              height: SUB_PANE_COLLAPSED_HEIGHT,
            }}
            onDoubleClick={() => openIndicatorSettings(ind.id)}
          >
            {!ind.paneCollapsed && (
              <div
                className="lq-chart__pane-resize-handle"
                onPointerDown={(e) => startPaneResize(ind.id, e)}
                aria-hidden="true"
              />
            )}
            <div className="lq-chart__pane-header-primary">
              <span className="lq-chart__pane-header-label">{indicatorLabel(ind)}</span>
              {!ind.paneCollapsed && (
                <div className="lq-chart__pane-header-actions lq-chart__pane-header-actions--visible">
                  <button
                    type="button"
                    className="lq-chart__pane-header-action"
                    onClick={() => openIndicatorSettings(ind.id)}
                    aria-label={`Paramètres ${indicatorLabel(ind)}`}
                  >
                    <SettingsIcon size={11} />
                  </button>
                  <button
                    type="button"
                    className="lq-chart__pane-header-action"
                    onClick={() => removeIndicator(ind.id)}
                    aria-label={`Supprimer ${indicatorLabel(ind)}`}
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              )}
            </div>
            <div className="lq-chart__pane-header-actions lq-chart__pane-header-actions--visible">
              {ind.paneCollapsed ? (
                <button
                  type="button"
                  className="lq-chart__pane-header-action"
                  onClick={() => commitIndicators(indicators.map((i) => (i.id === ind.id ? { ...i, paneCollapsed: false } : i)))}
                  aria-label={`Agrandir le panneau ${indicatorLabel(ind)}`}
                >
                  <ChevronUpIcon size={12} />
                </button>
              ) : (
                <button
                  type="button"
                  className="lq-chart__pane-header-action"
                  onClick={() => commitIndicators(indicators.map((i) => (i.id === ind.id ? { ...i, paneCollapsed: true } : i)))}
                  aria-label={`Réduire le panneau ${indicatorLabel(ind)}`}
                >
                  <ChevronDownIcon size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
        <canvas
          ref={canvasRef}
          className="lq-chart__canvas"
          style={{
            left: dims.margin.left,
            top: dims.margin.top,
            width: dims.boundedWidth,
            height: plotBoundedHeight,
          }}
        />
        <svg className="lq-chart__svg" width={dims.width} height={plotHeight} role="img">
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={dims.boundedWidth} height={plotBoundedHeight} />
            </clipPath>
          </defs>
          <g transform={`translate(${dims.margin.left}, ${dims.margin.top})`}>
            <ChartAxis scale={zoomedPriceScale} orientation="right" transform={`translate(${dims.boundedWidth}, 0)`} tickFormat={(v) => pFmt(Number(v))} />

            {volumeVisible && (
              <>
                {!volumeCollapsed && (
                  <g transform={`translate(0, ${priceHeight})`}>
                    <ChartAxis
                      scale={volumeScale}
                      orientation="right"
                      transform={`translate(${dims.boundedWidth}, 0)`}
                      ticks={2}
                      tickFormat={(v) => vFmt(Number(v))}
                    />
                  </g>
                )}
                {/* Continues the canvas-drawn price/volume divider (which only covers
                    [0, boundedWidth], the canvas's own extent) across the price axis's
                    tick-label column so the divider reaches the full chart width and
                    visually separates the price ticks from the volume ticks too. */}
                <line
                  className="lq-chart__price-volume-divider"
                  x1={dims.boundedWidth}
                  x2={dims.boundedWidth + dims.margin.right}
                  y1={snapPixel(priceHeight)}
                  y2={snapPixel(priceHeight)}
                />
              </>
            )}

            {/* Same pair (a few ticks + a divider extension into the price-axis label column) as
                volume above, once per "own"-pane indicator — ownPaneScales is shared with the
                canvas draw effect so these ticks always land exactly on what's actually drawn. */}
            {ownPaneIndicators.map((ind, idx) => {
              const paneTop = priceHeight + volumeHeight + indicatorPaneTops[idx];
              const scale = ownPaneScales[ind.id];
              if (!scale) return null;
              return (
                <g key={ind.id}>
                  {!ind.paneCollapsed && (
                    <g transform={`translate(0, ${paneTop})`}>
                      <ChartAxis scale={scale} orientation="right" transform={`translate(${dims.boundedWidth}, 0)`} ticks={3} />
                    </g>
                  )}
                  <line
                    className="lq-chart__price-volume-divider"
                    x1={dims.boundedWidth}
                    x2={dims.boundedWidth + dims.margin.right}
                    y1={snapPixel(paneTop)}
                    y2={snapPixel(paneTop)}
                  />
                </g>
              );
            })}

            <ChartAxis
              scale={zoomedXScale}
              orientation="bottom"
              transform={`translate(0, ${plotBoundedHeight})`}
              tickValues={dateTickValues}
              tickFormat={dateTickFormat}
            />
            {/* The date axis's own domain line only spans [0, boundedWidth] — its own scale's
                range, i.e. the canvas/plot area — so it stopped short of the chart's actual
                right edge, leaving the price-axis label column above it without a matching
                line underneath. Same fix as the price/volume divider above: continue it across
                that column with a plain SVG line. */}
            <line
              className="lq-chart__axis-line-extension"
              x1={dims.boundedWidth}
              x2={dims.boundedWidth + dims.margin.right}
              y1={snapPixel(plotBoundedHeight)}
              y2={snapPixel(plotBoundedHeight)}
            />

            <rect
              ref={zoomRef}
              className={["lq-chart__overlay", activeTool && "lq-chart__overlay--drawing"].filter(Boolean).join(" ")}
              width={dims.boundedWidth}
              height={plotBoundedHeight}
              onPointerDown={handleOverlayPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handleOverlayPointerUp}
              onClick={handleOverlayClick}
              onDoubleClick={handleOverlayDoubleClick}
            />

            <rect
              ref={yAxisWheelRef}
              className="lq-chart__axis-drag lq-chart__axis-drag--y"
              x={dims.boundedWidth}
              y={0}
              width={dims.margin.right}
              height={priceHeight}
              onPointerDown={yAxisDrag.onPointerDown}
              onPointerMove={yAxisDrag.onPointerMove}
              onPointerUp={yAxisDrag.onPointerUp}
              onDoubleClick={resetYAxis}
            />
            <rect
              ref={xAxisWheelRef}
              className="lq-chart__axis-drag lq-chart__axis-drag--x"
              x={0}
              y={plotBoundedHeight}
              width={dims.boundedWidth}
              height={dims.margin.bottom}
              onPointerDown={xAxisDrag.onPointerDown}
              onPointerMove={xAxisDrag.onPointerMove}
              onPointerUp={xAxisDrag.onPointerUp}
              onDoubleClick={resetX}
            />

            {/* Rendered last (on top of the zoom/pan overlay and axis-drag strips) so the handles
                actually receive pointer events instead of the overlay swallowing them first. */}
            <g clipPath={`url(#${clipId})`}>
              {visibleDrawings.map((dr) => {
                const isHovered = hoveredDrawingId === dr.id;
                if (!isHovered) return null;
                // A freehand stroke can have dozens of sampled points — individually draggable
                // handles for each would be impractical clutter, so it only moves as a whole
                // (the generic whole-body drag in handlePointerMove already covers that, no
                // per-type code needed there since it shifts every point — extraPoints included —
                // by the same pixel delta regardless of how many there are).
                if (dr.lineType === "brush") return null;
                // Axis-constrained lines get a single handle at a fixed point along the axis
                // they don't move on (never at their data endpoints, which aren't meaningful
                // drag targets here — the whole line only has one degree of freedom).
                if (dr.lineType === "horizontal") {
                  const cy = dr.valueAxis === "volume" ? priceHeight + volumeScale(dr.y1) : zoomedPriceScale(dr.y1);
                  return (
                    <circle
                      key={dr.id}
                      className="lq-chart__drawing-handle"
                      cx={dims.boundedWidth * AXIS_HANDLE_FRACTION_X}
                      cy={cy}
                      r={5}
                      onPointerDown={handleAxisHandlePointerDown(dr.id)}
                      onPointerMove={handleAxisHandlePointerMove}
                      onPointerUp={handleAxisHandlePointerUp}
                    />
                  );
                }
                if (dr.lineType === "vertical") {
                  return (
                    <circle
                      key={dr.id}
                      className="lq-chart__drawing-handle"
                      cx={zoomedXScale(indexForDate(dr.x1) + 0.5)}
                      cy={plotBoundedHeight * AXIS_HANDLE_FRACTION_Y}
                      r={5}
                      onPointerDown={handleAxisHandlePointerDown(dr.id)}
                      onPointerMove={handleAxisHandlePointerMove}
                      onPointerUp={handleAxisHandlePointerUp}
                    />
                  );
                }
                // A ray's one handle sits right at its actual anchor point (unlike
                // horizontal/vertical's fixed-fraction handle) since that anchor is itself
                // meaningful and draggable in both axes.
                if (dr.lineType === "ray") {
                  const cy = dr.valueAxis === "volume" ? priceHeight + volumeScale(dr.y1) : zoomedPriceScale(dr.y1);
                  return (
                    <circle
                      key={dr.id}
                      className="lq-chart__drawing-handle"
                      cx={zoomedXScale(indexForDate(dr.x1) + 0.5)}
                      cy={cy}
                      r={5}
                      onPointerDown={handleAxisHandlePointerDown(dr.id)}
                      onPointerMove={handleAxisHandlePointerMove}
                      onPointerUp={handleAxisHandlePointerUp}
                    />
                  );
                }
                // An arrow marker's one handle sits at its own point, same as a ray's anchor
                // above — x2/y2 mirrors x1/y1 automatically (see handleAxisHandlePointerMove).
                if (dr.lineType === "arrowUp" || dr.lineType === "arrowDown") {
                  return (
                    <circle
                      key={dr.id}
                      className="lq-chart__drawing-handle"
                      cx={zoomedXScale(indexForDate(dr.x1) + 0.5)}
                      cy={zoomedPriceScale(dr.y1)}
                      r={5}
                      onPointerDown={handleAxisHandlePointerDown(dr.id)}
                      onPointerMove={handleAxisHandlePointerMove}
                      onPointerUp={handleAxisHandlePointerUp}
                    />
                  );
                }
                // Every point (x1/y1, x2/y2, and any extraPoints) gets its own independently
                // draggable handle via the same generic pointIndex-based handler — covers a
                // regular trend line/extended/fibonacci's two points and
                // fibonacciExtension/elliottCorrection/elliottImpulse's extra ones alike, with no
                // per-tool-specific handle code needed beyond channel's own 3rd (below), which
                // adjusts channelOffset instead of a raw point.
                const points = allPointsOf(dr);
                const x1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
                const x2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
                return (
                  <g key={dr.id}>
                    {points.map((p, i) => (
                      <circle
                        key={i}
                        className="lq-chart__drawing-handle"
                        cx={zoomedXScale(indexForDate(p.x) + 0.5)}
                        cy={zoomedPriceScale(p.y)}
                        r={5}
                        onPointerDown={handleEndpointPointerDown(dr.id, i)}
                        onPointerMove={handleEndpointPointerMove}
                        onPointerUp={handleEndpointPointerUp}
                      />
                    ))}
                    {dr.lineType === "channel" && (
                      <circle
                        className="lq-chart__drawing-handle"
                        cx={(x1 + x2) / 2}
                        cy={zoomedPriceScale((dr.y1 + dr.y2) / 2 + (dr.channelOffset ?? 0))}
                        r={5}
                        onPointerDown={handleAxisHandlePointerDown(dr.id)}
                        onPointerMove={handleAxisHandlePointerMove}
                        onPointerUp={handleAxisHandlePointerUp}
                      />
                    )}
                  </g>
                );
              })}
              {/* The measure tool's own two points, draggable to redefine the measurement after
                  the tool has already deselected itself (see the "measure" branch of
                  handleOverlayClick) — always shown while a measurement exists rather than
                  hover-gated like the drawing handles above, since there's only ever at most one
                  measurement on screen at a time. */}
              {measurePoints && (
                <>
                  <circle
                    className="lq-chart__drawing-handle"
                    cx={zoomedXScale(indexForDate(measurePoints.p1.x) + 0.5)}
                    cy={zoomedPriceScale(measurePoints.p1.y)}
                    r={5}
                    onPointerDown={handleMeasureHandlePointerDown("p1")}
                    onPointerMove={handleMeasureHandlePointerMove}
                    onPointerUp={handleMeasureHandlePointerUp}
                  />
                  <circle
                    className="lq-chart__drawing-handle"
                    cx={zoomedXScale(indexForDate(measurePoints.p2.x) + 0.5)}
                    cy={zoomedPriceScale(measurePoints.p2.y)}
                    r={5}
                    onPointerDown={handleMeasureHandlePointerDown("p2")}
                    onPointerMove={handleMeasureHandlePointerMove}
                    onPointerUp={handleMeasureHandlePointerUp}
                  />
                </>
              )}
            </g>

            {/* Rendered last, same reasoning as the drawing handles above — needs to sit on top
                of the pan/zoom overlay to receive the pointer events its own <title> tooltip
                depends on. Anchored to the price/volume divider (not the tallest/shortest
                visible candle) so the row stays put while panning/zooming. */}
            {visibleEvents.length > 0 && (
              <g className="lq-chart__events">
                {visibleEvents.map(({ event, idx, i }) => {
                  const cx = zoomedXScale(i + 0.5);
                  const cy = priceHeight - EVENT_MARKER_OFFSET;
                  const kindIndex = eventKinds.indexOf(event.kind);
                  const color = event.color ?? defaultEventColor(kindIndex < 0 ? 0 : kindIndex);
                  const glyph = (event.symbol ?? event.kind.charAt(0)).slice(0, 2).toUpperCase();
                  return (
                    <g key={idx} className="lq-chart__event-marker" transform={`translate(${cx}, ${cy})`}>
                      <title>{`${dFmt(event.date)} — ${event.label}`}</title>
                      <line x1={0} x2={0} y1={EVENT_MARKER_RADIUS} y2={priceHeight - cy} stroke={color} strokeDasharray="2,2" />
                      <circle r={EVENT_MARKER_RADIUS} fill={color} />
                      <text textAnchor="middle" dominantBaseline="central">
                        {glyph}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </g>
        </svg>

        {hoverY !== null && (
          // Overlaps the chart by AXIS_VALUE_Y_OVERLAP so the badge's own background englobes
          // the "+" button too, instead of it living outside as a separate element — reachable
          // either way since onPointerLeave lives on .lq-chart__plot (a real ancestor of both),
          // not on the interactive rect itself.
          <div
            className="lq-chart__axis-value lq-chart__axis-value--y"
            style={{ top: dims.margin.top + hoverY, left: dims.margin.left + dims.boundedWidth - AXIS_VALUE_Y_OVERLAP }}
          >
            <button type="button" className="lq-chart__axis-value-add" onClick={addPriceLine} aria-label="Ajouter une ligne de prix horizontale">
              <PlusIcon size={9} />
            </button>
            <span className="lq-chart__axis-value-text">{pFmt(zoomedPriceScale.invert(hoverY))}</span>
          </div>
        )}
        {hoverVolumeY !== null && (
          <div
            className="lq-chart__axis-value lq-chart__axis-value--y"
            style={{ top: dims.margin.top + priceHeight + hoverVolumeY, left: dims.margin.left + dims.boundedWidth - AXIS_VALUE_Y_OVERLAP }}
          >
            <button type="button" className="lq-chart__axis-value-add" onClick={addVolumeLine} aria-label="Ajouter une ligne de volume horizontale">
              <PlusIcon size={9} />
            </button>
            <span className="lq-chart__axis-value-text">{vFmt(volumeScale.invert(hoverVolumeY))}</span>
          </div>
        )}
        {hovered && (
          <>
            <div
              className="lq-chart__axis-value lq-chart__axis-value--x"
              style={{ left: dims.margin.left + zoomedXScale(hoverIndex! + 0.5), top: dims.margin.top + plotBoundedHeight }}
            >
              <span className="lq-chart__axis-value-text">{dFmt(hovered.date)}</span>
            </div>
            {/* A standalone square button (not englobed by the date badge below the plot, since
                that badge is unreachable — reaching it means leaving the interactive rect
                entirely). Anchored inside the plot instead, in line with the vertical
                crosshair. */}
            <button
              type="button"
              className="lq-chart__crosshair-add lq-chart__crosshair-add--x"
              style={{ left: dims.margin.left + zoomedXScale(hoverIndex! + 0.5), top: dims.margin.top + plotBoundedHeight - CROSSHAIR_ADD_INSET }}
              onClick={addDateLine}
              aria-label="Ajouter une ligne de date verticale"
            >
              <PlusIcon size={9} />
            </button>
          </>
        )}

        {/* Live last-close price (up/down colored against the previous close) and, right below
            it, a countdown to the next candle — the dashed line itself is canvas (see the draw
            effect), this is just its own Y-axis badge plus the countdown, both plain DOM since
            the countdown needs to re-render every second independent of the canvas. The interval
            is inferred from the last two candles' own dates, not a separate prop. */}
        {livePrice &&
          data.length > 0 &&
          (() => {
            const lastCandle = data[data.length - 1];
            const prevCandle = data.length > 1 ? data[data.length - 2] : null;
            const up = prevCandle ? lastCandle.close >= prevCandle.close : true;
            const y = dims.margin.top + clampToPriceAxis(zoomedPriceScale(lastCandle.close));
            const intervalMs = prevCandle ? lastCandle.date.getTime() - prevCandle.date.getTime() : null;
            const remainingMs = intervalMs ? lastCandle.date.getTime() + intervalMs - now : null;
            return (
              <>
                <div
                  className="lq-chart__axis-value lq-chart__axis-value--y"
                  style={{
                    top: y,
                    left: dims.margin.left + dims.boundedWidth - AXIS_VALUE_Y_OVERLAP,
                    backgroundColor: `var(${up ? "--lq-color-up" : "--lq-color-down"})`,
                  }}
                >
                  <span className="lq-chart__axis-value-text">{pFmt(lastCandle.close)}</span>
                </div>
                {remainingMs !== null && (
                  <div
                    className="lq-chart__live-countdown"
                    style={{ top: y + LIVE_COUNTDOWN_OFFSET, left: dims.margin.left + dims.boundedWidth - AXIS_VALUE_Y_OVERLAP }}
                  >
                    {formatCountdown(remainingMs)}
                  </div>
                )}
              </>
            );
          })()}

        {/* Each active price-overlay indicator's own latest value, same axis-badge style,
            colored to match that indicator's own line instead of the theme accent. "own"-pane
            indicators (RSI/CHOP/MACD) already get axis ticks on their own separate scale below,
            so they're excluded here — this is price-pane overlays only (SMA/EMA/WMA/VWAP/
            Bollinger, whose "value" is a plain number; Bollinger's own band uses its middle
            line). */}
        {showIndicators &&
          indicatorValues.map(({ indicator, values }, idx) => {
            if (indicator.hidden || indicatorCatalogEntry(indicator.kind).pane !== "price") return null;
            const last = values[values.length - 1];
            if (last === null) return null;
            // Only ever a plain number (SMA/EMA/WMA/VWAP) or a band (Bollinger, use its middle
            // line) here — MACD's own shape only exists on the "own"-pane branch this filter
            // above already excludes, but the values array's type covers all three.
            const value = typeof last === "number" ? last : "middle" in last ? last.middle : null;
            if (value === null) return null;
            const color = indicator.color ?? defaultIndicatorColor(idx);
            return (
              <div
                key={indicator.id}
                className="lq-chart__axis-value lq-chart__axis-value--y"
                style={{
                  top: dims.margin.top + clampToPriceAxis(zoomedPriceScale(value)),
                  left: dims.margin.left + dims.boundedWidth - AXIS_VALUE_Y_OVERLAP,
                  backgroundColor: color,
                }}
              >
                <span className="lq-chart__axis-value-text">{pFmt(value)}</span>
              </div>
            );
          })}

        {/* A horizontal/ray line's own price, permanently on the price axis (not just on
            hover, unlike the badges above) — same visual as the hover badge, minus its "+"
            button since there's nothing left to add. Anchored to the volume axis instead when
            the line's `valueAxis` says so, same as the hover volume badge does. */}
        {visibleDrawings
          .filter((dr) => (dr.lineType === "horizontal" || dr.lineType === "ray") && (dr.valueAxis !== "volume" || volumeVisible))
          .map((dr) => (
            <div
              key={dr.id}
              className="lq-chart__axis-value lq-chart__axis-value--y"
              style={{
                top: dims.margin.top + (dr.valueAxis === "volume" ? priceHeight + volumeScale(dr.y1) : clampToPriceAxis(zoomedPriceScale(dr.y1))),
                left: dims.margin.left + dims.boundedWidth - AXIS_VALUE_Y_OVERLAP,
              }}
            >
              <span className="lq-chart__axis-value-text">{dr.valueAxis === "volume" ? vFmt(dr.y1) : pFmt(dr.y1)}</span>
            </div>
          ))}

        {/* A "ray"'s own start date, only while its line is hovered (unlike the price badge
            above, which stays up permanently) — same X-axis badge style as the hover date
            badge, anchored to the line's own x1 instead of the live cursor position. */}
        {visibleDrawings
          .filter((dr) => dr.lineType === "ray" && dr.id === hoveredDrawingId)
          .map((dr) => (
            <div
              key={dr.id}
              className="lq-chart__axis-value lq-chart__axis-value--x"
              style={{ left: dims.margin.left + zoomedXScale(indexForDate(dr.x1) + 0.5), top: dims.margin.top + plotBoundedHeight }}
            >
              <span className="lq-chart__axis-value-text">{dFmt(dr.x1)}</span>
            </div>
          ))}
      </div>

      {editingId && draft && (
        <Modal
          open
          onClose={closeEditModal}
          title="Modifier la ligne"
          footer={
            <div className="lq-chart__edit-drawing-footer">
              <button type="button" className="lq-chart__reset-button" onClick={deleteEditingDrawing}>
                Supprimer
              </button>
              <button type="button" className="lq-chart__confirm-button" onClick={saveEditModal}>
                Enregistrer
              </button>
            </div>
          }
        >
          <Tabs
            items={[
              { id: "coords", label: "Coordonnées" },
              { id: "text", label: "Texte" },
              { id: "style", label: "Style" },
            ]}
            value={editModalTab}
            onChange={(id) => setEditModalTab(id as "coords" | "text" | "style")}
            className="lq-chart__edit-drawing-tabs"
          />

          {editModalTab === "coords" && (
            <>
              {/* A horizontal/vertical line only has one degree of freedom (see the single drag
                  handle above) — editing its two endpoints independently here would let them
                  drift apart and break that invariant, so it gets one field instead of the usual
                  two. */}
              {draft.lineType === "horizontal" && (
                <NumberField
                  label={draft.valueAxis === "volume" ? "Volume" : "Prix"}
                  step={0.01}
                  value={draft.y1}
                  onChange={(v) => setDraft({ ...draft, y1: v === "" ? draft.y1 : round4(v), y2: v === "" ? draft.y2 : round4(v) })}
                />
              )}
              {draft.lineType === "vertical" && (
                <div className="lq-field">
                  <label className="lq-field__label">Date</label>
                  <input
                    type="date"
                    className="lq-chart__date-input"
                    value={toDateInputValue(draft.x1)}
                    onChange={(e) => {
                      const next = fromDateInputValue(e.target.value, draft.x1);
                      setDraft({ ...draft, x1: next, x2: next });
                    }}
                  />
                </div>
              )}
              {/* A ray keeps both its degrees of freedom (unlike horizontal/vertical), so it gets
                  both fields — still just one of each, since x2/y2 always mirror x1/y1. Arrow
                  markers share this same one-point editor (never a volume value — they're always
                  price-anchored). */}
              {(draft.lineType === "ray" || draft.lineType === "arrowUp" || draft.lineType === "arrowDown") && (
                <div className="lq-chart__edit-drawing-row">
                  <div className="lq-field">
                    <label className="lq-field__label">Date</label>
                    <input
                      type="date"
                      className="lq-chart__date-input"
                      value={toDateInputValue(draft.x1)}
                      onChange={(e) => {
                        const next = fromDateInputValue(e.target.value, draft.x1);
                        setDraft({ ...draft, x1: next, x2: next });
                      }}
                    />
                  </div>
                  <NumberField
                    label={draft.valueAxis === "volume" ? "Volume" : "Prix"}
                    step={0.01}
                    value={draft.y1}
                    onChange={(v) => setDraft({ ...draft, y1: v === "" ? draft.y1 : round4(v), y2: v === "" ? draft.y2 : round4(v) })}
                  />
                </div>
              )}
              {/* Regular trend line, "extended" (same two points, just drawn further — see the
                  canvas draw effect), "channel" (line 1's own two points; its second, parallel
                  line is set by the "Décalage" field below instead of its own coordinates),
                  "fibonacci" (its retracement levels are all derived from these same two points,
                  0% at "Prix début" and 100% at "Prix fin") and "rectangle" (opposite corners)
                  all share the same two-point editor. */}
              {(!draft.lineType ||
                draft.lineType === "extended" ||
                draft.lineType === "channel" ||
                draft.lineType === "fibonacci" ||
                draft.lineType === "rectangle") && (
                <>
                  <div className="lq-chart__edit-drawing-row">
                    <div className="lq-field">
                      <label className="lq-field__label">Début</label>
                      <input
                        type="date"
                        className="lq-chart__date-input"
                        value={toDateInputValue(draft.x1)}
                        onChange={(e) => setDraft({ ...draft, x1: fromDateInputValue(e.target.value, draft.x1) })}
                      />
                    </div>
                    <NumberField
                      label="Prix début"
                      step={0.01}
                      value={draft.y1}
                      onChange={(v) => setDraft({ ...draft, y1: v === "" ? draft.y1 : round4(v) })}
                    />
                  </div>
                  <div className="lq-chart__edit-drawing-row">
                    <div className="lq-field">
                      <label className="lq-field__label">Fin</label>
                      <input
                        type="date"
                        className="lq-chart__date-input"
                        value={toDateInputValue(draft.x2)}
                        onChange={(e) => setDraft({ ...draft, x2: fromDateInputValue(e.target.value, draft.x2) })}
                      />
                    </div>
                    <NumberField
                      label="Prix fin"
                      step={0.01}
                      value={draft.y2}
                      onChange={(v) => setDraft({ ...draft, y2: v === "" ? draft.y2 : round4(v) })}
                    />
                  </div>
                </>
              )}
              {draft.lineType === "channel" && (
                <NumberField
                  label="Décalage (ligne 2)"
                  step={0.01}
                  value={draft.channelOffset ?? 0}
                  onChange={(v) => setDraft({ ...draft, channelOffset: v === "" ? draft.channelOffset : round4(v) })}
                />
              )}
              {/* "disjointChannel"/"fibonacciExtension"/"elliottCorrection"/"elliottImpulse" — a
                  date+price row per point (x1/y1, x2/y2, then extraPoints), generic over however
                  many that tool needs instead of a fixed "Début"/"Fin" pair. */}
              {draft.lineType &&
                MULTI_POINT_TOOLS[draft.lineType]?.labels.map((label, i) => {
                  const point = i === 0 ? { x: draft.x1, y: draft.y1 } : i === 1 ? { x: draft.x2, y: draft.y2 } : draft.extraPoints?.[i - 2];
                  if (!point) return null;
                  const setPointField = (next: Partial<DataPoint>) => {
                    if (i === 0) {
                      setDraft({ ...draft, x1: next.x ?? draft.x1, y1: next.y ?? draft.y1 });
                    } else if (i === 1) {
                      setDraft({ ...draft, x2: next.x ?? draft.x2, y2: next.y ?? draft.y2 });
                    } else {
                      const extra = [...(draft.extraPoints ?? [])];
                      extra[i - 2] = { ...extra[i - 2], ...next };
                      setDraft({ ...draft, extraPoints: extra });
                    }
                  };
                  return (
                    <div className="lq-chart__edit-drawing-row" key={i}>
                      <div className="lq-field">
                        <label className="lq-field__label">{label}</label>
                        <input
                          type="date"
                          className="lq-chart__date-input"
                          value={toDateInputValue(point.x)}
                          onChange={(e) => setPointField({ x: fromDateInputValue(e.target.value, point.x) })}
                        />
                      </div>
                      <NumberField
                        label={`Prix (${label})`}
                        step={0.01}
                        value={point.y}
                        onChange={(v) => v !== "" && setPointField({ y: round4(v) })}
                      />
                    </div>
                  );
                })}
              {/* "elbowArrow" — same date+price-row-per-point idea as the generic multi-point
                  block above, but over allPointsOf directly (numbered "Point N") instead of
                  MULTI_POINT_TOOLS' fixed labels array, since it can have any number of points
                  depending on how many clicks it took before Escape finalized it. */}
              {draft.lineType === "elbowArrow" &&
                allPointsOf(draft).map((point, i) => {
                  const setPointField = (next: Partial<DataPoint>) => {
                    if (i === 0) {
                      setDraft({ ...draft, x1: next.x ?? draft.x1, y1: next.y ?? draft.y1 });
                    } else if (i === 1) {
                      setDraft({ ...draft, x2: next.x ?? draft.x2, y2: next.y ?? draft.y2 });
                    } else {
                      const extra = [...(draft.extraPoints ?? [])];
                      extra[i - 2] = { ...extra[i - 2], ...next };
                      setDraft({ ...draft, extraPoints: extra });
                    }
                  };
                  const label = `Point ${i + 1}`;
                  return (
                    <div className="lq-chart__edit-drawing-row" key={i}>
                      <div className="lq-field">
                        <label className="lq-field__label">{label}</label>
                        <input
                          type="date"
                          className="lq-chart__date-input"
                          value={toDateInputValue(point.x)}
                          onChange={(e) => setPointField({ x: fromDateInputValue(e.target.value, point.x) })}
                        />
                      </div>
                      <NumberField
                        label={`Prix (${label})`}
                        step={0.01}
                        value={point.y}
                        onChange={(v) => v !== "" && setPointField({ y: round4(v) })}
                      />
                    </div>
                  );
                })}
            </>
          )}

          {editModalTab === "text" && (
            <>
              <TextField
                label="Texte"
                placeholder="Étiquette (optionnel)"
                value={draft.text ?? ""}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              />
              <Checkbox
                checked={draft.textAlignWithLine ?? false}
                onChange={(textAlignWithLine) => setDraft({ ...draft, textAlignWithLine })}
                label="Aligner le texte avec la ligne"
              />
              <div className="lq-chart__edit-drawing-row">
                <NumberField
                  label="Taille du texte"
                  min={8}
                  max={48}
                  step={1}
                  value={draft.textSize ?? 11}
                  onChange={(v) => setDraft({ ...draft, textSize: v === "" ? 11 : v })}
                />
                <div className="lq-field">
                  <label className="lq-field__label">Couleur de fond</label>
                  <input
                    type="color"
                    className="lq-chart__color-input"
                    value={draft.textBackgroundColor ?? "#000000"}
                    onChange={(e) => setDraft({ ...draft, textBackgroundColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="lq-chart__edit-drawing-row">
                <Checkbox checked={draft.textBold ?? true} onChange={(textBold) => setDraft({ ...draft, textBold })} label="Gras" />
                <Checkbox checked={draft.textItalic ?? false} onChange={(textItalic) => setDraft({ ...draft, textItalic })} label="Italique" />
              </div>
              {draft.textBackgroundColor && (
                <button
                  type="button"
                  className="lq-chart__text-bg-clear"
                  onClick={() => setDraft({ ...draft, textBackgroundColor: undefined })}
                >
                  Retirer la couleur de fond
                </button>
              )}
              <div className="lq-chart__edit-drawing-row">
                <Select
                  label="Alignement vertical"
                  value={draft.textVerticalAlign ?? "top"}
                  onChange={(v) => setDraft({ ...draft, textVerticalAlign: v })}
                  options={[
                    { value: "top", label: "Haut" },
                    { value: "center", label: "Centre" },
                    { value: "bottom", label: "Bas" },
                  ]}
                />
                <Select
                  label="Alignement horizontal"
                  value={draft.textHorizontalAlign ?? "center"}
                  onChange={(v) => setDraft({ ...draft, textHorizontalAlign: v })}
                  options={[
                    { value: "left", label: "Gauche" },
                    { value: "center", label: "Centre" },
                    { value: "right", label: "Droite" },
                  ]}
                />
              </div>
            </>
          )}

          {editModalTab === "style" && (
            <>
              <div className="lq-chart__edit-drawing-row">
                <NumberField
                  label="Épaisseur"
                  min={1}
                  max={8}
                  step={0.5}
                  value={draft.strokeWidth ?? 1.5}
                  onChange={(v) => setDraft({ ...draft, strokeWidth: v === "" ? 1.5 : v })}
                />
                <div className="lq-field">
                  <label className="lq-field__label">Couleur</label>
                  <input
                    type="color"
                    className="lq-chart__color-input"
                    value={draft.color ?? DEFAULT_DRAWING_COLOR}
                    onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                  />
                </div>
              </div>
              <Select
                label="Style de trait"
                value={draft.lineStyle ?? (draft.dashed ? "dashed" : "solid")}
                onChange={(v) => setDraft({ ...draft, lineStyle: v, dashed: undefined })}
                options={[
                  { value: "solid", label: "Continu" },
                  { value: "dashed", label: "Tirets" },
                  { value: "dotted", label: "Pointillés" },
                  { value: "dashdot", label: "Tiret-point" },
                ]}
              />
              {/* "extend" only applies to a plain 2-point line — the other line types (channel,
                  fibonacci, elliott, disjoint channel, horizontal/ray/vertical) each draw
                  themselves with their own fixed geometry and don't read this field (see the
                  canvas draw effect's per-lineType branches vs. its generic fallback). */}
              {(!draft.lineType || draft.lineType === "extended") && (
                <Select
                  label="Extension"
                  value={effectiveExtendOf(draft)}
                  onChange={(v) => setDraft({ ...draft, extend: v, lineType: draft.lineType === "extended" ? undefined : draft.lineType })}
                  options={[
                    { value: "none", label: "Ne pas étendre" },
                    { value: "right", label: "Étendre à droite" },
                    { value: "left", label: "Étendre à gauche" },
                    { value: "both", label: "Étendre des deux côtés" },
                  ]}
                />
              )}
              {/* Arrowheads only make sense on a line that actually stops somewhere — offered
                  only once "Extension" above is set to "Ne pas étendre" (an infinitely-extended
                  end has nothing to put an arrowhead on). "Gauche"/"Droite" are screen positions
                  (see arrowLeft/arrowRight's own doc), not tied to which point is x1 vs x2. */}
              {(!draft.lineType || draft.lineType === "extended") && effectiveExtendOf(draft) === "none" && (
                <div className="lq-chart__edit-drawing-row">
                  <Checkbox checked={draft.arrowLeft ?? false} onChange={(arrowLeft) => setDraft({ ...draft, arrowLeft })} label="Flèche à gauche" />
                  <Checkbox checked={draft.arrowRight ?? false} onChange={(arrowRight) => setDraft({ ...draft, arrowRight })} label="Flèche à droite" />
                </div>
              )}
            </>
          )}
        </Modal>
      )}

      {indicatorPickerOpen && (
        <Modal open onClose={() => setIndicatorPickerOpen(false)} title="Ajouter un indicateur">
          <TextField
            placeholder="Rechercher un indicateur…"
            value={indicatorSearchQuery}
            onChange={(e) => setIndicatorSearchQuery(e.target.value)}
            leadingIcon={<SearchIcon size={14} />}
            autoFocus
          />
          <div className="lq-chart__indicator-picker">
            {(() => {
              const query = indicatorSearchQuery.trim().toLowerCase();
              const showVolumeOption = showVolume && "volume".includes(query);
              const matches = INDICATOR_CATALOG.filter(
                (entry) => entry.label.toLowerCase().includes(query) || entry.shortLabel.toLowerCase().includes(query)
              );
              const groups: { category: string; entries: IndicatorCatalogEntry[] }[] = [];
              for (const entry of matches) {
                const group = groups.find((g) => g.category === entry.category);
                if (group) group.entries.push(entry);
                else groups.push({ category: entry.category, entries: [entry] });
              }
              if (!showVolumeOption && groups.length === 0) {
                return <p className="lq-chart__indicator-picker-empty">Aucun indicateur ne correspond à « {indicatorSearchQuery} ».</p>;
              }
              return (
                <>
                  {/* Volume isn't part of INDICATOR_CATALOG — it's the caller's own data (not
                      something computed), driven by `showVolume`/the volume pane's own header
                      rather than an `Indicator` entry — but it's still just as valid an "add a
                      pane" choice as RSI/CHOP/MACD, so it gets a slot here too, re-showing the
                      pane if it was previously collapsed or removed. */}
                  {showVolumeOption && (
                    <div className="lq-chart__indicator-picker-group">
                      <div className="lq-chart__indicator-picker-group-label">Volume</div>
                      <button
                        type="button"
                        className="lq-chart__indicator-picker-option"
                        onClick={() => setVolumePaneState("expanded")}
                      >
                        <span className="lq-chart__indicator-picker-name">Volume</span>
                      </button>
                    </div>
                  )}
                  {groups.map((group) => (
                    <div className="lq-chart__indicator-picker-group" key={group.category}>
                      <div className="lq-chart__indicator-picker-group-label">{group.category}</div>
                      {group.entries.map((entry) => (
                        <button
                          key={entry.kind}
                          type="button"
                          className="lq-chart__indicator-picker-option"
                          onClick={() => addIndicator(entry)}
                        >
                          <span className="lq-chart__indicator-picker-name">{entry.label}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </Modal>
      )}

      {editingIndicatorId && indicatorDraft && (
        <Modal
          open
          onClose={closeIndicatorSettings}
          title={`Paramètres — ${indicatorLabel(indicatorDraft)}`}
          footer={
            <div className="lq-chart__edit-drawing-footer">
              <button type="button" className="lq-chart__reset-button" onClick={deleteEditingIndicator}>
                Supprimer
              </button>
              <button type="button" className="lq-chart__confirm-button" onClick={saveIndicatorSettings}>
                Enregistrer
              </button>
            </div>
          }
        >
          {indicatorCatalogEntry(indicatorDraft.kind).hasPeriod && (
            <NumberField
              label="Période"
              min={1}
              max={500}
              step={1}
              value={indicatorDraft.period}
              onChange={(v) => setIndicatorDraft({ ...indicatorDraft, period: v === "" ? indicatorDraft.period : v })}
            />
          )}
          {indicatorCatalogEntry(indicatorDraft.kind).hasStdDev && (
            <NumberField
              label="Écart-type (bandes)"
              min={0.5}
              max={5}
              step={0.1}
              value={indicatorDraft.stdDev ?? 2}
              onChange={(v) => setIndicatorDraft({ ...indicatorDraft, stdDev: v === "" ? indicatorDraft.stdDev : v })}
            />
          )}
          {indicatorDraft.kind === "macd" && (
            <div className="lq-chart__edit-drawing-row">
              <NumberField
                label="Rapide"
                min={1}
                max={200}
                step={1}
                value={indicatorDraft.fastPeriod ?? 12}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, fastPeriod: v === "" ? indicatorDraft.fastPeriod : v })}
              />
              <NumberField
                label="Lent"
                min={1}
                max={400}
                step={1}
                value={indicatorDraft.slowPeriod ?? 26}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, slowPeriod: v === "" ? indicatorDraft.slowPeriod : v })}
              />
              <NumberField
                label="Signal"
                min={1}
                max={200}
                step={1}
                value={indicatorDraft.signalPeriod ?? 9}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, signalPeriod: v === "" ? indicatorDraft.signalPeriod : v })}
              />
            </div>
          )}
          <div className="lq-field">
            <label className="lq-field__label">Couleur</label>
            <input
              type="color"
              className="lq-chart__color-input"
              value={indicatorDraft.color ?? defaultIndicatorColor(indicators.findIndex((i) => i.id === indicatorDraft.id))}
              onChange={(e) => setIndicatorDraft({ ...indicatorDraft, color: e.target.value })}
            />
          </div>
        </Modal>
      )}

      {settingsOpen && (
        <Modal open onClose={() => setSettingsOpen(false)} title="Paramètres du graphique">
          <div className="lq-chart__edit-drawing-row">
            <div className="lq-field">
              <label className="lq-field__label">Bougies haussières</label>
              <input
                type="color"
                className="lq-chart__color-input"
                value={upColorOverride ?? "#26a69a"}
                onChange={(e) => setUpColorOverride(e.target.value)}
              />
            </div>
            <div className="lq-field">
              <label className="lq-field__label">Bougies baissières</label>
              <input
                type="color"
                className="lq-chart__color-input"
                value={downColorOverride ?? "#ef5350"}
                onChange={(e) => setDownColorOverride(e.target.value)}
              />
            </div>
          </div>
          {(upColorOverride || downColorOverride) && (
            <button
              type="button"
              className="lq-chart__inline-reset"
              onClick={() => {
                setUpColorOverride(undefined);
                setDownColorOverride(undefined);
              }}
            >
              Réinitialiser aux couleurs du thème
            </button>
          )}
          <Checkbox
            checked={yAutoScalingState}
            onChange={(checked) => {
              setYAutoScalingState(checked);
              onYAutoScalingChange?.(checked);
            }}
            label="Rescale automatique de l'axe des prix au zoom"
          />
          {eventKinds.length > 0 && (
            <div className="lq-chart__settings-events">
              <span className="lq-field__label">Événements</span>
              {eventKinds.map((kind) => (
                <Checkbox
                  key={kind}
                  checked={!hiddenEventKinds.has(kind)}
                  onChange={() =>
                    setHiddenEventKinds((prev) => {
                      const next = new Set(prev);
                      if (next.has(kind)) next.delete(kind);
                      else next.add(kind);
                      return next;
                    })
                  }
                  label={kind}
                />
              ))}
            </div>
          )}
        </Modal>
      )}

      {symbolSearchOpen && (
        <Modal open onClose={() => setSymbolSearchOpen(false)} title="Symbol search" footer={null}>
          <TextField
            placeholder="Rechercher un symbole…"
            value={symbolSearchQuery}
            onChange={(e) => setSymbolSearchQuery(e.target.value)}
            leadingIcon={<SearchIcon size={14} />}
            trailingIcon={
              symbolSearchQuery ? (
                <button
                  type="button"
                  className="lq-chart__symbol-search-clear"
                  onClick={() => setSymbolSearchQuery("")}
                  aria-label="Effacer la recherche"
                >
                  <CloseIcon size={12} />
                </button>
              ) : undefined
            }
            autoFocus
          />
          {/* Single-select pills, not checkboxes (CheckboxButton) — only one category filters
              the results at a time, same "active" visual convention as the timeframe/
              display-mode menus above. */}
          <div className="lq-chart__symbol-search-categories">
            {SYMBOL_SEARCH_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={[
                  "lq-chart__symbol-search-category",
                  cat.value === symbolSearchCategory && "lq-chart__symbol-search-category--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSymbolSearchCategory(cat.value)}
                aria-pressed={cat.value === symbolSearchCategory}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="lq-chart__symbol-search-results">
            {(symbolSearchResults ?? []).length === 0 ? (
              <p className="lq-chart__symbol-search-empty">Aucun résultat.</p>
            ) : (
              (symbolSearchResults ?? []).map((result, i) => {
                const isFavorite = favoriteSymbolIds.includes(result.id);
                return (
                  <div className="lq-chart__symbol-search-row" key={result.id}>
                    <button
                      type="button"
                      className="lq-chart__symbol-search-row-main"
                      onClick={() => {
                        onSymbolSelect?.(result);
                        setSymbolSearchOpen(false);
                      }}
                    >
                      <span
                        className="lq-chart__symbol-search-logo"
                        style={result.logoUrl ? undefined : { backgroundColor: result.logoColor ?? defaultSymbolLogoColor(i) }}
                      >
                        {result.logoUrl ? <img src={result.logoUrl} alt="" /> : result.ticker.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="lq-chart__symbol-search-ticker">{result.ticker}</span>
                      <span className="lq-chart__symbol-search-name">{result.name}</span>
                      <span className="lq-chart__symbol-search-source">{result.source}</span>
                    </button>
                    {/* Invisible until the row is hovered/focused (see charts-shared.css) — unless
                        already favorited, in which case it stays visible so favorited results
                        can actually be told apart from a glance, not just while hovering. */}
                    <button
                      type="button"
                      className={[
                        "lq-chart__symbol-search-favorite",
                        isFavorite && "lq-chart__symbol-search-favorite--active",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => toggleFavoriteSymbol(result.id)}
                      aria-label={isFavorite ? `Retirer ${result.ticker} des favoris` : `Ajouter ${result.ticker} aux favoris`}
                    >
                      <StarIcon size={14} fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
