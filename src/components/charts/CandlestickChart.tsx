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
import {
  MaximizeIcon,
  MinimizeIcon,
  TrendLineIcon,
  HorizontalLineIcon,
  VerticalLineIcon,
  ChevronDownIcon,
  PlusIcon,
  ActivityIcon,
  SettingsIcon,
} from "../icons";
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
  /** Constrains the line to one axis instead of a free-form two-point line: "horizontal" keeps
   *  y1 === y2 and can only be dragged vertically (its price/volume changes, never its date
   *  span, which always covers the full width); "vertical" keeps x1 === x2 and can only be
   *  dragged horizontally (its date changes, never its price span, which always covers the full
   *  height). Omitted for a regular hand-drawn trend line — set automatically by the axis "+"
   *  buttons. */
  lineType?: "horizontal" | "vertical";
  /** Which value scale a "horizontal" line's y is expressed in. Ignored for "vertical" lines and
   *  regular trend lines. Default "price". */
  valueAxis?: "price" | "volume";
}

interface DataPoint {
  x: Date;
  y: number;
}

export type IndicatorKind = "sma" | "ema" | "wma";

export interface Indicator {
  id: string;
  kind: IndicatorKind;
  /** Lookback window, in candles. */
  period: number;
  /** CSS color. Defaults to a color cycled from a small built-in palette. */
  color?: string;
}

interface IndicatorCatalogEntry {
  kind: IndicatorKind;
  label: string;
  shortLabel: string;
  defaultPeriod: number;
}

const INDICATOR_CATALOG: IndicatorCatalogEntry[] = [
  { kind: "sma", label: "Moyenne mobile simple (SMA)", shortLabel: "SMA", defaultPeriod: 20 },
  { kind: "ema", label: "Moyenne mobile exponentielle (EMA)", shortLabel: "EMA", defaultPeriod: 20 },
  { kind: "wma", label: "Moyenne mobile pondérée (WMA)", shortLabel: "WMA", defaultPeriod: 20 },
];

function indicatorCatalogEntry(kind: IndicatorKind): IndicatorCatalogEntry {
  return INDICATOR_CATALOG.find((entry) => entry.kind === kind) ?? INDICATOR_CATALOG[0];
}

function indicatorLabel(indicator: Indicator): string {
  return `${indicatorCatalogEntry(indicator.kind).shortLabel}(${indicator.period})`;
}

const INDICATOR_COLORS = ["#e0a95c", "#6c87c9", "#7fb37f", "#c96c8f", "#9a7fd1"];

function defaultIndicatorColor(index: number): string {
  return INDICATOR_COLORS[((index % INDICATOR_COLORS.length) + INDICATOR_COLORS.length) % INDICATOR_COLORS.length];
}

// Each returns one value per candle (null during the warm-up period before enough history has
// accumulated), so the result stays index-aligned with `data` — the draw effect windows it down
// to the visible range the exact same way `visible` windows `data` itself.
function computeSMAValues(data: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) sum -= data[i - period].close;
    if (i >= period - 1) result[i] = sum / period;
  }
  return result;
}

function computeEMAValues(data: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return result;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let ema = sum / period;
  result[period - 1] = ema;
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

function computeWMAValues(data: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < data.length; i++) {
    let weighted = 0;
    for (let j = 0; j < period; j++) weighted += data[i - period + 1 + j].close * (j + 1);
    result[i] = weighted / denom;
  }
  return result;
}

function computeIndicatorValues(data: Candle[], indicator: Indicator): (number | null)[] {
  const period = Math.max(1, Math.round(indicator.period));
  switch (indicator.kind) {
    case "ema":
      return computeEMAValues(data, period);
    case "wma":
      return computeWMAValues(data, period);
    case "sma":
    default:
      return computeSMAValues(data, period);
  }
}

type DrawingToolType = "trendline" | "horizontal" | "vertical";

