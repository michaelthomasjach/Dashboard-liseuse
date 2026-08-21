import { useMemo } from "react";
import type { Candle } from "../interfaces/Candle.interface";
import type { Indicator } from "../interfaces/Indicator.interface";
import { computeTPOSessionProfiles, type TpoSessionProfile } from "../chartModes";

export interface TpoOverlay {
  indicatorId: string;
  profiles: TpoSessionProfile[];
  splitByBlocks: boolean;
  opacity: number;
}

/** "tpo" is the one indicator kind whose value is a range-aware aggregate (a profile per
 *  session, built from whatever's currently on screen — see `computeTPOSessionProfiles`'s own
 *  doc) rather than a value at a fixed candle index, so it can't go through
 *  `useIndicatorPaneScales`'s `indicatorValues` memo the way every other indicator does — that
 *  memo is deliberately independent of `visibleRange` (recomputing a full dataset's worth of
 *  session profiles on every pan/zoom would be wasteful, and pointless once only a couple of
 *  sessions are ever on screen at once). Same "recomputed on pan/zoom, not just `data`" shape
 *  Renko/Line Break bricks already needed for their own range-relative geometry, just triggered
 *  by an indicator instead of a `chartDisplayMode`. One profile set per active (non-hidden) "tpo"
 *  indicator — same as any other indicator kind, nothing stops two coexisting with different
 *  settings. */
export function useTpoOverlay(data: Candle[], visibleRange: { start: number; end: number }, indicators: Indicator[]): TpoOverlay[] {
  const tpoIndicators = useMemo(() => indicators.filter((ind) => ind.kind === "tpo" && !ind.hidden), [indicators]);

  return useMemo(() => {
    if (tpoIndicators.length === 0) return [];
    const start = Math.max(0, visibleRange.start);
    const end = Math.min(data.length, visibleRange.end);
    if (end <= start) return [];
    const slice = data.slice(start, end);
    return tpoIndicators.map((ind) => {
      // computeTPOSessionProfiles' own startIndex/endIndex are relative to the slice handed to
      // it — offset back by `start` so they're absolute indices into `data` again, the index
      // space zoomedXScale (and every other renderer input) actually expects.
      const profiles = computeTPOSessionProfiles(
        slice,
        ind.tpoRowCount ?? 24,
        ind.tpoBlockMinutes ?? 30,
        ind.tpoLabelStyle ?? "letters",
        (ind.tpoValueAreaPercent ?? 70) / 100
      ).map((s) => ({ ...s, startIndex: s.startIndex + start, endIndex: s.endIndex + start }));
      return { indicatorId: ind.id, profiles, splitByBlocks: ind.tpoSplitByBlocks ?? true, opacity: ind.tpoOpacity ?? 100 };
    });
  }, [data, visibleRange, tpoIndicators]);
}
