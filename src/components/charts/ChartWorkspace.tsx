import { Children, cloneElement, useState, type ReactElement } from "react";
import type { CandlestickChartProps } from "./candlestick/interfaces/CandlestickChartProps.interface";
import { useLinkGroups } from "./workspace/useLinkGroups";
import { LinkGroupsModal } from "./workspace/LinkGroupsModal";
import "./ChartWorkspace.css";

const GRID_COLUMNS: Record<1 | 2 | 4 | 6 | 8, number> = { 1: 1, 2: 2, 4: 2, 6: 3, 8: 4 };

export interface ChartWorkspaceProps {
  /** Uncontrolled initial panel count — also picks the grid: 1 is a plain single chart (no grid
   *  chrome), 2 is a single row, 4/6/8 wrap into two rows (2/3/4 columns respectively). Owned
   *  internally from here on (same uncontrolled pattern as everywhere else in this library): each
   *  panel's own header grid/split-screen button (`CandlestickChart.showSplitScreen`, wired here)
   *  lets the user change it live — including going from 1 up to a split view and back — same as
   *  the chain-link button does for groups. Default 1. */
  defaultPanels?: 1 | 2 | 4 | 6 | 8;
  /** Fires whenever the panel count changes via any panel's own split-screen menu. */
  onPanelsChange?: (panels: 1 | 2 | 4 | 6 | 8) => void;
  /** One pre-configured `<CandlestickChart>` per panel, in order ("Fenêtre 1" = the first child,
   *  etc.) — same "compose, don't configure" shape as everywhere else a caller hands this library
   *  a data source of their own; `ChartWorkspace` only adds layout and cross-chart sync on top,
   *  it never owns what each panel actually shows. Extra children past `panels` are ignored;
   *  fewer just leaves the remaining grid cells empty. */
  children: ReactElement<CandlestickChartProps>[] | ReactElement<CandlestickChartProps>;
  /** Fixed height in px applied to every panel uniformly, overriding each child's own `height`
   *  prop if it set one — a mixed-height grid wouldn't read as one coherent workspace. Default
   *  320. */
  panelHeight?: number;
  /** Uncontrolled initial link groups — each a plain array of panel indices (0-based). */
  defaultLinkGroups?: number[][];
  /** Fires whenever a group is created, changed, or dissolved from the "Graphiques liés" modal. */
  onLinkGroupsChange?: (groups: number[][]) => void;
  className?: string;
}

/** A split-screen grid of `CandlestickChart`s (1/2/4/6/8 panels) whose crosshairs can be synced
 *  across whichever ones the user links together — hovering a candle on any panel in a group
 *  draws the same crosshair (vertical line, date badge, OHLC readout) on every other panel in
 *  that group, translated to each one's own nearest candle by date rather than raw index, so
 *  panels showing different symbols/ranges still line up correctly. Grouping itself happens
 *  through the chain-link button each panel's own header gets (`CandlestickChart.linkable`,
 *  wired here) — opens one shared "Graphiques liés" modal (see `LinkGroupsModal`) regardless of
 *  which panel's button was clicked, since the groups themselves are workspace-wide, not
 *  per-panel. */
export function ChartWorkspace({
  defaultPanels = 1,
  onPanelsChange,
  children,
  panelHeight = 320,
  defaultLinkGroups,
  onLinkGroupsChange,
  className,
}: ChartWorkspaceProps) {
  const [panels, setPanels] = useState(defaultPanels);
  const { groups, linkPanels, unlinkGroup, groupIndexOfPanel } = useLinkGroups({ defaultLinkGroups, onLinkGroupsChange });
  // Each panel's own last-reported real hover date (or null) — keyed by panel index, not a single
  // "currently hovered panel" value, since a panel that isn't in any group still needs its own
  // entry cleared correctly when its mouse leaves regardless of what else is going on.
  const [hoverByPanel, setHoverByPanel] = useState<Record<number, Date | null>>({});
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  function handlePanelsChange(next: 1 | 2 | 4 | 6 | 8) {
    setPanels(next);
    onPanelsChange?.(next);
  }

  function handleHoverChange(panelIndex: number, date: Date | null) {
    setHoverByPanel((prev) => {
      const current = prev[panelIndex] ?? null;
      // Bails out on an unchanged value rather than always spreading a fresh object — `date` is a
      // freshly-constructed Date every call (see useHoverSync's own dateForIndex), so `===` alone
      // would never short-circuit even when nothing meaningful changed, defeating the point.
      if (current === date || (current !== null && date !== null && current.getTime() === date.getTime())) return prev;
      return { ...prev, [panelIndex]: date };
    });
  }

  // The synced date a given panel should render its own crosshair at: whichever *other* panel in
  // its own group most recently reported a real hover, or null if none currently has one (nobody
  // in the group is hovering right now, or this panel isn't in a group at all).
  function syncedDateForPanel(panelIndex: number): Date | null {
    const groupIndex = groupIndexOfPanel(panelIndex);
    if (groupIndex === null) return null;
    for (const otherIndex of groups[groupIndex]) {
      if (otherIndex === panelIndex) continue;
      const date = hoverByPanel[otherIndex];
      if (date) return date;
    }
    return null;
  }

  const panelElements = (Children.toArray(children) as ReactElement<CandlestickChartProps>[]).slice(0, panels);
  const columns = GRID_COLUMNS[panels];

  return (
    <div className={["lq-chart-workspace", className].filter(Boolean).join(" ")} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {panelElements.map((child, i) =>
        cloneElement(child, {
          key: child.key ?? i,
          height: panelHeight,
          syncedHoverDate: syncedDateForPanel(i),
          onHoverDateChange: (date: Date | null) => handleHoverChange(i, date),
          linkable: true,
          isLinked: groupIndexOfPanel(i) !== null,
          onLinkClick: () => setLinkModalOpen(true),
          showSplitScreen: true,
          splitScreenPanels: panels,
          onSplitScreenChange: handlePanelsChange,
        })
      )}
      <LinkGroupsModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        panelCount={panelElements.length}
        groups={groups}
        onLink={linkPanels}
        onUnlink={unlinkGroup}
      />
    </div>
  );
}
