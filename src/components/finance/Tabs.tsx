import "./Tabs.css";

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Underlined tab navigation for switching panels (Positions / Orders / History…). */
export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div className={["lq-tabs", className].filter(Boolean).join(" ")} role="tablist">
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
          {item.label}
        </button>
      ))}
    </div>
  );
}
