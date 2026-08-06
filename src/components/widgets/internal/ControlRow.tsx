import { PanelRow } from "../../primitives/Panel";
import { Toggle } from "../../primitives/Toggle";
import { LevelGauge } from "../../primitives/LevelGauge";

export interface ControlListEntry {
  id: string;
  label: string;
  on: boolean;
  /** 0-100. Omit for controls with no intensity (a simple on/off row still shows the toggle only). */
  level?: number;
  /** Trailing status text, e.g. "ouvert", "fermé", "80 %". */
  statusText?: string;
  onToggle?: (on: boolean) => void;
  /** Makes the row clickable (e.g. to open a detail modal), independent of the toggle. */
  onClick?: () => void;
  disabled?: boolean;
}

export interface ControlListRowProps {
  entry: ControlListEntry;
  gaugeSegments?: number;
}

/** Shared row shape for widgets built around "toggle + level gauge + status" (shutters, lights…). */
export function ControlListRow({ entry, gaugeSegments = 10 }: ControlListRowProps) {
  return (
    <PanelRow label={entry.label} value={entry.statusText} onClick={entry.onClick}>
      <Toggle
        checked={entry.on}
        onChange={entry.onToggle}
        ariaLabel={entry.label}
        disabled={entry.disabled}
      />
      {entry.level !== undefined && (
        <LevelGauge value={entry.level} segments={gaugeSegments} label={null} ariaLabel={`Niveau ${entry.label}`} />
      )}
    </PanelRow>
  );
}
