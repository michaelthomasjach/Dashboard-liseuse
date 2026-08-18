import { useRef, useState } from "react";
import { Popover } from "../../forms/Popover";
import { Checkbox } from "../../forms/Checkbox";
import { TextField } from "../../forms/TextField";
import { Modal } from "../../primitives/Modal";
import { SymbolSearchModal } from "../candlestick/components/SymbolSearchModal";
import { useSymbolSearchState } from "../candlestick/hooks/useSymbolSearchState";
import { defaultSymbolLogoColor } from "../candlestick/symbolSearchCatalog";
import { useWatchlistRowDrag, watchlistDropZoneProps } from "./useWatchlistRowDrag";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, MoreHorizontalIcon, GripIcon, TrashIcon } from "../../icons";
import type { SymbolSearchCategory } from "../candlestick/interfaces/SymbolSearchCategory.interface";
import type { SymbolSearchResult } from "../candlestick/interfaces/SymbolSearchResult.interface";
import type { ChartWorkspaceWatchlist, ChartWorkspaceWatchlistRow, ChartWorkspaceWatchlistSection } from "./ChartWorkspaceWatchlist.interface";

// Matches the CSS default `.lq-chart-workspace__watchlist-cell` itself falls back to — the JS
// value is what actually drives width from here on (see startColumnResize below), the CSS one is
// only ever read before a caller's own render has passed anything through inline styles yet.
const DEFAULT_COLUMN_WIDTH = 68;
const MIN_COLUMN_WIDTH = 40;

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
  onCreateWatchlist: ((name: string) => void) | undefined;
  onCreateSection: ((watchlistId: string, name: string) => void) | undefined;
  onRemoveRow: ((watchlistId: string, rowId: string, sectionId: string | null) => void) | undefined;
  onMoveRow: ((watchlistId: string, rowId: string, fromSectionId: string | null, toSectionId: string | null) => void) | undefined;
  onRemoveSection: ((watchlistId: string, sectionId: string) => void) | undefined;
}

