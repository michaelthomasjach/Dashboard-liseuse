import type { ReactNode } from "react";
import "./Badge.css";

export type BadgeTone = "neutral" | "up" | "down" | "warning" | "info";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

/** Small status pill — order/position state, KYC status, alert severity… */
export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return <span className={["lq-badge", `lq-badge--${tone}`, className].filter(Boolean).join(" ")}>{children}</span>;
}
