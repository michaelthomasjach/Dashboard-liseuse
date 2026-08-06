import type { ReactNode } from "react";
import "./Tabs.css";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

/** Underlined tab navigation for switching panels (Positions / Orders / History…). */
export function Tabs({ items, value, onChange, orientation = "horizontal", className }: TabsProps) {
  return (
    <div
      className={["lq-tabs", `lq-tabs--${orientation}`, className].filter(Boolean).join(" ")}
      role="tablist"
      aria-orientation={orientation}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          disabled={item.disabled}
          className={["lq-tabs__tab", item.id === value && "lq-tabs__tab--active"].filter(Boolean).join(" ")}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
