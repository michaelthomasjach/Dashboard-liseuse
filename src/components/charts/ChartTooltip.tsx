import type { ReactNode } from "react";
import "./ChartTooltip.css";

export interface ChartTooltipProps {
  x: number;
  y: number;
  visible: boolean;
  children: ReactNode;
  /** Which side of (x, y) the box is drawn on. Default "auto" flips near the container edges. */
  align?: "left" | "right";
}

/** Floating box positioned in pixel-space over a chart's plot area (absolute, parent must be `position: relative`). */
export function ChartTooltip({ x, y, visible, children, align = "right" }: ChartTooltipProps) {
  if (!visible) return null;
  return (
    <div
      className={["lq-chart-tooltip", align === "left" && "lq-chart-tooltip--left"].filter(Boolean).join(" ")}
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      {children}
    </div>
  );
}
