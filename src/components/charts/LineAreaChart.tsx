import { useId, useMemo, useState } from "react";
import * as d3 from "d3";
import { useChartDimensions, type ChartMargin } from "./internal/useChartDimensions";
import { useD3Zoom } from "./internal/useD3Zoom";
import { useAxisDragRescale } from "./internal/useAxisDragRescale";
import { useFullscreen } from "./internal/useFullscreen";
import { ChartAxis } from "./ChartAxis";
import { ChartTooltip } from "./ChartTooltip";
import { CHART_PALETTE } from "./internal/palette";
import { MaximizeIcon, MinimizeIcon } from "../icons";
import "./charts-shared.css";
import "./LineAreaChart.css";

export interface ChartPoint {
  x: Date | number;
  y: number;
}

export interface ChartSeries {
  id: string;
  label?: string;
  /** CSS color. Defaults to a color cycled from the theme's categorical palette. */
  color?: string;
  /** Fill the area under this series. Falls back to the chart-level `area` prop. */
  area?: boolean;
  data: ChartPoint[];
}

export interface LineAreaChartProps {
  series: ChartSeries[];
  /** Fixed height in px. Fills 100% of the container's width regardless. */
  height?: number;
  area?: boolean;
  xType?: "time" | "linear";
  zoomable?: boolean;
  formatX?: (x: Date | number) => string;
  formatY?: (y: number) => string;
  showGrid?: boolean;
  showLegend?: boolean;
  /** Shows a fullscreen toggle button in the toolbar. Default true. */
  fullscreenToggle?: boolean;
  margin?: Partial<ChartMargin>;
  className?: string;
}

