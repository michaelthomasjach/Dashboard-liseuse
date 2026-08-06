import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Visually pressed/active, e.g. the currently selected white-balance preset. */
  selected?: boolean;
  /** Full-width block button, e.g. the "Fermer" action at the bottom of a modal. */
  block?: boolean;
}

/** Bordered rectangular button used for discrete choices (Allumer/Éteindre, Blanc chaud…). */
export function Button({ children, selected, block, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={["lq-button", selected && "lq-button--selected", block && "lq-button--block", className]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={selected}
      {...rest}
    >
      {children}
    </button>
  );
}
