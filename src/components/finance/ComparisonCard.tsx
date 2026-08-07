import type { ReactNode } from "react";
import { Panel } from "../primitives/Panel";
import { PriceChangeTag } from "./PriceChangeTag";
import "./ComparisonCard.css";

export interface ComparisonCardFigure {
  label: string;
  value: ReactNode;
  /** Signed percent change, shown as a `PriceChangeTag`. */
  delta?: number;
}

export interface ComparisonCardProps {
  title?: ReactNode;
  meta?: ReactNode;
  primary: ComparisonCardFigure;
  secondary: ComparisonCardFigure;
  className?: string;
}

/** Two figures side by side with a divider — a portfolio vs. its benchmark, this period vs. last. */
export function ComparisonCard({ title, meta, primary, secondary, className }: ComparisonCardProps) {
  return (
    <Panel title={title} meta={meta} className={className}>
      <div className="lq-comparison-card">
        {[primary, secondary].map((figure, i) => (
          <div key={i} className="lq-comparison-card__figure">
            <span className="lq-comparison-card__label">{figure.label}</span>
            <span className="lq-comparison-card__value">{figure.value}</span>
            {figure.delta !== undefined && <PriceChangeTag value={figure.delta} />}
          </div>
        ))}
      </div>
    </Panel>
  );
}
