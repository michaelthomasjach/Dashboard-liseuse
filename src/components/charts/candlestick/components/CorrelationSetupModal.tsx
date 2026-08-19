import { Modal } from "../../../primitives/Modal";
import { SymbolSearchModal } from "./SymbolSearchModal";
import { ChevronDownIcon, PencilIcon } from "../../../icons";
import type { SymbolSearchResult } from "../interfaces/SymbolSearchResult.interface";
import type { SymbolSearchCategory } from "../interfaces/SymbolSearchCategory.interface";

// Every field here is prefixed "correlation"/"Correlation" (rather than the generic open/onClose/
// symbolSearchOpen names AlertCreateModal/SymbolSearchModal already use) specifically because
// ChartModals.tsx spreads one flat, combined props object across every modal it bundles — a
// same-named field here would collide with (and silently steal state from) one of those, not just
// fail to compile. `symbolSearchResults` is the one deliberate exception: it's meant to be the
// exact same caller-supplied results list the main search already uses, not a second copy of it.
export interface CorrelationSetupModalProps {
  correlationSetupOpen: boolean;
  closeCorrelationSetup: () => void;
  correlationStagedSymbol: SymbolSearchResult | null;
  selectCorrelationSymbol: (result: SymbolSearchResult) => void;
  addingCorrelation: boolean;
  confirmCorrelationSetup: () => void;
  correlationSymbolSearchOpen: boolean;
  setCorrelationSymbolSearchOpen: (open: boolean) => void;
  correlationSymbolSearchQuery: string;
  setCorrelationSymbolSearchQuery: (query: string) => void;
  correlationSymbolSearchCategory: SymbolSearchCategory;
  setCorrelationSymbolSearchCategory: (category: SymbolSearchCategory) => void;
  symbolSearchResults: SymbolSearchResult[] | undefined;
}

/** TradingView's own "Confirm Inputs" pattern (reference image), for the one built-in indicator
 *  that can't just be added with catalog defaults — "Correlation" needs a second symbol's own
 *  price series first. The "Symbole" field looks like a plain `Select` trigger (same
 *  `lq-field__control lq-select__trigger` chrome) but opens the *full* symbol-search modal
 *  instead of a small options popover, matching the user's own "comme un dropdown, sauf que
 *  quand je clique dessus ça ouvre la modale" description — a second, independent
 *  `SymbolSearchModal` instance (its own open/query/category state — see useCorrelationSetup)
 *  stacks on top while this one stays open behind it. "Appliquer" only enables once a symbol has
 *  actually been picked. */
export function CorrelationSetupModal({
  correlationSetupOpen,
  closeCorrelationSetup,
  correlationStagedSymbol,
  selectCorrelationSymbol,
  addingCorrelation,
  confirmCorrelationSetup,
  correlationSymbolSearchOpen,
  setCorrelationSymbolSearchOpen,
  correlationSymbolSearchQuery,
  setCorrelationSymbolSearchQuery,
  correlationSymbolSearchCategory,
  setCorrelationSymbolSearchCategory,
  symbolSearchResults,
}: CorrelationSetupModalProps) {
  if (!correlationSetupOpen) return null;
  return (
    <>
      <Modal
        open
        onClose={closeCorrelationSetup}
        title="Coefficient de corrélation"
        footer={
          <div className="lq-chart__edit-drawing-footer">
            <button type="button" className="lq-chart__reset-button" onClick={closeCorrelationSetup}>
              Annuler
            </button>
            <button
              type="button"
              className="lq-chart__confirm-button"
              onClick={confirmCorrelationSetup}
              disabled={!correlationStagedSymbol || addingCorrelation}
            >
              Appliquer
            </button>
          </div>
        }
      >
        <div className="lq-field">
          <span className="lq-field__label">Symbole</span>
          <button type="button" className="lq-field__control lq-select__trigger" onClick={() => setCorrelationSymbolSearchOpen(true)}>
            <span className={correlationStagedSymbol ? "lq-select__value" : "lq-select__placeholder"}>
              {correlationStagedSymbol ? correlationStagedSymbol.ticker : "Sélectionner…"}
            </span>
            {correlationStagedSymbol ? <PencilIcon size={14} /> : <ChevronDownIcon size={16} className="lq-select__chevron" />}
          </button>
        </div>
      </Modal>
      <SymbolSearchModal
        title="Sélectionner un symbole"
        symbolSearchOpen={correlationSymbolSearchOpen}
        setSymbolSearchOpen={setCorrelationSymbolSearchOpen}
        symbolSearchQuery={correlationSymbolSearchQuery}
        setSymbolSearchQuery={setCorrelationSymbolSearchQuery}
        symbolSearchCategory={correlationSymbolSearchCategory}
        setSymbolSearchCategory={setCorrelationSymbolSearchCategory}
        symbolSearchResults={symbolSearchResults}
        onSymbolSelect={selectCorrelationSymbol}
        onAddSymbolOverlay={undefined}
        symbolOverlays={[]}
        addingOverlaySymbols={new Set()}
        handleAddSymbolOverlay={() => {}}
        removeSymbolOverlay={() => {}}
      />
    </>
  );
}
