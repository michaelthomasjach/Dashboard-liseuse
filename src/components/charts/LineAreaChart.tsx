import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useState } from "react";
import * as d3 from "d3";
import { useChartDimensions, type ChartMargin } from "./internal/useChartDimensions";
import { useD3Zoom } from "./internal/useD3Zoom";
import { useAxisDragRescale } from "./internal/useAxisDragRescale";
import { useAxisWheelZoom } from "./internal/useAxisWheelZoom";
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
  /** Line thickness in px. Default 2 — bump it to make one series (e.g. the current, in-progress
   *  year in SeasonalityView's "années indépendantes" mode) stand out among several others. */
  strokeWidth?: number;
  /** Draws a persistent dot at this series' own last defined point, not just while hovered — for
   *  a series that legitimately ends partway through the shared X domain (an in-progress year
   *  whose data simply stops at "today", short of every other series' full range) so that stop
   *  point reads as "still going, paused here" rather than an unexplained dangling line end. */
  endDot?: boolean;
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
  /** Which side the Y axis (and its own drag-to-rescale strip) renders on. Default "left"; pass
   *  "right" to match `CandlestickChart`'s own price-axis convention when embedding this as a
   *  sub-chart alongside it (see SeasonalityView). */
  yAxisOrientation?: "left" | "right";
  /** Drops this chart's own border/background chrome — for embedding inside another `.lq-chart`
   *  that already provides it (see SeasonalityView), so the two don't stack into a visible
   *  double border. Default false (a standalone LineAreaChart keeps its own border). */
  embedded?: boolean;
  /** A solid, slightly darker horizontal line at this Y value — same "meaningful threshold, not
   *  just a scale tick" treatment as the main CandlestickChart's own 0% compare-mode line (see
   *  SeasonalityView, which passes 0 to mark flat/breakeven performance). Omit for no line. */
  referenceLineY?: number;
  /** Hides the built-in "Réinitialiser le zoom" button from this chart's own toolbar — for a
   *  caller that renders its own reset button elsewhere (its own header, say) driven by
   *  `onZoomChange`/the imperative `resetZoom()` handle instead. Default true (shown). */
  showZoomReset?: boolean;
  /** Fires whenever the zoomed-in/panned state changes — lets a caller that set `showZoomReset`
   *  to false know when to show its own reset control. */
  onZoomChange?: (isZoomed: boolean) => void;
  /** Swaps the floating `ChartTooltip` box for a pair of axis-pinned value badges instead (same
   *  `.lq-chart__axis-value` treatment `CandlestickChart`'s own crosshair uses) — one under the X
   *  axis showing the hovered point's own X label, one per visible series on the Y axis (right
   *  edge when `yAxisOrientation="right"`, left edge otherwise) showing that series' own value,
   *  colored to match its line. For a chart embedded alongside another one that already reads its
   *  X/Y readout that way (see SeasonalityView) — a second, differently-shaped floating tooltip
   *  box would read as a visual inconsistency next to it. Default false (floating tooltip). */
  axisHoverLabels?: boolean;
  margin?: Partial<ChartMargin>;
  className?: string;
}

export interface LineAreaChartHandle {
  /** Same as clicking the built-in "Réinitialiser le zoom" button — for a caller that hid it via
   *  `showZoomReset={false}` and rendered its own trigger elsewhere. */
  resetZoom: () => void;
}

