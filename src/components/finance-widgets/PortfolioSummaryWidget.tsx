import type { ReactNode } from "react";
import { Panel } from "../primitives/Panel";
import { PriceChangeTag } from "../finance/PriceChangeTag";
import { LineAreaChart, type ChartPoint } from "../charts/LineAreaChart";
import "./PortfolioSummaryWidget.css";

export interface PortfolioSummaryWidgetProps {
  title?: ReactNode;
  meta?: ReactNode;
  value: ReactNode;
  /** Signed percent change, shown as a `PriceChangeTag` next to `value`. */
  delta?: number;
  /** History used to draw the area chart below the headline figure. */
  series: ChartPoint[];
  formatY?: (value: number) => string;
  formatX?: (value: Date | number) => string;
  xType?: "time" | "linear";
  className?: string;
}

/** Ready-to-drop portfolio overview: a big value + delta over a zoomable history chart. */
export function PortfolioSummaryWidget({
  title = "Valeur du portefeuille",
  meta,
  value,
  delta,
  series,
  formatY,
  formatX,
  xType = "time",
  className,
}: PortfolioSummaryWidgetProps) {
  return (
    <Panel title={title} meta={meta} className={className}>
      <div className="lq-portfolio-summary__headline">
        <span className="lq-portfolio-summary__value">{value}</span>
        {delta !== undefined && <PriceChangeTag value={delta} />}
      </div>
      <LineAreaChart
        series={[{ id: "value", data: series }]}
        area
        xType={xType}
        formatY={formatY}
        formatX={formatX}
        showLegend={false}
        height={160}
        margin={{ top: 8, right: 8, bottom: 24, left: 48 }}
      />
    </Panel>
  );
}
