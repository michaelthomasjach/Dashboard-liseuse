import type { RefObject, Dispatch, SetStateAction } from "react";
import { Popover } from "../../../forms/Popover";
import {
  ChevronDownIcon,
  ActivityIcon,
  CalendarIcon,
  MaximizeIcon,
  MinimizeIcon,
} from "../../../icons";
import type { ChartDisplayMode } from "../interfaces/ChartDisplayMode.interface";
import type { TimeframeEntry } from "../interfaces/TimeframeEntry.interface";
import type { ChartTemplate } from "../interfaces/ChartTemplate.interface";
import { CHART_DISPLAY_MODES, type ChartDisplayModeDef } from "../chartModes";
import { isTimeframeGroup } from "../timeframes";
import { TemplateControls } from "./TemplateControls";

export interface ChartHeaderProps {
  dims: { width: number | undefined };
  timeframes: TimeframeEntry[] | undefined;
  timeframe: string | undefined;
  onTimeframeChange: ((value: string) => void) | undefined;
  tfOpen: boolean;
  setTfOpen: Dispatch<SetStateAction<boolean>>;
  tfAnchorRef: RefObject<HTMLButtonElement>;
  currentTimeframeLabel: string | null;
  displayModeAnchorRef: RefObject<HTMLButtonElement>;
  displayModeOpen: boolean;
  setDisplayModeOpen: Dispatch<SetStateAction<boolean>>;
  currentModeEntry: ChartDisplayModeDef;
  chartDisplayMode: ChartDisplayMode;
  setChartDisplayMode: (mode: ChartDisplayMode) => void;
  onChartDisplayModeChange: ((mode: ChartDisplayMode) => void) | undefined;
  showIndicators: boolean;
  setIndicatorSearchQuery: (query: string) => void;
  setIndicatorPickerOpen: (open: boolean) => void;
  zoomable: boolean;
  isZoomed: boolean;
  resetZoom: () => void;
  seasonality: boolean;
  setSeasonalityOpen: (open: boolean) => void;
  fullscreenToggle: boolean;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
  showTemplates: boolean;
  templates: ChartTemplate[];
  activeTemplateId: string | null;
  templatesDirty: boolean;
  onSaveTemplate: (name?: string) => void;
  onSaveTemplateAs: (name: string) => void;
  onLoadTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
}

/** The chart's main (non-seasonality) header: timeframe picker, display-mode picker, "add
 *  indicator" button, "reset zoom" button, the seasonality-mode entry point, and the fullscreen
 *  toggle — everything gated by `showHeader && !seasonalityOpen` in CandlestickChart itself.
 *  Purely presentational; every interaction is a callback prop. */
export function ChartHeader({
  dims,
  timeframes,
  timeframe,
  onTimeframeChange,
  tfOpen,
  setTfOpen,
  tfAnchorRef,
  currentTimeframeLabel,
  displayModeAnchorRef,
  displayModeOpen,
  setDisplayModeOpen,
  currentModeEntry,
  chartDisplayMode,
  setChartDisplayMode,
  onChartDisplayModeChange,
  showIndicators,
  setIndicatorSearchQuery,
  setIndicatorPickerOpen,
  zoomable,
  isZoomed,
  resetZoom,
  seasonality,
  setSeasonalityOpen,
  fullscreenToggle,
  toggleFullscreen,
  isFullscreen,
  showTemplates,
  templates,
  activeTemplateId,
  templatesDirty,
  onSaveTemplate,
  onSaveTemplateAs,
  onLoadTemplate,
  onDeleteTemplate,
}: ChartHeaderProps) {
  return (
    <div className="lq-chart__header" style={{ width: dims.width }}>
      {timeframes && timeframes.length > 0 && (
        <>
          <button ref={tfAnchorRef} type="button" className="lq-chart__timeframe-trigger" onClick={() => setTfOpen((o) => !o)}>
            {currentTimeframeLabel ?? "Intervalle"}
            <ChevronDownIcon size={12} />
          </button>
          <Popover open={tfOpen} onClose={() => setTfOpen(() => false)} anchorRef={tfAnchorRef} placement="bottom">
            <div className="lq-chart__timeframe-menu">
              {timeframes.map((entry) =>
                isTimeframeGroup(entry) ? (
                  <div key={entry.group} className="lq-chart__timeframe-group">
                    <div className="lq-chart__timeframe-group-label">{entry.group}</div>
                    {entry.options.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={["lq-chart__timeframe-option", opt.value === timeframe && "lq-chart__timeframe-option--selected"]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => {
                          onTimeframeChange?.(opt.value);
                          setTfOpen(() => false);
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    key={entry.value}
                    type="button"
                    className={["lq-chart__timeframe-option", entry.value === timeframe && "lq-chart__timeframe-option--selected"]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      onTimeframeChange?.(entry.value);
                      setTfOpen(() => false);
                    }}
                  >
                    {entry.label}
                  </button>
                )
              )}
            </div>
          </Popover>
        </>
      )}
      {/* No dedicated prop gates this (unlike `showIndicators`/`drawingTools`) — it rides on
          `showHeader` same as zoomable/fullscreenToggle, so it's on by default and only
          disappears in the edge case where a caller has already opted out of every other
          header feature too. */}
      <button
        ref={displayModeAnchorRef}
        type="button"
        className="lq-chart__icon-button"
        onClick={() => setDisplayModeOpen((o) => !o)}
        aria-label="Mode d'affichage"
        title="Mode d'affichage"
      >
        <currentModeEntry.icon size={14} />
      </button>
      <Popover open={displayModeOpen} onClose={() => setDisplayModeOpen(() => false)} anchorRef={displayModeAnchorRef} placement="bottom">
        <div className="lq-chart__display-mode-menu">
          {CHART_DISPLAY_MODES.map((entry) => (
            <button
              key={entry.mode}
              type="button"
              className={["lq-chart__display-mode-option", entry.mode === chartDisplayMode && "lq-chart__display-mode-option--selected"]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                setChartDisplayMode(entry.mode);
                onChartDisplayModeChange?.(entry.mode);
                setDisplayModeOpen(() => false);
              }}
            >
              <entry.icon size={15} />
              {entry.label}
            </button>
          ))}
        </div>
      </Popover>
      {showIndicators && (
        <button
          type="button"
          className="lq-chart__icon-button"
          onClick={() => {
            setIndicatorSearchQuery("");
            setIndicatorPickerOpen(true);
          }}
          aria-label="Ajouter un indicateur"
        >
          <ActivityIcon size={14} />
        </button>
      )}
      {zoomable && isZoomed && (
        <button type="button" className="lq-chart__reset-button" onClick={resetZoom}>
          Réinitialiser le zoom
        </button>
      )}
      {seasonality && (
        <button
          type="button"
          className="lq-chart__icon-button"
          onClick={() => setSeasonalityOpen(true)}
          aria-label="Saisonnalité"
          title="Saisonnalité : performance moyenne par période, agrégée sur l'historique"
        >
          <CalendarIcon size={14} />
        </button>
      )}
      {fullscreenToggle && (
        <button
          type="button"
          className="lq-chart__icon-button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
        >
          {isFullscreen ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />}
        </button>
      )}
      {showTemplates && (
        <TemplateControls
          templates={templates}
          activeTemplateId={activeTemplateId}
          isDirty={templatesDirty}
          onSave={onSaveTemplate}
          onSaveAs={onSaveTemplateAs}
          onLoad={onLoadTemplate}
          onDelete={onDeleteTemplate}
        />
      )}
    </div>
  );
}
