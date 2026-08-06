import { useState, type ReactNode } from "react";
import { Tabs, type TabItem } from "./Tabs";
import "./TabbedCard.css";

export interface TabbedCardTab extends TabItem {
  content: ReactNode;
}

export interface TabbedCardProps {
  tabs: TabbedCardTab[];
  orientation?: "horizontal" | "vertical";
  title?: ReactNode;
  defaultTabId?: string;
  value?: string;
  onChange?: (id: string) => void;
  className?: string;
}

/** A card whose body is split into tabs — horizontal (top rail) or vertical (side rail). */
export function TabbedCard({ tabs, orientation = "horizontal", title, defaultTabId, value, onChange, className }: TabbedCardProps) {
  const [internalValue, setInternalValue] = useState(defaultTabId ?? tabs[0]?.id);
  const activeId = value ?? internalValue;
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  function handleChange(id: string) {
    if (value === undefined) setInternalValue(id);
    onChange?.(id);
  }

  return (
    <section className={["lq-tabbed-card", `lq-tabbed-card--${orientation}`, className].filter(Boolean).join(" ")}>
      {title && <div className="lq-tabbed-card__title">{title}</div>}
      <div className="lq-tabbed-card__layout">
        <Tabs items={tabs} value={active?.id ?? ""} onChange={handleChange} orientation={orientation} className="lq-tabbed-card__tabs" />
        <div className="lq-tabbed-card__content">{active?.content}</div>
      </div>
    </section>
  );
}
