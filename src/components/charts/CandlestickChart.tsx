import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useChartDimensions, type ChartMargin } from "./internal/useChartDimensions";
import { useD3Zoom } from "./internal/useD3Zoom";
import { useAxisDragRescale } from "./internal/useAxisDragRescale";
import { useAxisWheelZoom } from "./internal/useAxisWheelZoom";
import { useFullscreen } from "./internal/useFullscreen";
import { ChartAxis } from "./ChartAxis";
import { ChartTooltip } from "./ChartTooltip";
import { MaximizeIcon, MinimizeIcon, TrendLineIcon } from "../icons";
import "./charts-shared.css";
import "./CandlestickChart.css";

export interface Candle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TrendLineDrawing {
  id: string;
  x1: Date;
  y1: number;
  x2: Date;
  y2: number;
}

interface DataPoint {
  x: Date;
  y: number;
}

export interface CandlestickChartProps {
  data: Candle[];
  height?: number;
  zoomable?: boolean;
  showVolume?: boolean;
  formatDate?: (d: Date) => string;
  formatPrice?: (v: number) => string;
  formatVolume?: (v: number) => string;
  /** Shows a fullscreen toggle button in the toolbar. Default true. */
  fullscreenToggle?: boolean;
  /** Shows a right-docked toolbar for drawing annotations directly on the chart (currently: trend line). Default false. */
  drawingTools?: boolean;
  /** Uncontrolled initial set of trend-line drawings. */
  defaultDrawings?: TrendLineDrawing[];
  /** Fires whenever a drawing is added or an endpoint is moved. */
  onDrawingsChange?: (drawings: TrendLineDrawing[]) => void;
  margin?: Partial<ChartMargin>;
  className?: string;
}

