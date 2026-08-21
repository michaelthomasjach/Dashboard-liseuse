import { useMemo, useRef, useState } from "react";
import type { Candle } from "../interfaces/Candle.interface";
import type { ChartDisplayMode } from "../interfaces/ChartDisplayMode.interface";
import { computeHeikinAshiCandles, computeRenkoBrickSize, computeRenkoBricks, computeLineBreakBricks, computeTPOSessionProfiles } from "../chartModes";

export interface UseChartDisplayModeArgs {
  data: Candle[];
  visibleRange: { start: number; end: number };
  renkoAtrPeriod: number;
  tpoBlockMinutes: number;
  tpoLabelStyle: "letters" | "numbers";
  defaultChartDisplayMode: ChartDisplayMode | undefined;
}

/** How the price series itself is drawn (candle/line/Heikin Ashi/Renko/Line Break/TPO) — see
 *  `CandlestickChartProps.defaultChartDisplayMode`/`onChartDisplayModeChange` — plus every
 *  display-mode-specific transform of `data` the canvas draw effect actually paints from. */
export function useChartDisplayMode({
  data,
  visibleRange,
  renkoAtrPeriod,
  tpoBlockMinutes,
  tpoLabelStyle,
  defaultChartDisplayMode,
}: UseChartDisplayModeArgs) {
  const [chartDisplayMode, setChartDisplayMode] = useState<ChartDisplayMode>(defaultChartDisplayMode ?? "candle");
  const [displayModeOpen, setDisplayModeOpen] = useState(false);
  const displayModeAnchorRef = useRef<HTMLButtonElement>(null);

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
  // Recomputed on pan/zoom (not just `data`), same as `YAutoScaling` above — the profiles
  // describe whatever's currently on screen, not the whole dataset. One per session (see
  // computeTPOSessionProfiles's own doc) rather than a single aggregate.
  const tpoSessionProfiles = useMemo(() => {
    if (chartDisplayMode !== "tpo") return [];
    const start = Math.max(0, visibleRange.start);
    const end = Math.min(data.length, visibleRange.end);
    if (end <= start) return [];
    // computeTPOSessionProfiles' own startIndex/endIndex are relative to the slice handed to
    // it — offset back by `start` so they're absolute indices into `data` again, the index
    // space zoomedXScale (and every other renderer input) actually expects.
    return computeTPOSessionProfiles(data.slice(start, end), 24, tpoBlockMinutes, tpoLabelStyle).map((s) => ({
      ...s,
      startIndex: s.startIndex + start,
      endIndex: s.endIndex + start,
    }));
  }, [data, visibleRange, chartDisplayMode, tpoBlockMinutes, tpoLabelStyle]);

  return {
    chartDisplayMode,
    setChartDisplayMode,
    displayModeOpen,
    setDisplayModeOpen,
    displayModeAnchorRef,
    visible,
    heikinAshiCandles,
    renkoBricks,
    lineBreakBricks,
    tpoSessionProfiles,
  };
}
