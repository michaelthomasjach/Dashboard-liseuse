import { useEffect, useRef } from "react";
import type { Candle } from "../interfaces/Candle.interface";

export interface UseHoverSyncArgs {
  data: Candle[];
  hoverIndex: number | null;
  indexForDate: (date: Date) => number;
  dateForIndex: (index: number) => Date;
  syncedHoverDate: Date | null | undefined;
  onHoverDateChange: ((date: Date | null) => void) | undefined;
}

/** Cross-chart crosshair sync (see `CandlestickChartProps.syncedHoverDate`'s own doc) — the real
 *  cursor always wins over a synced-in date, so a chart being actively hovered never has its own
 *  crosshair hijacked by whatever another linked chart (see `ChartWorkspace`) last reported.
 *  `effectiveHoverIndex`/`effectiveHovered` are what every purely *visual* hover consumer reads
 *  instead of raw `hoverIndex`/`hovered` — interaction-driven code (adding a line at hover,
 *  hit-testing a drawing to drag) keeps reading the raw pair, since those should only ever act on
 *  where the cursor genuinely is. Also reports this chart's own real hover back out via
 *  `onHoverDateChange` — deliberately off the raw index, not the effective one: a synced chart
 *  must never re-broadcast the date it just *received* right back out as if it were its own. */
export function useHoverSync({ data, hoverIndex, indexForDate, dateForIndex, syncedHoverDate, onHoverDateChange }: UseHoverSyncArgs) {
  const effectiveHoverIndex = hoverIndex !== null ? hoverIndex : syncedHoverDate ? indexForDate(syncedHoverDate) : null;
  const effectiveHovered = effectiveHoverIndex !== null ? data[effectiveHoverIndex] : null;

  // `onHoverDateChange` read through a ref (kept in sync during render, same reasoning
  // usePaneLayout's own reorderPanesRef is), not listed as an effect dependency directly: a
  // `ChartWorkspace` syncing several charts hands each of them a fresh callback closure on every
  // one of *its own* re-renders (it has no reason to memoize one per panel), and depending on that
  // reference directly here would re-fire this effect — re-reporting the same hover date — every
  // time any sibling chart's hover changes, not just this chart's own. That, plus a plain `useMemo`
  // fallback, is itself enough to snowball into a render loop across every synced chart in the
  // group. Depending only on `hoverIndex`/`dateForIndex` (both genuinely local to this chart)
  // means this only ever fires when *this* chart's own hover actually changes.
  const onHoverDateChangeRef = useRef(onHoverDateChange);
  onHoverDateChangeRef.current = onHoverDateChange;
  useEffect(() => {
    onHoverDateChangeRef.current?.(hoverIndex !== null ? dateForIndex(hoverIndex) : null);
  }, [hoverIndex, dateForIndex]);

  return { effectiveHoverIndex, effectiveHovered };
}
