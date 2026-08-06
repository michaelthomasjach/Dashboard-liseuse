import type { ReactNode } from "react";
import "./Panel.css";

export interface PanelProps {
  /** Section title, e.g. "VOLETS". Rendered upper-cased via CSS, keep the string itself normal case. */
  title?: ReactNode;
  /** Right-aligned meta, e.g. "2 ouverts", "6 pièces". */
  meta?: ReactNode;
  /** Optional footer, rendered below the divider (e.g. a "Fermer" button). */
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Removes the outer border/background so the panel blends into a parent grid cell. */
  bare?: boolean;
}

/** The bordered card used to group a widget's rows (Intérieur, Volets, Lumières, Énergie…). */
export function Panel({ title, meta, footer, children, className, bare }: PanelProps) {
  return (
    <section className={["lq-panel", bare && "lq-panel--bare", className].filter(Boolean).join(" ")}>
      {(title || meta) && (
        <header className="lq-panel__header">
          {title && <h3 className="lq-panel__title">{title}</h3>}
          {meta && <span className="lq-panel__meta">{meta}</span>}
        </header>
      )}
      <div className="lq-panel__body">{children}</div>
      {footer && <footer className="lq-panel__footer">{footer}</footer>}
    </section>
  );
}

export interface PanelRowProps {
  label: ReactNode;
  children?: ReactNode;
  /** Value/detail shown at the trailing edge of the row (e.g. a temperature). */
  value?: ReactNode;
  className?: string;
  onClick?: () => void;
}

/** A single labelled row inside a Panel; lays out label / controls / trailing value. */
export function PanelRow({ label, children, value, className, onClick }: PanelRowProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      className={["lq-panel-row", interactive && "lq-panel-row--interactive", className]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <span className="lq-panel-row__label">{label}</span>
      {children && <span className="lq-panel-row__controls">{children}</span>}
      {value !== undefined && <span className="lq-panel-row__value">{value}</span>}
    </div>
  );
}
