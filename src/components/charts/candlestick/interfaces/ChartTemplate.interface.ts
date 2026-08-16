import type { Indicator } from "./Indicator.interface";

/** Everything a saved layout needs to reproduce "all the indicators/panes" (see the Save button
 *  in the chart's own header) — deliberately just the indicator/pane *configuration*, not
 *  transient view state like zoom/pan or a pane's own manual Y-axis rescale, which nobody
 *  reloading a template later would expect to jump back to. */
export interface ChartTemplateSnapshot {
  indicators: Indicator[];
  /** Where the Volume pane sits among the "own"-pane indicators — see `usePaneLayout`'s own
   *  `volumePaneOrder` doc. */
  volumePaneOrder: number;
  volumePaneState: "expanded" | "collapsed" | "hidden";
  /** Keyed by "volume" or an indicator's own id — see `usePaneLayout`'s own `paneHeightFractions`
   *  doc. */
  paneHeightFractions: Record<string, number>;
}

export interface ChartTemplate extends ChartTemplateSnapshot {
  id: string;
  name: string;
}
