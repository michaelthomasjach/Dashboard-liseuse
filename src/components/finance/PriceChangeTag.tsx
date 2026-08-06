import { ArrowDownIcon, ArrowUpIcon } from "../icons";
import "./PriceChangeTag.css";

export interface PriceChangeTagProps {
  /** Signed value, e.g. 2.4 or -1.1. */
  value: number;
  format?: (absValue: number) => string;
  showIcon?: boolean;
  className?: string;
}

/** Signed delta with an up/down arrow — price change, P&L, allocation drift. */
export function PriceChangeTag({ value, format, showIcon = true, className }: PriceChangeTagProps) {
  const up = value >= 0;
  const fmt = format ?? ((v: number) => `${v.toFixed(2)} %`);
  return (
    <span className={["lq-price-change", up ? "lq-price-change--up" : "lq-price-change--down", className].filter(Boolean).join(" ")}>
      {showIcon && (up ? <ArrowUpIcon size={14} /> : <ArrowDownIcon size={14} />)}
      {up ? "+" : "−"}
      {fmt(Math.abs(value))}
    </span>
  );
}
