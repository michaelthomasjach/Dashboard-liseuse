import { useMemo, useState } from "react";
import * as d3 from "d3";
import { useChartDimensions, type ChartMargin } from "./internal/useChartDimensions";
import { useFullscreen } from "./internal/useFullscreen";
import { ChartAxis } from "./ChartAxis";
import { ChartTooltip } from "./ChartTooltip";
import { MaximizeIcon, MinimizeIcon } from "../icons";
import "./charts-shared.css";
import "./DeltaChart.css";

export interface DeltaChartItem {
  id: string;
  label: string;
  /** Signed amount: positive adds to the running total, negative subtracts from it. */
  value: number;
  /** Renders as a full bar from 0 (a running subtotal/result) instead of floating on top of the
   *  previous bar, and resets the running total to this value — e.g. a final "Enterprise value" bar. */
  isTotal?: boolean;
  color?: string;
}

export interface DeltaChartProps {
  items: DeltaChartItem[];
  height?: number;
  formatValue?: (value: number) => string;
  /** Dashed bridging lines between consecutive bars. Default true. */
  showConnectors?: boolean;
  showLegend?: boolean;
  /** Shows a fullscreen toggle button in the toolbar. Default true. */
  fullscreenToggle?: boolean;
  margin?: Partial<ChartMargin>;
  className?: string;
}

interface ComputedBar {
  item: DeltaChartItem;
  top: number;
  bottom: number;
  cumulativeAfter: number;
}

function computeBars(items: DeltaChartItem[]): ComputedBar[] {
  let cumulative = 0;
  return items.map((item) => {
    if (item.isTotal) {
      cumulative = item.value;
      return { item, top: Math.max(0, item.value), bottom: Math.min(0, item.value), cumulativeAfter: item.value };
    }
    const base = cumulative;
    const next = cumulative + item.value;
    cumulative = next;
    return { item, top: Math.max(base, next), bottom: Math.min(base, next), cumulativeAfter: next };
  });
}

const DEFAULT_MARGIN: Partial<ChartMargin> = { top: 16, right: 16, bottom: 32, left: 64 };

/** Waterfall / bridge chart: shows how a sequence of signed additions and subtractions build up to
 *  one or more totals — e.g. capital structure (market cap + debt + minority interest − cash = enterprise value). */
export function DeltaChart({
  items,
  height = 340,
  formatValue,
  showConnectors = true,
  showLegend = true,
  fullscreenToggle = true,
  margin,
  className,
}: DeltaChartProps) {
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const [ref, dims] = useChartDimensions(margin ?? DEFAULT_MARGIN, { height: isFullscreen ? undefined : height });
  const [hoverId, setHoverId] = useState<string | null>(null);

  const bars = useMemo(() => computeBars(items), [items]);

  const bandScale = useMemo(
    () =>
      d3
        .scaleBand()
        .domain(items.map((i) => i.id))
        .range([0, dims.boundedWidth])
        .padding(0.35),
    [items, dims.boundedWidth]
  );

  const valueScale = useMemo(() => {
    const values = bars.flatMap((b) => [b.top, b.bottom, 0]);
    const [min, max] = d3.extent(values) as [number, number];
    const pad = (max - min) * 0.12 || 1;
    return d3
      .scaleLinear()
      .domain([Math.min(0, min - pad), max + pad])
      .nice()
      .range([dims.boundedHeight, 0]);
  }, [bars, dims.boundedHeight]);

  const labelFor = (id: string) => items.find((i) => i.id === id)?.label ?? id;
  const colorFor = (bar: ComputedBar) => {
    if (bar.item.color) return bar.item.color;
    if (bar.item.isTotal) return "var(--lq-color-accent)";
    return bar.item.value >= 0 ? "var(--lq-color-up)" : "var(--lq-color-down)";
  };

  const fmt = formatValue ?? ((v: number) => v.toLocaleString("fr-FR"));

  const wrapperClass = ["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ");

  if (dims.width === 0) return <div ref={ref} className={wrapperClass} style={{ height }} />;
  if (items.length === 0) {
    return (
      <div ref={ref} className={wrapperClass} style={{ height }}>
        <div className="lq-chart__empty">Aucune donnée</div>
      </div>
    );
  }

  const zero = valueScale(0);
  const hovered = bars.find((b) => b.item.id === hoverId);

  return (
    <div ref={ref} className={wrapperClass}>
      {fullscreenToggle && (
        <div className="lq-chart__toolbar">
          <button
            type="button"
            className="lq-chart__icon-button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />}
          </button>
        </div>
      )}
      <svg className="lq-chart__svg" width={dims.width} height={dims.height} role="img">
        <g transform={`translate(${dims.margin.left}, ${dims.margin.top})`}>
          <ChartAxis scale={valueScale} orientation="left" grid gridLength={dims.boundedWidth} tickFormat={(v) => fmt(Number(v))} />
          <ChartAxis scale={bandScale} orientation="bottom" transform={`translate(0, ${dims.boundedHeight})`} tickFormat={(id) => labelFor(String(id))} />

          <line className="lq-delta-chart__zero-line" x1={0} x2={dims.boundedWidth} y1={zero} y2={zero} />

          {showConnectors &&
            bars.slice(0, -1).map((bar, i) => {
              const next = bars[i + 1];
              if (next.item.isTotal) return null;
              const x1 = (bandScale(bar.item.id) ?? 0) + bandScale.bandwidth();
              const x2 = bandScale(next.item.id) ?? 0;
              const y = valueScale(bar.cumulativeAfter);
              return <line key={bar.item.id} className="lq-delta-chart__connector" x1={x1} x2={x2} y1={y} y2={y} />;
            })}

          {bars.map((bar) => {
            const x = bandScale(bar.item.id) ?? 0;
            const y = valueScale(bar.top);
            const barHeight = Math.max(1, valueScale(bar.bottom) - valueScale(bar.top));
            return (
              <rect
                key={bar.item.id}
                className="lq-delta-chart__bar"
                x={x}
                y={y}
                width={bandScale.bandwidth()}
                height={barHeight}
                fill={colorFor(bar)}
                opacity={hoverId === bar.item.id ? 0.8 : 1}
                onPointerEnter={() => setHoverId(bar.item.id)}
                onPointerLeave={() => setHoverId(null)}
              />
            );
          })}
        </g>
      </svg>

      {hovered &&
        (() => {
          const x = dims.margin.left + (bandScale(hovered.item.id) ?? 0) + bandScale.bandwidth() / 2;
          const y = dims.margin.top + valueScale(hovered.top);
          return (
            <ChartTooltip x={x} y={y} visible align={x > dims.width * 0.65 ? "left" : "right"}>
              <div className="lq-chart-tooltip__title">{hovered.item.label}</div>
              <div className="lq-chart-tooltip__row">
                <strong>
                  {!hovered.item.isTotal && hovered.item.value >= 0 ? "+" : ""}
                  {fmt(hovered.item.value)}
                </strong>
              </div>
            </ChartTooltip>
          );
        })()}

      {showLegend && (
        <div className="lq-chart__legend">
          <span className="lq-chart__legend-item">
            <span className="lq-chart__legend-swatch" style={{ backgroundColor: "var(--lq-color-up)" }} />
            Ajout
          </span>
          <span className="lq-chart__legend-item">
            <span className="lq-chart__legend-swatch" style={{ backgroundColor: "var(--lq-color-down)" }} />
            Retrait
          </span>
          <span className="lq-chart__legend-item">
            <span className="lq-chart__legend-swatch" style={{ backgroundColor: "var(--lq-color-accent)" }} />
            Total
          </span>
        </div>
      )}
    </div>
  );
}
