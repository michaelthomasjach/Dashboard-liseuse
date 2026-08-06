import { useMemo, useState } from "react";
import * as d3 from "d3";
import { useChartDimensions, type ChartMargin } from "./internal/useChartDimensions";
import { useFullscreen } from "./internal/useFullscreen";
import { ChartAxis } from "./ChartAxis";
import { ChartTooltip } from "./ChartTooltip";
import { MaximizeIcon, MinimizeIcon } from "../icons";
import "./charts-shared.css";
import "./BarChart.css";

export interface BarDatum {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: BarDatum[];
  height?: number;
  orientation?: "vertical" | "horizontal";
  formatValue?: (value: number) => string;
  showGrid?: boolean;
  /** Shows a fullscreen toggle button in the toolbar. Default true. */
  fullscreenToggle?: boolean;
  margin?: Partial<ChartMargin>;
  className?: string;
  /** Highlight positive/negative bars using the theme's up/down colors instead of a single accent. */
  colorByValue?: boolean;
}

/** Categorical bar chart with hover tooltips. Bars are discrete by nature, so
 *  pan/zoom (continuous-domain gestures) live on `LineAreaChart` and
 *  `CandlestickChart` instead — here interactivity is per-bar hover. */
export function BarChart({
  data,
  height = 320,
  orientation = "vertical",
  formatValue,
  showGrid = true,
  fullscreenToggle = true,
  margin,
  className,
  colorByValue = false,
}: BarChartProps) {
  const defaultMargin =
    orientation === "horizontal"
      ? { top: 8, right: 24, bottom: 24, left: 96 }
      : { top: 8, right: 8, bottom: 32, left: 48 };
  const [ref, dims] = useChartDimensions(margin ?? defaultMargin, { height });
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(ref);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const colorFor = (d: BarDatum) => {
    if (d.color) return d.color;
    if (colorByValue) return d.value >= 0 ? "var(--lq-color-up)" : "var(--lq-color-down)";
    return "var(--lq-color-accent)";
  };

  const bandScale = useMemo(() => {
    const size = orientation === "vertical" ? dims.boundedWidth : dims.boundedHeight;
    return d3
      .scaleBand()
      .domain(data.map((d) => d.id))
      .range([0, size])
      .padding(0.3);
  }, [data, orientation, dims.boundedWidth, dims.boundedHeight]);

  const valueScale = useMemo(() => {
    const values = data.map((d) => d.value);
    const [min, max] = d3.extent(values) as [number, number];
    const domain = [Math.min(0, min ?? 0), Math.max(0, max ?? 0)];
    const size = orientation === "vertical" ? dims.boundedHeight : dims.boundedWidth;
    return d3
      .scaleLinear()
      .domain(domain)
      .nice()
      .range(orientation === "vertical" ? [size, 0] : [0, size]);
  }, [data, orientation, dims.boundedWidth, dims.boundedHeight]);

  const toolbar = fullscreenToggle && (
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
  );

  if (dims.width === 0) return <div ref={ref} className={["lq-chart", className].filter(Boolean).join(" ")} style={{ height }} />;
  if (data.length === 0) {
    return (
      <div ref={ref} className={["lq-chart", className].filter(Boolean).join(" ")} style={{ height }}>
        {toolbar}
        <div className="lq-chart__empty">Aucune donnée</div>
      </div>
    );
  }

  const zeroline = valueScale(0);
  const hovered = data.find((d) => d.id === hoverId);

  return (
    <div ref={ref} className={["lq-chart", className].filter(Boolean).join(" ")}>
      {toolbar}
      <svg className="lq-chart__svg" width={dims.width} height={dims.height} role="img">
        <g transform={`translate(${dims.margin.left}, ${dims.margin.top})`}>
          {orientation === "vertical" ? (
            <>
              <ChartAxis scale={valueScale} orientation="left" grid={showGrid} gridLength={dims.boundedWidth} tickFormat={formatValue ? (v) => formatValue(Number(v)) : undefined} />
              <ChartAxis scale={bandScale} orientation="bottom" transform={`translate(0, ${dims.boundedHeight})`} />
            </>
          ) : (
            <>
              <ChartAxis scale={valueScale} orientation="bottom" transform={`translate(0, ${dims.boundedHeight})`} grid={showGrid} gridLength={dims.boundedHeight} tickFormat={formatValue ? (v) => formatValue(Number(v)) : undefined} />
              <ChartAxis scale={bandScale} orientation="left" />
            </>
          )}

          {data.map((d) => {
            const isHover = hoverId === d.id;
            if (orientation === "vertical") {
              const x = bandScale(d.id) ?? 0;
              const y = d.value >= 0 ? valueScale(d.value) : zeroline;
              const barHeight = Math.abs(valueScale(d.value) - zeroline);
              return (
                <rect
                  key={d.id}
                  x={x}
                  y={y}
                  width={bandScale.bandwidth()}
                  height={barHeight}
                  fill={colorFor(d)}
                  opacity={isHover ? 0.75 : 1}
                  onPointerEnter={() => setHoverId(d.id)}
                  onPointerLeave={() => setHoverId(null)}
                />
              );
            }
            const y = bandScale(d.id) ?? 0;
            const x = d.value >= 0 ? zeroline : valueScale(d.value);
            const barWidth = Math.abs(valueScale(d.value) - zeroline);
            return (
              <rect
                key={d.id}
                x={x}
                y={y}
                width={barWidth}
                height={bandScale.bandwidth()}
                fill={colorFor(d)}
                opacity={isHover ? 0.75 : 1}
                onPointerEnter={() => setHoverId(d.id)}
                onPointerLeave={() => setHoverId(null)}
              />
            );
          })}
        </g>
      </svg>

      {hovered &&
        (() => {
          const x =
            orientation === "vertical"
              ? dims.margin.left + (bandScale(hovered.id) ?? 0) + bandScale.bandwidth() / 2
              : dims.margin.left + valueScale(Math.max(0, hovered.value));
          const y = orientation === "vertical" ? dims.margin.top + valueScale(hovered.value) : dims.margin.top + (bandScale(hovered.id) ?? 0);
          return (
            <ChartTooltip x={x} y={y} visible align={x > dims.width * 0.65 ? "left" : "right"}>
              <div className="lq-chart-tooltip__title">{hovered.label}</div>
              <div className="lq-chart-tooltip__row">
                <span className="lq-chart-tooltip__swatch" style={{ backgroundColor: colorFor(hovered) }} />
                <strong>{formatValue ? formatValue(hovered.value) : hovered.value}</strong>
              </div>
            </ChartTooltip>
          );
        })()}
    </div>
  );
}
