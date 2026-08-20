import { useMemo } from "react";
import { Modal } from "../../primitives/Modal";
import { DataTable } from "../../finance/DataTable";
import type { DataTableColumn } from "../../finance/DataTable";
import { DonutChart } from "../DonutChart";
import type { DonutDatum } from "../DonutChart";
import { defaultSymbolLogoColor } from "../candlestick/symbolSearchCatalog";
import type { ChartWorkspaceWatchlist, ChartWorkspaceWatchlistRow } from "./ChartWorkspaceWatchlist.interface";

const UNASSIGNED_TYPE = "Autre";

// One count per distinct value of `pick(row)` — used for both donuts below, just fed a different
// picker (assetType across every row, sector across whichever rows have one). Rows the picker
// returns undefined/empty for are left out entirely (see callers for which case that is).
function countBy(rows: ChartWorkspaceWatchlistRow[], pick: (row: ChartWorkspaceWatchlistRow) => string | undefined): DonutDatum[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts, ([label, value]) => ({ id: label, label, value }));
}

export interface WatchlistExposureModalProps {
  open: boolean;
  onClose: () => void;
  /** The list to break down — `undefined` while none is active yet (mirrors `activeWatchlist`'s
   *  own possible-undefined state in WatchlistPanel), in which case this renders nothing. */
  watchlist: ChartWorkspaceWatchlist | undefined;
}

/** "Concentration/exposure" detail view for one watchlist — opened via the small pie-chart icon
 *  next to the list's own name (see WatchlistPanel). A table of every symbol in the list
 *  (ungrouped rows plus every section's own, flattened together — the breakdown itself doesn't
 *  care which section a row happens to sit in), followed by two donuts: one grouping every row by
 *  its own `assetType` (an "Autre" bucket catches rows with none, so nothing silently vanishes),
 *  one grouping whichever rows carry a `sector` (typically just the equities — nothing hardcodes
 *  "this type means stock," a row simply lands in the second donut the moment it has a sector).
 *  Both `assetType`/`sector` are entirely caller-supplied (see that field's own doc) — this modal
 *  only ever aggregates whatever's already on the rows it's given, never fetches or infers either. */
export function WatchlistExposureModal({ open, onClose, watchlist }: WatchlistExposureModalProps) {
  const rows = useMemo(() => {
    if (!watchlist) return [];
    const sectionRows = watchlist.sections?.flatMap((s) => s.rows) ?? [];
    return [...watchlist.rows, ...sectionRows];
  }, [watchlist]);

  const typeData = useMemo(() => countBy(rows, (r) => r.assetType ?? UNASSIGNED_TYPE), [rows]);
  const sectorData = useMemo(() => countBy(rows, (r) => r.sector), [rows]);

  if (!open || !watchlist) return null;

  const tableColumns: DataTableColumn<ChartWorkspaceWatchlistRow>[] = [
    {
      id: "symbol",
      header: "Symbole",
      sortValue: (r) => r.ticker,
      accessor: (r) => (
        <span className="lq-watchlist-exposure__symbol">
          <span
            className="lq-chart-workspace__watchlist-logo"
            style={r.logoUrl ? undefined : { backgroundColor: r.logoColor ?? defaultSymbolLogoColor(rows.indexOf(r)) }}
          >
            {r.logoUrl ? <img src={r.logoUrl} alt="" /> : r.ticker.slice(0, 2).toUpperCase()}
          </span>
          {r.ticker}
        </span>
      ),
    },
    ...watchlist.columns.map((c) => ({ id: c.id, header: c.label, accessor: (r: ChartWorkspaceWatchlistRow) => r.values[c.id] })),
    { id: "assetType", header: "Type", sortValue: (r) => r.assetType ?? "", accessor: (r) => r.assetType ?? "—" },
    { id: "sector", header: "Secteur", sortValue: (r) => r.sector ?? "", accessor: (r) => r.sector ?? "—" },
  ];

  return (
    <Modal open onClose={onClose} title={`Répartition — ${watchlist.name}`} size="fullscreen">
      <div className="lq-watchlist-exposure">
        <DataTable columns={tableColumns} rows={rows} rowKey={(r) => r.id} emptyMessage="Cette liste ne contient aucun symbole" />
        {rows.length > 0 && (
          <>
            <h3 className="lq-watchlist-exposure__section-title">Exposition</h3>
            <div className="lq-watchlist-exposure__charts">
              <DonutChart data={typeData} centerValue={typeData.length} centerCaption="Types de symboles" />
              {sectorData.length > 0 && <DonutChart data={sectorData} centerValue={sectorData.length} centerCaption="Secteurs" />}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
