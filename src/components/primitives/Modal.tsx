import { useEffect, type ReactNode } from "react";
import "./Modal.css";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  /** Defaults to a full-width "Fermer" button; pass null to omit, or your own footer. */
  footer?: ReactNode | null;
  closeLabel?: string;
  /** `"default"` is the small centered dialog; `"fullscreen"` takes up nearly the whole
   *  viewport (a thin margin all round) — for a detail view or editor that needs real room
   *  instead of a small popup. Default "default". */
  size?: "default" | "fullscreen";
}

/** Centered dialog used for a row's detail view (e.g. the light color/temperature picker).
 *  Use `size="fullscreen"` for content that needs the whole screen instead. */
export function Modal({ open, onClose, title, children, footer, closeLabel = "Fermer", size = "default" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const resolvedFooter =
    footer === undefined ? (
      <button type="button" className="lq-modal__close-button" onClick={onClose}>
        {closeLabel}
      </button>
    ) : (
      footer
    );

  return (
    <div className="lq-modal__overlay" onClick={onClose}>
      <div
        className={["lq-modal", size === "fullscreen" && "lq-modal--fullscreen"].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <header className="lq-modal__header">
            <h2 className="lq-modal__title">{title}</h2>
          </header>
        )}
        <div className="lq-modal__body">{children}</div>
        {resolvedFooter && <footer className="lq-modal__footer">{resolvedFooter}</footer>}
      </div>
    </div>
  );
}
