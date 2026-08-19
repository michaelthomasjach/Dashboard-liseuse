import { useState } from "react";
import type { SymbolSearchResult } from "../interfaces/SymbolSearchResult.interface";
import type { SymbolSearchCategory } from "../interfaces/SymbolSearchCategory.interface";
import type { OverlayDataPoint } from "../interfaces/TrendLineDrawing.interface";
import type { Indicator } from "../interfaces/Indicator.interface";
import { indicatorCatalogEntry } from "../indicatorCatalog";
import { useSymbolSearchState } from "./useSymbolSearchState";

export interface UseCorrelationSetupArgs {
  appendIndicator: (indicator: Omit<Indicator, "id">) => void;
  onAddSymbolOverlay: ((result: SymbolSearchResult) => OverlayDataPoint[] | Promise<OverlayDataPoint[]>) | undefined;
  onSymbolSearchChange: ((query: string, category: SymbolSearchCategory) => void) | undefined;
}

/** The "Confirm Inputs"-style setup `CorrelationSetupModal` needs before a "correlation" indicator
 *  can actually be added — picking it from the catalog picker opens this (see
 *  `IndicatorModals.tsx`'s own `onSelect` special-case) instead of adding immediately with
 *  defaults the way every other indicator kind does, since a correlation coefficient has nothing
 *  to compute without a second symbol's own price series first (fetched via the same
 *  `onAddSymbolOverlay` the "symbolOverlay" drawing type already uses). Its own nested
 *  symbol-search modal reuses `useSymbolSearchState` wholesale — a second, fully independent
 *  instance of exactly the same open/query/category wiring the main search already has — rather
 *  than re-deriving that same state here. */
export function useCorrelationSetup({ appendIndicator, onAddSymbolOverlay, onSymbolSearchChange }: UseCorrelationSetupArgs) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [stagedSymbol, setStagedSymbol] = useState<SymbolSearchResult | null>(null);
  const [adding, setAdding] = useState(false);
  const symbolSearch = useSymbolSearchState({ defaultFavoriteSymbolIds: undefined, onFavoriteSymbolIdsChange: undefined, onSymbolSearchChange });

  function openSetup() {
    setStagedSymbol(null);
    setSetupOpen(true);
  }

  function closeSetup() {
    setSetupOpen(false);
    symbolSearch.setSymbolSearchOpen(false);
    setStagedSymbol(null);
  }

  // The nested SymbolSearchModal already closes itself right after calling this (see its own
  // onSymbolSelect wiring) — nothing more to do here than stage the pick.
  function selectSymbol(result: SymbolSearchResult) {
    setStagedSymbol(result);
  }

  async function confirm() {
    if (!stagedSymbol || !onAddSymbolOverlay || adding) return;
    setAdding(true);
    try {
      const data = await onAddSymbolOverlay(stagedSymbol);
      if (!data || data.length === 0) return;
      const sorted = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
      appendIndicator({
        kind: "correlation",
        period: indicatorCatalogEntry("correlation").defaultPeriod,
        correlationSymbol: stagedSymbol.ticker,
        correlationSymbolName: stagedSymbol.name,
        correlationData: sorted,
      });
      closeSetup();
    } finally {
      setAdding(false);
    }
  }

  // Returned under names matching CorrelationSetupModalProps directly (not this hook's own
  // shorter internal names) so CandlestickChart.tsx can spread this straight into <ChartModals>
  // without a manual rename at the call site — see that props interface's own doc for why the
  // longer, "correlation"-prefixed names matter here specifically (ChartModals spreads one flat
  // props object across every modal it bundles).
  return {
    correlationSetupOpen: setupOpen,
    openCorrelationSetup: openSetup,
    closeCorrelationSetup: closeSetup,
    correlationStagedSymbol: stagedSymbol,
    selectCorrelationSymbol: selectSymbol,
    addingCorrelation: adding,
    confirmCorrelationSetup: confirm,
    correlationSymbolSearchOpen: symbolSearch.symbolSearchOpen,
    setCorrelationSymbolSearchOpen: symbolSearch.setSymbolSearchOpen,
    correlationSymbolSearchQuery: symbolSearch.symbolSearchQuery,
    setCorrelationSymbolSearchQuery: symbolSearch.setSymbolSearchQuery,
    correlationSymbolSearchCategory: symbolSearch.symbolSearchCategory,
    setCorrelationSymbolSearchCategory: symbolSearch.setSymbolSearchCategory,
  };
}
