import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useChartDimensions, type ChartMargin } from "./internal/useChartDimensions";
import { useD3Zoom } from "./internal/useD3Zoom";
import { useAxisDragRescale } from "./internal/useAxisDragRescale";
import { useAxisWheelZoom } from "./internal/useAxisWheelZoom";
import { useFullscreen } from "./internal/useFullscreen";
import { ChartAxis } from "./ChartAxis";
import { Popover } from "../forms/Popover";
import { TextField } from "../forms/TextField";
import { NumberField } from "../forms/NumberField";
import { Modal } from "../primitives/Modal";
import { MaximizeIcon, MinimizeIcon, TrendLineIcon, ChevronDownIcon } from "../icons";
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
  /** Optional label rendered above the line's midpoint. */
  text?: string;
  /** CSS color. Defaults to the theme's accent color. */
  color?: string;
  /** Line thickness in px. Default 1.5. */
  strokeWidth?: number;
}

interface DataPoint {
  x: Date;
  y: number;
}

export interface TimeframeOption {
  label: string;
  value: string;
}

export interface TimeframeGroup {
  group: string;
  options: TimeframeOption[];
}

export type TimeframeEntry = TimeframeOption | TimeframeGroup;

function isTimeframeGroup(entry: TimeframeEntry): entry is TimeframeGroup {
  return "options" in entry;
}

function findTimeframeLabel(entries: TimeframeEntry[] | undefined, value: string | undefined): string | null {
  if (!entries || !value) return null;
  for (const entry of entries) {
    if (isTimeframeGroup(entry)) {
      const found = entry.options.find((o) => o.value === value);
      if (found) return found.label;
    } else if (entry.value === value) {
      return entry.label;
    }
  }
  return null;
}

export interface CandlestickChartProps {
  data: Candle[];
  height?: number;
  zoomable?: boolean;
  showVolume?: boolean;
  formatDate?: (d: Date) => string;
  formatPrice?: (v: number) => string;
  formatVolume?: (v: number) => string;
  /** Shows a fullscreen toggle button in the header. Default true. */
  fullscreenToggle?: boolean;
  /** Shows a left-docked toolbar for drawing annotations directly on the chart (currently: trend line). Default false. */
  drawingTools?: boolean;
  /** Uncontrolled initial set of trend-line drawings. */
  defaultDrawings?: TrendLineDrawing[];
  /** Fires whenever a drawing is added, moved, or edited. */
  onDrawingsChange?: (drawings: TrendLineDrawing[]) => void;
  /** Timeframe/interval options shown as a dropdown in the header — flat, or grouped (e.g. one
   *  group per "Minutes"/"Heures"/"Jours"), matching a typical trading-platform interval menu.
   *  This only renders the picker and reports the choice via `onTimeframeChange`; resampling
   *  `data` into the new interval is left to the caller. */
  timeframes?: TimeframeEntry[];
  /** Currently selected timeframe's `value`, to highlight it in the menu. */
  timeframe?: string;
  onTimeframeChange?: (value: string) => void;
  margin?: Partial<ChartMargin>;
  className?: string;
}

const DEFAULT_MARGIN: Partial<ChartMargin> = { top: 0, right: 56, bottom: 24, left: 8 };
/** Screen-space distance (px) under which the pointer counts as "hovering" a drawn line. */
const DRAWING_HIT_DISTANCE = 8;
/** Width of the drawing-tools rail. Added to the left margin so the plot/axes never draw
 *  under it — the rail gets its own reserved strip instead of overlaying the chart. */
const TOOLS_RAIL_WIDTH = 40;
/** Height of the (non-floating) header row holding the timeframe picker and reset/fullscreen
 *  buttons — subtracted from the available height before laying out the plot itself. */
