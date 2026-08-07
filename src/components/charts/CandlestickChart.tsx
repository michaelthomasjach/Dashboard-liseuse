import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useChartDimensions, type ChartMargin } from "./internal/useChartDimensions";
import { useD3Zoom } from "./internal/useD3Zoom";
import { useAxisDragRescale } from "./internal/useAxisDragRescale";
import { useAxisWheelZoom } from "./internal/useAxisWheelZoom";
import { useFullscreen } from "./internal/useFullscreen";
import { ChartAxis } from "./ChartAxis";
import { MaximizeIcon, MinimizeIcon, TrendLineIcon } from "../icons";
import "./charts-shared.css";

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
/** Width of the drawing-tools rail. Added to the right margin so the plot/axes never draw
 *  under it — the rail gets its own reserved strip instead of overlaying the chart. */
const TOOLS_RAIL_WIDTH = 40;

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
  const [hoverY, setHoverY] = useState<number | null>(null);
  const dragEndpointRef = useRef<{ id: string; which: 1 | 2 } | null>(null);
  const drawingIdRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [themeTick, setThemeTick] = useState(0);

  // Mirrors hoveredDrawingId so useD3Zoom's filter (a plain callback, run outside React) can
  // read it synchronously at pointerdown time, without re-attaching the zoom behavior on
  // every hover change.
  const hoveredDrawingIdRef = useRef<string | null>(null);
  function updateHoveredDrawingId(id: string | null) {
    hoveredDrawingIdRef.current = id;
    setHoveredDrawingId(id);
  }

  // Set while dragging a whole drawing (pointer down directly on its body, not an endpoint).
  const dragLineRef = useRef<{ id: string; startClientX: number; startClientY: number; orig: TrendLineDrawing } | null>(null);
  // Set while dragging the plot body itself to pan the price axis vertically (independent of
  // d3-zoom's own horizontal pan, which only ever touches the X transform).
  const dragPanRef = useRef<{ startClientY: number; startYTransform: d3.ZoomTransform } | null>(null);

  function commitDrawings(next: TrendLineDrawing[]) {
    setDrawings(next);
    onDrawingsChange?.(next);
  }

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const baseMargin = margin ?? DEFAULT_MARGIN;
  const resolvedMargin = drawingTools
    ? { ...baseMargin, right: (baseMargin.right ?? DEFAULT_MARGIN.right ?? 8) + TOOLS_RAIL_WIDTH }
    : baseMargin;
  const [ref, dims] = useChartDimensions(resolvedMargin, { height: isFullscreen ? undefined : height });

  // The candles/volume/crosshair/drawings are drawn on a <canvas> for performance with large
  // datasets (versus one SVG node per candle). Canvas has no live binding to CSS custom
  // properties, so redraws re-read them from the DOM — this observer just triggers that redraw
  // whenever the active palette/surface actually changes.
  useEffect(() => {
    const el = ref.current;
    const root = el?.closest(".lq-root");
    if (!root) return;
    const observer = new MutationObserver(() => setThemeTick((t) => t + 1));
    observer.observe(root, { attributes: true, attributeFilter: ["data-lq-palette", "data-lq-surface"] });
    return () => observer.disconnect();
  }, [ref]);

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

  // High enough that zooming all the way in leaves roughly one candle's slot filling the
  // viewport, regardless of how many candles are in `data` (a fixed cap like 20 would only
  // ever reveal ~20 candles at max zoom on a large dataset).
  const maxXZoom = Math.max(20, data.length);

  const { ref: zoomRef, reset: resetX, setTransform: setXTransformViaZoom } = useD3Zoom<SVGRectElement>({
    width: dims.boundedWidth,
    height: dims.boundedHeight,
    enabled: zoomable && activeTool === null,
    scaleExtent: [1, maxXZoom],
    onZoom: setTransform,
    filter: () => hoveredDrawingIdRef.current === null,
  });

  const xAxisDrag = useAxisDragRescale({
    axis: "x",
    size: dims.boundedWidth,
    transform,
    onChange: setXTransformViaZoom,
    scaleExtent: [1, maxXZoom],
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
    scaleExtent: [1, maxXZoom],
    size: dims.boundedWidth,
  });
  const yAxisWheelRef = useAxisWheelZoom<SVGRectElement>({
    axis: "y",
    transform: yTransform,
    onChange: setYTransform,
    enabled: zoomable,
    size: priceHeight,
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

    if (dragLineRef.current) {
      const drag = dragLineRef.current;
      const dxPixels = e.clientX - drag.startClientX;
      const dyPixels = e.clientY - drag.startClientY;
      const newX1 = zoomedXScale.invert(zoomedXScale(drag.orig.x1) + dxPixels) as Date;
      const newY1 = zoomedPriceScale.invert(zoomedPriceScale(drag.orig.y1) + dyPixels);
      const newX2 = zoomedXScale.invert(zoomedXScale(drag.orig.x2) + dxPixels) as Date;
      const newY2 = zoomedPriceScale.invert(zoomedPriceScale(drag.orig.y2) + dyPixels);
      commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, x1: newX1, y1: newY1, x2: newX2, y2: newY2 } : d)));
      return;
    }

    if (dragPanRef.current) {
      const drag = dragPanRef.current;
      const dy = e.clientY - drag.startClientY;
      const t0 = drag.startYTransform;
      setYTransform(d3.zoomIdentity.scale(t0.k).translate(0, t0.y / t0.k + dy / t0.k));
      return;
    }

    const target = zoomedXScale.invert(mouseX);
    const bisect = d3.bisector<Candle, Date>((d) => d.date).left;
    const index = Math.min(data.length - 1, Math.max(0, bisect(data, target as Date)));
    setHoverIndex(index);
    setHoverY(mouseY <= priceHeight ? mouseY : null);

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
      updateHoveredDrawingId(closestId);
    }
  }

  function handleOverlayPointerDown(e: React.PointerEvent<SVGRectElement>) {
    if (activeTool) return;
    if (hoveredDrawingId) {
      const dr = drawings.find((d) => d.id === hoveredDrawingId);
      if (dr) {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragLineRef.current = { id: dr.id, startClientX: e.clientX, startClientY: e.clientY, orig: dr };
        return;
      }
    }
    if (zoomable) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragPanRef.current = { startClientY: e.clientY, startYTransform: yTransform };
    }
  }

  function handleOverlayPointerUp(e: React.PointerEvent<SVGRectElement>) {
    dragLineRef.current = null;
    dragPanRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = ref.current;
    if (!canvas || !wrapper || dims.boundedWidth <= 0 || dims.boundedHeight <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.boundedWidth * dpr;
    canvas.height = dims.boundedHeight * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, dims.boundedWidth, dims.boundedHeight);

    const style = getComputedStyle(wrapper);
    const colorUp = style.getPropertyValue("--lq-color-up").trim();
    const colorDown = style.getPropertyValue("--lq-color-down").trim();
    const colorBg = style.getPropertyValue("--lq-color-bg").trim();
    const colorText = style.getPropertyValue("--lq-color-text").trim();
    const colorMuted = style.getPropertyValue("--lq-color-text-muted").trim();
    const colorAccent = style.getPropertyValue("--lq-color-accent").trim();
    const colorGrid = style.getPropertyValue("--lq-color-border-subtle").trim();
    const isEink = wrapper.closest('[data-lq-palette="eink"]') !== null;

    // Drawn first, underneath everything else — mirrors ChartAxis's own grid (same `ticks(5)`
    // the SVG price axis would otherwise use), kept on canvas so it stays behind the candles
    // instead of the SVG (which paints on top of the canvas) covering them.
    ctx.save();
    ctx.strokeStyle = colorGrid;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    for (const tick of zoomedPriceScale.ticks(5)) {
      const y = zoomedPriceScale(tick);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dims.boundedWidth, y);
      ctx.stroke();
    }
    ctx.restore();

    if (showVolume) {
      ctx.save();
      ctx.translate(0, priceHeight + volumeGap);
      for (const d of visible) {
        const cx = zoomedXScale(d.date);
        const up = d.close >= d.open;
        const barHeight = Math.max(0, volumeHeight - volumeScale(d.volume ?? 0));
        ctx.globalAlpha = isEink ? (up ? 0.15 : 0.35) : 0.55;
        ctx.fillStyle = isEink ? colorText : up ? colorUp : colorDown;
        ctx.fillRect(cx - candleWidth / 2, volumeHeight - barHeight, candleWidth, barHeight);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    for (const d of visible) {
      const cx = zoomedXScale(d.date);
      const up = d.close >= d.open;
      const bodyTop = zoomedPriceScale(Math.max(d.open, d.close));
      const bodyBottom = zoomedPriceScale(Math.min(d.open, d.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);
      const hueColor = up ? colorUp : colorDown;

      ctx.lineWidth = 1;
      ctx.strokeStyle = isEink ? colorText : hueColor;
      ctx.beginPath();
      ctx.moveTo(cx, zoomedPriceScale(d.high));
      ctx.lineTo(cx, zoomedPriceScale(d.low));
      ctx.stroke();

      // E-ink can't code up/down by hue, so it falls back to the standard hollow/filled OHLC convention.
      ctx.fillStyle = isEink ? (up ? colorBg : colorText) : hueColor;
      ctx.strokeStyle = isEink ? colorText : hueColor;
      ctx.fillRect(cx - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      ctx.strokeRect(cx - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    }

    if (hovered) {
      ctx.save();
      ctx.strokeStyle = colorMuted;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      const hx = zoomedXScale(hovered.date);
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, dims.boundedHeight);
      ctx.stroke();
      if (hoverY !== null) {
        ctx.beginPath();
        ctx.moveTo(0, hoverY);
        ctx.lineTo(dims.boundedWidth, hoverY);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const dr of drawings) {
      ctx.strokeStyle = colorAccent;
      ctx.lineWidth = hoveredDrawingId === dr.id ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(zoomedXScale(dr.x1), zoomedPriceScale(dr.y1));
      ctx.lineTo(zoomedXScale(dr.x2), zoomedPriceScale(dr.y2));
      ctx.stroke();
    }

    if (activeTool && pendingPoint && previewPoint) {
      ctx.save();
      ctx.strokeStyle = colorAccent;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(zoomedXScale(pendingPoint.x), zoomedPriceScale(pendingPoint.y));
      ctx.lineTo(zoomedXScale(previewPoint.x), zoomedPriceScale(previewPoint.y));
      ctx.stroke();
      ctx.restore();
    }
  }, [
    visible,
    zoomedXScale,
    zoomedPriceScale,
    candleWidth,
    showVolume,
    volumeScale,
    volumeHeight,
    volumeGap,
    priceHeight,
    hovered,
    hoverY,
    drawings,
    hoveredDrawingId,
    activeTool,
    pendingPoint,
    previewPoint,
    dims.boundedWidth,
    dims.boundedHeight,
    themeTick,
    ref,
  ]);

  if (dims.width === 0) return <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")} style={{ height }} />;
  if (data.length === 0) {
    return (
      <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")} style={{ height }}>
        <div className="lq-chart__empty">Aucune donnée</div>
      </div>
    );
  }

  const dFmt = formatDate ?? d3.timeFormat("%d %b %Y");
  const pFmt = formatPrice ?? ((v: number) => v.toFixed(2));
  const vFmt = formatVolume ?? ((v: number) => d3.format(".2s")(v));

  return (
    <div
      ref={ref}
      className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")}
      onPointerLeave={() => {
        if (!dragEndpointRef.current) updateHoveredDrawingId(null);
      }}
    >
      <div className="lq-chart__toolbar" style={drawingTools ? { right: TOOLS_RAIL_WIDTH } : undefined}>
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
        <div className="lq-chart__tools-rail" style={{ width: TOOLS_RAIL_WIDTH, height: dims.height }}>
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
      <div className="lq-chart__plot">
        <canvas
          ref={canvasRef}
          className="lq-chart__canvas"
          style={{
            left: dims.margin.left,
            top: dims.margin.top,
            width: dims.boundedWidth,
            height: dims.boundedHeight,
          }}
        />
        <svg className="lq-chart__svg" width={dims.width} height={dims.height} role="img">
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={dims.boundedWidth} height={dims.boundedHeight} />
            </clipPath>
          </defs>
          <g transform={`translate(${dims.margin.left}, ${dims.margin.top})`}>
            <ChartAxis scale={zoomedPriceScale} orientation="left" tickFormat={(v) => pFmt(Number(v))} />

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
              onPointerDown={handleOverlayPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handleOverlayPointerUp}
              onPointerLeave={() => {
                setHoverIndex(null);
                setHoverY(null);
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

            {/* Rendered last (on top of the zoom/pan overlay and axis-drag strips) so the handles
                actually receive pointer events instead of the overlay swallowing them first. */}
            <g clipPath={`url(#${clipId})`}>
              {drawings.map((dr) => {
                const isHovered = hoveredDrawingId === dr.id;
                if (!isHovered) return null;
                const x1 = zoomedXScale(dr.x1);
                const y1 = zoomedPriceScale(dr.y1);
                const x2 = zoomedXScale(dr.x2);
                const y2 = zoomedPriceScale(dr.y2);
                return (
                  <g key={dr.id}>
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
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {hoverY !== null && (
          <div
            className="lq-chart__axis-value lq-chart__axis-value--y"
            style={{ top: dims.margin.top + hoverY, width: dims.margin.left }}
          >
            {pFmt(zoomedPriceScale.invert(hoverY))}
          </div>
        )}
        {hovered && (
          <div
            className="lq-chart__axis-value lq-chart__axis-value--x"
            style={{ left: dims.margin.left + zoomedXScale(hovered.date), top: dims.margin.top + dims.boundedHeight }}
          >
            {dFmt(hovered.date)}
          </div>
        )}
      </div>
    </div>
  );
}
