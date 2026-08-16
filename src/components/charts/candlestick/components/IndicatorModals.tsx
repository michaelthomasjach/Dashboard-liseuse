import { Modal } from "../../../primitives/Modal";
import { Checkbox } from "../../../forms/Checkbox";
import { TextField } from "../../../forms/TextField";
import { NumberField } from "../../../forms/NumberField";
import { SearchIcon, SettingsIcon, TrashIcon, OverlayBadgeIcon, PaneBadgeIcon } from "../../../icons";
import type { TrendLineDrawing } from "../interfaces/TrendLineDrawing.interface";
import type { Indicator } from "../interfaces/Indicator.interface";
import type { CustomIndicatorDef } from "../interfaces/CustomIndicatorDef.interface";
import { INDICATOR_CATALOG, type IndicatorCatalogEntry, indicatorCatalogEntry, indicatorLabel, defaultIndicatorColor } from "../indicators";
import { drawingToolMeta, drawingLabel } from "../drawingCatalog";

export interface IndicatorModalsProps {
  indicatorPickerOpen: boolean;
  setIndicatorPickerOpen: (open: boolean) => void;
  indicatorSearchQuery: string;
  setIndicatorSearchQuery: (query: string) => void;
  showVolume: boolean;
  setVolumePaneState: (state: "expanded" | "collapsed" | "hidden") => void;
  addIndicator: (entry: IndicatorCatalogEntry) => void;
  /** Caller-supplied indicators (see CandlestickChartProps.customIndicators) — merged into the
   *  picker alongside the built-in catalog, grouped by their own `section`. */
  customIndicators: CustomIndicatorDef[] | undefined;
  addCustomIndicator: (def: CustomIndicatorDef) => void;
  indicatorsManagerOpen: boolean;
  setIndicatorsManagerOpen: (open: boolean) => void;
  indicators: Indicator[];
  ownPaneIndicators: Indicator[];
  volumeVisible: boolean;
  visibleDrawings: TrendLineDrawing[];
  setEditingId: (id: string | null) => void;
  setDraft: (d: TrendLineDrawing) => void;
  setEditModalTab: (tab: "coords" | "text" | "style") => void;
  commitDrawings: (next: TrendLineDrawing[]) => void;
  drawings: TrendLineDrawing[];
  openIndicatorSettings: (id: string) => void;
  removeIndicator: (id: string) => void;
  setVolumeSettingsOpen: (open: boolean) => void;
  editingIndicatorId: string | null;
  indicatorDraft: Indicator | null;
  setIndicatorDraft: (d: Indicator) => void;
  closeIndicatorSettings: () => void;
  deleteEditingIndicator: () => void;
  saveIndicatorSettings: () => void;
}

/** The three indicator-related modals: "Ajouter un indicateur" (search + catalog, plus a Volume
 *  entry since it's just as valid an "add a pane" choice), "Dessins et indicateurs" (a flat
 *  manage-everything list — drawings, price-overlay indicators, own-pane indicators/volume, each
 *  with the same settings/delete actions already reachable from the chart itself), and the
 *  per-indicator settings modal (period/stdDev/MACD periods/color, whichever apply to that
 *  indicator's own kind). */