/**
 * The docked panel's own "watchlist" tab body (see `ChartWorkspace.tsx`'s own `activeTab`) — the
 * name+caret header (opens a dropdown to switch among `watchlists`, or create a new one), the
 * "+"/"…" action pair (add a symbol via the same `SymbolSearchModal` shell `CandlestickChart`
 * uses, toggle which optional columns show), and the table itself: an ungrouped row list plus any
 * named `sections` (collapsible, drag-and-drop between them via each row's own grip handle — see
 * `useWatchlistRowDrag`). Kept as its own file/component rather than inlined in
 * `ChartWorkspace.tsx` — enough of its own state (three popovers/modals, the add-symbol modal's
 * search state, column widths, section collapse) to read as a distinct unit, same "extract when
 * there's real internal complexity" call this library already makes for `ChartHeader`/
 * `ChartSidePanel`/etc.
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
  onCreateWatchlist,
  onCreateSection,
  onRemoveRow,
  onMoveRow,
  onRemoveSection,
}: WatchlistPanelProps) {
  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId) ?? watchlists[0];
  const [watchlistMenuOpen, setWatchlistMenuOpen] = useState(false);
  const watchlistTriggerRef = useRef<HTMLButtonElement>(null);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const columnsTriggerRef = useRef<HTMLButtonElement>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(new Set());
  // Which of the two "enter a name" modals is open, if either — a single piece of state (not two
  // separate booleans) since they're mutually exclusive and share one <NameModal/> render below.
  const [nameModal, setNameModal] = useState<"list" | "section" | null>(null);
  // The section a delete was just requested for, while it still needs confirming — only set when
  // that section actually has rows in it (see confirmRemoveSection below); an empty section is
  // removed immediately with no modal, since there's nothing a confirmation would be protecting.
  const [confirmDeleteSection, setConfirmDeleteSection] = useState<ChartWorkspaceWatchlistSection | null>(null);
  const { draggingRowId, dropTargetSectionId, startDrag } = useWatchlistRowDrag({
    onMove: activeWatchlist
      ? ({ rowId, fromSectionId, toSectionId }) => onMoveRow?.(activeWatchlist.id, rowId, fromSectionId, toSectionId)
      : undefined,
  });
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

  function columnWidth(id: string) {
    return columnWidths[id] ?? DEFAULT_COLUMN_WIDTH;
  }

  // A column the user hasn't dragged yet stays flexible (see .lq-chart-workspace__watchlist-cell's
  // own default `flex: 1 1 <width>`) so removing another column via the "…" checklist actually
  // frees up space for it (and the ticker) to grow into, not just a narrower row overall — no
  // inline style at all lets that CSS default win. Once dragged, it's pinned to an exact pixel
  // width (`flex: 0 0 <width>`) instead, same as a deliberately-resized column in any real
  // spreadsheet/table stays exactly that size regardless of what else changes around it.
  function columnFlexStyle(id: string): React.CSSProperties {
    const width = columnWidths[id];
    return width === undefined ? {} : { flex: `0 0 ${width}px` };
  }

  // Same window-pointermove-listener pattern useSidePanel's own startResize uses (see its own
  // comment) — a plain drag delta from the column's own width at drag-start.
  function startColumnResize(columnId: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startClientX = e.clientX;
    const startWidth = columnWidth(columnId);
    const onMove = (ev: PointerEvent) => {
      const next = Math.max(MIN_COLUMN_WIDTH, startWidth + (ev.clientX - startClientX));
      setColumnWidths((prev) => ({ ...prev, [columnId]: next }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function toggleSectionCollapsed(id: string) {
    setCollapsedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!activeWatchlist) return null;
  const visibleColumns = activeWatchlist.columns.filter((c) => visibleColumnIds.has(c.id));

  // Only asks for confirmation when deleting the section would also delete something — an empty
  // one is removed on the spot.
  function requestRemoveSection(section: ChartWorkspaceWatchlistSection) {
    if (section.rows.length > 0) setConfirmDeleteSection(section);
    else onRemoveSection?.(activeWatchlist.id, section.id);
  }

  function renderRow(row: ChartWorkspaceWatchlistRow, sectionId: string | null, index: number) {
    return (
      <div
        key={row.id}
        className={["lq-chart-workspace__watchlist-row", draggingRowId === row.id && "lq-chart-workspace__watchlist-row--dragging"]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          className="lq-chart-workspace__watchlist-grip"
          onPointerDown={() => startDrag(row.id, sectionId)}
          aria-label={`Déplacer ${row.ticker}`}
          title="Glisser pour déplacer"
        >
          <GripIcon size={12} />
        </button>
        <button type="button" className="lq-chart-workspace__watchlist-row-main" onClick={() => onRowClick?.(row, activeWatchlist.id)}>
          <span
            className="lq-chart-workspace__watchlist-logo"
            style={row.logoUrl ? undefined : { backgroundColor: row.logoColor ?? defaultSymbolLogoColor(index) }}
          >
            {row.logoUrl ? <img src={row.logoUrl} alt="" /> : row.ticker.slice(0, 2).toUpperCase()}
          </span>
          <span className="lq-chart-workspace__watchlist-ticker">{row.ticker}</span>
          {visibleColumns.map((c) => (
            <span key={c.id} className="lq-chart-workspace__watchlist-cell" style={columnFlexStyle(c.id)}>
              {row.values[c.id]}
            </span>
          ))}
        </button>
        {onRemoveRow && (
          <button
            type="button"
            className="lq-chart-workspace__watchlist-delete"
            onClick={() => onRemoveRow(activeWatchlist.id, row.id, sectionId)}
            aria-label={`Supprimer ${row.ticker}`}
            title="Supprimer"
          >
            <TrashIcon size={12} />
          </button>
        )}
      </div>
    );
  }

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
            {onCreateWatchlist && (
              <>
                <div className="lq-chart__tool-menu-divider" />
                <button
                  type="button"
                  className="lq-chart__tool-menu-option"
                  onClick={() => {
                    setWatchlistMenuOpen(false);
                    setNameModal("list");
                  }}
                >
                  <PlusIcon size={12} />
                  Nouvelle liste
                </button>
              </>
            )}
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

      {/* Same grip-spacer/delete-spacer shape as a real row (see renderRow) — not just the
          ticker/cells alone — so every column label lines up exactly with the real values below
          despite the header having no actual grip/delete buttons of its own to reserve that space
          otherwise. No logo spacer, unlike a real row's own leading logo: "Symbole" labels the
          *whole* identity column (logo + ticker together), so it starts flush with the logo's own
          left edge — the leftmost thing that column actually shows — rather than indented past it
          to align with the ticker text specifically. */}
      <div className="lq-chart-workspace__watchlist-row lq-chart-workspace__watchlist-row--header">
        <span className="lq-chart-workspace__watchlist-grip lq-chart-workspace__watchlist-grip--spacer" />
        <span className="lq-chart-workspace__watchlist-row-main">
          <span className="lq-chart-workspace__watchlist-ticker">Symbole</span>
          {visibleColumns.map((c) => (
            <span key={c.id} className="lq-chart-workspace__watchlist-cell" style={columnFlexStyle(c.id)}>
              {c.label}
              <span
                className="lq-chart-workspace__watchlist-col-resize"
                onPointerDown={(e) => startColumnResize(c.id, e)}
                role="separator"
                aria-orientation="vertical"
                aria-label={`Redimensionner la colonne ${c.label}`}
              />
            </span>
          ))}
        </span>
        <span className="lq-chart-workspace__watchlist-delete lq-chart-workspace__watchlist-delete--spacer" />
      </div>

      <div
        className={["lq-chart-workspace__watchlist-group", dropTargetSectionId === null && "lq-chart-workspace__watchlist-group--drop-target"]
          .filter(Boolean)
          .join(" ")}
        {...watchlistDropZoneProps(null)}
      >
        {activeWatchlist.rows.map((row, i) => renderRow(row, null, i))}
      </div>

      {activeWatchlist.sections?.map((section) => {
        const collapsed = collapsedSectionIds.has(section.id);
        return (
          <div key={section.id}>
            <div
              className={[
                "lq-chart-workspace__watchlist-section-header",
                dropTargetSectionId === section.id && "lq-chart-workspace__watchlist-group--drop-target",
              ]
                .filter(Boolean)
                .join(" ")}
              {...watchlistDropZoneProps(section.id)}
            >
              <button type="button" className="lq-chart-workspace__watchlist-section-toggle" onClick={() => toggleSectionCollapsed(section.id)}>
                {collapsed ? <ChevronRightIcon size={12} /> : <ChevronDownIcon size={12} />}
                {section.name}
              </button>
              {onRemoveSection && (
                <button
                  type="button"
                  className="lq-chart-workspace__watchlist-delete"
                  onClick={() => requestRemoveSection(section)}
                  aria-label={`Supprimer la section ${section.name}`}
                  title="Supprimer la section"
                >
                  <TrashIcon size={12} />
                </button>
              )}
            </div>
            {!collapsed && (
              <div
                className={[
                  "lq-chart-workspace__watchlist-group",
                  dropTargetSectionId === section.id && "lq-chart-workspace__watchlist-group--drop-target",
                ]
                  .filter(Boolean)
                  .join(" ")}
                {...watchlistDropZoneProps(section.id)}
              >
                {section.rows.map((row, i) => renderRow(row, section.id, i))}
              </div>
            )}
          </div>
        );
      })}

      {onCreateSection && (
        <button type="button" className="lq-chart-workspace__watchlist-add-section" onClick={() => setNameModal("section")}>
          <PlusIcon size={12} />
          Nouvelle section
        </button>
      )}

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

      {nameModal && (
        <NameModal
          title={nameModal === "list" ? "Nouvelle liste" : "Nouvelle section"}
          placeholder={nameModal === "list" ? "Ma nouvelle liste" : "Ma nouvelle section"}
          onClose={() => setNameModal(null)}
          onSubmit={(name) => (nameModal === "list" ? onCreateWatchlist?.(name) : onCreateSection?.(activeWatchlist.id, name))}
        />
      )}

      {confirmDeleteSection && (
        <Modal
          open
          onClose={() => setConfirmDeleteSection(null)}
          title="Supprimer la section ?"
          footer={
            <div className="lq-chart__edit-drawing-footer">
              <button type="button" className="lq-chart__reset-button" onClick={() => setConfirmDeleteSection(null)}>
                Annuler
              </button>
              <button
                type="button"
                className="lq-chart__confirm-button"
                onClick={() => {
                  onRemoveSection?.(activeWatchlist.id, confirmDeleteSection.id);
                  setConfirmDeleteSection(null);
                }}
              >
                Supprimer
              </button>
            </div>
          }
        >
          <p className="lq-chart__indicator-picker-empty">
            La section « {confirmDeleteSection.name} » contient {confirmDeleteSection.rows.length} symbole
            {confirmDeleteSection.rows.length > 1 ? "s" : ""}. Les supprimer aussi ?
          </p>
        </Modal>
      )}
    </>
  );
}

/** Shared "enter a name, Créer/Annuler" shell for both `onCreateWatchlist` and `onCreateSection`
 *  above — same `.lq-chart__edit-drawing-footer`/`.lq-chart__reset-button`/`.lq-chart__confirm-
 *  button` recipe `TemplateControls`' own "save as" modal already uses for the identical shape
 *  (enter a name, confirm or cancel). */
function NameModal({ title, placeholder, onSubmit, onClose }: { title: string; placeholder: string; onSubmit: (name: string) => void; onClose: () => void }) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <div className="lq-chart__edit-drawing-footer">
          <button type="button" className="lq-chart__reset-button" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="lq-chart__confirm-button" onClick={submit} disabled={!value.trim()}>
            Créer
          </button>
        </div>
      }
    >
      <TextField
        label="Nom"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
    </Modal>
  );
}
