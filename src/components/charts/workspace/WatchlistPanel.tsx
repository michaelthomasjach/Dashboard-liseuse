import { useRef, useState } from "react";
import { Popover } from "../../forms/Popover";
import { Checkbox } from "../../forms/Checkbox";
import { SymbolSearchModal } from "../candlestick/components/SymbolSearchModal";
import { useSymbolSearchState } from "../candlestick/hooks/useSymbolSearchState";
import { ChevronDownIcon, PlusIcon, MoreHorizontalIcon } from "../../icons";
import type { SymbolSearchCategory } from "../candlestick/interfaces/SymbolSearchCategory.interface";
import type { SymbolSearchResult } from "../candlestick/interfaces/SymbolSearchResult.interface";
import type { ChartWorkspaceWatchlist, ChartWorkspaceWatchlistRow } from "./ChartWorkspaceWatchlist.interface";

export interface WatchlistPanelProps {
  watchlists: ChartWorkspaceWatchlist[];
  activeWatchlistId: string | undefined;
  onSelectWatchlist: (id: string) => void;
  visibleColumnIds: Set<string>;
  onVisibleColumnIdsChange: (ids: Set<string>) => void;
  /** Fires when a row is clicked — same "which symbol should the chart show now" role
   *  `CandlestickChart`'s own `onSymbolSelect` already plays for the main symbol search, just
   *  sourced from a watchlist row instead. What "opens in the candle chart" actually means (which
   *  panel, in a multi-panel workspace) is entirely up to whatever the caller does with this. */
  onRowClick: ((row: ChartWorkspaceWatchlistRow, watchlistId: string) => void) | undefined;
  symbolSearchResults: SymbolSearchResult[] | undefined;
  onSymbolSearchChange: ((query: string, category: SymbolSearchCategory) => void) | undefined;
  onAddSymbol: ((watchlistId: string, result: SymbolSearchResult) => void) | undefined;
}

/**
 * The docked panel's own "watchlist" tab body (see `ChartWorkspace.tsx`'s own `activeTab`) — the
 * name+caret header (opens a dropdown to switch among `watchlists`), the "+"/"…" action pair
 * (add a symbol via the same `SymbolSearchModal` shell `CandlestickChart` uses, toggle which
 * optional columns show), and the table itself. Kept as its own file/component rather than inlined
 * in `ChartWorkspace.tsx` — enough of its own state (two popovers, the add-symbol modal's search
 * state) to read as a distinct unit, same "extract when there's real internal complexity" call
 * this library already makes for `ChartHeader`/`ChartSidePanel`/etc.
 */
