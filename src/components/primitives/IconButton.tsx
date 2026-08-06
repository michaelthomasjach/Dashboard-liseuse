import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./IconButton.css";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  ariaLabel: string;
  size?: "sm" | "md";
}

/** Square bordered button holding a single icon (transport controls, close, settings…). */
export function IconButton({ icon, ariaLabel, size = "md", className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={["lq-icon-button", `lq-icon-button--${size}`, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      {...rest}
    >
      {icon}
    </button>
  );
}
