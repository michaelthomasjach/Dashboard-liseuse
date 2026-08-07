import type { ReactNode } from "react";
import { CheckIcon } from "../icons";
import "../primitives/Button.css";

export interface CheckboxButtonProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** A checkbox that looks and feels like a button: checked → active tone + a checkmark
 *  that pops in; unchecked → plain button, no icon. Good for filter chips ("Actions",
 *  "Obligations"…) where a traditional checkbox reads as too form-y. Uses proper
 *  `role="checkbox"` semantics rather than a toggle button's `aria-pressed`. */
export function CheckboxButton({ checked, onChange, children, disabled, className }: CheckboxButtonProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      className={["lq-button", checked && "lq-button--selected", className].filter(Boolean).join(" ")}
      onClick={() => onChange?.(!checked)}
    >
      {checked && (
        <span key="checked" className="lq-button__icon lq-button__icon--pop">
          <CheckIcon size={16} />
        </span>
      )}
      {children}
    </button>
  );
}
