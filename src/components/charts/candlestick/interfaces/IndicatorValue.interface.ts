import type { IndicatorBand } from "./IndicatorBand.interface";
import type { IndicatorMACD } from "./IndicatorMACD.interface";
import type { IndicatorZigZagPoint } from "./IndicatorZigZagPoint.interface";
import type { IndicatorSupertrendPoint } from "./IndicatorSupertrendPoint.interface";
import type { IndicatorIchimokuPoint } from "./IndicatorIchimokuPoint.interface";
import type { IndicatorGapPoint } from "./IndicatorGapPoint.interface";

/** Every shape a single indicator value can take, in one place — every file that used to spell
 *  out this union inline (indicators.ts, useIndicatorPaneScales.ts,
 *  RenderCandlestickChartParams.interface.ts, ChartHoverBadges.tsx, PaneHeaders.tsx) now reads
 *  this alias instead, so a new indicator kind with its own value shape only ever needs adding
 *  here once rather than in every one of those five places. A plain `number` covers every
 *  single-line indicator (SMA/EMA/WMA/VWAP/RSI/CHOP/ATR/Parabolic SAR/every fundamental,
 *  built-in or custom) — only the ones with a genuinely richer per-point shape get their own
 *  member. */
export type IndicatorValue = number | IndicatorBand | IndicatorMACD | IndicatorZigZagPoint | IndicatorSupertrendPoint | IndicatorIchimokuPoint | IndicatorGapPoint;