const DEFAULT_MARGIN: Partial<ChartMargin> = { top: 8, right: 8, bottom: 24, left: 56 };
/** Screen-space distance (px) under which the pointer counts as "hovering" a drawn line. */
const DRAWING_HIT_DISTANCE = 8;

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function CandlestickChart({
  data,
  height = 380,
  zoomable = true,
  showVolume = true,
  formatDate,
  formatPrice,
  formatVolume,
  fullscreenToggle = true,
  drawingTools = false,
  defaultDrawings,
  onDrawingsChange,
  margin,
  className,
}: CandlestickChartProps) {
  const clipId = useId();
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [yTransform, setYTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const [drawings, setDrawings] = useState<TrendLineDrawing[]>(defaultDrawings ?? []);
  const [activeTool, setActiveTool] = useState<"trendline" | null>(null);
  const [pendingPoint, setPendingPoint] = useState<DataPoint | null>(null);
  const [previewPoint, setPreviewPoint] = useState<DataPoint | null>(null);
  const [hoveredDrawingId, setHoveredDrawingId] = useState<string | null>(null);
  const dragEndpointRef = useRef<{ id: string; which: 1 | 2 } | null>(null);
  const drawingIdRef = useRef(0);

  function commitDrawings(next: TrendLineDrawing[]) {
    setDrawings(next);
    onDrawingsChange?.(next);
  }

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const [ref, dims] = useChartDimensions(margin ?? DEFAULT_MARGIN, { height: isFullscreen ? undefined : height });

  const volumeGap = showVolume ? 16 : 0;
  const volumeHeight = showVolume ? Math.round(dims.boundedHeight * 0.22) : 0;
  const priceHeight = Math.max(0, dims.boundedHeight - volumeHeight - volumeGap);

  const xScale = useMemo(() => {
    const extent = d3.extent(data, (d) => d.date) as [Date, Date];
    return d3.scaleTime().domain(extent[0] ? extent : [new Date(), new Date()]).range([0, dims.boundedWidth]);
  }, [data, dims.boundedWidth]);

  const zoomedXScale = transform.rescaleX(xScale);

  const priceScale = useMemo(() => {
    const highs = data.map((d) => d.high);
    const lows = data.map((d) => d.low);
    const min = d3.min(lows) ?? 0;
    const max = d3.max(highs) ?? 1;
    const pad = (max - min) * 0.08 || 1;
    return d3.scaleLinear().domain([min - pad, max + pad]).range([priceHeight, 0]);
  }, [data, priceHeight]);

  const zoomedPriceScale = yTransform.rescaleY(priceScale);

  const volumeScale = useMemo(() => {
    const max = d3.max(data, (d) => d.volume ?? 0) ?? 0;
    return d3.scaleLinear().domain([0, max || 1]).range([volumeHeight, 0]);
  }, [data, volumeHeight]);

  const { ref: zoomRef, reset: resetX, setTransform: setXTransformViaZoom } = useD3Zoom<SVGRectElement>({
    width: dims.boundedWidth,
    height: dims.boundedHeight,
    enabled: zoomable && activeTool === null,
    scaleExtent: [1, 20],
    onZoom: setTransform,
  });

  const xAxisDrag = useAxisDragRescale({
    axis: "x",
    size: dims.boundedWidth,
    transform,
    onChange: setXTransformViaZoom,
    scaleExtent: [1, 20],
  });
  const yAxisDrag = useAxisDragRescale({
    axis: "y",
    size: priceHeight,
    transform: yTransform,
    onChange: setYTransform,
  });

  const xAxisWheelRef = useAxisWheelZoom<SVGRectElement>({
    axis: "x",
    transform,
    onChange: setXTransformViaZoom,
    enabled: zoomable,
    scaleExtent: [1, 20],
  });
  const yAxisWheelRef = useAxisWheelZoom<SVGRectElement>({
    axis: "y",
    transform: yTransform,
    onChange: setYTransform,
    enabled: zoomable,
  });

  const isZoomed = transform.k !== 1 || transform.x !== 0 || yTransform.k !== 1 || yTransform.y !== 0;

  function resetZoom() {
    resetX();
    setYTransform(d3.zoomIdentity);
  }

  function resetYAxis() {
    setYTransform(d3.zoomIdentity);
  }

  function cancelDrawingTool() {
    setActiveTool(null);
    setPendingPoint(null);
    setPreviewPoint(null);
  }

  function handleToolClick(tool: "trendline") {
    if (activeTool === tool) {
      cancelDrawingTool();
    } else {
      setActiveTool(tool);
      setPendingPoint(null);
      setPreviewPoint(null);
    }
  }

  useEffect(() => {
    if (!activeTool) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") cancelDrawingTool();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTool]);

  function toDataPoint(e: { clientX: number; clientY: number }): DataPoint {
    const rect = zoomRef.current!.getBoundingClientRect();
    return {
      x: zoomedXScale.invert(e.clientX - rect.left) as Date,
      y: zoomedPriceScale.invert(e.clientY - rect.top),
    };
  }

  function handleOverlayClick(e: React.MouseEvent<SVGRectElement>) {
    if (!activeTool) return;
    const point = toDataPoint(e);
    if (!pendingPoint) {
      setPendingPoint(point);
      setPreviewPoint(point);
      return;
    }
    const drawing: TrendLineDrawing = {
      id: `drawing-${drawingIdRef.current++}`,
      x1: pendingPoint.x,
      y1: pendingPoint.y,
      x2: point.x,
      y2: point.y,
    };
    commitDrawings([...drawings, drawing]);
    cancelDrawingTool();
  }

  function handleEndpointPointerDown(drawingId: string, which: 1 | 2) {
    return (e: React.PointerEvent<SVGCircleElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragEndpointRef.current = { id: drawingId, which };
    };
  }

  function handleEndpointPointerMove(e: React.PointerEvent<SVGCircleElement>) {
    const drag = dragEndpointRef.current;
    if (!drag) return;
    const point = toDataPoint(e);
    commitDrawings(
      drawings.map((d) => {
        if (d.id !== drag.id) return d;
        return drag.which === 1 ? { ...d, x1: point.x, y1: point.y } : { ...d, x2: point.x, y2: point.y };
      })
    );
  }

  function handleEndpointPointerUp(e: React.PointerEvent<SVGCircleElement>) {
    dragEndpointRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const slotWidth = data.length > 0 ? dims.boundedWidth / data.length : 0;
  const candleWidth = Math.max(1, Math.min(24, slotWidth * transform.k * 0.6));

  const visible = useMemo(() => {
    if (data.length === 0) return [];
    const [d0, d1] = zoomedXScale.domain();
    const bisect = d3.bisector<Candle, Date>((d) => d.date).left;
    const start = Math.max(0, bisect(data, d0 as Date) - 2);
    const end = Math.min(data.length, bisect(data, d1 as Date) + 2);
    return data.slice(start, end);
  }, [data, zoomedXScale]);

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const target = zoomedXScale.invert(mouseX);
    const bisect = d3.bisector<Candle, Date>((d) => d.date).left;
    const index = Math.min(data.length - 1, Math.max(0, bisect(data, target as Date)));
    setHoverIndex(index);

    if (activeTool && pendingPoint) {
      setPreviewPoint({ x: zoomedXScale.invert(mouseX) as Date, y: zoomedPriceScale.invert(mouseY) });
    } else if (!activeTool && drawings.length > 0) {
      let closestId: string | null = null;
      let closestDist = DRAWING_HIT_DISTANCE;
      for (const dr of drawings) {
        const d = distanceToSegment(
          mouseX,
          mouseY,
          zoomedXScale(dr.x1),
          zoomedPriceScale(dr.y1),
          zoomedXScale(dr.x2),
          zoomedPriceScale(dr.y2)
        );
        if (d < closestDist) {
          closestDist = d;
          closestId = dr.id;
        }
      }
      setHoveredDrawingId(closestId);
    }
  }

  if (dims.width === 0) return <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")} style={{ height }} />;
  if (data.length === 0) {
    return (
      <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")} style={{ height }}>
        <div className="lq-chart__empty">Aucune donnée</div>
      </div>
    );
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const dFmt = formatDate ?? d3.timeFormat("%d %b %Y");
  const pFmt = formatPrice ?? ((v: number) => v.toFixed(2));
  const vFmt = formatVolume ?? ((v: number) => d3.format(".2s")(v));

  return (
    <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")}>
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
      {drawingTools && (
        <div className="lq-chart__tools-toolbar">
          <button
            type="button"
            className={["lq-chart__icon-button", activeTool === "trendline" && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
            onClick={() => handleToolClick("trendline")}
            aria-label="Ligne de tendance"
            aria-pressed={activeTool === "trendline"}
          >
            <TrendLineIcon size={14} />
          </button>
        </div>
      )}
      <svg className="lq-chart__svg" width={dims.width} height={dims.height} role="img">
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={dims.boundedWidth} height={dims.boundedHeight} />
          </clipPath>
        </defs>
        <g transform={`translate(${dims.margin.left}, ${dims.margin.top})`}>
          <ChartAxis scale={zoomedPriceScale} orientation="left" grid gridLength={dims.boundedWidth} tickFormat={(v) => pFmt(Number(v))} />

          <g clipPath={`url(#${clipId})`}>
            {visible.map((d) => {
              const cx = zoomedXScale(d.date);
              const up = d.close >= d.open;
              const bodyTop = zoomedPriceScale(Math.max(d.open, d.close));
              const bodyBottom = zoomedPriceScale(Math.min(d.open, d.close));
              return (
                <g key={d.date.getTime()} className={up ? "lq-candle lq-candle--up" : "lq-candle lq-candle--down"}>
                  <line className="lq-candle-wick" x1={cx} x2={cx} y1={zoomedPriceScale(d.high)} y2={zoomedPriceScale(d.low)} />
                  <rect
                    className="lq-candle-body"
                    x={cx - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={Math.max(1, bodyBottom - bodyTop)}
                  />
                </g>
              );
            })}

            {hovered && (
              <line
                className="lq-chart__crosshair-line"
                x1={zoomedXScale(hovered.date)}
                x2={zoomedXScale(hovered.date)}
                y1={0}
                y2={dims.boundedHeight}
              />
            )}

            {showVolume && (
              <g transform={`translate(0, ${priceHeight + volumeGap})`}>
                {visible.map((d) => {
                  const cx = zoomedXScale(d.date);
                  const up = d.close >= d.open;
                  const barHeight = volumeHeight - volumeScale(d.volume ?? 0);
                  return (
                    <rect
                      key={d.date.getTime()}
                      className={up ? "lq-candle-volume lq-candle-volume--up" : "lq-candle-volume lq-candle-volume--down"}
                      x={cx - candleWidth / 2}
                      y={volumeHeight - barHeight}
                      width={candleWidth}
                      height={Math.max(0, barHeight)}
                    />
                  );
                })}
              </g>
            )}

            {drawings.map((dr) => {
              const x1 = zoomedXScale(dr.x1);
              const y1 = zoomedPriceScale(dr.y1);
              const x2 = zoomedXScale(dr.x2);
              const y2 = zoomedPriceScale(dr.y2);
              const isHovered = hoveredDrawingId === dr.id;
              return (
                <g key={dr.id}>
                  <line
                    className={["lq-chart__drawing-line", isHovered && "lq-chart__drawing-line--hover"].filter(Boolean).join(" ")}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                  />
                  {isHovered && (
                    <>
                      <circle
                        className="lq-chart__drawing-handle"
                        cx={x1}
                        cy={y1}
                        r={5}
                        onPointerDown={handleEndpointPointerDown(dr.id, 1)}
                        onPointerMove={handleEndpointPointerMove}
                        onPointerUp={handleEndpointPointerUp}
                      />
                      <circle
                        className="lq-chart__drawing-handle"
                        cx={x2}
                        cy={y2}
                        r={5}
                        onPointerDown={handleEndpointPointerDown(dr.id, 2)}
                        onPointerMove={handleEndpointPointerMove}
                        onPointerUp={handleEndpointPointerUp}
                      />
                    </>
                  )}
                </g>
              );
            })}

            {activeTool && pendingPoint && previewPoint && (
              <line
                className="lq-chart__drawing-line lq-chart__drawing-line--preview"
                x1={zoomedXScale(pendingPoint.x)}
                y1={zoomedPriceScale(pendingPoint.y)}
                x2={zoomedXScale(previewPoint.x)}
                y2={zoomedPriceScale(previewPoint.y)}
              />
            )}
          </g>

          {showVolume && (
            <g transform={`translate(0, ${priceHeight + volumeGap})`}>
              <ChartAxis scale={volumeScale} orientation="left" ticks={2} tickFormat={(v) => vFmt(Number(v))} />
            </g>
          )}

          <ChartAxis scale={zoomedXScale} orientation="bottom" transform={`translate(0, ${dims.boundedHeight})`} tickFormat={(v) => dFmt(v as Date)} />

          <rect
            ref={zoomRef}
            className={["lq-chart__overlay", activeTool && "lq-chart__overlay--drawing"].filter(Boolean).join(" ")}
            width={dims.boundedWidth}
            height={dims.boundedHeight}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => {
              setHoverIndex(null);
              if (!dragEndpointRef.current) setHoveredDrawingId(null);
            }}
            onClick={handleOverlayClick}
          />

          <rect
            ref={yAxisWheelRef}
            className="lq-chart__axis-drag lq-chart__axis-drag--y"
            x={-dims.margin.left}
            y={0}
            width={dims.margin.left}
            height={priceHeight}
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

      {hovered &&
        (() => {
          const x = dims.margin.left + zoomedXScale(hovered.date);
          return (
            <ChartTooltip x={x} y={dims.margin.top} visible align={x > dims.width * 0.65 ? "left" : "right"}>
              <div className="lq-chart-tooltip__title">{dFmt(hovered.date)}</div>
              <div className="lq-chart-tooltip__row">O <strong>{pFmt(hovered.open)}</strong></div>
              <div className="lq-chart-tooltip__row">H <strong>{pFmt(hovered.high)}</strong></div>
              <div className="lq-chart-tooltip__row">L <strong>{pFmt(hovered.low)}</strong></div>
              <div className="lq-chart-tooltip__row">C <strong>{pFmt(hovered.close)}</strong></div>
              {hovered.volume !== undefined && <div className="lq-chart-tooltip__row">Vol <strong>{vFmt(hovered.volume)}</strong></div>}
            </ChartTooltip>
          );
        })()}
    </div>
  );
}
