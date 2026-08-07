import { useState, type ReactNode } from "react";
import { Panel, PanelRow } from "../primitives/Panel";
import { Tabs } from "../primitives/Tabs";
import { PriceChangeTag } from "../finance/PriceChangeTag";
import "./MarketMoversWidget.css";

export interface MarketMoverItem {
  id: string;
  symbol: string;
  name: string;
  /** Signed percent change. */
  change: number;
}

export interface MarketMoversWidgetProps {
  title?: ReactNode;
  gainers: MarketMoverItem[];
  losers: MarketMoverItem[];
  className?: string;
}

/** Ready-to-drop "top movers" card: tabbed gainers/losers lists. */
export function MarketMoversWidget({ title = "Marché", gainers, losers, className }: MarketMoversWidgetProps) {
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const items = tab === "gainers" ? gainers : losers;

  return (
    <Panel title={title} className={className}>
      <Tabs
        className="lq-market-movers__tabs"
        value={tab}
        onChange={(id) => setTab(id as "gainers" | "losers")}
        items={[
          { id: "gainers", label: "Hausses" },
          { id: "losers", label: "Baisses" },
        ]}
      />
      {items.length === 0 ? (
        <p className="lq-market-movers__empty">Aucune donnée</p>
      ) : (
        items.map((item) => (
          <PanelRow key={item.id} label={`${item.symbol} · ${item.name}`} value={<PriceChangeTag value={item.change} />} />
        ))
      )}
    </Panel>
  );
}
