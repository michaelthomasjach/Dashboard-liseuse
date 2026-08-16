import { useRef, useState } from "react";
import { Modal } from "../../../primitives/Modal";
import { DropdownPanel } from "../../../primitives/DropdownPanel";
import { TextField } from "../../../forms/TextField";
import { SaveIcon, FolderIcon, CheckIcon, TrashIcon } from "../../../icons";
import type { ChartTemplate } from "../interfaces/ChartTemplate.interface";

export interface TemplateControlsProps {
  templates: ChartTemplate[];
  activeTemplateId: string | null;
  isDirty: boolean;
  onSave: (name?: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Save button + "saved templates" dropdown, right edge of the chart's own header — see
 *  `CandlestickChartProps.showTemplates`'s own doc for the exact save/load/dirty-guard rules
 *  this implements. Purely orchestration: every actual mutation (save/load/delete) is a call
 *  into `useChartTemplates` (passed in as the on* props above); this component only owns the
 *  transient UI state — which modal/dropdown is open, the name field, and a pending load id
 *  waiting on a save-or-discard decision. */
export function TemplateControls({ templates, activeTemplateId, isDirty, onSave, onLoad, onDelete }: TemplateControlsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownAnchorRef = useRef<HTMLButtonElement>(null);
  const [modal, setModal] = useState<"name" | "confirmDiscard" | null>(null);
  // Set only while `modal === "confirmDiscard"` (or the "name" modal it can hand off to, when
  // there's no active template to just overwrite) — which template the user actually clicked,
  // applied once they've decided whether to save the current one first.
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState("");
  // Briefly swaps the Save button's own icon to a checkmark — the only feedback an otherwise
  // silent "click Save, it just overwrites" action gets, same reasoning the symbol-search "+"
  // button (see onAddSymbolOverlay) turns into a checkmark once its own overlay is active.
  const [justSaved, setJustSaved] = useState(false);

  function flashSaved() {
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1200);
  }

  function closeModal() {
    setModal(null);
    setPendingLoadId(null);
  }

  function handleSaveClick() {
    if (activeTemplateId) {
      onSave();
      flashSaved();
      return;
    }
    setNameValue("");
    setModal("name");
  }

  function handleNameSubmit() {
    const trimmed = nameValue.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setModal(null);
    if (pendingLoadId) {
      onLoad(pendingLoadId);
      setPendingLoadId(null);
    } else {
      flashSaved();
    }
  }

  function handleRowClick(id: string) {
    setDropdownOpen(false);
    if (!isDirty) {
      onLoad(id);
      return;
    }
    setPendingLoadId(id);
    setModal("confirmDiscard");
  }

  // "Enregistrer et charger" from the discard-guard modal: an active template just gets
  // overwritten in place, same as the header Save button; with no active template yet there's
  // nothing to overwrite, so this hands off to the same name modal the header button would've
  // opened — `pendingLoadId` stays set, handleNameSubmit picks the load back up once it resolves.
  function handleConfirmSave() {
    if (activeTemplateId) {
      onSave();
      setModal(null);
      // `onSave`'s own state update hasn't landed yet in this synchronous handler (React batches
      // it) — calling `onLoad` right after would read `templates` as it was *before* the save,
      // stale-reloading whatever was last saved and undoing the very change `onSave` just made.
      // Harmless for a genuinely different pending template (its own entry wasn't touched by the
      // save either way) but actively wrong when re-confirming the *same* one that's already
      // active: there's nothing left to load anyway, since saving already brought the live layout
      // and the template back in sync.
      if (pendingLoadId && pendingLoadId !== activeTemplateId) {
        onLoad(pendingLoadId);
      }
      setPendingLoadId(null);
      return;
    }
    setNameValue("");
    setModal("name");
  }

  function handleConfirmDiscard() {
    setModal(null);
    if (pendingLoadId) {
      onLoad(pendingLoadId);
      setPendingLoadId(null);
    }
  }

  return (
    <>
      {/* `margin-left: auto` on this wrapper, not the individual buttons — .lq-chart__header is a
          plain packed-left flex row (no space-between/other push-right mechanism of its own), so
          this is what actually lands the pair at the bar's far right edge instead of just after
          whichever button happens to render last. */}
      <div className="lq-chart__header-templates">
        <button
          type="button"
          className="lq-chart__icon-button"
          onClick={handleSaveClick}
          aria-label={activeTemplateId ? "Enregistrer le modèle" : "Enregistrer comme nouveau modèle"}
          title={activeTemplateId ? "Enregistrer le modèle" : "Enregistrer comme nouveau modèle"}
        >
          {justSaved ? <CheckIcon size={14} /> : <SaveIcon size={14} />}
        </button>
        <button
          ref={dropdownAnchorRef}
          type="button"
          className={["lq-chart__icon-button", dropdownOpen && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
          onClick={() => setDropdownOpen((o) => !o)}
          aria-label="Modèles enregistrés"
          title="Modèles enregistrés"
        >
          <FolderIcon size={14} />
        </button>
      </div>
      <DropdownPanel
        open={dropdownOpen}
        onClose={() => setDropdownOpen(false)}
        anchorRef={dropdownAnchorRef}
        placement="bottom"
        header={
          <div className="lq-dropdown-panel__header-row">
            <span>Modèles enregistrés</span>
            <span className="lq-dropdown-panel__header-count">{templates.length}</span>
          </div>
        }
      >
        {templates.length === 0 ? (
          <p className="lq-chart__template-empty">Aucun modèle enregistré.</p>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className={["lq-chart__template-row", t.id === activeTemplateId && "lq-chart__template-row--active"].filter(Boolean).join(" ")}
            >
              <button type="button" className="lq-chart__template-row-name" onClick={() => handleRowClick(t.id)}>
                {t.id === activeTemplateId && <CheckIcon size={12} />}
                {t.name}
              </button>
              <button type="button" className="lq-chart__template-row-delete" onClick={() => onDelete(t.id)} aria-label={`Supprimer ${t.name}`}>
                <TrashIcon size={12} />
              </button>
            </div>
          ))
        )}
      </DropdownPanel>

      {modal === "name" && (
        <Modal
          open
          onClose={closeModal}
          title="Enregistrer le modèle"
          footer={
            <div className="lq-chart__edit-drawing-footer">
              <button type="button" className="lq-chart__reset-button" onClick={closeModal}>
                Annuler
              </button>
              <button type="button" className="lq-chart__confirm-button" onClick={handleNameSubmit} disabled={!nameValue.trim()}>
                Enregistrer
              </button>
            </div>
          }
        >
          <TextField
            label="Nom du modèle"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            placeholder="Ex. Analyse technique complète"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSubmit();
            }}
          />
        </Modal>
      )}

      {modal === "confirmDiscard" && (
        <Modal
          open
          onClose={closeModal}
          title="Modifications non enregistrées"
          footer={
            <div className="lq-chart__edit-drawing-footer">
              <button type="button" className="lq-chart__reset-button" onClick={handleConfirmDiscard}>
                Charger sans enregistrer
              </button>
              <button type="button" className="lq-chart__confirm-button" onClick={handleConfirmSave}>
                Enregistrer et charger
              </button>
            </div>
          }
        >
          <p className="lq-chart__template-confirm-text">
            La disposition actuelle des indicateurs/panneaux n'est pas enregistrée. L'enregistrer avant de charger l'autre modèle ?
          </p>
        </Modal>
      )}
    </>
  );
}
