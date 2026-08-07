import { useId, useMemo, useState } from "react";
import * as d3 from "d3";
import { useChartDimensions, type ChartMargin } from "./internal/useChartDimensions";
import { useD3Zoom } from "./internal/useD3Zoom";
import { useAxisDragRescale } from "./internal/useAxisDragRescale";
import { useAxisWheelZoom } from "./internal/useAxisWheelZoom";
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
  /** Pan/zoom the categorical axis — same drag/wheel/axis-rescale conventions as
   *  `CandlestickChart` and `LineAreaChart`, useful once there are many bars. Default true. */
  zoomable?: boolean;
  /** Shows a fullscreen toggle button in the toolbar. Default true. */
  fullscreenToggle?: boolean;
  margin?: Partial<ChartMargin>;
  className?: string;
  /** Highlight positive/negative bars using the theme's up/down colors instead of a single accent. */
  colorByValue?: boolean;
}

const MAX_CATEGORY_TICKS = 24;

/** Categorical bar chart built on the same zoom/pan/axis-rescale primitives as
 *  `CandlestickChart`: the categorical axis is treated as a continuous index
 *  scale so wheel/drag/pinch can zoom into a subset of bars, independently of
 *  the value axis (which rescales the same way the price axis does). */
export function BarChart({
  data,
  height = 320,
  orientation = "vertical",
  formatValue,
  showGrid = true,
  zoomable = true,
  fullscreenToggle = true,
  margin,
  className,
  colorByValue = false,
}: BarChartProps) {
  const clipId = useId();
  const defaultMargin =
    orientation === "horizontal"
      ? { top: 8, right: 24, bottom: 24, left: 96 }
      : { top: 8, right: 8, bottom: 32, left: 48 };
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const [ref, dims] = useChartDimensions(margin ?? defaultMargin, { height: isFullscreen ? undefined : height });
  const [hoverId, setHoverId] = useState<string | null>(null);

  const catAxis: "x" | "y" = orientation === "vertical" ? "x" : "y";
  const valAxis: "x" | "y" = orientation === "vertical" ? "y" : "x";
  const catSize = orientation === "vertical" ? dims.boundedWidth : dims.boundedHeight;
  const valSize = orientation === "vertical" ? dims.boundedHeight : dims.boundedWidth;

  const [catTransform, setCatTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [valTransform, setValTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  const colorFor = (d: BarDatum) => {
    if (d.color) return d.color;
    if (colorByValue) return d.value >= 0 ? "var(--lq-color-up)" : "var(--lq-color-down)";
    return "var(--lq-color-accent)";
  };

  const indexScale = useMemo(() => d3.scaleLinear().domain([0, Math.max(1, data.length)]).range([0, catSize]), [data.length, catSize]);
  const zoomedIndexScale = catAxis === "x" ? catTransform.rescaleX(indexScale) : catTransform.rescaleY(indexScale);

  const valueScale = useMemo(() => {
    const values = data.map((d) => d.value);
    const [min, max] = d3.extent(values) as [number, number];
    const domain = [Math.min(0, min ?? 0), Math.max(0, max ?? 0)];
    return d3
      .scaleLinear()
      .domain(domain)
      .nice()
      .range(orientation === "vertical" ? [valSize, 0] : [0, valSize]);
  }, [data, orientation, valSize]);
  const zoomedValueScale = valAxis === "y" ? valTransform.rescaleY(valueScale) : valTransform.rescaleX(valueScale);

  const { ref: zoomRef, reset: resetCat, setTransform: setCatTransformViaZoom } = useD3Zoom<SVGRectElement>({
    width: dims.boundedWidth,
    height: dims.boundedHeight,
    enabled: zoomable,
    onZoom: setCatTransform,
  });

  const catAxisDrag = useAxisDragRescale({
    axis: catAxis,
    size: catSize,
    transform: catTransform,
    onChange: setCatTransformViaZoom,
    scaleExtent: [1, 20],
  });
  const valAxisDrag = useAxisDragRescale({
    axis: valAxis,
    size: valSize,
    transform: valTransform,
    onChange: setValTransform,
  });

  const catAxisWheelRef = useAxisWheelZoom<SVGRectElement>({
    axis: catAxis,
    transform: catTransform,
    onChange: setCatTransformViaZoom,
    enabled: zoomable,
    scaleExtent: [1, 20],
  });
  const valAxisWheelRef = useAxisWheelZoom<SVGRectElement>({
    axis: valAxis,
    transform: valTransform,
    onChange: setValTransform,
    enabled: zoomable,
  });

  const isZoomed = catTransform.k !== 1 || catTransform.x !== 0 || catTransform.y !== 0 || valTransform.k !== 1 || valTransform.x !== 0 || valTransform.y !== 0;

  function resetZoom() {
    resetCat();
    setValTransform(d3.zoomIdentity);
  }
  function resetValAxis() {
    setValTransform(d3.zoomIdentity);
  }

  const baseSlot = catSize / Math.max(1, data.length);
  const barThickness = Math.max(2, Math.min(64, baseSlot * catTransform.k * 0.7));

  const visible = useMemo(() => {
    if (data.length === 0) return [];
    const [i0, i1] = zoomedIndexScale.domain();
    const start = Math.max(0, Math.floor(i0) - 1);
    const end = Math.min(data.length, Math.ceil(i1) + 1);
    return data.slice(start, end).map((d, k) => ({ d, i: start + k }));
  }, [data, zoomedIndexScale]);

  const tickStep = Math.max(1, Math.ceil(visible.length / MAX_CATEGORY_TICKS));
  const catTickValues = visible.filter((_, k) => k % tickStep === 0).map((v) => v.i + 0.5);
  const catTickFormat = (v: number) => data[Math.round(v - 0.5)]?.label ?? "";

  const wrapperClass = ["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ");

  const toolbar = (
    <div className="lq-chart__toolbar">
      {zoomable && isZoomed && (
        <button type="button" className="lq-chart__reset-button" onClick={resetZoom}>
          Réinitialiser le zoom
        </button>
      )}
      {fullscreenToggle && (
        <button
          type="button"
          className="lq-chart__icon-button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
        >
          {isFullscreen ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />}
        </button>
      )}
    </div>
  );

  if (dims.width === 0) return <div ref={ref} className={wrapperClass} style={{ height }} />;
  if (data.length === 0) {
    return (
      <div ref={ref} className={wrapperClass} style={{ height }}>
        {toolbar}
        <div className="lq-chart__empty">Aucune donnée</div>
      </div>
    );
  }

  const zeroline = zoomedValueScale(0);
  const hovered = data.find((d) => d.id === hoverId);

  return (
    <div ref={ref} className={wrapperClass}>
      {toolbar}
      <svg className="lq-chart__svg" width={dims.width} height={dims.height} role="img">
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={dims.boundedWidth} height={dims.boundedHeight} />
          </clipPath>
        </defs>
        <g transform={`translate(${dims.margin.left}, ${dims.margin.top})`}>
          {orientation === "vertical" ? (
            <>
              <ChartAxis scale={zoomedValueScale} orientation="left" grid={showGrid} gridLength={dims.boundedWidth} tickFormat={formatValue ? (v) => formatValue(Number(v)) : undefined} />
              <ChartAxis
                scale={zoomedIndexScale}
                orientation="bottom"
                transform={`translate(0, ${dims.boundedHeight})`}
                tickValues={catTickValues}
                tickFormat={catTickFormat}
              />
            </>
          ) : (
            <>
              <ChartAxis scale={zoomedValueScale} orientation="bottom" transform={`translate(0, ${dims.boundedHeight})`} grid={showGrid} gridLength={dims.boundedHeight} tickFormat={formatValue ? (v) => formatValue(Number(v)) : undefined} />
              <ChartAxis scale={zoomedIndexScale} orientation="left" tickValues={catTickValues} tickFormat={catTickFormat} />
            </>
          )}

          <rect ref={zoomRef} className="lq-chart__overlay" width={dims.boundedWidth} height={dims.boundedHeight} />

          <g clipPath={`url(#${clipId})`}>
            {visible.map(({ d, i }) => {
              const isHover = hoverId === d.id;
              const center = zoomedIndexScale(i + 0.5);
              if (orientation === "vertical") {
                const x = center - barThickness / 2;
                const y = d.value >= 0 ? zoomedValueScale(d.value) : zeroline;
                const barHeight = Math.abs(zoomedValueScale(d.value) - zeroline);
                return (
                  <rect
                    key={d.id}
                    x={x}
                    y={y}
                    width={barThickness}
                    height={barHeight}
                    fill={colorFor(d)}
                    opacity={isHover ? 0.75 : 1}
                    onPointerEnter={() => setHoverId(d.id)}
                    onPointerLeave={() => setHoverId(null)}
                  />
                );
              }
              const y = center - barThickness / 2;
              const x = d.value >= 0 ? zeroline : zoomedValueScale(d.value);
              const barWidth = Math.abs(zoomedValueScale(d.value) - zeroline);
              return (
                <rect
                  key={d.id}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barThickness}
                  fill={colorFor(d)}
                  opacity={isHover ? 0.75 : 1}
                  onPointerEnter={() => setHoverId(d.id)}
                  onPointerLeave={() => setHoverId(null)}
                />
              );
            })}
          </g>

          <rect
            ref={valAxisWheelRef}
            className={`lq-chart__axis-drag lq-chart__axis-drag--${valAxis}`}
            x={valAxis === "y" ? -dims.margin.left : 0}
            y={valAxis === "y" ? 0 : dims.boundedHeight}
            width={valAxis === "y" ? dims.margin.left : dims.boundedWidth}
            height={valAxis === "y" ? dims.boundedHeight : dims.margin.bottom}
            onPointerDown={valAxisDrag.onPointerDown}
            onPointerMove={valAxisDrag.onPointerMove}
            onPointerUp={valAxisDrag.onPointerUp}
            onDoubleClick={resetValAxis}
          />
          <rect
            ref={catAxisWheelRef}
            className={`lq-chart__axis-drag lq-chart__axis-drag--${catAxis}`}
            x={catAxis === "y" ? -dims.margin.left : 0}
            y={catAxis === "y" ? 0 : dims.boundedHeight}
            width={catAxis === "y" ? dims.margin.left : dims.boundedWidth}
            height={catAxis === "y" ? dims.boundedHeight : dims.margin.bottom}
            onPointerDown={catAxisDrag.onPointerDown}
            onPointerMove={catAxisDrag.onPointerMove}
            onPointerUp={catAxisDrag.onPointerUp}
            onDoubleClick={resetCat}
          />
        </g>
      </svg>

      {hovered &&
        (() => {
          const i = data.findIndex((d) => d.id === hovered.id);
          const center = zoomedIndexScale(i + 0.5);
          const x = orientation === "vertical" ? dims.margin.left + center : dims.margin.left + zoomedValueScale(Math.max(0, hovered.value));
          const y = orientation === "vertical" ? dims.margin.top + zoomedValueScale(hovered.value) : dims.margin.top + center;
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
