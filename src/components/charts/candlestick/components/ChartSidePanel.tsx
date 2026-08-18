import type { ReactNode, RefObject } from "react";
import type * as React from "react";
import { SIDE_PANEL_DEFAULT_WIDTH_FRACTION } from "../constants";

export interface ChartSidePanelProps {
  children: ReactNode;
  panelRef: RefObject<HTMLDivElement>;
  widthPx: number | null;
  startResize: (e: React.PointerEvent) => void;
}

/** The chart's own right-docked panel (`CandlestickChartProps.sidePanel`) — a flex sibling of
 *  `.lq-chart__main` inside the outer `.lq-chart` row (see CandlestickChart.tsx's own doc on why
 *  that split exists: it lets the plot's own width genuinely shrink to make room via ordinary
 *  flexbox, with zero changes needed to any of the axis/margin math everything else already
 *  reads from). Purely a layout shell around whatever the caller passed as `sidePanel` — same
 *  "structure only, caller owns the content" shape as `ChartWorkspace.children`. Unmounted
 *  entirely (not just visually hidden) whenever collapsed — see CandlestickChart.tsx's own
 *  `sidePanelState.open` gate — so a collapsed panel gives the chart back its *full* width, not a
 *  thin strip. */
export function ChartSidePanel({ children, panelRef, widthPx, startResize }: ChartSidePanelProps) {
  return (
    <div
      ref={panelRef}
      className="lq-chart__side-panel"
      // The CSS default (a plain 20% flex-basis, see SIDE_PANEL_DEFAULT_WIDTH_FRACTION) is what
      // actually delivers "1/5 of the chart" — this inline style only kicks in once the user has
      // dragged the resize handle at least once (see useSidePanel's own widthPx doc), pinning the
      // panel to that exact pixel width from then on instead of a relative share.
      style={widthPx !== null ? { flex: `0 0 ${widthPx}px` } : { flexBasis: SIDE_PANEL_DEFAULT_WIDTH_FRACTION }}
    >
      <div className="lq-chart__side-panel-resize-handle" onPointerDown={startResize} />
      <div className="lq-chart__side-panel-content">{children}</div>
    </div>
  );
}
