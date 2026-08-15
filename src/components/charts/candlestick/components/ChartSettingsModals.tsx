import type { Dispatch, SetStateAction } from "react";
import { Modal } from "../../../primitives/Modal";
import { Checkbox } from "../../../forms/Checkbox";

export interface ChartSettingsModalsProps {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  upColorOverride: string | undefined;
  setUpColorOverride: (color: string | undefined) => void;
  downColorOverride: string | undefined;
  setDownColorOverride: (color: string | undefined) => void;
  yAutoScalingState: boolean;
  setYAutoScalingState: (checked: boolean) => void;
  onYAutoScalingChange: ((value: boolean) => void) | undefined;
  eventKinds: string[];
  hiddenEventKinds: Set<string>;
  setHiddenEventKinds: Dispatch<SetStateAction<Set<string>>>;
  volumeSettingsOpen: boolean;
  setVolumeSettingsOpen: (open: boolean) => void;
  volumeUpColorOverride: string | undefined;
  setVolumeUpColorOverride: (color: string | undefined) => void;
  volumeDownColorOverride: string | undefined;
  setVolumeDownColorOverride: (color: string | undefined) => void;
}

/** The two small "chart settings" modals — up/down candle colors + YAutoScaling toggle + per-kind
 *  event visibility (double-click the symbol/chart-type label to open), and its volume-pane
 *  sibling (independent up/down bar colors, falling back to the candle colors above until
 *  overridden). */
export function ChartSettingsModals({
  settingsOpen,
  setSettingsOpen,
  upColorOverride,
  setUpColorOverride,
  downColorOverride,
  setDownColorOverride,
  yAutoScalingState,
  setYAutoScalingState,
  onYAutoScalingChange,
  eventKinds,
  hiddenEventKinds,
  setHiddenEventKinds,
  volumeSettingsOpen,
  setVolumeSettingsOpen,
  volumeUpColorOverride,
  setVolumeUpColorOverride,
  volumeDownColorOverride,
  setVolumeDownColorOverride,
}: ChartSettingsModalsProps) {
  return (
    <>
      {settingsOpen && (
        <Modal open onClose={() => setSettingsOpen(false)} title="Paramètres du graphique">
          <div className="lq-chart__edit-drawing-row">
            <div className="lq-field">
              <label className="lq-field__label">Bougies haussières</label>
              <input
                type="color"
                className="lq-chart__color-input"
                value={upColorOverride ?? "#26a69a"}
                onChange={(e) => setUpColorOverride(e.target.value)}
              />
            </div>
            <div className="lq-field">
              <label className="lq-field__label">Bougies baissières</label>
              <input
                type="color"
                className="lq-chart__color-input"
                value={downColorOverride ?? "#ef5350"}
                onChange={(e) => setDownColorOverride(e.target.value)}
              />
            </div>
          </div>
          {(upColorOverride || downColorOverride) && (
            <button
              type="button"
              className="lq-chart__inline-reset"
              onClick={() => {
                setUpColorOverride(undefined);
                setDownColorOverride(undefined);
              }}
            >
              Réinitialiser aux couleurs du thème
            </button>
          )}
          <Checkbox
            checked={yAutoScalingState}
            onChange={(checked) => {
              setYAutoScalingState(checked);
              onYAutoScalingChange?.(checked);
            }}
            label="Rescale automatique de l'axe des prix au zoom"
          />
          {eventKinds.length > 0 && (
            <div className="lq-chart__settings-events">
              <span className="lq-field__label">Événements</span>
              {eventKinds.map((kind) => (
                <Checkbox
                  key={kind}
                  checked={!hiddenEventKinds.has(kind)}
                  onChange={() =>
                    setHiddenEventKinds((prev) => {
                      const next = new Set(prev);
                      if (next.has(kind)) next.delete(kind);
                      else next.add(kind);
                      return next;
                    })
                  }
                  label={kind}
                />
              ))}
            </div>
          )}
        </Modal>
      )}

      {volumeSettingsOpen && (
        <Modal open onClose={() => setVolumeSettingsOpen(false)} title="Paramètres du panneau Volume" footer={null}>
          <div className="lq-chart__edit-drawing-row">
            <div className="lq-field">
              <label className="lq-field__label">Barres haussières</label>
              <input
                type="color"
                className="lq-chart__color-input"
                value={volumeUpColorOverride ?? upColorOverride ?? "#26a69a"}
                onChange={(e) => setVolumeUpColorOverride(e.target.value)}
              />
            </div>
            <div className="lq-field">
              <label className="lq-field__label">Barres baissières</label>
              <input
                type="color"
                className="lq-chart__color-input"
                value={volumeDownColorOverride ?? downColorOverride ?? "#ef5350"}
                onChange={(e) => setVolumeDownColorOverride(e.target.value)}
              />
            </div>
          </div>
          {(volumeUpColorOverride || volumeDownColorOverride) && (
            <button
              type="button"
              className="lq-chart__inline-reset"
              onClick={() => {
                setVolumeUpColorOverride(undefined);
                setVolumeDownColorOverride(undefined);
              }}
            >
              Réinitialiser aux couleurs des bougies
            </button>
          )}
        </Modal>
      )}
    </>
  );
}