const DRAWING_TOOLS: { type: DrawingToolType; label: string; icon: typeof TrendLineIcon }[] = [
  { type: "trendline", label: "Ligne de tendance", icon: TrendLineIcon },
  { type: "horizontal", label: "Ligne horizontale", icon: HorizontalLineIcon },
  { type: "vertical", label: "Ligne verticale", icon: VerticalLineIcon },
];

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
  /** Shows a header button that opens the technical-indicator picker (SMA, EMA, WMA…) and the
   *  active-indicator legend in the plot's top-left corner. Default false. */
  showIndicators?: boolean;
  /** Uncontrolled initial set of technical indicators. */
  defaultIndicators?: Indicator[];
  /** Fires whenever an indicator is added, edited, or removed. */
  onIndicatorsChange?: (indicators: Indicator[]) => void;
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
/** Distance (px) the date "+" button sits inset from the plot's own bottom edge — close to the
 *  date axis it mirrors (but clear of the date label's own badge just below the plot), and
 *  still inside the interactive rect so hovering it never counts as leaving the plot (see
 *  .lq-chart__plot's onPointerLeave). */
const CROSSHAIR_ADD_INSET = 20;
/** How far the price/volume value badges' own left edge overlaps the chart, so their background
 *  englobes the "+" button living at its start instead of the button sitting outside it. */
const AXIS_VALUE_Y_OVERLAP = 20;
/** Single drag-handle position for an axis-constrained line, as a fraction of the plot's own
 *  size along the axis it doesn't move on: a horizontal line's handle sits 1/4 of the width in
 *  from the right edge, a vertical line's handle 1/4 of the height down from the top. */
