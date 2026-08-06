import type { CSSProperties, ReactNode } from "react";
import "./DashboardGrid.css";

export interface DashboardGridProps {
  /** CSS grid-template-columns value. Default matches the reference layout: a wide left column + two side columns. */
  columns?: string;
  gap?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** CSS-grid shell for arranging widgets into a dashboard page. */
export function DashboardGrid({ columns = "2fr 1.3fr 1.3fr", gap, children, className, style }: DashboardGridProps) {
  return (
    <div
      className={["lq-dashboard-grid", className].filter(Boolean).join(" ")}
      style={{ ...style, gridTemplateColumns: columns, ...(gap ? { gap } : {}) }}
    >
      {children}
    </div>
  );
}

export interface DashboardGridItemProps {
  colSpan?: number;
  rowSpan?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** A cell inside `DashboardGrid` that can span multiple columns/rows. */
export function DashboardGridItem({ colSpan, rowSpan, children, className, style }: DashboardGridItemProps) {
  return (
    <div
      className={["lq-dashboard-grid__item", className].filter(Boolean).join(" ")}
      style={{
        ...style,
        ...(colSpan ? { gridColumn: `span ${colSpan}` } : {}),
        ...(rowSpan ? { gridRow: `span ${rowSpan}` } : {}),
      }}
    >
      {children}
    </div>
  );
}
