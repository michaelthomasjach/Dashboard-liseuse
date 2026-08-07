import type { ReactNode } from "react";
import { CloseIcon } from "../icons";
import "./Tag.css";

export interface TagProps {
  children: ReactNode;
  /** Shows a close (×) button; omit to render a plain, non-removable tag. */
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}

/** Small removable chip — used by `TagInput`, also handy standalone (active filters, labels…). */
export function Tag({ children, onRemove, removeLabel = "Retirer", className }: TagProps) {
  return (
    <span className={["lq-tag", className].filter(Boolean).join(" ")}>
      {children}
      {onRemove && (
        <button
          type="button"
          className="lq-tag__remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={removeLabel}
        >
          <CloseIcon size={11} />
        </button>
      )}
    </span>
  );
}