export const LineAreaChart = forwardRef<LineAreaChartHandle, LineAreaChartProps>(function LineAreaChart({
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
  yAxisOrientation = "left",
  embedded = false,
  referenceLineY,
  showZoomReset = true,
  onZoomChange,
  axisHoverLabels = false,
  margin,
  className,
}, handleRef) {
  const clipId = useId();
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [yTransform, setYTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  // `anchorX` is the actual data-space X value under the cursor (visibleSeries[0]'s own closest
  // point, same as `index` picks out) — kept alongside `index`/`mouseX` (still what positions the
  // crosshair line and snaps to a candle/bucket, unchanged) so every OTHER series can look up its
  // own closest point *by X value* instead of reusing this one array index into an array that
  // isn't guaranteed to line up with it (see closestPointInSeries's own doc for why that matters).
  const [hover, setHover] = useState<{ index: number; mouseX: number; anchorX: Date | number } | null>(null);

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const [ref, dims] = useChartDimensions(margin, { height: isFullscreen ? undefined : height });

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

  const xAxisWheelRef = useAxisWheelZoom<SVGRectElement>({
    axis: "x",
    transform,
    onChange: setXTransformViaZoom,
    enabled: zoomable,
    size: dims.boundedWidth,
  });
  const yAxisWheelRef = useAxisWheelZoom<SVGRectElement>({
    axis: "y",
    transform: yTransform,
    onChange: setYTransform,
    enabled: zoomable,
    size: dims.boundedHeight,
  });

  const isZoomed = transform.k !== 1 || transform.x !== 0 || yTransform.k !== 1 || yTransform.y !== 0;

  const resetZoom = useCallback(() => {
    resetX();
    setYTransform(d3.zoomIdentity);
  }, [resetX]);

  function resetYAxis() {
    setYTransform(d3.zoomIdentity);
  }

  useImperativeHandle(handleRef, () => ({ resetZoom }), [resetZoom]);

  useEffect(() => {
    onZoomChange?.(isZoomed);
  }, [isZoomed, onZoomChange]);

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
    setHover({ index, mouseX: zoomedXScale(first.data[index].x as never), anchorX: first.data[index].x });
  }

  // A series' own closest point to `xValue` — bisecting *that series' own* data instead of
  // reusing another series' array index (see hover.anchorX's own doc): two series only share an
  // index-to-point mapping when their data arrays are the exact same length with no gaps of their
  // own, which independently-computed series (e.g. SeasonalityView's own per-year lines, each
  // only defined for the buckets that year actually has an occurrence in) can't be assumed to be.
  // Clamps to the nearest end past either edge, same "closest available" reading a hover past a
  // shorter series' own last point already gets from its permanent endDot.
  function closestPointInSeries(data: ChartPoint[], xValue: Date | number): ChartPoint | undefined {
    if (data.length === 0) return undefined;
    const bisect = d3.bisector<ChartPoint, number>((d) => +d.x).left;
    const i = bisect(data, +xValue);
    if (i <= 0) return data[0];
    if (i >= data.length) return data[data.length - 1];
    const prev = data[i - 1];
    const next = data[i];
    return +xValue - +prev.x <= +next.x - +xValue ? prev : next;
  }

  if (dims.width === 0 || series.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <div
        ref={ref}
        className={["lq-chart", isFullscreen && "lq-chart--fullscreen", embedded && "lq-chart--embedded", className].filter(Boolean).join(" ")}
        style={{ height }}
      >
        {series.length === 0 && <div className="lq-chart__empty">Aucune donnée</div>}
      </div>
    );
  }

  const hoverPoint = hover
    ? visibleSeries.map((s, i) => ({ series: s, color: colorFor(s, i), point: closestPointInSeries(s.data, hover.anchorX) }))
    : null;

  return (
    <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", embedded && "lq-chart--embedded", className].filter(Boolean).join(" ")}>
      <div className="lq-chart__toolbar">
        {zoomable && isZoomed && showZoomReset && (
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
            orientation={yAxisOrientation}
            transform={yAxisOrientation === "right" ? `translate(${dims.boundedWidth}, 0)` : undefined}
            grid={showGrid}
            gridLength={dims.boundedWidth}
            tickFormat={formatY ? (v) => formatY(Number(v)) : undefined}
          />
          {/* d3's own X-axis domain line only spans its scale's range ([0, boundedWidth]) — with
              the Y axis moved into a right-side margin column, that left it short of the chart's
              actual right edge, same gap CandlestickChart's own axis-line-extension already
              fixes for its date axis. */}
          {yAxisOrientation === "right" && (
            <line
              className="lq-chart__axis-line-extension"
              x1={dims.boundedWidth}
              x2={dims.boundedWidth + dims.margin.right}
              y1={dims.boundedHeight}
              y2={dims.boundedHeight}
            />
          )}
          <ChartAxis
            scale={zoomedXScale}
            orientation="bottom"
            transform={`translate(0, ${dims.boundedHeight})`}
            tickFormat={formatX ? (v) => formatX(xType === "time" ? (v as Date) : Number(v)) : undefined}
          />

          <g clipPath={`url(#${clipId})`}>
            {referenceLineY !== undefined && (
              <line
                className="lq-chart__reference-line"
                x1={0}
                x2={dims.boundedWidth}
                y1={zoomedYScale(referenceLineY)}
                y2={zoomedYScale(referenceLineY)}
              />
            )}

            {visibleSeries.map((s, i) => {
              const color = colorFor(s, i);
              const fillArea = s.area ?? area;
              return (
                <g key={s.id}>
                  {fillArea && <path d={areaGen(s.data) ?? undefined} fill={color} fillOpacity={0.12} stroke="none" />}
                  <path d={lineGen(s.data) ?? undefined} fill="none" stroke={color} strokeWidth={s.strokeWidth ?? 2} />
                  {s.endDot &&
                    s.data.length > 0 &&
                    (() => {
                      const last = s.data[s.data.length - 1];
                      return (
                        <circle
                          className="lq-chart__dot lq-chart__dot--end"
                          cx={zoomedXScale(last.x as never)}
                          cy={zoomedYScale(last.y)}
                          r={5}
                          fill={color}
                        />
                      );
                    })()}
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
            ref={yAxisWheelRef}
            className="lq-chart__axis-drag lq-chart__axis-drag--y"
            x={yAxisOrientation === "right" ? dims.boundedWidth : -dims.margin.left}
            y={0}
            width={yAxisOrientation === "right" ? dims.margin.right : dims.margin.left}
            height={dims.boundedHeight}
            onPointerDown={yAxisDrag.onPointerDown}
            onPointerMove={yAxisDrag.onPointerMove}
            onPointerUp={yAxisDrag.onPointerUp}
            onDoubleClick={resetYAxis}
          />
          <rect
            ref={xAxisWheelRef}
            className="lq-chart__axis-drag lq-chart__axis-drag--x"
            x={0}
            y={dims.boundedHeight}
            width={dims.boundedWidth}
            height={dims.margin.bottom}
            onPointerDown={xAxisDrag.onPointerDown}
            onPointerMove={xAxisDrag.onPointerMove}
            onPointerUp={xAxisDrag.onPointerUp}
            onDoubleClick={resetX}
          />
        </g>
      </svg>

      {hover &&
        hoverPoint &&
        (axisHoverLabels ? (
          (() => {
            const anchor = hoverPoint[0]?.point;
            if (!anchor) return null;
            const formattedX = formatX ? formatX(anchor.x) : xType === "time" ? d3.timeFormat("%d %b %Y")(anchor.x as Date) : String(anchor.x);
            return (
              <>
                <div
                  className="lq-chart__axis-value lq-chart__axis-value--x"
                  style={{ left: dims.margin.left + hover.mouseX, top: dims.margin.top + dims.boundedHeight }}
                >
                  <span className="lq-chart__axis-value-text">{formattedX}</span>
                </div>
                {hoverPoint.map(({ series: s, color, point }) =>
                  point ? (
                    <div
                      key={s.id}
                      className="lq-chart__axis-value lq-chart__axis-value--y"
                      style={{
                        top: dims.margin.top + zoomedYScale(point.y),
                        backgroundColor: color,
                        ...(yAxisOrientation === "right"
                          ? { left: dims.margin.left + dims.boundedWidth, minWidth: dims.margin.right }
                          : { left: 0, width: dims.margin.left, justifyContent: "flex-end" }),
                      }}
                    >
                      <span className="lq-chart__axis-value-text">{formatY ? formatY(point.y) : point.y}</span>
                    </div>
                  ) : null
                )}
              </>
            );
          })()
        ) : (
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
          })()
        ))}

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
});
