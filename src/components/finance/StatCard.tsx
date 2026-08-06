import type { ReactNode } from "react";
import { Panel } from "../primitives/Panel";
import { PriceChangeTag } from "./PriceChangeTag";
import { Sparkline } from "../charts/Sparkline";
import "./StatCard.css";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Signed delta rendered as a `PriceChangeTag` under the value. */
  delta?: number;
  deltaFormat?: (absValue: number) => string;
  icon?: ReactNode;
  sparklineData?: number[];
  className?: string;
}

/** KPI tile: label, big value, optional delta and trend sparkline. */
export function StatCard({ label, value, delta, deltaFormat, icon, sparklineData, className }: StatCardProps) {
  return (
    <Panel className={["lq-stat-card", className].filter(Boolean).join(" ")}>
      <div className="lq-stat-card__row">
        <div className="lq-stat-card__main">
          <span className="lq-stat-card__label">{label}</span>
          <span className="lq-stat-card__value">{value}</span>
          {delta !== undefined && <PriceChangeTag value={delta} format={deltaFormat} className="lq-stat-card__delta" />}
        </div>
        {icon && <span className="lq-stat-card__icon">{icon}</span>}
      </div>
      {sparklineData && sparklineData.length > 1 && (
        <Sparkline data={sparklineData} width={120} height={32} area colorByTrend className="lq-stat-card__sparkline" />
      )}
    </Panel>
  );
}
