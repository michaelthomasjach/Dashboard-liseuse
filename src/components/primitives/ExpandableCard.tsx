import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "../icons";
import "./ExpandableCard.css";

export interface ExpandableCardProps {
  title: ReactNode;
  meta?: ReactNode;
  /** Always-visible teaser content shown above the collapsible body. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

/** A `Panel` that expands/collapses vertically — a card with a "show more" toggle. */
export function ExpandableCard({ title, meta, summary, defaultOpen = false, open, onOpenChange, children, className }: ExpandableCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;

  function toggle() {
    const next = !isOpen;
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }

  return (
    <section className={["lq-expandable-card", className].filter(Boolean).join(" ")}>
      <button type="button" className="lq-expandable-card__header" onClick={toggle} aria-expanded={isOpen}>
        <span className="lq-expandable-card__heading">
          <span className="lq-expandable-card__title">{title}</span>
          {meta && <span className="lq-expandable-card__meta">{meta}</span>}
        </span>
        <ChevronDownIcon size={18} className={isOpen ? "lq-expandable-card__chevron lq-expandable-card__chevron--open" : "lq-expandable-card__chevron"} />
      </button>

      {summary && <div className="lq-expandable-card__summary">{summary}</div>}

      <div className={isOpen ? "lq-expandable-card__collapse lq-expandable-card__collapse--open" : "lq-expandable-card__collapse"}>
        <div className="lq-expandable-card__collapse-inner">
          <div className="lq-expandable-card__body">{children}</div>
        </div>
      </div>
    </section>
  );
}
