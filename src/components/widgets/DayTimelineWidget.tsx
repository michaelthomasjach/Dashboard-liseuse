import type { ReactNode } from "react";
import "./DayTimelineWidget.css";

export interface DayTimelineItem {
  id: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

export interface DayTimelineWidgetProps {
  items: DayTimelineItem[];
  className?: string;
}

/** Row of icon + label milestones for the day (Matin, Début de journée, Dodo, Départ…). */
export function DayTimelineWidget({ items, className }: DayTimelineWidgetProps) {
  return (
    <div className={["lq-day-timeline", className].filter(Boolean).join(" ")}>
      {items.map((item) => {
        const interactive = Boolean(item.onClick);
        return (
          <button
            key={item.id}
            type="button"
            className="lq-day-timeline__item"
            onClick={item.onClick}
            disabled={!interactive}
          >
            <span className="lq-day-timeline__icon">{item.icon}</span>
            <span className="lq-day-timeline__label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
