import { Children, cloneElement, useState, type ReactElement } from "react";
import type { CandlestickChartProps } from "./candlestick/interfaces/CandlestickChartProps.interface";
import { useLinkGroups } from "./workspace/useLinkGroups";
import { LinkGroupsModal } from "./workspace/LinkGroupsModal";
import "./ChartWorkspace.css";

const GRID_COLUMNS: Record<1 | 2 | 4 | 6 | 8, number> = { 1: 1, 2: 2, 4: 2, 6: 3, 8: 4 };
const GRID_ROWS: Record<1 | 2 | 4 | 6 | 8, number> = { 1: 1, 2: 1, 4: 2, 6: 2, 8: 2 };

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
  /** A single pre-configured `<CandlestickChart {...allTheOptions} />` — the same "compose, don't
   *  configure" shape as everywhere else a caller hands this library a data source of their own,
   *  `ChartWorkspace` only adds layout and cross-chart sync on top. Every panel gets its own
   *  independent *instance* of exactly this configuration (own drawings, own indicators, own
   *  zoom, own templates — everything `CandlestickChart` itself owns internally), not a cut-down
   *  version of it, so splitting from one window to several never loses toolbar/drawing-tool/
   *  indicator access in the new ones. Pass an array instead (one element per panel, in order —
   *  "Fenêtre 1" = the first) if different panels should show genuinely different data/symbols;
   *  extra array entries past the current panel count are ignored, fewer leave the remaining grid
   *  cells empty. */
  children: ReactElement<CandlestickChartProps> | ReactElement<CandlestickChartProps>[];
  /** Fixed height in px applied to every panel uniformly, overriding each child's own `height`
   *  prop if it set one — a mixed-height grid wouldn't read as one coherent workspace. Omit
   *  (default) to instead fill 100% of the viewport height, splitting that budget evenly across
   *  however many rows the current panel count needs (a plain CSS grid fraction per row) — the
   *  usual choice for a workspace that's the main content of its own page. Always filled this way
   *  once the grid wraps into two rows (4/6/8 panels) regardless of this prop: stacking two rows'
   *  worth of a height meant for *one* row would run well past the screen. */
  panelHeight?: number;
  /** Uncontrolled initial link groups — each a plain array of panel indices (0-based). */
  defaultLinkGroups?: number[][];
  /** Fires whenever a group is created, changed, or dissolved from the "Graphiques liés" modal. */
  onLinkGroupsChange?: (groups: number[][]) => void;
  className?: string;
}

/** A split-screen grid of `CandlestickChart`s (1/2/4/6/8 panels) whose crosshairs can be synced
 *  across whichever ones the user links together — hovering a candle on any panel in a group
 *  draws the same crosshair (vertical line, date badge, OHLC readout, plus the horizontal price
 *  line/badge) on every other panel in that group, each axis translated to that panel's own
 *  scale (nearest candle by date on X, the same price re-projected through that panel's own
 *  price scale on Y) rather than a raw shared index/pixel, so panels showing different symbols,
 *  zoom levels, or ranges still line up correctly. Grouping itself happens through the
 *  chain-link button each panel's own header gets (`CandlestickChart.linkable`, wired here) —
 *  opens one shared "Graphiques liés" modal (see `LinkGroupsModal`) regardless of which panel's
 *  button was clicked, since the groups themselves are workspace-wide, not per-panel. */
export function ChartWorkspace({
  defaultPanels = 1,
  onPanelsChange,
  children,
  panelHeight,
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
  // Horizontal-axis counterpart to hoverByPanel — a price rather than a date, see
  // syncedPriceForPanel/CandlestickChartProps.syncedHoverPrice for why a price (not a raw pixel)
  // is what's actually shared here.
  const [priceByPanel, setPriceByPanel] = useState<Record<number, number | null>>({});
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

  function handleHoverPriceChange(panelIndex: number, price: number | null) {
    setPriceByPanel((prev) => (prev[panelIndex] === price ? prev : { ...prev, [panelIndex]: price }));
  }

  // Horizontal-axis counterpart to syncedDateForPanel above.
  function syncedPriceForPanel(panelIndex: number): number | null {
    const groupIndex = groupIndexOfPanel(panelIndex);
    if (groupIndex === null) return null;
    for (const otherIndex of groups[groupIndex]) {
      if (otherIndex === panelIndex) continue;
      const price = priceByPanel[otherIndex];
      if (price !== null && price !== undefined) return price;
    }
    return null;
  }

  // A single child is a *template*, repeated to fill every panel — each still becomes its own
  // independent component instance below (cloneElement gives each a distinct `key`, and React
  // mounts a fresh instance per distinct key regardless of them all starting from the same
  // element), it's only the initial props that are shared. Multiple children keep the older
  // "one config per panel" behavior unchanged.
  const rawChildren = Children.toArray(children) as ReactElement<CandlestickChartProps>[];
  const panelElements = rawChildren.length === 1 ? Array.from({ length: panels }, () => rawChildren[0]) : rawChildren.slice(0, panels);
  const columns = GRID_COLUMNS[panels];
  const rows = GRID_ROWS[panels];
  // Fills 100% of the viewport height whenever the caller hasn't opted into a fixed `panelHeight`
  // — always true once the grid wraps into two rows (stacking two rows' worth of a single-row
  // height would run well past the screen regardless of what the caller asked for), and now also
  // the default for a single row (1/2 panels) since that's the more common case in practice: a
  // workspace that's the main content of its own page, same as any other panel count.
  const fillHeight = panelHeight === undefined || rows > 1;

  return (
    <div
      className={["lq-chart-workspace", className].filter(Boolean).join(" ")}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        // gridTemplateRows splits the 100vh budget evenly between the rows, and each panel below
        // gets `height: undefined` (see CandlestickChart's own useChartDimensions doc) so it
        // measures and fills its own row's actual share via ResizeObserver rather than a
        // hardcoded pixel figure.
        ...(fillHeight ? { gridTemplateRows: `repeat(${rows}, 1fr)`, height: "100vh" } : {}),
      }}
    >
      {panelElements.map((child, i) =>
        cloneElement(child, {
          // Always the panel index, never `child.key` — panels don't reorder, so it's already a
          // stable, unique identity on its own, and in the single-child "repeat as a template"
          // case above every entry in `panelElements` is literally the *same* element (same key,
          // whatever `Children.toArray` assigned it), which would otherwise collide and collapse
          // every panel down to one shared React instance instead of `panels` independent ones.
          key: i,
          height: fillHeight ? undefined : panelHeight,
          syncedHoverDate: syncedDateForPanel(i),
          onHoverDateChange: (date: Date | null) => handleHoverChange(i, date),
          syncedHoverPrice: syncedPriceForPanel(i),
          onHoverPriceChange: (price: number | null) => handleHoverPriceChange(i, price),
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