const AXIS_HANDLE_FRACTION_X = 0.75;
const AXIS_HANDLE_FRACTION_Y = 0.25;
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
  showIndicators = false,
  defaultIndicators,
  onIndicatorsChange,
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
  const [activeTool, setActiveTool] = useState<DrawingToolType | null>(null);
  // Which tool the rail's single button currently represents — stays selected across draws,
  // independent of whether drawing is actually active right now. Changed via the flyout menu.
  const [selectedToolType, setSelectedToolType] = useState<DrawingToolType>("trendline");
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<DataPoint | null>(null);
  const [previewPoint, setPreviewPoint] = useState<DataPoint | null>(null);
  const [hoveredDrawingId, setHoveredDrawingId] = useState<string | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const [hoverVolumeY, setHoverVolumeY] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TrendLineDrawing | null>(null);
  const [tfOpen, setTfOpen] = useState(false);
  const [indicators, setIndicators] = useState<Indicator[]>(defaultIndicators ?? []);
  const [indicatorPickerOpen, setIndicatorPickerOpen] = useState(false);
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);
  const [indicatorDraft, setIndicatorDraft] = useState<Indicator | null>(null);
  const dragEndpointRef = useRef<{ id: string; which: 1 | 2 } | null>(null);
  const dragAxisRef = useRef<{ id: string } | null>(null);
  const drawingIdRef = useRef(0);
  const indicatorIdRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tfAnchorRef = useRef<HTMLButtonElement>(null);
  const toolMenuAnchorRef = useRef<HTMLButtonElement>(null);
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

  function commitIndicators(next: Indicator[]) {
    setIndicators(next);
    onIndicatorsChange?.(next);
  }

  function addIndicator(entry: IndicatorCatalogEntry) {
    commitIndicators([...indicators, { id: `indicator-${indicatorIdRef.current++}`, kind: entry.kind, period: entry.defaultPeriod }]);
  }

  function openIndicatorSettings(id: string) {
    const indicator = indicators.find((i) => i.id === id);
    if (!indicator) return;
    setEditingIndicatorId(id);
    setIndicatorDraft(indicator);
  }

  function closeIndicatorSettings() {
    setEditingIndicatorId(null);
    setIndicatorDraft(null);
  }

  function saveIndicatorSettings() {
    if (!editingIndicatorId || !indicatorDraft) return;
    commitIndicators(indicators.map((i) => (i.id === editingIndicatorId ? indicatorDraft : i)));
    closeIndicatorSettings();
  }

  function deleteEditingIndicator() {
    if (!editingIndicatorId) return;
    commitIndicators(indicators.filter((i) => i.id !== editingIndicatorId));
    closeIndicatorSettings();
  }

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const baseMargin = margin ?? DEFAULT_MARGIN;
  const resolvedMargin = drawingTools
    ? { ...baseMargin, left: (baseMargin.left ?? DEFAULT_MARGIN.left ?? 8) + TOOLS_RAIL_WIDTH }
    : baseMargin;
  const [ref, dims] = useChartDimensions(resolvedMargin, { height: isFullscreen ? undefined : height });

  const showHeader = fullscreenToggle || zoomable || !!timeframes?.length || showIndicators;
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

  // All three span the dataset's own (unzoomed) extent rather than the currently visible one,
  // so they still reach edge to edge after the user zooms/pans away from where they were added
  // — a price alert or a session marker shouldn't disappear just because the view moved. Marked
  // with `lineType` so they drag along one axis only (see handlePointerMove/handleAxisHandle*)
  // and render full-span instead of between their stored x1/x2 (see the canvas draw effect).
  function addPriceLine() {
    if (hoverY === null) return;
    const price = zoomedPriceScale.invert(hoverY);
    const [d0, d1] = xScale.domain() as [Date, Date];
    commitDrawings([...drawings, { id: `drawing-${drawingIdRef.current++}`, x1: d0, y1: price, x2: d1, y2: price, lineType: "horizontal" }]);
  }

  function addVolumeLine() {
    if (hoverVolumeY === null) return;
    const volume = volumeScale.invert(hoverVolumeY);
    const [d0, d1] = xScale.domain() as [Date, Date];
    commitDrawings([
      ...drawings,
      { id: `drawing-${drawingIdRef.current++}`, x1: d0, y1: volume, x2: d1, y2: volume, lineType: "horizontal", valueAxis: "volume" },
    ]);
  }

  function addDateLine() {
    if (!hovered) return;
    const [p0, p1] = priceScale.domain() as [number, number];
    commitDrawings([...drawings, { id: `drawing-${drawingIdRef.current++}`, x1: hovered.date, y1: p0, x2: hovered.date, y2: p1, lineType: "vertical" }]);
  }

  function cancelDrawingTool() {
    setActiveTool(null);
    setPendingPoint(null);
    setPreviewPoint(null);
  }

  function handleToolClick(tool: DrawingToolType) {
    if (activeTool === tool) {
      cancelDrawingTool();
    } else {
      setActiveTool(tool);
      setPendingPoint(null);
      setPreviewPoint(null);
    }
  }

  // Picking a tool from the flyout menu only changes what the rail's single button represents —
  // it doesn't start drawing. The user still has to click that button afterward, same as any
  // other tool selection.
  function handleSelectToolType(type: DrawingToolType) {
    setSelectedToolType(type);
    setToolMenuOpen(false);
    cancelDrawingTool();
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

    // Axis-constrained lines only have one degree of freedom, so a single click places them —
    // no pending/preview step like the free trend line below.
    if (activeTool === "horizontal") {
      const rect = zoomRef.current!.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const [d0, d1] = xScale.domain() as [Date, Date];
      const drawing: TrendLineDrawing =
        showVolume && mouseY > priceHeight
          ? {
              id: `drawing-${drawingIdRef.current++}`,
              x1: d0,
              y1: volumeScale.invert(mouseY - priceHeight),
              x2: d1,
              y2: volumeScale.invert(mouseY - priceHeight),
              lineType: "horizontal",
              valueAxis: "volume",
            }
          : { id: `drawing-${drawingIdRef.current++}`, x1: d0, y1: point.y, x2: d1, y2: point.y, lineType: "horizontal" };
      commitDrawings([...drawings, drawing]);
      cancelDrawingTool();
      return;
    }
    if (activeTool === "vertical") {
      const [p0, p1] = priceScale.domain() as [number, number];
      commitDrawings([
        ...drawings,
        { id: `drawing-${drawingIdRef.current++}`, x1: point.x, y1: p0, x2: point.x, y2: p1, lineType: "vertical" },
      ]);
      cancelDrawingTool();
      return;
    }

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

  // Single-handle drag for an axis-constrained line: sets its value directly from the pointer's
  // absolute position (like the two-endpoint drag above), but along one axis only — a
  // "horizontal" line's handle only ever changes y1/y2 (kept equal), a "vertical" line's handle
  // only ever changes x1/x2 (kept equal).
  function handleAxisHandlePointerDown(drawingId: string) {
    return (e: React.PointerEvent<SVGCircleElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragAxisRef.current = { id: drawingId };
    };
  }

  function handleAxisHandlePointerMove(e: React.PointerEvent<SVGCircleElement>) {
    const drag = dragAxisRef.current;
    if (!drag) return;
    const dr = drawings.find((d) => d.id === drag.id);
    if (!dr) return;
    const rect = zoomRef.current!.getBoundingClientRect();
    if (dr.lineType === "horizontal") {
      const mouseY = e.clientY - rect.top;
      const value = dr.valueAxis === "volume" ? volumeScale.invert(mouseY - priceHeight) : zoomedPriceScale.invert(mouseY);
      commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, y1: value, y2: value } : d)));
    } else if (dr.lineType === "vertical") {
      const mouseX = e.clientX - rect.left;
      const dateValue = zoomedXScale.invert(mouseX) as Date;
      commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, x1: dateValue, x2: dateValue } : d)));
    }
  }

  function handleAxisHandlePointerUp(e: React.PointerEvent<SVGCircleElement>) {
    dragAxisRef.current = null;
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

  // Expensive (O(data.length) per indicator) — recomputed only when the data or the indicator
  // list itself changes, never on pan/zoom (which would otherwise redo this every frame).
  const indicatorValues = useMemo(
    () => indicators.map((indicator) => ({ indicator, values: computeIndicatorValues(data, indicator) })),
    [data, indicators]
  );

  // Cheap: slices the precomputed arrays down to the same padded visible window `visible` uses,
  // dropping the null (warm-up period) entries.
  const visibleIndicators = useMemo(() => {
    const start = Math.max(0, visibleRange.start - 2);
    const end = Math.min(data.length, visibleRange.end + 2);
    return indicatorValues.map(({ indicator, values }) => {
      const points: { date: Date; value: number }[] = [];
      for (let i = start; i < end; i++) {
        const v = values[i];
        if (v !== null) points.push({ date: data[i].date, value: v });
      }
      return { indicator, points };
    });
  }, [indicatorValues, data, visibleRange]);

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (dragLineRef.current) {
      const drag = dragLineRef.current;
      const dxPixels = e.clientX - drag.startClientX;
      const dyPixels = e.clientY - drag.startClientY;
      if (drag.orig.lineType === "horizontal") {
        // Dragging the body moves it exactly like its single handle would — only the
        // perpendicular axis (here, price/volume) can change.
        const scale = drag.orig.valueAxis === "volume" ? volumeScale : zoomedPriceScale;
        const newValue = scale.invert(scale(drag.orig.y1) + dyPixels);
        commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, y1: newValue, y2: newValue } : d)));
      } else if (drag.orig.lineType === "vertical") {
        const newDate = zoomedXScale.invert(zoomedXScale(drag.orig.x1) + dxPixels) as Date;
        commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, x1: newDate, x2: newDate } : d)));
      } else {
        const newX1 = zoomedXScale.invert(zoomedXScale(drag.orig.x1) + dxPixels) as Date;
        const newY1 = zoomedPriceScale.invert(zoomedPriceScale(drag.orig.y1) + dyPixels);
        const newX2 = zoomedXScale.invert(zoomedXScale(drag.orig.x2) + dxPixels) as Date;
        const newY2 = zoomedPriceScale.invert(zoomedPriceScale(drag.orig.y2) + dyPixels);
        commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, x1: newX1, y1: newY1, x2: newX2, y2: newY2 } : d)));
      }
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
        // Axis-constrained lines render full-span (see the canvas draw effect below) rather
        // than between their stored x1/x2 pixel positions, so hit-testing has to match that.
        let d: number;
        if (dr.lineType === "horizontal") {
          const y = dr.valueAxis === "volume" ? priceHeight + volumeScale(dr.y1) : zoomedPriceScale(dr.y1);
          d = distanceToSegment(mouseX, mouseY, 0, y, dims.boundedWidth, y);
        } else if (dr.lineType === "vertical") {
          const x = zoomedXScale(dr.x1);
          d = distanceToSegment(mouseX, mouseY, x, 0, x, plotBoundedHeight);
        } else {
          d = distanceToSegment(mouseX, mouseY, zoomedXScale(dr.x1), zoomedPriceScale(dr.y1), zoomedXScale(dr.x2), zoomedPriceScale(dr.y2));
        }
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

    visibleIndicators.forEach(({ indicator, points }, index) => {
      if (points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = indicator.color ?? defaultIndicatorColor(index);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = zoomedXScale(p.date);
        const y = zoomedPriceScale(p.value);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    });

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

    // Regular trend lines plus "horizontal" price lines (volume ones are drawn in the volume
    // section below, "vertical" ones are drawn full-height further down, outside any clip).
    for (const dr of drawings) {
      if (dr.lineType === "vertical" || (dr.lineType === "horizontal" && dr.valueAxis === "volume")) continue;
      const lineColor = dr.color ?? colorAccent;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      let x1: number, y1: number, x2: number, y2: number;
      if (dr.lineType === "horizontal") {
        x1 = 0;
        x2 = dims.boundedWidth;
        y1 = y2 = zoomedPriceScale(dr.y1);
      } else {
        x1 = zoomedXScale(dr.x1);
        y1 = zoomedPriceScale(dr.y1);
        x2 = zoomedXScale(dr.x2);
        y2 = zoomedPriceScale(dr.y2);
      }
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (dr.text) {
        ctx.fillStyle = lineColor;
        ctx.font = `600 11px ${fontFamily}`;
        ctx.textAlign = dr.lineType === "horizontal" ? "right" : "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(dr.text, dr.lineType === "horizontal" ? dims.boundedWidth - 4 : (x1 + x2) / 2, Math.min(y1, y2) - 6);
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
      for (const dr of drawings) {
        if (!(dr.lineType === "horizontal" && dr.valueAxis === "volume")) continue;
        const lineColor = dr.color ?? colorAccent;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
        ctx.setLineDash([]);
        const y = volumeScale(dr.y1);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(dims.boundedWidth, y);
        ctx.stroke();
        if (dr.text) {
          ctx.fillStyle = lineColor;
          ctx.font = `600 11px ${fontFamily}`;
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillText(dr.text, dims.boundedWidth - 4, y - 6);
        }
      }
      ctx.restore();
    }

    // "Vertical" drawn lines span the full plot height (price and volume together), same as the
    // hover crosshair below — deliberately outside either section's clip above.
    for (const dr of drawings) {
      if (dr.lineType !== "vertical") continue;
      const lineColor = dr.color ?? colorAccent;
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      const x = zoomedXScale(dr.x1);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, plotBoundedHeight);
      ctx.stroke();
      if (dr.text) {
        ctx.fillStyle = lineColor;
        ctx.font = `600 11px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(dr.text, x, plotBoundedHeight - 4);
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
    visibleIndicators,
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
  const selectedTool = DRAWING_TOOLS.find((t) => t.type === selectedToolType) ?? DRAWING_TOOLS[0];
  const SelectedToolIcon = selectedTool.icon;

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
          {showIndicators && (
            <button
              type="button"
              className="lq-chart__icon-button"
              onClick={() => setIndicatorPickerOpen(true)}
              aria-label="Ajouter un indicateur"
            >
              <ActivityIcon size={14} />
            </button>
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

      <div
        className="lq-chart__plot"
        style={{ width: dims.width, height: plotHeight }}
        onPointerLeave={() => {
          setHoverIndex(null);
          setHoverY(null);
          setHoverVolumeY(null);
        }}
      >
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
            <div className="lq-chart__tools-rail-items">
              {/* The chevron is invisible until this group (button or chevron) is hovered —
                  see .lq-chart__tool-chevron in charts-shared.css. Picking a tool from its menu
                  only changes what this button represents; the user still has to click it
                  afterward to actually start drawing (see handleSelectToolType). */}
              <div className="lq-chart__tool-group">
                <button
                  type="button"
                  className={["lq-chart__icon-button", activeTool !== null && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
                  onClick={() => handleToolClick(selectedToolType)}
                  aria-label={selectedTool.label}
                  aria-pressed={activeTool !== null}
                >
                  <SelectedToolIcon size={14} />
                </button>
                <button
                  ref={toolMenuAnchorRef}
                  type="button"
                  className={["lq-chart__tool-chevron", toolMenuOpen && "lq-chart__tool-chevron--visible"].filter(Boolean).join(" ")}
                  onClick={() => setToolMenuOpen((o) => !o)}
                  aria-label="Autres outils de dessin"
                >
                  <ChevronDownIcon size={8} />
                </button>
                <Popover open={toolMenuOpen} onClose={() => setToolMenuOpen(false)} anchorRef={toolMenuAnchorRef} placement="bottom">
                  <div className="lq-chart__tool-menu">
                    {DRAWING_TOOLS.map((opt) => {
                      const OptionIcon = opt.icon;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          className={[
                            "lq-chart__tool-menu-option",
                            opt.type === selectedToolType && "lq-chart__tool-menu-option--selected",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => handleSelectToolType(opt.type)}
                        >
                          <OptionIcon size={14} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </Popover>
              </div>
            </div>
          </div>
        )}
        {showIndicators && indicators.length > 0 && (
          <div className="lq-chart__indicator-legend" style={{ top: dims.margin.top + 6, left: dims.margin.left + 6 }}>
            {indicators.map((indicator, i) => (
              <div
                key={indicator.id}
                className="lq-chart__indicator-legend-item"
                style={{ color: indicator.color ?? defaultIndicatorColor(i) }}
                onDoubleClick={() => openIndicatorSettings(indicator.id)}
              >
                <span className="lq-chart__indicator-legend-label">{indicatorLabel(indicator)}</span>
                {/* Invisible until this item is hovered (see charts-shared.css) — double-click
                    the label itself opens the same settings modal, so the gear is a discoverable
                    shortcut, not the only way in. */}
                <button
                  type="button"
                  className="lq-chart__indicator-legend-gear"
                  onClick={() => openIndicatorSettings(indicator.id)}
                  aria-label={`Paramètres ${indicatorLabel(indicator)}`}
                >
                  <SettingsIcon size={11} />
                </button>
              </div>
            ))}
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
                // Axis-constrained lines get a single handle at a fixed point along the axis
                // they don't move on (never at their data endpoints, which aren't meaningful
                // drag targets here — the whole line only has one degree of freedom).
                if (dr.lineType === "horizontal") {
                  const cy = dr.valueAxis === "volume" ? priceHeight + volumeScale(dr.y1) : zoomedPriceScale(dr.y1);
                  return (
                    <circle
                      key={dr.id}
                      className="lq-chart__drawing-handle"
                      cx={dims.boundedWidth * AXIS_HANDLE_FRACTION_X}
                      cy={cy}
                      r={5}
                      onPointerDown={handleAxisHandlePointerDown(dr.id)}
                      onPointerMove={handleAxisHandlePointerMove}
                      onPointerUp={handleAxisHandlePointerUp}
                    />
                  );
                }
                if (dr.lineType === "vertical") {
                  return (
                    <circle
                      key={dr.id}
                      className="lq-chart__drawing-handle"
                      cx={zoomedXScale(dr.x1)}
                      cy={plotBoundedHeight * AXIS_HANDLE_FRACTION_Y}
                      r={5}
                      onPointerDown={handleAxisHandlePointerDown(dr.id)}
                      onPointerMove={handleAxisHandlePointerMove}
                      onPointerUp={handleAxisHandlePointerUp}
                    />
                  );
                }
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
          // Overlaps the chart by AXIS_VALUE_Y_OVERLAP so the badge's own background englobes
          // the "+" button too, instead of it living outside as a separate element — reachable
          // either way since onPointerLeave lives on .lq-chart__plot (a real ancestor of both),
          // not on the interactive rect itself.
          <div
            className="lq-chart__axis-value lq-chart__axis-value--y"
            style={{ top: dims.margin.top + hoverY, left: dims.margin.left + dims.boundedWidth - AXIS_VALUE_Y_OVERLAP }}
          >
            <button type="button" className="lq-chart__axis-value-add" onClick={addPriceLine} aria-label="Ajouter une ligne de prix horizontale">
              <PlusIcon size={9} />
            </button>
            <span className="lq-chart__axis-value-text">{pFmt(zoomedPriceScale.invert(hoverY))}</span>
          </div>
        )}
        {hoverVolumeY !== null && (
          <div
            className="lq-chart__axis-value lq-chart__axis-value--y"
            style={{ top: dims.margin.top + priceHeight + hoverVolumeY, left: dims.margin.left + dims.boundedWidth - AXIS_VALUE_Y_OVERLAP }}
          >
            <button type="button" className="lq-chart__axis-value-add" onClick={addVolumeLine} aria-label="Ajouter une ligne de volume horizontale">
              <PlusIcon size={9} />
            </button>
            <span className="lq-chart__axis-value-text">{vFmt(volumeScale.invert(hoverVolumeY))}</span>
          </div>
        )}
        {hovered && (
          <>
            <div
              className="lq-chart__axis-value lq-chart__axis-value--x"
              style={{ left: dims.margin.left + zoomedXScale(hovered.date), top: dims.margin.top + plotBoundedHeight }}
            >
              <span className="lq-chart__axis-value-text">{dFmt(hovered.date)}</span>
            </div>
            {/* A standalone square button (not englobed by the date badge below the plot, since
                that badge is unreachable — reaching it means leaving the interactive rect
                entirely). Anchored inside the plot instead, in line with the vertical
                crosshair. */}
            <button
              type="button"
              className="lq-chart__crosshair-add lq-chart__crosshair-add--x"
              style={{ left: dims.margin.left + zoomedXScale(hovered.date), top: dims.margin.top + plotBoundedHeight - CROSSHAIR_ADD_INSET }}
              onClick={addDateLine}
              aria-label="Ajouter une ligne de date verticale"
            >
              <PlusIcon size={9} />
            </button>
          </>
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
          {/* A horizontal/vertical line only has one degree of freedom (see the single drag
              handle above) — editing its two endpoints independently here would let them drift
              apart and break that invariant, so it gets one field instead of the usual two. */}
          {draft.lineType === "horizontal" && (
            <NumberField
              label={draft.valueAxis === "volume" ? "Volume" : "Prix"}
              step={0.01}
              value={draft.y1}
              onChange={(v) => setDraft({ ...draft, y1: v === "" ? draft.y1 : v, y2: v === "" ? draft.y2 : v })}
            />
          )}
          {draft.lineType === "vertical" && (
            <div className="lq-field">
              <label className="lq-field__label">Date</label>
              <input
                type="date"
                className="lq-chart__date-input"
                value={toDateInputValue(draft.x1)}
                onChange={(e) => {
                  const next = fromDateInputValue(e.target.value, draft.x1);
                  setDraft({ ...draft, x1: next, x2: next });
                }}
              />
            </div>
          )}
          {!draft.lineType && (
            <>
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
            </>
          )}
        </Modal>
      )}

      {indicatorPickerOpen && (
        <Modal open onClose={() => setIndicatorPickerOpen(false)} title="Ajouter un indicateur">
          <div className="lq-chart__indicator-picker">
            {INDICATOR_CATALOG.map((entry) => (
              <button key={entry.kind} type="button" className="lq-chart__indicator-picker-option" onClick={() => addIndicator(entry)}>
                <span className="lq-chart__indicator-picker-name">{entry.label}</span>
                <span className="lq-chart__indicator-picker-hint">Période par défaut : {entry.defaultPeriod}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {editingIndicatorId && indicatorDraft && (
        <Modal
          open
          onClose={closeIndicatorSettings}
          title={`Paramètres — ${indicatorLabel(indicatorDraft)}`}
          footer={
            <div className="lq-chart__edit-drawing-footer">
              <button type="button" className="lq-chart__reset-button" onClick={deleteEditingIndicator}>
                Supprimer
              </button>
              <button type="button" className="lq-chart__confirm-button" onClick={saveIndicatorSettings}>
                Enregistrer
              </button>
            </div>
          }
        >
          <NumberField
            label="Période"
            min={1}
            max={500}
            step={1}
            value={indicatorDraft.period}
            onChange={(v) => setIndicatorDraft({ ...indicatorDraft, period: v === "" ? indicatorDraft.period : v })}
          />
          <div className="lq-field">
            <label className="lq-field__label">Couleur</label>
            <input
              type="color"
              className="lq-chart__color-input"
              value={indicatorDraft.color ?? defaultIndicatorColor(indicators.findIndex((i) => i.id === indicatorDraft.id))}
              onChange={(e) => setIndicatorDraft({ ...indicatorDraft, color: e.target.value })}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
