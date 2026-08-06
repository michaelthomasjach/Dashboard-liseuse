import type { ReactNode } from "react";
import "./FieldGroup.css";

export interface FieldGroupProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Labelled row of controls, e.g. "Température" above a row of white-balance buttons. */
export function FieldGroup({ label, children, className }: FieldGroupProps) {
  return (
    <div className={["lq-field-group", className].filter(Boolean).join(" ")}>
      <span className="lq-field-group__label">{label}</span>
      <div className="lq-field-group__row">{children}</div>
    </div>
  );
}