const HEADER_HEIGHT = 40;
const DEFAULT_DRAWING_COLOR = "#6c87c9";

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromDateInputValue(text: string, fallback: Date): Date {
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return fallback;
  const next = new Date(fallback);
  next.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return next;
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
  timeframes,
  timeframe,
  onTimeframeChange,
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
  const [hoverVolumeY, setHoverVolumeY] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TrendLineDrawing | null>(null);
  const [tfOpen, setTfOpen] = useState(false);
  const dragEndpointRef = useRef<{ id: string; which: 1 | 2 } | null>(null);
  const drawingIdRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tfAnchorRef = useRef<HTMLButtonElement>(null);
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

  // True while dragging the plot body to pan the price axis vertically, independent of
  // d3-zoom's own horizontal pan (see handleOverlayPointerDown) — only used to have
  // handlePointerMove skip its hover-detection work while this drag is live.
  const isPanningYRef = useRef(false);

  function commitDrawings(next: TrendLineDrawing[]) {
    setDrawings(next);
    onDrawingsChange?.(next);
  }

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const baseMargin = margin ?? DEFAULT_MARGIN;
  const resolvedMargin = drawingTools
    ? { ...baseMargin, left: (baseMargin.left ?? DEFAULT_MARGIN.left ?? 8) + TOOLS_RAIL_WIDTH }
    : baseMargin;
  const [ref, dims] = useChartDimensions(resolvedMargin, { height: isFullscreen ? undefined : height });

  const showHeader = fullscreenToggle || zoomable || !!timeframes?.length;
  const headerSpace = showHeader ? HEADER_HEIGHT : 0;
  const plotHeight = Math.max(0, dims.height - headerSpace);
  const plotBoundedHeight = Math.max(0, plotHeight - dims.margin.top - dims.margin.bottom);

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

  // No breathing room between the price section and the volume section below it: the divider
  // line itself is the only separation, flush against both (same "the border delimits the
  // content" rule applied to the tools rail and the header above).
  const volumeHeight = showVolume ? Math.round(plotBoundedHeight * 0.22) : 0;
  const priceHeight = Math.max(0, plotBoundedHeight - volumeHeight);

  // Padded by half the average inter-candle gap on each side, so the first/last candle get a
  // full slot like every other one — without this, their center sits exactly on the domain's
  // edge, so half their body/wick (and volume bar) falls past x=0 or x=boundedWidth and is
  // simply not drawn (the canvas doesn't paint outside its own box), leaving a gap between the
  // outermost candle and the axis that grows every time the candles themselves get wider.
  const xScale = useMemo(() => {
    const extent = d3.extent(data, (d) => d.date) as [Date, Date];
    if (!extent[0] || !extent[1]) {
      return d3.scaleTime().domain([new Date(), new Date()]).range([0, dims.boundedWidth]);
    }
    const avgGapMs = data.length > 1 ? (extent[1].getTime() - extent[0].getTime()) / (data.length - 1) : 24 * 60 * 60 * 1000;
    const halfGap = avgGapMs / 2;
    return d3
      .scaleTime()
      .domain([new Date(extent[0].getTime() - halfGap), new Date(extent[1].getTime() + halfGap)])
      .range([0, dims.boundedWidth]);
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

  // 10% headroom on top of the tallest bar, so it doesn't reach all the way up to the
  // price/volume divider — leaves a small visual gap between the bars and the line.
  const volumeScale = useMemo(() => {
    const max = d3.max(data, (d) => d.volume ?? 0) ?? 0;
    return d3.scaleLinear().domain([0, (max || 1) * 1.1]).range([volumeHeight, 0]);
  }, [data, volumeHeight]);

  // High enough that zooming all the way in leaves roughly one candle's slot filling the
  // viewport, regardless of how many candles are in `data` (a fixed cap like 20 would only
  // ever reveal ~20 candles at max zoom on a large dataset).
  const maxXZoom = Math.max(20, data.length);

  const { ref: zoomRef, reset: resetX, setTransform: setXTransformViaZoom } = useD3Zoom<SVGRectElement>({
    width: dims.boundedWidth,
    height: plotBoundedHeight,
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

  function handleOverlayDoubleClick() {
    if (activeTool || !hoveredDrawingId) return;
    const dr = drawings.find((d) => d.id === hoveredDrawingId);
    if (!dr) return;
    setEditingId(dr.id);
    setDraft(dr);
  }

  function closeEditModal() {
    setEditingId(null);
    setDraft(null);
  }

  function saveEditModal() {
    if (!editingId || !draft) return;
    commitDrawings(drawings.map((d) => (d.id === editingId ? draft : d)));
    closeEditModal();
  }

  function deleteEditingDrawing() {
    if (!editingId) return;
    commitDrawings(drawings.filter((d) => d.id !== editingId));
    closeEditModal();
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

  // Precise (unpadded) index range of candles actually inside the zoomed time domain — used
  // to size candles, separately from `visible` below (which pads a couple extra candles on
  // each side so partially-visible edge candles still render instead of popping in/out).
  const visibleRange = useMemo(() => {
    if (data.length === 0) return { start: 0, end: 0 };
    const [d0, d1] = zoomedXScale.domain();
    const bisect = d3.bisector<Candle, Date>((d) => d.date).left;
    return { start: bisect(data, d0 as Date), end: bisect(data, d1 as Date) };
  }, [data, zoomedXScale]);

  const visible = useMemo(() => {
    if (data.length === 0) return [];
    const start = Math.max(0, visibleRange.start - 2);
    const end = Math.min(data.length, visibleRange.end + 2);
    return data.slice(start, end);
  }, [data, visibleRange]);

  // Each candle fills up to 80% of the space actually available to it at the current zoom —
  // with a single candle visible, that's 80% of the whole plot width. Deliberately no minimum
  // pixel floor: with many candles crammed into a narrow view (e.g. fully zoomed out on a
  // 10,000-candle dataset), 80% of their slot is still less than the slot itself, so neighbors
  // never overlap — a floor like `max(1, ...)` would force overlap once the slot itself was
  // narrower than that floor.
  const visibleCount = Math.max(1, visibleRange.end - visibleRange.start);
  const candleWidth = Math.max(0.1, (dims.boundedWidth / visibleCount) * 0.8);

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

    if (isPanningYRef.current) return;

    const target = zoomedXScale.invert(mouseX);
    const bisect = d3.bisector<Candle, Date>((d) => d.date).left;
    const index = Math.min(data.length - 1, Math.max(0, bisect(data, target as Date)));
    setHoverIndex(index);
    setHoverY(mouseY <= priceHeight ? mouseY : null);
    setHoverVolumeY(showVolume && mouseY > priceHeight ? mouseY - priceHeight : null);

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

  // When hovering a drawing, starts a "drag the whole line" gesture — d3-zoom already backs off
  // in that case via the filter above, so capturing the pointer here doesn't compete with
  // anything. Otherwise starts an independent Y-pan via plain window listeners (same pattern
  // RangeSlider's drag uses) rather than a second setPointerCapture on the SAME overlay d3-zoom
  // is attached to — an earlier attempt did that, and it raced with d3-zoom's own native pointer
  // handling and broke X panning entirely. Window listeners never touch this element's pointer
  // capture, so d3-zoom's own gesture (handling X) is completely unaffected by this running
  // alongside it for Y.
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
    if (!zoomable) return;
    const startClientY = e.clientY;
    const startYTransform = yTransform;
    isPanningYRef.current = true;
    const onMove = (ev: PointerEvent) => {
      const dy = ev.clientY - startClientY;
      setYTransform(d3.zoomIdentity.scale(startYTransform.k).translate(0, startYTransform.y / startYTransform.k + dy / startYTransform.k));
    };
    const onUp = () => {
      isPanningYRef.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleOverlayPointerUp(e: React.PointerEvent<SVGRectElement>) {
    if (!dragLineRef.current) return;
    dragLineRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = ref.current;
    if (!canvas || !wrapper || dims.boundedWidth <= 0 || plotBoundedHeight <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.boundedWidth * dpr;
    canvas.height = plotBoundedHeight * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, dims.boundedWidth, plotBoundedHeight);

    const style = getComputedStyle(wrapper);
    const colorUp = style.getPropertyValue("--lq-color-up").trim();
    const colorDown = style.getPropertyValue("--lq-color-down").trim();
    const colorBg = style.getPropertyValue("--lq-color-bg").trim();
    const colorText = style.getPropertyValue("--lq-color-text").trim();
    const colorMuted = style.getPropertyValue("--lq-color-text-muted").trim();
    const colorAccent = style.getPropertyValue("--lq-color-accent").trim();
    const colorGrid = style.getPropertyValue("--lq-color-border-subtle").trim();
    const fontFamily = style.getPropertyValue("--lq-font-family").trim() || "sans-serif";
    const isEink = wrapper.closest('[data-lq-palette="eink"]') !== null;

    // Everything in price space (gridlines, candles, drawings, the price hover line) is clipped
    // to the price section's own rectangle — without this, panning/zooming the price axis could
    // push candles/drawings visually down into the volume area below, since rescaling the scale
    // doesn't clamp the pixels it produces to any particular range.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, dims.boundedWidth, priceHeight);
    ctx.clip();

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

    if (hovered && hoverY !== null) {
      ctx.save();
      ctx.strokeStyle = colorMuted;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, hoverY);
      ctx.lineTo(dims.boundedWidth, hoverY);
      ctx.stroke();
      ctx.restore();
    }

    for (const dr of drawings) {
      const lineColor = dr.color ?? colorAccent;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      const x1 = zoomedXScale(dr.x1);
      const y1 = zoomedPriceScale(dr.y1);
      const x2 = zoomedXScale(dr.x2);
      const y2 = zoomedPriceScale(dr.y2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (dr.text) {
        ctx.fillStyle = lineColor;
        ctx.font = `600 11px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(dr.text, (x1 + x2) / 2, Math.min(y1, y2) - 6);
      }
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

    ctx.restore(); // end price-section clip

    if (showVolume) {
      // Divider between the price plot and the volume plot below it — flush against both,
      // no padding on either side (the line itself is the only separation).
      ctx.save();
      ctx.strokeStyle = colorGrid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, priceHeight);
      ctx.lineTo(dims.boundedWidth, priceHeight);
      ctx.stroke();
      ctx.restore();

      // Clipped to its own rectangle for the same reason as the price section above.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, priceHeight, dims.boundedWidth, volumeHeight);
      ctx.clip();
      ctx.translate(0, priceHeight);
      for (const d of visible) {
        const cx = zoomedXScale(d.date);
        const up = d.close >= d.open;
        const barHeight = Math.max(0, volumeHeight - volumeScale(d.volume ?? 0));
        ctx.globalAlpha = isEink ? (up ? 0.15 : 0.35) : 0.55;
        ctx.fillStyle = isEink ? colorText : up ? colorUp : colorDown;
        ctx.fillRect(cx - candleWidth / 2, volumeHeight - barHeight, candleWidth, barHeight);
      }
      ctx.globalAlpha = 1;
      if (hoverVolumeY !== null) {
        ctx.strokeStyle = colorMuted;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, hoverVolumeY);
        ctx.lineTo(dims.boundedWidth, hoverVolumeY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Vertical crosshair spans the full plot (price and volume together) — deliberately drawn
    // outside either section's clip above.
    if (hovered) {
      ctx.save();
      ctx.strokeStyle = colorMuted;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      const hx = zoomedXScale(hovered.date);
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, plotBoundedHeight);
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
    priceHeight,
    hovered,
    hoverY,
    hoverVolumeY,
    drawings,
    hoveredDrawingId,
    activeTool,
    pendingPoint,
    previewPoint,
    dims.boundedWidth,
    plotBoundedHeight,
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
  const currentTimeframeLabel = findTimeframeLabel(timeframes, timeframe);

  return (
    <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")}>
      {showHeader && (
        <div className="lq-chart__header" style={{ width: dims.width }}>
          {timeframes && timeframes.length > 0 && (
            <>
              <button ref={tfAnchorRef} type="button" className="lq-chart__timeframe-trigger" onClick={() => setTfOpen((o) => !o)}>
                {currentTimeframeLabel ?? "Intervalle"}
                <ChevronDownIcon size={12} />
              </button>
              <Popover open={tfOpen} onClose={() => setTfOpen(false)} anchorRef={tfAnchorRef} placement="bottom">
                <div className="lq-chart__timeframe-menu">
                  {timeframes.map((entry) =>
                    isTimeframeGroup(entry) ? (
                      <div key={entry.group} className="lq-chart__timeframe-group">
                        <div className="lq-chart__timeframe-group-label">{entry.group}</div>
                        {entry.options.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={["lq-chart__timeframe-option", opt.value === timeframe && "lq-chart__timeframe-option--selected"]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => {
                              onTimeframeChange?.(opt.value);
                              setTfOpen(false);
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        key={entry.value}
                        type="button"
                        className={["lq-chart__timeframe-option", entry.value === timeframe && "lq-chart__timeframe-option--selected"]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => {
                          onTimeframeChange?.(entry.value);
                          setTfOpen(false);
                        }}
                      >
                        {entry.label}
                      </button>
                    )
                  )}
                </div>
              </Popover>
            </>
          )}
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
      )}

      <div className="lq-chart__plot" style={{ width: dims.width, height: plotHeight }}>
        {/* Positioned relative to .lq-chart__plot (not the outer .lq-chart), same reason the
            canvas is: .lq-chart carries padding in fullscreen mode and only .lq-chart__plot's
            box lines up with where the svg/canvas content actually starts. Explicitly sized
            (not left to intrinsic sizing from its svg child) so it can never drift from `dims`
            regardless of how the fullscreen flex container's own stretch/centering behaves. */}
        {/* Width is the *entire* reserved left margin (not just TOOLS_RAIL_WIDTH) so its
            right border lands exactly where the plot content starts — sizing it to the
            constant alone left an unstyled gap equal to the base margin between the rail
            and the first candle. Height spans the full plot (candles + volume + the date-axis
            label strip below them), reaching all the way down to the chart's own bottom border. */}
        {drawingTools && (
          <div className="lq-chart__tools-rail" style={{ width: dims.margin.left, height: plotHeight }}>
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
        <canvas
          ref={canvasRef}
          className="lq-chart__canvas"
          style={{
            left: dims.margin.left,
            top: dims.margin.top,
            width: dims.boundedWidth,
            height: plotBoundedHeight,
          }}
        />
        <svg className="lq-chart__svg" width={dims.width} height={plotHeight} role="img">
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={dims.boundedWidth} height={plotBoundedHeight} />
            </clipPath>
          </defs>
          <g transform={`translate(${dims.margin.left}, ${dims.margin.top})`}>
            <ChartAxis scale={zoomedPriceScale} orientation="right" transform={`translate(${dims.boundedWidth}, 0)`} tickFormat={(v) => pFmt(Number(v))} />

            {showVolume && (
              <>
                <g transform={`translate(0, ${priceHeight})`}>
                  <ChartAxis
                    scale={volumeScale}
                    orientation="right"
                    transform={`translate(${dims.boundedWidth}, 0)`}
                    ticks={2}
                    tickFormat={(v) => vFmt(Number(v))}
                  />
                </g>
                {/* Continues the canvas-drawn price/volume divider (which only covers
                    [0, boundedWidth], the canvas's own extent) across the price axis's
                    tick-label column so the divider reaches the full chart width and
                    visually separates the price ticks from the volume ticks too. */}
                <line
                  className="lq-chart__price-volume-divider"
                  x1={dims.boundedWidth}
                  x2={dims.boundedWidth + dims.margin.right}
                  y1={priceHeight}
                  y2={priceHeight}
                />
              </>
            )}

            <ChartAxis scale={zoomedXScale} orientation="bottom" transform={`translate(0, ${plotBoundedHeight})`} tickFormat={(v) => dFmt(v as Date)} />

            <rect
              ref={zoomRef}
              className={["lq-chart__overlay", activeTool && "lq-chart__overlay--drawing"].filter(Boolean).join(" ")}
              width={dims.boundedWidth}
              height={plotBoundedHeight}
              onPointerDown={handleOverlayPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handleOverlayPointerUp}
              onPointerLeave={() => {
                setHoverIndex(null);
                setHoverY(null);
                setHoverVolumeY(null);
              }}
              onClick={handleOverlayClick}
              onDoubleClick={handleOverlayDoubleClick}
            />

            <rect
              ref={yAxisWheelRef}
              className="lq-chart__axis-drag lq-chart__axis-drag--y"
              x={dims.boundedWidth}
              y={0}
              width={dims.margin.right}
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
              y={plotBoundedHeight}
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
          <div className="lq-chart__axis-value lq-chart__axis-value--y" style={{ top: dims.margin.top + hoverY, left: dims.margin.left + dims.boundedWidth }}>
            {pFmt(zoomedPriceScale.invert(hoverY))}
          </div>
        )}
        {hoverVolumeY !== null && (
          <div
            className="lq-chart__axis-value lq-chart__axis-value--y"
            style={{ top: dims.margin.top + priceHeight + hoverVolumeY, left: dims.margin.left + dims.boundedWidth }}
          >
            {vFmt(volumeScale.invert(hoverVolumeY))}
          </div>
        )}
        {hovered && (
          <div
            className="lq-chart__axis-value lq-chart__axis-value--x"
            style={{ left: dims.margin.left + zoomedXScale(hovered.date), top: dims.margin.top + plotBoundedHeight }}
          >
            {dFmt(hovered.date)}
          </div>
        )}
      </div>

      {editingId && draft && (
        <Modal
          open
          onClose={closeEditModal}
          title="Modifier la ligne"
          footer={
            <div className="lq-chart__edit-drawing-footer">
              <button type="button" className="lq-chart__reset-button" onClick={deleteEditingDrawing}>
                Supprimer
              </button>
              <button type="button" className="lq-chart__confirm-button" onClick={saveEditModal}>
                Enregistrer
              </button>
            </div>
          }
        >
          <TextField
            label="Texte"
            placeholder="Étiquette (optionnel)"
            value={draft.text ?? ""}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          />
          <div className="lq-chart__edit-drawing-row">
            <NumberField
              label="Épaisseur"
              min={1}
              max={8}
              step={0.5}
              value={draft.strokeWidth ?? 1.5}
              onChange={(v) => setDraft({ ...draft, strokeWidth: v === "" ? 1.5 : v })}
            />
            <div className="lq-field">
              <label className="lq-field__label">Couleur</label>
              <input
                type="color"
                className="lq-chart__color-input"
                value={draft.color ?? DEFAULT_DRAWING_COLOR}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              />
            </div>
          </div>
          <div className="lq-chart__edit-drawing-row">
            <div className="lq-field">
              <label className="lq-field__label">Début</label>
              <input
                type="date"
                className="lq-chart__date-input"
                value={toDateInputValue(draft.x1)}
                onChange={(e) => setDraft({ ...draft, x1: fromDateInputValue(e.target.value, draft.x1) })}
              />
            </div>
            <NumberField label="Prix début" step={0.01} value={draft.y1} onChange={(v) => setDraft({ ...draft, y1: v === "" ? draft.y1 : v })} />
          </div>
          <div className="lq-chart__edit-drawing-row">
            <div className="lq-field">
              <label className="lq-field__label">Fin</label>
              <input
                type="date"
                className="lq-chart__date-input"
                value={toDateInputValue(draft.x2)}
                onChange={(e) => setDraft({ ...draft, x2: fromDateInputValue(e.target.value, draft.x2) })}
              />
            </div>
            <NumberField label="Prix fin" step={0.01} value={draft.y2} onChange={(v) => setDraft({ ...draft, y2: v === "" ? draft.y2 : v })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
