import type { ReactNode } from "react";
import { Panel } from "../primitives/Panel";
import { LevelGauge } from "../primitives/LevelGauge";
import "./EnergyWidget.css";

export interface EnergyMetricRow {
  id: string;
  icon?: ReactNode;
  label: string;
  value: string;
  /** Extra muted lines under the label, e.g. ["442 W à l'instant", "Hier · 20,9 kWh"]. */
  details?: string[];
  /** 0-100. When set, a LevelGauge is rendered instead of the plain `value` text (e.g. battery %). */
  gaugePercent?: number;
}

export interface EnergyWidgetProps {
  title?: ReactNode;
  meta?: ReactNode;
  rows: EnergyMetricRow[];
  className?: string;
}

/** "ÉNERGIE" panel: mixed metric rows (solar production, network, cost) plus a battery gauge row. */
export function EnergyWidget({ title = "Énergie", meta, rows, className }: EnergyWidgetProps) {
  return (
    <Panel title={title} meta={meta} className={className}>
      {rows.map((row) => (
        <div key={row.id} className="lq-energy-row">
          {row.icon && <span className="lq-energy-row__icon">{row.icon}</span>}
          <div className="lq-energy-row__body">
            <div className="lq-energy-row__head">
              <span className="lq-energy-row__label">{row.label}</span>
              {row.gaugePercent === undefined && <span className="lq-energy-row__value">{row.value}</span>}
            </div>
            {row.gaugePercent !== undefined && (
              <div className="lq-energy-row__gauge">
                <LevelGauge value={row.gaugePercent} segments={12} label={`${row.gaugePercent} %`} ariaLabel={row.label} />
              </div>
            )}
            {row.details && row.details.length > 0 && (
              <div className="lq-energy-row__details">
                {row.details.map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </Panel>
  );
}
