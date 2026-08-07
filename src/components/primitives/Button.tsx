import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Visually pressed/active — a discrete choice (e.g. the selected white-balance preset) or a toggle's "on" state. */
  selected?: boolean;
  /** Full-width block button, e.g. the "Fermer" action at the bottom of a modal. */
  block?: boolean;
  /** Icon shown alongside the label; nudges slightly on hover. */
  icon?: ReactNode;
  /** Position of `icon` (and `selectedIcon`) relative to the label. Default "leading". */
  iconPosition?: "leading" | "trailing";
  /** Swaps to this icon instead of `icon` while `selected` is true, popping in — e.g. a filled vs
   *  outline star for a "favorite" toggle, or a check replacing a plus. */
  selectedIcon?: ReactNode;
}

/** Bordered rectangular button used for discrete choices (Allumer/Éteindre, Blanc chaud…) and, with
 *  `selected`/`selectedIcon`, as a toggle button (different tone + an animated state icon once pressed). */
export function Button({ children, selected, block, icon, iconPosition = "leading", selectedIcon, className, ...rest }: ButtonProps) {
  const resolvedIcon = selected && selectedIcon ? selectedIcon : icon;
  const iconEl = resolvedIcon && (
    <span key={selected ? "on" : "off"} className={["lq-button__icon", selected && selectedIcon && "lq-button__icon--pop"].filter(Boolean).join(" ")}>
      {resolvedIcon}
    </span>
  );

  return (
    <button
      type="button"
      className={["lq-button", selected && "lq-button--selected", block && "lq-button--block", className]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={selected}
      {...rest}
    >
      {iconPosition === "leading" && iconEl}
      {children}
      {iconPosition === "trailing" && iconEl}
    </button>
  );
}
