import type { ReactNode } from "react";
import { Panel, PanelRow } from "../primitives/Panel";

export interface MetricListRow {
  id: string;
  label: string;
  value: ReactNode;
}

export interface MetricListWidgetProps {
  title: ReactNode;
  meta?: ReactNode;
  rows: MetricListRow[];
  className?: string;
}

/** Generic label/value list panel — the "INTÉRIEUR" room-temperature block in the reference design. */
export function MetricListWidget({ title, meta, rows, className }: MetricListWidgetProps) {
  return (
    <Panel title={title} meta={meta} className={className}>
      {rows.map((row) => (
        <PanelRow key={row.id} label={row.label} value={row.value} />
      ))}
    </Panel>
  );
}
