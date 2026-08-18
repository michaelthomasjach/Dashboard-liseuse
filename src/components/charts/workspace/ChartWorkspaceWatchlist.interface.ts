import type { ReactNode } from "react";

/** One optional, toggleable value column in a workspace's own docked watchlist table (see
 *  `ChartWorkspaceWatchlist.columns`) — the ticker itself is always shown and isn't one of these. */
export interface ChartWorkspaceWatchlistColumn {
  id: string;
  /** Shown as this column's own header, and as its label in the "..." visibility toggle. */
  label: string;
}

/** One row (one symbol) in a workspace's own docked watchlist table. */
export interface ChartWorkspaceWatchlistRow {
  id: string;
  ticker: string;
  /** Rendered content per optional column (see `ChartWorkspaceWatchlist.columns`), keyed by
   *  column id — whatever the caller wants shown there for this row (a formatted price, a
   *  colored % change, …). A column with no entry here for a given row simply renders blank. */
  values: Record<string, ReactNode>;
}

/** One named list for the workspace's own docked watchlist tab (see `ChartWorkspaceProps.watchlists`). */
export interface ChartWorkspaceWatchlist {
  id: string;
  /** Shown as the panel's own clickable title while this list is active. */
  name: string;
  /** Optional value columns beyond the always-shown ticker (e.g. "Prix", "Variation") — visibility
   *  toggled via the panel's own "..." button, shared across every list (so the same selection
   *  carries over when switching lists) rather than tracked per list. */
  columns: ChartWorkspaceWatchlistColumn[];
  rows: ChartWorkspaceWatchlistRow[];
}