export function IndicatorModals({
  indicatorPickerOpen,
  setIndicatorPickerOpen,
  indicatorSearchQuery,
  setIndicatorSearchQuery,
  showVolume,
  setVolumePaneState,
  addIndicator,
  customIndicators,
  addCustomIndicator,
  indicatorsManagerOpen,
  setIndicatorsManagerOpen,
  indicators,
  ownPaneIndicators,
  volumeVisible,
  visibleDrawings,
  setEditingId,
  setDraft,
  setEditModalTab,
  commitDrawings,
  drawings,
  openIndicatorSettings,
  removeIndicator,
  setVolumeSettingsOpen,
  editingIndicatorId,
  indicatorDraft,
  setIndicatorDraft,
  closeIndicatorSettings,
  deleteEditingIndicator,
  saveIndicatorSettings,
}: IndicatorModalsProps) {
  return (
    <>
      {indicatorPickerOpen && (
        <Modal open onClose={() => setIndicatorPickerOpen(false)} title="Ajouter un indicateur">
          <TextField
            placeholder="Rechercher un indicateur…"
            value={indicatorSearchQuery}
            onChange={(e) => setIndicatorSearchQuery(e.target.value)}
            leadingIcon={<SearchIcon size={14} />}
            autoFocus
          />
          <div className="lq-chart__indicator-picker">
            {(() => {
              const query = indicatorSearchQuery.trim().toLowerCase();
              const showVolumeOption = showVolume && "volume".includes(query);
              // Built-in and custom entries merged into one tagged list before grouping, so a
              // custom indicator's own `section` slots it in alongside the built-in categories
              // exactly like any other — each entry keeps a reference to whichever of
              // IndicatorCatalogEntry/CustomIndicatorDef it actually came from, since only that
              // original shape knows what `onClick` needs to add it (addIndicator vs.
              // addCustomIndicator take different argument types).
              type PickerOption = { key: string; label: string; category: string; pane: "price" | "own"; onSelect: () => void };
              const builtinOptions: PickerOption[] = INDICATOR_CATALOG.filter(
                (entry) => entry.label.toLowerCase().includes(query) || entry.shortLabel.toLowerCase().includes(query)
              ).map((entry) => ({ key: entry.kind, label: entry.label, category: entry.category, pane: entry.pane, onSelect: () => addIndicator(entry) }));
              const customOptions: PickerOption[] = (customIndicators ?? [])
                .filter((def) => def.label.toLowerCase().includes(query) || (def.shortLabel ?? "").toLowerCase().includes(query))
                .map((def) => ({
                  key: def.id,
                  label: def.label,
                  category: def.section,
                  pane: def.type === "overlay" ? "price" : "own",
                  onSelect: () => addCustomIndicator(def),
                }));
              const allOptions = [...builtinOptions, ...customOptions];
              const groups: { category: string; options: PickerOption[] }[] = [];
              for (const option of allOptions) {
                const group = groups.find((g) => g.category === option.category);
                if (group) group.options.push(option);
                else groups.push({ category: option.category, options: [option] });
              }
              if (!showVolumeOption && groups.length === 0) {
                return <p className="lq-chart__indicator-picker-empty">Aucun indicateur ne correspond à « {indicatorSearchQuery} ».</p>;
              }
              return (
                <>
                  {/* Volume isn't part of INDICATOR_CATALOG — it's the caller's own data (not
                      something computed), driven by `showVolume`/the volume pane's own header
                      rather than an `Indicator` entry — but it's still just as valid an "add a
                      pane" choice as RSI/CHOP/MACD, so it gets a slot here too, re-showing the
                      pane if it was previously collapsed or removed. */}
                  {showVolumeOption && (
                    <div className="lq-chart__indicator-picker-group">
                      <div className="lq-chart__indicator-picker-group-label">Volume</div>
                      <button
                        type="button"
                        className="lq-chart__indicator-picker-option"
                        onClick={() => setVolumePaneState("expanded")}
                      >
                        <span className="lq-chart__indicator-picker-name">Volume</span>
                        <span className="lq-chart__indicators-manager-badge" title="Panneau séparé">
                          <PaneBadgeIcon size={13} />
                        </span>
                      </button>
                    </div>
                  )}
                  {groups.map((group) => (
                    <div className="lq-chart__indicator-picker-group" key={group.category}>
                      <div className="lq-chart__indicator-picker-group-label">{group.category}</div>
                      {group.options.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className="lq-chart__indicator-picker-option"
                          onClick={option.onSelect}
                        >
                          <span className="lq-chart__indicator-picker-name">{option.label}</span>
                          <span
                            className="lq-chart__indicators-manager-badge"
                            title={option.pane === "price" ? "Superposé au prix" : "Panneau séparé"}
                          >
                            {option.pane === "price" ? <OverlayBadgeIcon size={13} /> : <PaneBadgeIcon size={13} />}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </Modal>
      )}

      {indicatorsManagerOpen && (
        <Modal open onClose={() => setIndicatorsManagerOpen(false)} title="Dessins et indicateurs" footer={null}>
          <div className="lq-chart__indicators-manager">
            {(() => {
              const overlay = indicators.filter((ind) => indicatorCatalogEntry(ind).pane === "price");
              const own = ownPaneIndicators;
              if (overlay.length === 0 && own.length === 0 && !volumeVisible && visibleDrawings.length === 0) {
                return <p className="lq-chart__indicator-picker-empty">Rien à gérer pour l'instant — aucun dessin ni indicateur actif.</p>;
              }
              // A row's own two actions mirror exactly what's already reachable from the chart
              // itself (the legend's roue crantée/corbeille for an overlay, a pane header's for an
              // "own" one, Suppr/double-clic for a drawing) — this list is a second way to reach
              // the same actions, not a new set of them, so nothing here can do anything the
              // chart's own hover/pane-header UI can't.
              const row = (label: string, badge: React.ReactNode, badgeTitle: string, onSettings: (() => void) | null, onDelete: () => void, key: string) => (
                <div className="lq-chart__indicators-manager-row" key={key}>
                  <span className="lq-chart__indicators-manager-badge" title={badgeTitle}>
                    {badge}
                  </span>
                  <span className="lq-chart__indicators-manager-name">{label}</span>
                  <span className="lq-chart__indicators-manager-actions">
                    {onSettings && (
                      <button type="button" className="lq-chart__pane-header-action" onClick={onSettings} aria-label={`Paramètres ${label}`}>
                        <SettingsIcon size={13} />
                      </button>
                    )}
                    <button type="button" className="lq-chart__pane-header-action" onClick={onDelete} aria-label={`Supprimer ${label}`}>
                      <TrashIcon size={13} />
                    </button>
                  </span>
                </div>
              );
              return (
                <>
                  {visibleDrawings.length > 0 && (
                    <div className="lq-chart__indicator-picker-group">
                      <div className="lq-chart__indicator-picker-group-label">Dessins</div>
                      {visibleDrawings.map((dr) => {
                        const ToolIcon = drawingToolMeta(dr).icon;
                        return row(
                          drawingLabel(dr),
                          <ToolIcon size={13} />,
                          drawingToolMeta(dr).label,
                          () => {
                            setEditingId(dr.id);
                            setDraft(dr);
                            setEditModalTab("coords");
                          },
                          () => commitDrawings(drawings.filter((d) => d.id !== dr.id)),
                          dr.id
                        );
                      })}
                    </div>
                  )}
                  {overlay.length > 0 && (
                    <div className="lq-chart__indicator-picker-group">
                      <div className="lq-chart__indicator-picker-group-label">Superposés au prix</div>
                      {overlay.map((ind) =>
                        row(
                          indicatorLabel(ind),
                          <OverlayBadgeIcon size={13} />,
                          "Superposé au prix",
                          () => openIndicatorSettings(ind.id),
                          () => removeIndicator(ind.id),
                          ind.id
                        )
                      )}
                    </div>
                  )}
                  {(own.length > 0 || volumeVisible) && (
                    <div className="lq-chart__indicator-picker-group">
                      <div className="lq-chart__indicator-picker-group-label">En sous-panneau</div>
                      {volumeVisible &&
                        row("Volume", <PaneBadgeIcon size={13} />, "Panneau séparé", () => setVolumeSettingsOpen(true), () => setVolumePaneState("hidden"), "volume")}
                      {own.map((ind) =>
                        row(
                          indicatorLabel(ind),
                          <PaneBadgeIcon size={13} />,
                          "Panneau séparé",
                          () => openIndicatorSettings(ind.id),
                          () => removeIndicator(ind.id),
                          ind.id
                        )
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </Modal>
      )}

      {editingIndicatorId && indicatorDraft && (
        <Modal
          open
          onClose={closeIndicatorSettings}
          title={`Paramètres — ${indicatorLabel(indicatorDraft)}`}
          footer={
            <div className="lq-chart__edit-drawing-footer">
              <button type="button" className="lq-chart__reset-button" onClick={deleteEditingIndicator}>
                Supprimer
              </button>
              <button type="button" className="lq-chart__confirm-button" onClick={saveIndicatorSettings}>
                Enregistrer
              </button>
            </div>
          }
        >
          {indicatorCatalogEntry(indicatorDraft).hasPeriod && (
            <NumberField
              label="Période"
              min={1}
              max={500}
              step={1}
              value={indicatorDraft.period}
              onChange={(v) => setIndicatorDraft({ ...indicatorDraft, period: v === "" ? indicatorDraft.period : v })}
            />
          )}
          {indicatorCatalogEntry(indicatorDraft).hasStdDev && (
            <NumberField
              label="Écart-type (bandes)"
              min={0.5}
              max={5}
              step={0.1}
              value={indicatorDraft.stdDev ?? 2}
              onChange={(v) => setIndicatorDraft({ ...indicatorDraft, stdDev: v === "" ? indicatorDraft.stdDev : v })}
            />
          )}
          {indicatorDraft.kind === "macd" && (
            <div className="lq-chart__edit-drawing-row">
              <NumberField
                label="Rapide"
                min={1}
                max={200}
                step={1}
                value={indicatorDraft.fastPeriod ?? 12}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, fastPeriod: v === "" ? indicatorDraft.fastPeriod : v })}
              />
              <NumberField
                label="Lent"
                min={1}
                max={400}
                step={1}
                value={indicatorDraft.slowPeriod ?? 26}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, slowPeriod: v === "" ? indicatorDraft.slowPeriod : v })}
              />
              <NumberField
                label="Signal"
                min={1}
                max={200}
                step={1}
                value={indicatorDraft.signalPeriod ?? 9}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, signalPeriod: v === "" ? indicatorDraft.signalPeriod : v })}
              />
            </div>
          )}
          {indicatorDraft.kind === "zigzag" && (
            <>
              <NumberField
                label="Déviation (%)"
                min={0.5}
                max={50}
                step={0.5}
                value={indicatorDraft.zigzagDeviation ?? 5}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, zigzagDeviation: v === "" ? indicatorDraft.zigzagDeviation : v })}
              />
              <Checkbox
                label="Afficher les labels HH / HL / LH / LL"
                checked={indicatorDraft.zigzagShowLabels ?? true}
                onChange={(checked) => setIndicatorDraft({ ...indicatorDraft, zigzagShowLabels: checked })}
              />
            </>
          )}
          {indicatorDraft.kind === "supertrend" && (
            <NumberField
              label="Multiplicateur (× ATR)"
              min={0.5}
              max={10}
              step={0.5}
              value={indicatorDraft.supertrendMultiplier ?? 3}
              onChange={(v) => setIndicatorDraft({ ...indicatorDraft, supertrendMultiplier: v === "" ? indicatorDraft.supertrendMultiplier : v })}
            />
          )}
          {indicatorDraft.kind === "parabolicSar" && (
            <div className="lq-chart__edit-drawing-row">
              <NumberField
                label="Pas"
                min={0.01}
                max={1}
                step={0.01}
                value={indicatorDraft.sarStep ?? 0.02}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, sarStep: v === "" ? indicatorDraft.sarStep : v })}
              />
              <NumberField
                label="Max"
                min={0.05}
                max={1}
                step={0.05}
                value={indicatorDraft.sarMax ?? 0.2}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, sarMax: v === "" ? indicatorDraft.sarMax : v })}
              />
            </div>
          )}
          {indicatorDraft.kind === "gaps" && (
            <NumberField
              label="Écart minimum (%)"
              min={0}
              max={20}
              step={0.1}
              value={indicatorDraft.gapsMinPercent ?? 0.1}
              onChange={(v) => setIndicatorDraft({ ...indicatorDraft, gapsMinPercent: v === "" ? indicatorDraft.gapsMinPercent : v })}
            />
          )}
          {indicatorDraft.kind === "ichimoku" && (
            <div className="lq-chart__edit-drawing-row">
              <NumberField
                label="Conversion"
                min={1}
                max={100}
                step={1}
                value={indicatorDraft.ichimokuConversionPeriod ?? 9}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, ichimokuConversionPeriod: v === "" ? indicatorDraft.ichimokuConversionPeriod : v })}
              />
              <NumberField
                label="Base"
                min={1}
                max={200}
                step={1}
                value={indicatorDraft.ichimokuBasePeriod ?? 26}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, ichimokuBasePeriod: v === "" ? indicatorDraft.ichimokuBasePeriod : v })}
              />
              <NumberField
                label="Span B"
                min={1}
                max={300}
                step={1}
                value={indicatorDraft.ichimokuSpanPeriod ?? 52}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, ichimokuSpanPeriod: v === "" ? indicatorDraft.ichimokuSpanPeriod : v })}
              />
              <NumberField
                label="Déplacement"
                min={1}
                max={200}
                step={1}
                value={indicatorDraft.ichimokuDisplacement ?? 26}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, ichimokuDisplacement: v === "" ? indicatorDraft.ichimokuDisplacement : v })}
              />
            </div>
          )}
          {/* Supertrend always uses the chart's own up/down colors (so its trend flips read
              consistently with candle coloring) and Parabolic SAR colors each dot by which side
              of price it's on — neither reads `color` at all, so the picker would be a dead
              control for them. */}
          {indicatorDraft.kind !== "supertrend" && indicatorDraft.kind !== "parabolicSar" && (
            <div className="lq-field">
              <label className="lq-field__label">Couleur</label>
              <input
                type="color"
                className="lq-chart__color-input"
                value={indicatorDraft.color ?? defaultIndicatorColor(indicators.findIndex((i) => i.id === indicatorDraft.id))}
                onChange={(e) => setIndicatorDraft({ ...indicatorDraft, color: e.target.value })}
              />
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