export function LineAreaChart({
  series,
  height = 320,
  area = false,
  xType = "time",
  zoomable = true,
  formatX,
  formatY,
  showGrid = true,
  showLegend = true,
  fullscreenToggle = true,
  margin,
  className,
}: LineAreaChartProps) {
  const clipId = useId();
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [yTransform, setYTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<{ index: number; mouseX: number } | null>(null);

  const [ref, dims] = useChartDimensions(margin, { height });
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(ref);

  const visibleSeries = series.filter((s) => !hiddenIds.has(s.id));

  const xScale = useMemo(() => {
    const allX = visibleSeries.flatMap((s) => s.data.map((d) => d.x));
    if (xType === "time") {
      const extent = d3.extent(allX as Date[]) as [Date, Date];
      return d3
        .scaleTime()
        .domain(extent[0] && extent[1] ? extent : [new Date(), new Date()])
        .range([0, dims.boundedWidth]);
    }
    const extent = d3.extent(allX as number[]) as [number, number];
    return d3
      .scaleLinear()
      .domain(extent[0] !== undefined ? extent : [0, 1])
      .range([0, dims.boundedWidth]);
  }, [visibleSeries, xType, dims.boundedWidth]);

  const zoomedXScale = transform.rescaleX(xScale as unknown as d3.ScaleLinear<number, number>);

  const yScale = useMemo(() => {
    const allY = visibleSeries.flatMap((s) => s.data.map((d) => d.y));
    const [min, max] = d3.extent(allY) as [number, number];
    const pad = (max - min) * 0.1 || 1;
    return d3
      .scaleLinear()
      .domain([min - pad, max + pad])
      .range([dims.boundedHeight, 0])
      .nice();
  }, [visibleSeries, dims.boundedHeight]);

  const zoomedYScale = yTransform.rescaleY(yScale);

  const { ref: zoomRef, reset: resetX, setTransform: setXTransformViaZoom } = useD3Zoom<SVGRectElement>({
    width: dims.boundedWidth,
    height: dims.boundedHeight,
    enabled: zoomable,
    onZoom: setTransform,
  });

  const xAxisDrag = useAxisDragRescale({
    axis: "x",
    size: dims.boundedWidth,
    transform,
    onChange: setXTransformViaZoom,
  });
  const yAxisDrag = useAxisDragRescale({
    axis: "y",
    size: dims.boundedHeight,
    transform: yTransform,
    onChange: setYTransform,
  });

  const isZoomed = transform.k !== 1 || transform.x !== 0 || yTransform.k !== 1 || yTransform.y !== 0;

  function resetZoom() {
    resetX();
    setYTransform(d3.zoomIdentity);
  }

  const lineGen = d3
    .line<ChartPoint>()
    .x((d) => zoomedXScale(d.x as never))
    .y((d) => zoomedYScale(d.y))
    .curve(d3.curveMonotoneX);

  const areaGen = d3
    .area<ChartPoint>()
    .x((d) => zoomedXScale(d.x as never))
    .y0(dims.boundedHeight)
    .y1((d) => zoomedYScale(d.y))
    .curve(d3.curveMonotoneX);

  const colorFor = (s: ChartSeries, i: number) => s.color ?? CHART_PALETTE[i % CHART_PALETTE.length];

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const first = visibleSeries[0];
    if (!first || first.data.length === 0) return;
    const bisect = d3.bisector<ChartPoint, number>((d) => +d.x).left;
    const xValue = zoomedXScale.invert(mouseX);
    const index = Math.min(first.data.length - 1, Math.max(0, bisect(first.data, +xValue)));
    setHover({ index, mouseX: zoomedXScale(first.data[index].x as never) });
  }

  if (dims.width === 0 || series.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <div ref={ref} className={["lq-chart", className].filter(Boolean).join(" ")} style={{ height }}>
        {series.length === 0 && <div className="lq-chart__empty">Aucune donnée</div>}
      </div>
    );
  }

  const hoverPoint = hover
    ? visibleSeries.map((s, i) => ({ series: s, color: colorFor(s, i), point: s.data[hover.index] }))
    : null;

  return (
    <div ref={ref} className={["lq-chart", className].filter(Boolean).join(" ")}>
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
      <svg className="lq-chart__svg" width={dims.width} height={dims.height} role="img">
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={dims.boundedWidth} height={dims.boundedHeight} />
          </clipPath>
        </defs>
        <g transform={`translate(${dims.margin.left}, ${dims.margin.top})`}>
          <ChartAxis
            scale={zoomedYScale}
            orientation="left"
            grid={showGrid}
            gridLength={dims.boundedWidth}
            tickFormat={formatY ? (v) => formatY(Number(v)) : undefined}
          />
          <ChartAxis
            scale={zoomedXScale}
            orientation="bottom"
            transform={`translate(0, ${dims.boundedHeight})`}
            tickFormat={formatX ? (v) => formatX(xType === "time" ? (v as Date) : Number(v)) : undefined}
          />

          <g clipPath={`url(#${clipId})`}>
            {visibleSeries.map((s, i) => {
              const color = colorFor(s, i);
              const fillArea = s.area ?? area;
              return (
                <g key={s.id}>
                  {fillArea && <path d={areaGen(s.data) ?? undefined} fill={color} fillOpacity={0.12} stroke="none" />}
                  <path d={lineGen(s.data) ?? undefined} fill="none" stroke={color} strokeWidth={2} />
                </g>
              );
            })}

            {hover &&
              hoverPoint &&
              (() => {
                const p = hoverPoint[0]?.point;
                if (!p) return null;
                return (
                  <>
                    <line
                      className="lq-chart__crosshair-line"
                      x1={hover.mouseX}
                      x2={hover.mouseX}
                      y1={0}
                      y2={dims.boundedHeight}
                    />
                    {hoverPoint.map(({ series: s, color, point }) =>
                      point ? (
                        <circle
                          key={s.id}
                          className="lq-chart__dot"
                          cx={zoomedXScale(point.x as never)}
                          cy={zoomedYScale(point.y)}
                          r={4}
                          fill={color}
                        />
                      ) : null
                    )}
                  </>
                );
              })()}
          </g>

          <rect
            ref={zoomRef}
            className="lq-chart__overlay"
            width={dims.boundedWidth}
            height={dims.boundedHeight}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHover(null)}
          />

          <rect
            className="lq-chart__axis-drag lq-chart__axis-drag--y"
            x={-dims.margin.left}
            y={0}
            width={dims.margin.left}
            height={dims.boundedHeight}
            onPointerDown={yAxisDrag.onPointerDown}
            onPointerMove={yAxisDrag.onPointerMove}
            onPointerUp={yAxisDrag.onPointerUp}
          />
          <rect
            className="lq-chart__axis-drag lq-chart__axis-drag--x"
            x={0}
            y={dims.boundedHeight}
            width={dims.boundedWidth}
            height={dims.margin.bottom}
            onPointerDown={xAxisDrag.onPointerDown}
            onPointerMove={xAxisDrag.onPointerMove}
            onPointerUp={xAxisDrag.onPointerUp}
          />
        </g>
      </svg>

      {hover &&
        hoverPoint &&
        (() => {
          const anchor = hoverPoint[0]?.point;
          if (!anchor) return null;
          const nearRightEdge = hover.mouseX > dims.boundedWidth * 0.65;
          return (
            <ChartTooltip
              x={dims.margin.left + hover.mouseX}
              y={dims.margin.top}
              visible
              align={nearRightEdge ? "left" : "right"}
            >
              <div className="lq-chart-tooltip__title">
                {formatX ? formatX(anchor.x) : xType === "time" ? d3.timeFormat("%d %b %Y")(anchor.x as Date) : String(anchor.x)}
              </div>
              {hoverPoint.map(({ series: s, color, point }) => (
                <div key={s.id} className="lq-chart-tooltip__row">
                  <span className="lq-chart-tooltip__swatch" style={{ backgroundColor: color }} />
                  {s.label ?? s.id}: <strong>{point ? (formatY ? formatY(point.y) : point.y) : "—"}</strong>
                </div>
              ))}
            </ChartTooltip>
          );
        })()}

      {showLegend && series.length > 1 && (
        <div className="lq-chart__legend">
          {series.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="lq-chart__legend-item"
              style={{ opacity: hiddenIds.has(s.id) ? 0.4 : 1 }}
              onClick={() =>
                setHiddenIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(s.id)) next.delete(s.id);
                  else next.add(s.id);
                  return next;
                })
              }
            >
              <span className="lq-chart__legend-swatch" style={{ backgroundColor: colorFor(s, i) }} />
              {s.label ?? s.id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