export function WatchlistPanel({
  watchlists,
  activeWatchlistId,
  onSelectWatchlist,
  visibleColumnIds,
  onVisibleColumnIdsChange,
  onRowClick,
  symbolSearchResults,
  onSymbolSearchChange,
  onAddSymbol,
}: WatchlistPanelProps) {
  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId) ?? watchlists[0];
  const [watchlistMenuOpen, setWatchlistMenuOpen] = useState(false);
  const watchlistTriggerRef = useRef<HTMLButtonElement>(null);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const columnsTriggerRef = useRef<HTMLButtonElement>(null);
  // No favorites concept here (see SymbolSearchModal's own doc on reusing it without them) —
  // `useSymbolSearchState` still owns the open/query/category state either way.
  const addSymbolState = useSymbolSearchState({
    defaultFavoriteSymbolIds: undefined,
    onFavoriteSymbolIdsChange: undefined,
    onSymbolSearchChange,
  });

  function toggleColumn(id: string) {
    const next = new Set(visibleColumnIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onVisibleColumnIdsChange(next);
  }

  if (!activeWatchlist) return null;
  const visibleColumns = activeWatchlist.columns.filter((c) => visibleColumnIds.has(c.id));

  return (
    <>
      <div className="lq-chart-workspace__side-panel-header">
        <button
          ref={watchlistTriggerRef}
          type="button"
          className="lq-chart__timeframe-trigger"
          onClick={() => setWatchlistMenuOpen((o) => !o)}
          aria-label={`Liste : ${activeWatchlist.name}`}
        >
          {activeWatchlist.name}
          <ChevronDownIcon size={12} />
        </button>
        <Popover open={watchlistMenuOpen} onClose={() => setWatchlistMenuOpen(false)} anchorRef={watchlistTriggerRef} placement="bottom">
          <div className="lq-chart__tool-menu">
            {watchlists.map((w) => (
              <button
                key={w.id}
                type="button"
                className={["lq-chart__tool-menu-option", w.id === activeWatchlist.id && "lq-chart__tool-menu-option--selected"]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  onSelectWatchlist(w.id);
                  setWatchlistMenuOpen(false);
                }}
              >
                {w.name}
              </button>
            ))}
          </div>
        </Popover>

        <div className="lq-chart-workspace__watchlist-actions">
          <button
            type="button"
            className="lq-chart__icon-button"
            onClick={() => addSymbolState.setSymbolSearchOpen(true)}
            aria-label="Ajouter un symbole"
            title="Ajouter un symbole"
          >
            <PlusIcon size={14} />
          </button>
          <button
            ref={columnsTriggerRef}
            type="button"
            className="lq-chart__icon-button"
            onClick={() => setColumnsMenuOpen((o) => !o)}
            aria-label="Colonnes affichées"
            title="Colonnes affichées"
          >
            <MoreHorizontalIcon size={14} />
          </button>
          <Popover open={columnsMenuOpen} onClose={() => setColumnsMenuOpen(false)} anchorRef={columnsTriggerRef} placement="bottom">
            <div className="lq-chart__tool-menu">
              {activeWatchlist.columns.map((c) => (
                <Checkbox key={c.id} checked={visibleColumnIds.has(c.id)} onChange={() => toggleColumn(c.id)} label={c.label} />
              ))}
            </div>
          </Popover>
        </div>
      </div>

      {visibleColumns.length > 0 && (
        <div className="lq-chart-workspace__watchlist-row lq-chart-workspace__watchlist-row--header">
          <span className="lq-chart-workspace__watchlist-ticker" />
          {visibleColumns.map((c) => (
            <span key={c.id} className="lq-chart-workspace__watchlist-cell">
              {c.label}
            </span>
          ))}
        </div>
      )}

      {activeWatchlist.rows.map((row) => (
        <button key={row.id} type="button" className="lq-chart-workspace__watchlist-row" onClick={() => onRowClick?.(row, activeWatchlist.id)}>
          <span className="lq-chart-workspace__watchlist-ticker">{row.ticker}</span>
          {visibleColumns.map((c) => (
            <span key={c.id} className="lq-chart-workspace__watchlist-cell">
              {row.values[c.id]}
            </span>
          ))}
        </button>
      ))}

      <SymbolSearchModal
        title={`Ajouter un symbole — ${activeWatchlist.name}`}
        symbolSearchOpen={addSymbolState.symbolSearchOpen}
        setSymbolSearchOpen={addSymbolState.setSymbolSearchOpen}
        symbolSearchQuery={addSymbolState.symbolSearchQuery}
        setSymbolSearchQuery={addSymbolState.setSymbolSearchQuery}
        symbolSearchCategory={addSymbolState.symbolSearchCategory}
        setSymbolSearchCategory={addSymbolState.setSymbolSearchCategory}
        symbolSearchResults={symbolSearchResults}
        onSymbolSelect={(result) => onAddSymbol?.(activeWatchlist.id, result)}
        onAddSymbolOverlay={undefined}
        symbolOverlays={[]}
        addingOverlaySymbols={new Set()}
        handleAddSymbolOverlay={() => {}}
        removeSymbolOverlay={() => {}}
      />
    </>
  );
}
