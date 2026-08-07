import { Avatar } from "./Avatar";
import { PriceChangeTag } from "./PriceChangeTag";
import { Sparkline } from "../charts/Sparkline";
import "./HoldingCard.css";

export interface HoldingCardProps {
  symbol: string;
  name: string;
  quantity?: number;
  price: number;
  /** Signed percent change. */
  change: number;
  formatPrice?: (value: number) => string;
  sparklineData?: number[];
  onClick?: () => void;
  className?: string;
}

/** Compact row card for a single position — watchlists, holdings lists. */
export function HoldingCard({ symbol, name, quantity, price, change, formatPrice, sparklineData, onClick, className }: HoldingCardProps) {
  const fmt = formatPrice ?? ((v: number) => `${v.toFixed(2)} €`);
  const interactive = Boolean(onClick);

  return (
    <div
      className={["lq-holding-card", interactive && "lq-holding-card--interactive", className].filter(Boolean).join(" ")}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <Avatar name={symbol} size={36} />
      <div className="lq-holding-card__identity">
        <span className="lq-holding-card__symbol">{symbol}</span>
        <span className="lq-holding-card__name">{name}</span>
      </div>

      {sparklineData && sparklineData.length > 1 && (
        <Sparkline data={sparklineData} width={64} height={28} colorByTrend className="lq-holding-card__sparkline" />
      )}

      <div className="lq-holding-card__figures">
        <span className="lq-holding-card__price">{fmt(price)}</span>
        <PriceChangeTag value={change} />
      </div>

      {quantity !== undefined && <span className="lq-holding-card__quantity">{quantity} parts</span>}
    </div>
  );
}
