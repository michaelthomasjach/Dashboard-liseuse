import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useChartDimensions } from "./internal/useChartDimensions";
import { useFullscreen } from "./internal/useFullscreen";
import { renderCandlestickChart } from "./candlestick/render/renderChart";
import { useSymbolSearchState } from "./candlestick/hooks/useSymbolSearchState";
import { useChartEvents } from "./candlestick/hooks/useChartEvents";
import { useChartDisplayMode } from "./candlestick/hooks/useChartDisplayMode";
import { useChartAppearance } from "./candlestick/hooks/useChartAppearance";
import { usePaneLayout } from "./candlestick/hooks/usePaneLayout";
import { useZoomAndScales } from "./candlestick/hooks/useZoomAndScales";
import { useIndicatorPaneScales } from "./candlestick/hooks/useIndicatorPaneScales";
import { ChartAxis } from "./ChartAxis";
import { ChartEventTooltip } from "./EventTooltip";
import { SeasonalityView } from "./SeasonalityView";
import { Popover } from "../forms/Popover";
import { TextField } from "../forms/TextField";
import { NumberField } from "../forms/NumberField";
import { Checkbox } from "../forms/Checkbox";
import { Select } from "../forms/Select";
import { Modal } from "../primitives/Modal";
import { Tabs } from "../primitives/Tabs";
import {
  MaximizeIcon,
  MinimizeIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  PlusIcon,
  ActivityIcon,
  SettingsIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  MagnetIcon,
  StarIcon,
  CloseIcon,
  LockIcon,
  GripIcon,
  LayersIcon,
  OverlayBadgeIcon,
  PaneBadgeIcon,
  CheckIcon,
  RefreshIcon,
  CalendarIcon,
} from "../icons";
import "./charts-shared.css";

import type { Candle } from "./candlestick/interfaces/Candle.interface";
import type { ChartEvent } from "./candlestick/interfaces/ChartEvent.interface";
import type { FundamentalDataPoint } from "./candlestick/interfaces/FundamentalDataPoint.interface";
import type { SymbolSearchCategory } from "./candlestick/interfaces/SymbolSearchCategory.interface";
import type { SymbolSearchResult } from "./candlestick/interfaces/SymbolSearchResult.interface";
import type { TrendLineDrawing } from "./candlestick/interfaces/TrendLineDrawing.interface";
import type { DataPoint } from "./candlestick/interfaces/DataPoint.interface";
import type { IndicatorKind } from "./candlestick/interfaces/IndicatorKind.interface";
import type { IndicatorBand } from "./candlestick/interfaces/IndicatorBand.interface";
import type { IndicatorMACD } from "./candlestick/interfaces/IndicatorMACD.interface";
import type { Indicator } from "./candlestick/interfaces/Indicator.interface";
import type { ChartDisplayMode } from "./candlestick/interfaces/ChartDisplayMode.interface";
import type { TimeframeOption } from "./candlestick/interfaces/TimeframeOption.interface";
import type { TimeframeGroup } from "./candlestick/interfaces/TimeframeGroup.interface";
import type { TimeframeEntry } from "./candlestick/interfaces/TimeframeEntry.interface";
import type { DrawingToolType } from "./candlestick/interfaces/DrawingToolType.interface";
import type { CandlestickChartProps } from "./candlestick/interfaces/CandlestickChartProps.interface";

export type {
  Candle,
  ChartEvent,
  FundamentalDataPoint,
  SymbolSearchCategory,
  SymbolSearchResult,
  TrendLineDrawing,
  IndicatorKind,
  IndicatorBand,
  IndicatorMACD,
  Indicator,
  ChartDisplayMode,
  TimeframeOption,
  TimeframeGroup,
  TimeframeEntry,
  CandlestickChartProps,
};

import {
  MULTI_POINT_TOOLS,
  DRAWING_TOOL_CATEGORIES,
  categoryOfTool,
  drawingToolMeta,
  drawingLabel,
  FIBONACCI_LEVELS,
  FIBONACCI_EXTENSION_LEVELS,
} from "./candlestick/drawingCatalog";
import {
  allPointsOf,
  snapPixel,
  distanceToSegment,
  round4,
  extendSegmentToEdges,
  effectiveExtendOf,
  channelOffsetFromClick,
} from "./candlestick/drawingGeometry";
import {
  isFundamentalKind,
  formatFundamentalValue,
  type IndicatorCatalogEntry,
  INDICATOR_CATALOG,
  indicatorCatalogEntry,
  indicatorLabel,
  defaultIndicatorColor,
} from "./candlestick/indicators";
import { EVENT_MARKER_OFFSET, EVENT_MARKER_RADIUS, EVENT_TOOLTIP_WIDTH, EVENT_TOOLTIP_GAP } from "./candlestick/eventsCatalog";
import { CHART_DISPLAY_MODES } from "./candlestick/chartModes";
import { SYMBOL_SEARCH_CATEGORIES, defaultSymbolLogoColor } from "./candlestick/symbolSearchCatalog";
import { isTimeframeGroup, findTimeframeLabel } from "./candlestick/timeframes";
import {
  DEFAULT_MARGIN,
  DRAWING_HIT_DISTANCE,
  TOOLS_RAIL_WIDTH,
  HEADER_HEIGHT,
  CROSSHAIR_ADD_INSET,
  LIVE_COUNTDOWN_OFFSET,
  AXIS_HANDLE_FRACTION_X,
  AXIS_HANDLE_FRACTION_Y,
  MAX_DATE_TICKS,
  DEFAULT_DRAWING_COLOR,
  EMPTY_DRAWINGS,
  SUB_PANE_COLLAPSED_HEIGHT,
} from "./candlestick/constants";
import { contrastingTextColor, formatCountdown, formatPercentFromReference, toDateInputValue, fromDateInputValue } from "./candlestick/formatting";

export function CandlestickChart({
  data,
  width,
  height = 380,
  zoomable = true,
  showVolume = true,
  formatDate,
  formatPrice,
  formatVolume,
  fullscreenToggle = true,
  seasonality = false,
  drawingTools = false,
  defaultDrawings,
  onDrawingsChange,
  showIndicators = false,
  defaultIndicators,
  onIndicatorsChange,
  initialVisibleCandles = 500,
  YAutoScaling = false,
  onYAutoScalingChange,
  timeframes,
  timeframe,
  onTimeframeChange,
  defaultChartDisplayMode,
  onChartDisplayModeChange,
  renkoAtrPeriod = 14,
  symbol,
  events,
  fundamentals,
  symbolSearch = false,
  symbolSearchResults,
  onSymbolSearchChange,
  onSymbolSelect,
  onAddSymbolOverlay,
  defaultFavoriteSymbolIds,
  onFavoriteSymbolIdsChange,
  livePrice = false,
  margin,
  className,
}: CandlestickChartProps) {
  const clipId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const [drawings, setDrawings] = useState<TrendLineDrawing[]>(defaultDrawings ?? []);
  const [activeTool, setActiveTool] = useState<DrawingToolType | null>(null);
  // Which tool each category's own rail button currently represents — stays selected across
  // draws, independent of whether drawing is actually active right now, and independent of the
  // other categories' own selection. Changed via that category's own flyout menu, which (unlike
  // the button itself) also activates the tool immediately — see handleSelectToolType.
  const [selectedToolByCategory, setSelectedToolByCategory] = useState<Record<string, DrawingToolType>>(() =>
    Object.fromEntries(DRAWING_TOOL_CATEGORIES.map((c) => [c.id, c.tools[0].type]))
  );
  // Which category's dropdown is open, if any — at most one at a time.
  const [openToolMenu, setOpenToolMenu] = useState<string | null>(null);
  const [pendingPoint, setPendingPoint] = useState<DataPoint | null>(null);
  const [previewPoint, setPreviewPoint] = useState<DataPoint | null>(null);
  // "channel"'s second point (fixing line 1), set between the tool's 2nd and 3rd clicks — plain
  // pendingPoint/previewPoint alone are enough for every 2-point tool's flow, channel needs a
  // 3rd click. Every *other* multi-point tool (fibonacciExtension/elliottCorrection/
  // elliottImpulse) also passes through this same 2nd-point stage before collecting the rest
  // into pendingExtraPoints below — they don't diverge from channel until after it.
  const [pendingSecondPoint, setPendingSecondPoint] = useState<DataPoint | null>(null);
  // 3rd point onward for tools needing more than two (see MULTI_POINT_TOOLS) — irrelevant to
  // channel, which computes channelOffset from its 3rd click directly instead of collecting it
  // here.
  const [pendingExtraPoints, setPendingExtraPoints] = useState<DataPoint[]>([]);
  // When on, every new point placed by any drawing tool (via toDataPoint) snaps to whichever of
  // the nearest candle's open/high/low/close is closest — a persistent modifier rather than a
  // tool of its own, so it stays on across tool switches until toggled off again.
  const [magnetActive, setMagnetActive] = useState(false);
  // Hides every drawing (canvas render, hover/hit-testing, handles, axis badges) without
  // touching `drawings` itself — toggling it back off brings everything back exactly as it
  // was, unlike deleting. See `visibleDrawings` below, the single point every drawing-reading
  // codepath was switched to read from instead of `drawings` directly.
  const [drawingsHidden, setDrawingsHidden] = useState(false);
  // Blocks *starting* a body/endpoint/axis-handle drag (handleOverlayPointerDown/
  // handleEndpointPointerDown/handleAxisHandlePointerDown all bail out early while this is on)
  // — hover, the delete key, and double-click-to-edit are all untouched, so a locked drawing
  // stays selectable/deletable/editable, just not draggable.
  const [drawingsLocked, setDrawingsLocked] = useState(false);
  // Every codepath that reads drawn shapes for rendering, hit-testing, or handles reads this
  // instead of `drawings` directly — hiding never mutates `drawings` itself (toggling back on
  // restores everything exactly as it was), it just makes that read empty in the meantime.
  const visibleDrawings = drawingsHidden ? EMPTY_DRAWINGS : drawings;
  // The measure tool's own last completed 2-click measurement (not a `drawings` entry — it's
  // ephemeral, cleared on Escape/tool switch instead of persisted). `pendingPoint`/`previewPoint`
  // still drive its live 1st-click-to-cursor preview, same as every other 2-point tool.
  const [measurePoints, setMeasurePoints] = useState<{ p1: DataPoint; p2: DataPoint } | null>(null);
  // The brush tool's current in-progress stroke, for live preview only — the committed drawing
  // (on pointer up) is built from brushPointsRef below, not from this state, so a stroke can be
  // sampled at pointermove speed without every sample racing a stale closure over React state.
  const [brushPreview, setBrushPreview] = useState<DataPoint[] | null>(null);
  const brushPointsRef = useRef<DataPoint[]>([]);
  const brushDrawingRef = useRef(false);
  const [hoveredDrawingId, setHoveredDrawingId] = useState<string | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const [hoverVolumeY, setHoverVolumeY] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TrendLineDrawing | null>(null);
  const [editModalTab, setEditModalTab] = useState<"coords" | "text" | "style">("coords");
  const [tfOpen, setTfOpen] = useState(false);
  const {
    settingsOpen,
    setSettingsOpen,
    upColorOverride,
    setUpColorOverride,
    downColorOverride,
    setDownColorOverride,
    volumeUpColorOverride,
    setVolumeUpColorOverride,
    volumeDownColorOverride,
    setVolumeDownColorOverride,
    volumeSettingsOpen,
    setVolumeSettingsOpen,
    yAutoScalingState,
    setYAutoScalingState,
    now,
  } = useChartAppearance({ YAutoScaling, livePrice });
  // Swaps the whole chart body for SeasonalityView (see the `seasonality` prop's own doc
  // comment) — deliberately its own top-level flag, not folded into `chartDisplayMode`, since a
  // seasonal path isn't another way to draw the same price/date axes the way candle/line/Renko
  // are; it has its own x-axis (position within a reference year) that drawings/indicators/
  // volume/events have no meaningful relationship to.
  const [seasonalityOpen, setSeasonalityOpen] = useState(false);
  const { symbolSearchOpen, setSymbolSearchOpen, symbolSearchQuery, setSymbolSearchQuery, symbolSearchCategory, setSymbolSearchCategory, favoriteSymbolIds, toggleFavoriteSymbol } =
    useSymbolSearchState({ defaultFavoriteSymbolIds, onFavoriteSymbolIdsChange, onSymbolSearchChange });
  // Tickers whose "+" is currently awaiting onAddSymbolOverlay — a Set (not one at a time) since
  // there's no reason comparing against AAPL should block also comparing against GOOGL while its
  // own fetch is still in flight. Purely for each row's own spinner; not read anywhere that
  // affects the chart itself.
  const [addingOverlaySymbols, setAddingOverlaySymbols] = useState<Set<string>>(new Set());
  // pointIndex: 0 = x1/y1, 1 = x2/y2, 2+ = extraPoints[pointIndex - 2] — see allPointsOf.
  const dragEndpointRef = useRef<{ id: string; pointIndex: number } | null>(null);
  const dragAxisRef = useRef<{ id: string } | null>(null);
  // Which of the measure tool's two completed points (not a `drawings` entry, see measurePoints
  // above) is currently being dragged — same generic pointer-capture pattern as dragEndpointRef,
  // just keyed by "p1"/"p2" instead of a drawing id + pointIndex since there's only ever one.
  const dragMeasureRef = useRef<"p1" | "p2" | null>(null);
  const drawingIdRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tfAnchorRef = useRef<HTMLButtonElement>(null);
  // One per category (a fixed, known-at-compile-time list, so plain individual refs rather than
  // a dynamic map — Popover needs a real RefObject per anchor, and refs can't be created in a
  // loop).
  const linesMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const fibonacciMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const elliottMenuAnchorRef = useRef<HTMLButtonElement>(null);
  function menuAnchorRefFor(categoryId: string) {
    if (categoryId === "fibonacci") return fibonacciMenuAnchorRef;
    if (categoryId === "elliott") return elliottMenuAnchorRef;
    return linesMenuAnchorRef;
  }
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

  function removeSymbolOverlay(ticker: string) {
    commitDrawings(drawings.filter((d) => !(d.lineType === "symbolOverlay" && d.overlaySymbol === ticker)));
  }

  // Awaits `onAddSymbolOverlay` (a plain return is fine too — Promise.resolve passes it straight
  // through) rather than expecting the caller to push a new drawing in themselves: `drawings` has
  // no controlled counterpart to `defaultDrawings` (same as every other collection in this file),
  // so an async fetch has no way to land its result other than the chart committing it once the
  // promise settles. `addingOverlaySymbols` exists purely for each row's own spinner — never read
  // for anything that affects rendering the overlay itself.
  async function handleAddSymbolOverlay(result: SymbolSearchResult) {
    if (!onAddSymbolOverlay || addingOverlaySymbols.has(result.ticker)) return;
    setAddingOverlaySymbols((prev) => new Set(prev).add(result.ticker));
    try {
      const overlayData = await onAddSymbolOverlay(result);
      if (!overlayData || overlayData.length === 0) return;
      const sorted = [...overlayData].sort((a, b) => a.date.getTime() - b.date.getTime());
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      commitDrawings([
        ...drawings,
        {
          id: `drawing-${drawingIdRef.current++}`,
          // Unused for this lineType (see its own doc comment) — just needs *some* value.
          x1: first.date,
          y1: first.value,
          x2: last.date,
          y2: last.value,
          lineType: "symbolOverlay",
          overlaySymbol: result.ticker,
          overlaySymbolName: result.name,
          overlayData: sorted,
          color: defaultIndicatorColor(drawings.filter((d) => d.lineType === "symbolOverlay").length),
        },
      ]);
    } finally {
      setAddingOverlaySymbols((prev) => {
        const next = new Set(prev);
        next.delete(result.ticker);
        return next;
      });
    }
  }

  // `onSymbolSearchChange` deliberately isn't a dependency below — a typical caller passes an
  // inline (non-memoized) handler, which is a fresh function identity on every one of *its own*
  // renders; if this effect re-ran every time that identity changed, and that handler calls back
  // into state (e.g. setResults after searching, exactly what the story demonstrating this does),
  // the resulting re-render would produce yet another fresh identity — an infinite loop. A ref
  // always holding the latest callback sidesteps this while still calling the current version.
  const onSymbolSearchChangeRef = useRef(onSymbolSearchChange);
  useEffect(() => {
    onSymbolSearchChangeRef.current = onSymbolSearchChange;
  });

  // Fires once right when the modal opens (query/category at their defaults) and again on every
  // later change — searching/filtering itself (including resolving "favorites") is entirely the
  // caller's job, this just reports what the modal's own controls are currently asking for.
  useEffect(() => {
    if (!symbolSearchOpen) return;
    onSymbolSearchChangeRef.current?.(symbolSearchQuery, symbolSearchCategory);
  }, [symbolSearchOpen, symbolSearchQuery, symbolSearchCategory]);

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const baseMargin = margin ?? DEFAULT_MARGIN;
  const resolvedMargin = drawingTools
    ? { ...baseMargin, left: (baseMargin.left ?? DEFAULT_MARGIN.left ?? 0) + TOOLS_RAIL_WIDTH }
    : baseMargin;
  const [ref, dims] = useChartDimensions(resolvedMargin, {
    width: isFullscreen ? undefined : width,
    height: isFullscreen ? undefined : height,
  });

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

  const {
    indicators,
    indicatorPickerOpen,
    setIndicatorPickerOpen,
    indicatorSearchQuery,
    setIndicatorSearchQuery,
    editingIndicatorId,
    indicatorDraft,
    setIndicatorDraft,
    hoveredIndicatorId,
    setHoveredIndicatorId,
    indicatorsManagerOpen,
    setIndicatorsManagerOpen,
    copiedIndicatorRef,
    indicatorIdRef,
    draggingPaneId,
    setDraggingPaneId,
    setVolumePaneState,
    paneYTransform,
    handlePaneYAxisPointerDown,
    handlePaneYAxisPointerMove,
    handlePaneYAxisPointerUp,
    resetPaneYAxis,
    commitIndicators,
    addIndicator,
    openIndicatorSettings,
    closeIndicatorSettings,
    saveIndicatorSettings,
    deleteEditingIndicator,
    toggleIndicatorHidden,
    removeIndicator,
    volumeVisible,
    volumeCollapsed,
    startPaneResize,
    reorderPanesRef,
    ownPaneIndicators,
    indicatorPaneHeights,
    indicatorPaneTops,
    volumeTop,
    allPanesOrder,
    volumeHeight,
    priceHeight,
  } = usePaneLayout({ defaultIndicators, onIndicatorsChange, showVolume, plotBoundedHeight });

  const {
    yTransform,
    setYTransform,
    setYManuallyAdjusted,
    zoomedXScale,
    indexForDate,
    dateForIndex,
    visibleRange,
    symbolOverlays,
    compareMode,
    overlayProjections,
    priceScale,
    zoomedPriceScale,
    clampToPriceAxis,
    zoomedVolumeScale,
    zoomRef,
    resetX,
    xAxisDrag,
    yAxisDrag,
    xAxisWheelRef,
    yAxisWheelRef,
    isZoomed,
    resetZoom,
    resetYAxis,
  } = useZoomAndScales({
    data,
    dims,
    plotBoundedHeight,
    priceHeight,
    volumeHeight,
    paneYTransform,
    drawings,
    activeTool,
    hoveredDrawingIdRef,
    yAutoScalingState,
    zoomable,
    initialVisibleCandles,
  });

  // Drag-to-reorder via a dedicated grip handle (not the whole header — that already carries
  // resize/double-click/other buttons). Deliberately *not* the usual setPointerCapture-on-the-
  // handle pattern every other drag in this file uses: a reorder mid-drag causes React to
  // physically move this very handle's DOM node to its new sibling position, and that move can
  // drop the browser's own pointer capture on it — losing the pointerup this handle was supposed
  // to receive, which left the drag "stuck" (dragging visual pinned on, further mouse movement
  // still reordering things with no button held). A window-level effect isn't tied to any one
  // element's identity, so it survives the handle moving under it — and re-subscribing whenever
  // the pane order actually changes (not just once at drag start) keeps its own targetIdx maths
  // reading the *current* layout instead of a stale one frozen from before this drag's first
  // reorder, so a single continuous drag can hop across more than one neighbor correctly.
  useEffect(() => {
    if (!draggingPaneId) return;
    const draggedId = draggingPaneId;
    function paneTopOf(id: string): number {
      if (id === "volume") return volumeTop;
      const idx = ownPaneIndicators.findIndex((ind) => ind.id === id);
      return idx !== -1 ? indicatorPaneTops[idx] : 0;
    }
    function paneHeightOf(id: string): number {
      if (id === "volume") return volumeHeight;
      const idx = ownPaneIndicators.findIndex((ind) => ind.id === id);
      return idx !== -1 ? indicatorPaneHeights[idx] : 0;
    }
    function onMove(ev: PointerEvent) {
      const rect = zoomRef.current!.getBoundingClientRect();
      const relY = ev.clientY - rect.top - priceHeight;
      // Closest pane by its own vertical *midpoint*, not "whichever pane's full range contains
      // the cursor" — the latter needed the drag to travel almost the whole height of a taller
      // neighbor before triggering at all, which read as unresponsive (effectively broken for an
      // ordinary drag distance) once panes had any real height difference between them. Comparing
      // midpoints swaps as soon as the cursor crosses halfway into a neighboring pane instead,
      // matching the usual list-reorder feel regardless of how tall that neighbor is — and always
      // resolves to *some* index (clamped to the nearest pane), so dragging above the topmost or
      // below the bottommost pane's own strip still works instead of doing nothing. Works over
      // `allPanesOrder` (volume included) rather than indicators alone, so volume is just as
      // draggable — and just as much a target to drop an indicator onto — as any of them.
      let targetIdx = 0;
      let bestDist = Infinity;
      allPanesOrder.forEach((id, i) => {
        const dist = Math.abs(relY - (paneTopOf(id) + paneHeightOf(id) / 2));
        if (dist < bestDist) {
          bestDist = dist;
          targetIdx = i;
        }
      });
      const currentIds = [...allPanesOrder];
      const fromIdx = currentIds.indexOf(draggedId);
      if (fromIdx === -1 || fromIdx === targetIdx) return;
      currentIds.splice(fromIdx, 1);
      currentIds.splice(targetIdx, 0, draggedId);
      reorderPanesRef.current(currentIds);
    }
    function onUp() {
      setDraggingPaneId(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [
    draggingPaneId,
    allPanesOrder,
    ownPaneIndicators,
    indicatorPaneTops,
    indicatorPaneHeights,
    volumeTop,
    volumeHeight,
    priceHeight,
    zoomRef,
    reorderPanesRef,
    setDraggingPaneId,
  ]);


  // All three span the dataset's own (unzoomed) extent rather than the currently visible one,
  // so they still reach edge to edge after the user zooms/pans away from where they were added
  // — a price alert or a session marker shouldn't disappear just because the view moved. Marked
  // with `lineType` so they drag along one axis only (see handlePointerMove/handleAxisHandle*)
  // and render full-span instead of between their stored x1/x2 (see the canvas draw effect).
  function addPriceLine() {
    if (hoverY === null) return;
    const price = zoomedPriceScale.invert(hoverY);
    commitDrawings([
      ...drawings,
      { id: `drawing-${drawingIdRef.current++}`, x1: data[0].date, y1: price, x2: data[data.length - 1].date, y2: price, lineType: "horizontal" },
    ]);
  }

  function addVolumeLine() {
    if (hoverVolumeY === null) return;
    const volume = zoomedVolumeScale.invert(hoverVolumeY);
    commitDrawings([
      ...drawings,
      {
        id: `drawing-${drawingIdRef.current++}`,
        x1: data[0].date,
        y1: volume,
        x2: data[data.length - 1].date,
        y2: volume,
        lineType: "horizontal",
        valueAxis: "volume",
      },
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
    setPendingSecondPoint(null);
    setPendingExtraPoints([]);
    setMeasurePoints(null);
  }

  function handleToolClick(tool: DrawingToolType) {
    if (activeTool === tool) {
      cancelDrawingTool();
    } else {
      setActiveTool(tool);
      setPendingPoint(null);
      setPreviewPoint(null);
      setPendingSecondPoint(null);
      setPendingExtraPoints([]);
      setMeasurePoints(null);
    }
  }

  // Picking a tool from a category's flyout menu both changes what that category's own rail
  // button represents *and* activates it immediately, ready to draw — unlike clicking the
  // button itself to toggle the already-represented tool on/off, there's no extra confirmation
  // click needed here since picking a specific tool from the menu is already a deliberate choice.
  function handleSelectToolType(type: DrawingToolType) {
    setSelectedToolByCategory((prev) => ({ ...prev, [categoryOfTool(type).id]: type }));
    setOpenToolMenu(null);
    setActiveTool(type);
    setPendingPoint(null);
    setPreviewPoint(null);
    setPendingSecondPoint(null);
    setPendingExtraPoints([]);
    setMeasurePoints(null);
  }

  useEffect(() => {
    // Also armed while only a completed measurement lingers (activeTool already back to null by
    // then, see the "measure" branch of handleOverlayClick above) so Escape can still dismiss it —
    // every other tool only needs this while still active, since none of them outlive their own
    // deselection the way a finished measurement does.
    if (!activeTool && !measurePoints) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // "elbowArrow" is the one tool Escape *finalizes* instead of discarding — it has no fixed
      // point count to reach on its own (see handleOverlayClick), so Escape is the only way it
      // ever completes. Needs at least 2 points to be a line at all; fewer and there's nothing
      // to commit, same as cancelling any other half-placed tool.
      if (activeTool === "elbowArrow" && pendingPoint && pendingExtraPoints.length >= 1) {
        const points = [pendingPoint, ...pendingExtraPoints];
        const next: TrendLineDrawing[] = [
          ...drawings,
          {
            id: `drawing-${drawingIdRef.current++}`,
            x1: points[0].x,
            y1: points[0].y,
            x2: points[1].x,
            y2: points[1].y,
            lineType: "elbowArrow",
            extraPoints: points.slice(2),
          },
        ];
        setDrawings(next);
        onDrawingsChange?.(next);
      }
      cancelDrawingTool();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTool, pendingPoint, pendingExtraPoints, drawings, onDrawingsChange, measurePoints]);

  // Deletes whichever drawing is currently hovered (there's no separate "select" state — hover
  // already tracks the one line the user is pointing at, same thing a click-to-select would give
  // here) when Delete/Backspace is pressed — skipped while the edit modal is open (its own
  // "Supprimer" button is the deliberate action there) or while a text input has focus (typing a
  // label in the Texte tab shouldn't delete the drawing out from under it).
  useEffect(() => {
    if (!hoveredDrawingId || editingId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const active = document.activeElement;
      const isEditableFocused = active instanceof HTMLElement && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      if (isEditableFocused) return;
      e.preventDefault();
      const next = drawings.filter((d) => d.id !== hoveredDrawingId);
      setDrawings(next);
      onDrawingsChange?.(next);
      setHoveredDrawingId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hoveredDrawingId, editingId, drawings, onDrawingsChange]);

  // Ctrl/Cmd+C over a hovered legend item copies that indicator (copiedIndicatorRef); Ctrl/Cmd+V
  // pastes a duplicate of whatever was last copied (new id, everything else — kind/period/
  // color/etc. — unchanged) appended to the list. Mirrors the browser's own shortcuts rather than
  // inventing new ones, so it's skipped while a text input has focus for the same reason the
  // drawing-delete effect above is.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key !== "c" && key !== "v") return;
      const active = document.activeElement;
      const isEditableFocused = active instanceof HTMLElement && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      if (isEditableFocused) return;
      if (key === "c") {
        if (!hoveredIndicatorId) return;
        const indicator = indicators.find((i) => i.id === hoveredIndicatorId);
        if (indicator) copiedIndicatorRef.current = indicator;
        return;
      }
      if (!copiedIndicatorRef.current) return;
      e.preventDefault();
      const next = [...indicators, { ...copiedIndicatorRef.current, id: `indicator-${indicatorIdRef.current++}` }];
      commitIndicators(next);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hoveredIndicatorId, indicators, commitIndicators, copiedIndicatorRef, indicatorIdRef]);

  // Snaps a raw price to whichever of the nearest candle's open/high/low/close sits closest —
  // the magnet toggle's whole effect, applied wherever a new point gets placed (see toDataPoint).
  // No-op when the magnet is off, so every call site stays correct without its own branch.
  function magnetSnapPrice(rawIndex: number, rawY: number): number {
    if (!magnetActive || data.length === 0) return rawY;
    const idx = Math.min(data.length - 1, Math.max(0, Math.round(rawIndex - 0.5)));
    const candle = data[idx];
    const candidates = [candle.open, candle.high, candle.low, candle.close];
    return candidates.reduce((closest, v) => (Math.abs(v - rawY) < Math.abs(closest - rawY) ? v : closest), candidates[0]);
  }

  function toDataPoint(e: { clientX: number; clientY: number }): DataPoint {
    const rect = zoomRef.current!.getBoundingClientRect();
    const rawIndex = zoomedXScale.invert(e.clientX - rect.left);
    const rawY = zoomedPriceScale.invert(e.clientY - rect.top);
    return { x: dateForIndex(rawIndex), y: round4(magnetSnapPrice(rawIndex, rawY)) };
  }

  function handleOverlayClick(e: React.MouseEvent<SVGRectElement>) {
    if (!activeTool) return;
    const point = toDataPoint(e);

    // Axis-constrained lines only have one degree of freedom, so a single click places them —
    // no pending/preview step like the free trend line below.
    if (activeTool === "horizontal") {
      const rect = zoomRef.current!.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const d0 = data[0].date;
      const d1 = data[data.length - 1].date;
      // Any pane the click landed in — price, volume, or an own-pane indicator (see
      // resolveValueAxisAtY/paneScaleAndOffset and TrendLineDrawing.valueAxis). Price alone
      // keeps going through `point` (already magnet-snapped by toDataPoint above) instead of a
      // fresh invert() here — magnet-snapping to the nearest OHLC only makes sense against price.
      const valueAxis = resolveValueAxisAtY(mouseY);
      const pane = paneScaleAndOffset(valueAxis);
      const value = valueAxis === "price" ? point.y : round4(pane.scale.invert(mouseY - pane.offset));
      const drawing: TrendLineDrawing = {
        id: `drawing-${drawingIdRef.current++}`,
        x1: d0,
        y1: value,
        x2: d1,
        y2: value,
        lineType: "horizontal",
        ...(valueAxis !== "price" ? { valueAxis } : {}),
      };
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
    // Arrow markers are single-point, like horizontal/vertical — x2/y2 just mirrors x1/y1 (kept
    // in sync by both the generic whole-body drag and a dedicated single-handle case, see
    // handleEndpointPointerMove) so there's nothing meaningful a second point could add.
    if (activeTool === "arrowUp" || activeTool === "arrowDown") {
      commitDrawings([
        ...drawings,
        { id: `drawing-${drawingIdRef.current++}`, x1: point.x, y1: point.y, x2: point.x, y2: point.y, lineType: activeTool },
      ]);
      cancelDrawingTool();
      return;
    }
    // "elbowArrow" is an open-ended polyline: every click appends another point (1st into
    // pendingPoint, everything after into pendingExtraPoints) and the tool stays active — unlike
    // every other multi-point tool, there's no fixed point count to reach, so nothing here ever
    // commits or calls cancelDrawingTool(). Escape is what finalizes it (see the keydown effect
    // below), using however many points have been placed by then.
    if (activeTool === "elbowArrow") {
      if (!pendingPoint) {
        setPendingPoint(point);
        setPreviewPoint(point);
        return;
      }
      setPendingExtraPoints((prev) => [...prev, point]);
      setPreviewPoint(point);
      return;
    }
    // Measure doesn't create a `drawings` entry — its result is ephemeral (measurePoints, cleared
    // on Escape/tool switch). The tool deselects itself right after the 2nd click (unlike every
    // other tool, which stays active until Escape/reclick) — the completed measurement then stays
    // on screen with its own draggable handles (see the measure-handle drag functions below)
    // instead of disappearing, so re-clicking the tool button is what starts a fresh one.
    if (activeTool === "measure") {
      if (!pendingPoint) {
        setPendingPoint(point);
        setPreviewPoint(point);
        return;
      }
      setMeasurePoints({ p1: pendingPoint, p2: point });
      setPendingPoint(null);
      setPreviewPoint(null);
      setActiveTool(null);
      return;
    }
    // Same price/volume detection as "horizontal" above, but anchored at the clicked date
    // instead of the dataset's own start (see the "ray" rendering/hit-testing below, which draws
    // from that anchor to the plot's right edge only).
    if (activeTool === "ray") {
      const rect = zoomRef.current!.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const valueAxis = resolveValueAxisAtY(mouseY);
      const pane = paneScaleAndOffset(valueAxis);
      const value = valueAxis === "price" ? point.y : round4(pane.scale.invert(mouseY - pane.offset));
      const drawing: TrendLineDrawing = {
        id: `drawing-${drawingIdRef.current++}`,
        x1: point.x,
        y1: value,
        x2: point.x,
        y2: value,
        lineType: "ray",
        ...(valueAxis !== "price" ? { valueAxis } : {}),
      };
      commitDrawings([...drawings, drawing]);
      cancelDrawingTool();
      return;
    }

    // "channel" needs a 3rd click (the tool's whole point): the first two fix line 1 exactly
    // like a regular trend line, the third sets a constant price offset for a second line
    // parallel to it — measured as the clicked point's own vertical distance from line 1 at
    // that same date, not a true perpendicular distance (same simplification most trading
    // platforms use for this tool).
    if (activeTool === "channel") {
      if (!pendingPoint) {
        setPendingPoint(point);
        setPreviewPoint(point);
        return;
      }
      if (!pendingSecondPoint) {
        setPendingSecondPoint(point);
        setPreviewPoint(point);
        return;
      }
      commitDrawings([
        ...drawings,
        {
          id: `drawing-${drawingIdRef.current++}`,
          x1: pendingPoint.x,
          y1: pendingPoint.y,
          x2: pendingSecondPoint.x,
          y2: pendingSecondPoint.y,
          lineType: "channel",
          channelOffset: round4(channelOffsetFromClick(pendingPoint, pendingSecondPoint, point, indexForDate)),
        },
      ]);
      cancelDrawingTool();
      return;
    }

    // "disjointChannel": same first three clicks as "channel" (line 1's two points, then a 3rd
    // that sets a price offset the same way) — but instead of applying that offset as a constant
    // shift to a *parallel* line 2, it computes two independent points: extraPoints[0] (lined up
    // with x2/y2, "point 3") sits at the offset exactly like channel's line 2 would, and
    // extraPoints[1] (lined up with x1/y1, "point 4") is that same offset applied to point1's
    // price *mirrored* across point2's price level — 2*y2 - y1 + offset instead of plain y1 +
    // offset — so line 2 slopes the opposite way from line 1 instead of running parallel to it.
    // Both points are then ordinary, independently draggable ones (handled generically by
    // allPointsOf/the endpoint-drag system) for reshaping the angle by hand afterward.
    if (activeTool === "disjointChannel") {
      if (!pendingPoint) {
        setPendingPoint(point);
        setPreviewPoint(point);
        return;
      }
      if (!pendingSecondPoint) {
        setPendingSecondPoint(point);
        setPreviewPoint(point);
        return;
      }
      const offset = round4(channelOffsetFromClick(pendingPoint, pendingSecondPoint, point, indexForDate));
      commitDrawings([
        ...drawings,
        {
          id: `drawing-${drawingIdRef.current++}`,
          x1: pendingPoint.x,
          y1: pendingPoint.y,
          x2: pendingSecondPoint.x,
          y2: pendingSecondPoint.y,
          lineType: "disjointChannel",
          extraPoints: [
            { x: pendingSecondPoint.x, y: round4(pendingSecondPoint.y + offset) },
            { x: pendingPoint.x, y: round4(2 * pendingSecondPoint.y - pendingPoint.y + offset) },
          ],
        },
      ]);
      cancelDrawingTool();
      return;
    }

    // "fibonacciExtension"/"elliottCorrection"/"elliottImpulse" all collect more than two points
    // — the first two go through the same pendingPoint/pendingSecondPoint stages "channel" uses
    // above, the rest accumulate into pendingExtraPoints until MULTI_POINT_TOOLS' count for this
    // tool is reached, then commit with everything gathered.
    const multiPoint = MULTI_POINT_TOOLS[activeTool];
    if (multiPoint) {
      if (!pendingPoint) {
        setPendingPoint(point);
        setPreviewPoint(point);
        return;
      }
      if (!pendingSecondPoint) {
        setPendingSecondPoint(point);
        setPreviewPoint(point);
        return;
      }
      const nextExtra = [...pendingExtraPoints, point];
      if (nextExtra.length < multiPoint.extraPoints) {
        setPendingExtraPoints(nextExtra);
        setPreviewPoint(point);
        return;
      }
      commitDrawings([
        ...drawings,
        {
          id: `drawing-${drawingIdRef.current++}`,
          x1: pendingPoint.x,
          y1: pendingPoint.y,
          x2: pendingSecondPoint.x,
          y2: pendingSecondPoint.y,
          // MULTI_POINT_TOOLS only has entries for these three, guaranteed by `multiPoint` above
          // — narrower than what TS can infer just from the (wider-keyed) lookup being truthy.
          lineType: activeTool as "fibonacciExtension" | "elliottCorrection" | "elliottImpulse",
          extraPoints: nextExtra,
        },
      ]);
      cancelDrawingTool();
      return;
    }

    // "trendline", "extended", "fibonacci", "rectangle" and "zones" all share the same 2-click
    // flow — they only differ in how they're drawn (see the canvas draw effect) and, for
    // "rectangle"/"zones", hit-tested, not in how they're placed. "arrowLine" is the same flow
    // again but stays lineType-less like a plain trend line, just with arrowRight preset.
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
      ...(activeTool === "extended" || activeTool === "fibonacci" || activeTool === "rectangle" || activeTool === "zones"
        ? { lineType: activeTool }
        : {}),
      ...(activeTool === "arrowLine" ? { arrowRight: true } : {}),
    };
    commitDrawings([...drawings, drawing]);
    cancelDrawingTool();
  }

  function handleOverlayDoubleClick() {
    if (activeTool) return;
    // Double-clicking a drawing edits it (existing behavior) — double-clicking empty plot space
    // resets the zoom instead, same gesture the axis strips already use for their own axis.
    if (!hoveredDrawingId) {
      resetZoom();
      return;
    }
    const dr = drawings.find((d) => d.id === hoveredDrawingId);
    if (!dr) return;
    setEditingId(dr.id);
    setDraft(dr);
    // Coordonnées/Texte don't apply to a symbolOverlay (see the modal's own tab filtering) — Style
    // is the only tab it actually has.
    setEditModalTab(dr.lineType === "symbolOverlay" ? "style" : "coords");
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

  // pointIndex: 0 = x1/y1, 1 = x2/y2, 2+ = extraPoints[pointIndex - 2] — every multi-point tool
  // (fibonacciExtension/elliottCorrection/elliottImpulse) shares this one generic handler instead
  // of each needing its own, same as a regular trend line's two endpoints always have.
  function handleEndpointPointerDown(drawingId: string, pointIndex: number) {
    return (e: React.PointerEvent<SVGCircleElement>) => {
      // Still stops propagation while locked — otherwise the blocked click would bubble up to
      // the overlay underneath and start a whole-body drag instead, defeating the lock entirely.
      e.stopPropagation();
      if (drawingsLocked) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragEndpointRef.current = { id: drawingId, pointIndex };
    };
  }

  function handleEndpointPointerMove(e: React.PointerEvent<SVGCircleElement>) {
    const drag = dragEndpointRef.current;
    if (!drag) return;
    const point = toDataPoint(e);
    commitDrawings(
      drawings.map((d) => {
        if (d.id !== drag.id) return d;
        if (drag.pointIndex === 0) return { ...d, x1: point.x, y1: point.y };
        if (drag.pointIndex === 1) return { ...d, x2: point.x, y2: point.y };
        const extraPoints = [...(d.extraPoints ?? [])];
        extraPoints[drag.pointIndex - 2] = point;
        return { ...d, extraPoints };
      })
    );
  }

  function handleEndpointPointerUp(e: React.PointerEvent<SVGCircleElement>) {
    dragEndpointRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  // Redefines one of the measure tool's two completed points by dragging its handle — same
  // pointer-capture-on-the-handle pattern as a drawing endpoint above, just writing to
  // measurePoints instead of `drawings` (a measurement was never one to begin with).
  function handleMeasureHandlePointerDown(point: "p1" | "p2") {
    return (e: React.PointerEvent<SVGCircleElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragMeasureRef.current = point;
    };
  }

  function handleMeasureHandlePointerMove(e: React.PointerEvent<SVGCircleElement>) {
    const point = dragMeasureRef.current;
    if (!point) return;
    const next = toDataPoint(e);
    setMeasurePoints((mp) => (mp ? { ...mp, [point]: next } : mp));
  }

  function handleMeasureHandlePointerUp(e: React.PointerEvent<SVGCircleElement>) {
    dragMeasureRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  // Single-handle drag for an axis-constrained line: sets its value directly from the pointer's
  // absolute position (like the two-endpoint drag above), but along one axis only — a
  // "horizontal" line's handle only ever changes y1/y2 (kept equal), a "vertical" line's handle
  // only ever changes x1/x2 (kept equal).
  function handleAxisHandlePointerDown(drawingId: string) {
    return (e: React.PointerEvent<SVGCircleElement>) => {
      // Still stops propagation while locked — same reasoning as handleEndpointPointerDown above.
      e.stopPropagation();
      if (drawingsLocked) return;
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
      const pane = paneScaleAndOffset(dr.valueAxis);
      const value = round4(pane.scale.invert(mouseY - pane.offset));
      commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, y1: value, y2: value } : d)));
    } else if (dr.lineType === "vertical") {
      const mouseX = e.clientX - rect.left;
      const dateValue = dateForIndex(zoomedXScale.invert(mouseX));
      commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, x1: dateValue, x2: dateValue } : d)));
    } else if (dr.lineType === "ray" || dr.lineType === "arrowUp" || dr.lineType === "arrowDown") {
      // Both a ray's anchor and an arrow marker's single point have both degrees of freedom,
      // unlike horizontal/vertical's single axis — an arrow marker's own valueAxis is always
      // undefined (never set at creation, arrows aren't one of the pane-aware lineTypes), so
      // paneScaleAndOffset always resolves it to price same as before.
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const dateValue = dateForIndex(zoomedXScale.invert(mouseX));
      const pane = paneScaleAndOffset(dr.valueAxis);
      const value = round4(pane.scale.invert(mouseY - pane.offset));
      commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, x1: dateValue, x2: dateValue, y1: value, y2: value } : d)));
    } else if (dr.lineType === "channel") {
      // A channel's 3rd handle only adjusts channelOffset (single axis, vertical) — line 1's own
      // two endpoints already have their own draggable handles, same as a regular trend line.
      // Recomputes the offset so line 2 passes through the new mouseY at the handle's own X (its
      // line 2 midpoint) — the midpoint's line-1 price simplifies to a plain average of y1/y2.
      const mouseY = e.clientY - rect.top;
      const midPrice = (dr.y1 + dr.y2) / 2;
      commitDrawings(
        drawings.map((d) => (d.id === drag.id ? { ...d, channelOffset: round4(zoomedPriceScale.invert(mouseY) - midPrice) } : d))
      );
    }
  }

  function handleAxisHandlePointerUp(e: React.PointerEvent<SVGCircleElement>) {
    dragAxisRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const { chartDisplayMode, setChartDisplayMode, displayModeOpen, setDisplayModeOpen, displayModeAnchorRef, visible, heikinAshiCandles, renkoBricks, lineBreakBricks, tpoProfile } =
    useChartDisplayMode({ data, visibleRange, renkoAtrPeriod, defaultChartDisplayMode });

  const { hiddenEventKinds, setHiddenEventKinds, eventsVisible, setEventsVisible, activeEventStack, setActiveEventStack, eventModalOpen, setEventModalOpen, eventKinds, eventStacks } =
    useChartEvents({ events, indexForDate, visibleRange, dataLength: data.length });

  // The bottom axis's own scale is index-based now, so its automatic tick generator would label
  // ticks with raw indices (0, 100, 200…) instead of dates. Same fix BarChart/DeltaChart already
  // use for their categorical axis: supply explicit tickValues (slot centers, i + 0.5) throttled
  // to a readable count regardless of zoom, and a tickFormat that looks the date up by index.
  const dateTickValues = useMemo(() => {
    const start = Math.max(0, visibleRange.start);
    const end = Math.min(data.length, visibleRange.end);
    const count = end - start;
    if (count <= 0) return [];
    const step = Math.max(1, Math.ceil(count / MAX_DATE_TICKS));
    const values: number[] = [];
    for (let i = start; i < end; i += step) values.push(i + 0.5);
    return values;
  }, [visibleRange, data.length]);

  function dateTickFormat(v: number): string {
    const idx = Math.min(data.length - 1, Math.max(0, Math.round(v - 0.5)));
    return dFmt(data[idx].date);
  }

  // Each candle fills up to 80% of the space actually available to it at the current zoom —
  // with a single candle visible, that's 80% of the whole plot width. Deliberately no minimum
  // pixel floor: with many candles crammed into a narrow view (e.g. fully zoomed out on a
  // 10,000-candle dataset), 80% of their slot is still less than the slot itself, so neighbors
  // never overlap — a floor like `max(1, ...)` would force overlap once the slot itself was
  // narrower than that floor. Sized off the zoomed scale's own (unclamped) domain span rather
  // than `visibleRange` (which clamps to `data.length`) — otherwise, panned into the reserved
  // future space with only a few real candles peeking in from the left, `visibleRange` would
  // undercount the visible slots and render those candles too wide for the current zoom level.
  const zoomedSlotCount = useMemo(() => {
    const [i0, i1] = zoomedXScale.domain();
    return Math.max(1, i1 - i0);
  }, [zoomedXScale]);
  const candleWidth = Math.max(0.1, (dims.boundedWidth / zoomedSlotCount) * 0.8);

  const {
    indicatorValues,
    visibleIndicators,
    zoomedOwnPaneScales,
    paneScaleAndOffset,
    pixelYForDrawing,
    valueAxisLabel,
    resolveValueAxisAtY,
  } = useIndicatorPaneScales({
    data,
    fundamentals,
    indicators,
    ownPaneIndicators,
    indicatorPaneHeights,
    indicatorPaneTops,
    paneYTransform,
    visibleRange,
    zoomedPriceScale,
    zoomedVolumeScale,
    volumeVisible,
    volumeTop,
    volumeHeight,
    priceHeight,
  });

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Freehand capture: samples points into brushPointsRef (a ref, not state — pointermove can
    // fire faster than React re-renders, and the committed drawing on pointer up reads straight
    // from the ref instead of racing a stale closure over React state) throttled to roughly every
    // 3px of on-screen movement, so a slow stroke isn't hundreds of near-duplicate points. Mirrors
    // the same array into brushPreview state purely so the draw effect has something to render
    // live — the ref stays the single source of truth for what actually gets committed.
    if (brushDrawingRef.current) {
      const last = brushPointsRef.current[brushPointsRef.current.length - 1];
      if (last) {
        const lastX = zoomedXScale(indexForDate(last.x) + 0.5);
        const lastY = zoomedPriceScale(last.y);
        if (Math.hypot(mouseX - lastX, mouseY - lastY) < 3) return;
      }
      const point = toDataPoint(e);
      brushPointsRef.current = [...brushPointsRef.current, point];
      setBrushPreview(brushPointsRef.current);
      return;
    }

    if (dragLineRef.current) {
      const drag = dragLineRef.current;
      const dxPixels = e.clientX - drag.startClientX;
      const dyPixels = e.clientY - drag.startClientY;
      if (drag.orig.lineType === "horizontal") {
        // Dragging the body moves it exactly like its single handle would — only the
        // perpendicular axis (here, whichever pane it's anchored to) can change.
        const { scale } = paneScaleAndOffset(drag.orig.valueAxis);
        const newValue = round4(scale.invert(scale(drag.orig.y1) + dyPixels));
        commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, y1: newValue, y2: newValue } : d)));
      } else if (drag.orig.lineType === "vertical") {
        const origX = zoomedXScale(indexForDate(drag.orig.x1) + 0.5);
        const newDate = dateForIndex(zoomedXScale.invert(origX + dxPixels));
        commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, x1: newDate, x2: newDate } : d)));
      } else if (drag.orig.lineType === "ray") {
        // A ray has both degrees of freedom (unlike horizontal/vertical), so dragging its body
        // moves its one anchor point in both date and its own pane's value at once.
        const origX = zoomedXScale(indexForDate(drag.orig.x1) + 0.5);
        const newDate = dateForIndex(zoomedXScale.invert(origX + dxPixels));
        const { scale } = paneScaleAndOffset(drag.orig.valueAxis);
        const newValue = round4(scale.invert(scale(drag.orig.y1) + dyPixels));
        commitDrawings(drawings.map((d) => (d.id === drag.id ? { ...d, x1: newDate, x2: newDate, y1: newValue, y2: newValue } : d)));
      } else {
        const origX1 = zoomedXScale(indexForDate(drag.orig.x1) + 0.5);
        const origX2 = zoomedXScale(indexForDate(drag.orig.x2) + 0.5);
        const newX1 = dateForIndex(zoomedXScale.invert(origX1 + dxPixels));
        const newY1 = round4(zoomedPriceScale.invert(zoomedPriceScale(drag.orig.y1) + dyPixels));
        const newX2 = dateForIndex(zoomedXScale.invert(origX2 + dxPixels));
        const newY2 = round4(zoomedPriceScale.invert(zoomedPriceScale(drag.orig.y2) + dyPixels));
        // Any extraPoints (fibonacciExtension/elliottCorrection/elliottImpulse) move by the same
        // pixel delta as x1/x2, keeping the whole multi-point shape intact.
        const newExtraPoints = drag.orig.extraPoints?.map((p) => {
          const origX = zoomedXScale(indexForDate(p.x) + 0.5);
          return {
            x: dateForIndex(zoomedXScale.invert(origX + dxPixels)),
            y: round4(zoomedPriceScale.invert(zoomedPriceScale(p.y) + dyPixels)),
          };
        });
        commitDrawings(
          drawings.map((d) =>
            d.id === drag.id
              ? { ...d, x1: newX1, y1: newY1, x2: newX2, y2: newY2, ...(newExtraPoints ? { extraPoints: newExtraPoints } : {}) }
              : d
          )
        );
      }
      return;
    }

    if (isPanningYRef.current) return;

    const index = Math.min(data.length - 1, Math.max(0, Math.round(zoomedXScale.invert(mouseX) - 0.5)));
    setHoverIndex(index);
    setHoverY(mouseY <= priceHeight ? mouseY : null);
    // Bounded to volume's own [top, bottom) range (wherever it currently sits among the
    // indicator panes — see volumeTop), not just a bare "> priceHeight" — without both bounds,
    // hovering into an "own"-pane indicator (RSI/MACD/CHOP, which also satisfies mouseY >
    // priceHeight) incorrectly kept showing the volume hover line/badge there too, since nothing
    // distinguished "below the price section" from "specifically inside the volume pane".
    setHoverVolumeY(
      volumeVisible && !volumeCollapsed && mouseY > priceHeight + volumeTop && mouseY <= priceHeight + volumeTop + volumeHeight
        ? mouseY - priceHeight - volumeTop
        : null
    );

    if (activeTool && pendingPoint) {
      setPreviewPoint({ x: dateForIndex(zoomedXScale.invert(mouseX)), y: zoomedPriceScale.invert(mouseY) });
    } else if (!activeTool && visibleDrawings.length > 0) {
      let closestId: string | null = null;
      let closestDist = DRAWING_HIT_DISTANCE;
      for (const dr of visibleDrawings) {
        // Axis-constrained lines render full-span (see the canvas draw effect below) rather
        // than between their stored x1/x2 pixel positions, so hit-testing has to match that.
        let d: number;
        if (dr.lineType === "horizontal") {
          const y = pixelYForDrawing(dr);
          d = distanceToSegment(mouseX, mouseY, 0, y, dims.boundedWidth, y);
        } else if (dr.lineType === "ray") {
          const x = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const y = pixelYForDrawing(dr);
          d = distanceToSegment(mouseX, mouseY, x, y, dims.boundedWidth, y);
        } else if (dr.lineType === "vertical") {
          const x = zoomedXScale(indexForDate(dr.x1) + 0.5);
          d = distanceToSegment(mouseX, mouseY, x, 0, x, plotBoundedHeight);
        } else if (dr.lineType === "channel") {
          const cx1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const cy1 = zoomedPriceScale(dr.y1);
          const cx2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
          const cy2 = zoomedPriceScale(dr.y2);
          const offsetPx = zoomedPriceScale(dr.y1 + (dr.channelOffset ?? 0)) - zoomedPriceScale(dr.y1);
          d = Math.min(
            distanceToSegment(mouseX, mouseY, cx1, cy1, cx2, cy2),
            distanceToSegment(mouseX, mouseY, cx1, cy1 + offsetPx, cx2, cy2 + offsetPx)
          );
        } else if (dr.lineType === "fibonacci") {
          const fx1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const fx2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
          d = Math.min(
            // The diagonal x1/y1–x2/y2 line itself, same as a regular trend line...
            distanceToSegment(mouseX, mouseY, fx1, zoomedPriceScale(dr.y1), fx2, zoomedPriceScale(dr.y2)),
            // ...plus whichever retracement level line is closest.
            ...FIBONACCI_LEVELS.map((ratio) => {
              const y = zoomedPriceScale(dr.y1 + (dr.y2 - dr.y1) * ratio);
              return distanceToSegment(mouseX, mouseY, fx1, y, fx2, y);
            })
          );
        } else if (
          dr.lineType === "elliottImpulse" ||
          dr.lineType === "elliottCorrection" ||
          dr.lineType === "brush" ||
          dr.lineType === "elbowArrow"
        ) {
          // Same "polyline through every point" distance for a freehand stroke or an open-ended
          // elbow-arrow polyline as for an Elliott wave's own fixed vertices.
          const screenPoints = allPointsOf(dr).map((p) => ({ x: zoomedXScale(indexForDate(p.x) + 0.5), y: zoomedPriceScale(p.y) }));
          let minSegmentDist = Infinity;
          for (let i = 1; i < screenPoints.length; i++) {
            minSegmentDist = Math.min(
              minSegmentDist,
              distanceToSegment(mouseX, mouseY, screenPoints[i - 1].x, screenPoints[i - 1].y, screenPoints[i].x, screenPoints[i].y)
            );
          }
          d = minSegmentDist;
        } else if (dr.lineType === "rectangle") {
          const rx1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const ry1 = zoomedPriceScale(dr.y1);
          const rx2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
          const ry2 = zoomedPriceScale(dr.y2);
          d = Math.min(
            distanceToSegment(mouseX, mouseY, rx1, ry1, rx2, ry1),
            distanceToSegment(mouseX, mouseY, rx2, ry1, rx2, ry2),
            distanceToSegment(mouseX, mouseY, rx2, ry2, rx1, ry2),
            distanceToSegment(mouseX, mouseY, rx1, ry2, rx1, ry1)
          );
        } else if (dr.lineType === "zones") {
          // Unlike "rectangle" above (outline-only hit-testing), the three bands together fill
          // the whole pane height for this x-range — so anywhere inside that column counts as a
          // direct hit (d = 0), not just near one of the two boundary lines.
          const rx1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const rx2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
          const left = Math.min(rx1, rx2);
          const right = Math.max(rx1, rx2);
          d =
            mouseX >= left && mouseX <= right && mouseY >= 0 && mouseY <= priceHeight
              ? 0
              : Math.min(
                  distanceToSegment(mouseX, mouseY, left, 0, right, 0),
                  distanceToSegment(mouseX, mouseY, left, priceHeight, right, priceHeight),
                  distanceToSegment(mouseX, mouseY, left, 0, left, priceHeight),
                  distanceToSegment(mouseX, mouseY, right, 0, right, priceHeight)
                );
        } else if (dr.lineType === "arrowUp" || dr.lineType === "arrowDown") {
          d = Math.hypot(mouseX - zoomedXScale(indexForDate(dr.x1) + 0.5), mouseY - zoomedPriceScale(dr.y1));
        } else if (dr.lineType === "symbolOverlay") {
          // Same "polyline through every point" distance as a freehand stroke — over its own
          // projected (rebased-to-price-space) points, not x1/y1/x2/y2, which aren't meaningful
          // for this lineType (see its own doc comment).
          const projection = overlayProjections.find((p) => p.drawing.id === dr.id);
          const screenPoints = (projection?.points ?? []).map((p) => ({ x: zoomedXScale(p.i + 0.5), y: zoomedPriceScale(p.price) }));
          let minSegmentDist = Infinity;
          for (let i = 1; i < screenPoints.length; i++) {
            minSegmentDist = Math.min(
              minSegmentDist,
              distanceToSegment(mouseX, mouseY, screenPoints[i - 1].x, screenPoints[i - 1].y, screenPoints[i].x, screenPoints[i].y)
            );
          }
          d = minSegmentDist;
        } else if (dr.lineType === "fibonacciExtension") {
          const ax = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const ay = zoomedPriceScale(dr.y1);
          const bx = zoomedXScale(indexForDate(dr.x2) + 0.5);
          const by = zoomedPriceScale(dr.y2);
          const distances = [distanceToSegment(mouseX, mouseY, ax, ay, bx, by)];
          const pointC = dr.extraPoints?.[0];
          if (pointC) {
            const cx = zoomedXScale(indexForDate(pointC.x) + 0.5);
            const cy = zoomedPriceScale(pointC.y);
            distances.push(distanceToSegment(mouseX, mouseY, bx, by, cx, cy));
            const legDelta = dr.y2 - dr.y1;
            const levelX1 = Math.min(bx, cx);
            const levelX2 = Math.max(bx, cx);
            for (const ratio of FIBONACCI_EXTENSION_LEVELS) {
              const y = zoomedPriceScale(pointC.y + legDelta * ratio);
              distances.push(distanceToSegment(mouseX, mouseY, levelX1, y, levelX2, y));
            }
          }
          d = Math.min(...distances);
        } else if (dr.lineType === "disjointChannel") {
          const jx1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const jy1 = zoomedPriceScale(dr.y1);
          const jx2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
          const jy2 = zoomedPriceScale(dr.y2);
          const distances = [distanceToSegment(mouseX, mouseY, jx1, jy1, jx2, jy2)];
          const [p3, p4] = dr.extraPoints ?? [];
          if (p3 && p4) {
            distances.push(
              distanceToSegment(
                mouseX,
                mouseY,
                zoomedXScale(indexForDate(p3.x) + 0.5),
                zoomedPriceScale(p3.y),
                zoomedXScale(indexForDate(p4.x) + 0.5),
                zoomedPriceScale(p4.y)
              )
            );
          }
          d = Math.min(...distances);
        } else {
          const x1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
          const y1 = zoomedPriceScale(dr.y1);
          const x2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
          const y2 = zoomedPriceScale(dr.y2);
          // A regular trend line ("extended" included — see effectiveExtendOf) can be extended
          // past x1/x2 via the Style tab, not only when drawn with the dedicated tool.
          const extend = effectiveExtendOf(dr);
          if (extend === "none") {
            d = distanceToSegment(mouseX, mouseY, x1, y1, x2, y2);
          } else {
            const extended = extendSegmentToEdges(x1, y1, x2, y2, 0, dims.boundedWidth, extend);
            d = distanceToSegment(mouseX, mouseY, extended.x1, extended.y1, extended.x2, extended.y2);
          }
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
    // Brush is the one drawing tool that places points by dragging instead of clicking — starts
    // capturing here instead of falling through to the click-based tools' shared handleOverlayClick.
    if (activeTool === "brush") {
      e.currentTarget.setPointerCapture(e.pointerId);
      const point = toDataPoint(e);
      brushDrawingRef.current = true;
      brushPointsRef.current = [point];
      setBrushPreview(brushPointsRef.current);
      return;
    }
    if (activeTool) return;
    if (hoveredDrawingId) {
      // Locked: absorb the gesture instead of dragging the line OR falling through to Y-pan —
      // otherwise panning would shift the price scale under the (unmoved) line, breaking hit
      // testing at the original screen position. The drawing stays selectable/deletable/editable
      // (all driven by hover/double-click, untouched here), just not draggable.
      if (drawingsLocked) return;
      const dr = drawings.find((d) => d.id === hoveredDrawingId);
      // Data-driven, same reasoning "locked" absorbs the gesture above — there's no coordinate
      // for a whole-body drag to shift (see the lineType's own doc comment), and falling through
      // to Y-pan here would have the same hit-testing-drifts-under-you problem "locked" avoids.
      if (dr && dr.lineType === "symbolOverlay") return;
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
      // Only flagged here (once actual movement happens), not at pointerdown — a plain click
      // with no drag shouldn't disable YAutoScaling.
      setYManuallyAdjusted(true);
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
    if (brushDrawingRef.current) {
      brushDrawingRef.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      const points = brushPointsRef.current;
      brushPointsRef.current = [];
      setBrushPreview(null);
      if (points.length >= 2) {
        const first = points[0];
        const last = points[points.length - 1];
        commitDrawings([
          ...drawings,
          { id: `drawing-${drawingIdRef.current++}`, x1: first.x, y1: first.y, x2: last.x, y2: last.y, lineType: "brush", extraPoints: points.slice(1, -1) },
        ]);
      }
      cancelDrawingTool();
      return;
    }
    if (!dragLineRef.current) return;
    dragLineRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = ref.current;
    if (!canvas || !wrapper) return;
    renderCandlestickChart(canvas, wrapper, {
      dims,
      plotBoundedHeight,
      visible,
      zoomedXScale,
      zoomedPriceScale,
      candleWidth,
      chartDisplayMode,
      heikinAshiCandles,
      renkoBricks,
      lineBreakBricks,
      tpoProfile,
      data,
      visibleRange,
      upColorOverride,
      downColorOverride,
      volumeUpColorOverride,
      volumeDownColorOverride,
      volumeVisible,
      volumeCollapsed,
      zoomedVolumeScale,
      volumeHeight,
      volumeTop,
      priceHeight,
      ownPaneIndicators,
      indicatorPaneHeights,
      indicatorPaneTops,
      zoomedOwnPaneScales,
      indicators,
      overlayProjections,
      symbolOverlays,
      hovered,
      hoverY,
      hoverVolumeY,
      hoverIndex,
      visibleDrawings,
      hoveredDrawingId,
      activeTool,
      pendingPoint,
      previewPoint,
      pendingSecondPoint,
      pendingExtraPoints,
      brushPreview,
      measurePoints,
      livePrice,
      visibleIndicators,
      indexForDate,
    });
  }, [
    visible,
    zoomedXScale,
    zoomedPriceScale,
    candleWidth,
    chartDisplayMode,
    heikinAshiCandles,
    renkoBricks,
    lineBreakBricks,
    tpoProfile,
    data,
    visibleRange,
    upColorOverride,
    downColorOverride,
    volumeUpColorOverride,
    volumeDownColorOverride,
    volumeVisible,
    volumeCollapsed,
    zoomedVolumeScale,
    volumeHeight,
    volumeTop,
    priceHeight,
    ownPaneIndicators,
    indicatorPaneHeights,
    indicatorPaneTops,
    zoomedOwnPaneScales,
    indicators,
    overlayProjections,
    symbolOverlays,
    hovered,
    hoverY,
    hoverVolumeY,
    hoverIndex,
    visibleDrawings,
    hoveredDrawingId,
    activeTool,
    pendingPoint,
    previewPoint,
    pendingSecondPoint,
    pendingExtraPoints,
    brushPreview,
    measurePoints,
    livePrice,
    visibleIndicators,
    indexForDate,
    dims,
    plotBoundedHeight,
    themeTick,
    ref,
  ]);

  if (dims.width === 0)
    return <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")} style={{ width: isFullscreen ? undefined : width, height: isFullscreen ? undefined : height }} />;
  if (data.length === 0) {
    return (
      <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")} style={{ width: isFullscreen ? undefined : width, height: isFullscreen ? undefined : height }}>
        <div className="lq-chart__empty">Aucune donnée</div>
      </div>
    );
  }

  const dFmt = formatDate ?? d3.timeFormat("%d %b %Y");
  const pFmt = formatPrice ?? ((v: number) => v.toFixed(2));
  const vFmt = formatVolume ?? ((v: number) => d3.format(".2s")(v));
  // Every price-axis-pinned badge (hover, live price, price-overlay indicator values, horizontal/
  // ray drawing values) reads through this instead of `pFmt` directly, so they always agree with
  // the axis right beside them (see the price ChartAxis' own tickFormat, same compareMode check).
  const priceAxisFmt = (v: number) => (compareMode ? formatPercentFromReference(v, overlayProjections[0]?.mainReference ?? v) : pFmt(v));
  const currentTimeframeLabel = findTimeframeLabel(timeframes, timeframe);
  const currentModeEntry = CHART_DISPLAY_MODES.find((m) => m.mode === chartDisplayMode) ?? CHART_DISPLAY_MODES[0];
  // The top-left legend's own indicators — price overlays only, `ownPaneIndicators` (RSI/CHOP/
  // MACD) already have their own pane header and don't belong here too.
  const overlayIndicators = indicators.filter((ind) => indicatorCatalogEntry(ind.kind).pane === "price");

  // Live OHLC readout, top-left of the price plot — the hovered candle while hovering, the most
  // recent one otherwise (so the readout is never blank). % is against the *previous* candle's
  // close (not this candle's own open), matching how a trading platform's own top-bar readout
  // reads "change since last close" rather than "change within this bar".
  const ohlcIndex = hoverIndex !== null ? hoverIndex : data.length - 1;
  const ohlcCandle = data[ohlcIndex];
  const ohlcPrevClose = ohlcIndex > 0 ? data[ohlcIndex - 1].close : ohlcCandle.open;
  const ohlcDelta = ohlcCandle.close - ohlcPrevClose;
  const ohlcDeltaPct = ohlcPrevClose !== 0 ? (ohlcDelta / ohlcPrevClose) * 100 : 0;
  const ohlcSign = ohlcDelta >= 0 ? "+" : "";

  return (
    <div ref={ref} className={["lq-chart", isFullscreen && "lq-chart--fullscreen", className].filter(Boolean).join(" ")} style={{ width: isFullscreen ? undefined : width }}>
      {showHeader && !seasonalityOpen && (
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
          {/* No dedicated prop gates this (unlike `showIndicators`/`drawingTools`) — it rides on
              `showHeader` same as zoomable/fullscreenToggle, so it's on by default and only
              disappears in the edge case where a caller has already opted out of every other
              header feature too. */}
          <button
            ref={displayModeAnchorRef}
            type="button"
            className="lq-chart__icon-button"
            onClick={() => setDisplayModeOpen((o) => !o)}
            aria-label="Mode d'affichage"
            title="Mode d'affichage"
          >
            <currentModeEntry.icon size={14} />
          </button>
          <Popover open={displayModeOpen} onClose={() => setDisplayModeOpen(false)} anchorRef={displayModeAnchorRef} placement="bottom">
            <div className="lq-chart__display-mode-menu">
              {CHART_DISPLAY_MODES.map((entry) => (
                <button
                  key={entry.mode}
                  type="button"
                  className={["lq-chart__display-mode-option", entry.mode === chartDisplayMode && "lq-chart__display-mode-option--selected"]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    setChartDisplayMode(entry.mode);
                    onChartDisplayModeChange?.(entry.mode);
                    setDisplayModeOpen(false);
                  }}
                >
                  <entry.icon size={15} />
                  {entry.label}
                </button>
              ))}
            </div>
          </Popover>
          {events && events.length > 0 && (
            <button
              type="button"
              className={["lq-chart__icon-button", !eventsVisible && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
              onClick={() => setEventsVisible((v) => !v)}
              aria-label={eventsVisible ? "Masquer les évènements" : "Afficher les évènements"}
              aria-pressed={!eventsVisible}
              title="Masquer/afficher tous les évènements"
            >
              {eventsVisible ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
            </button>
          )}
          {showIndicators && (
            <button
              type="button"
              className="lq-chart__icon-button"
              onClick={() => {
                setIndicatorSearchQuery("");
                setIndicatorPickerOpen(true);
              }}
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
          {seasonality && (
            <button
              type="button"
              className="lq-chart__icon-button"
              onClick={() => setSeasonalityOpen(true)}
              aria-label="Saisonnalité"
              title="Saisonnalité : performance moyenne par période, agrégée sur l'historique"
            >
              <CalendarIcon size={14} />
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

      {/* Deliberately its own small header rather than trying to keep the regular one's
          timeframe/display-mode/indicator controls both visible and meaningful over a view none
          of them actually apply to — a dedicated "back" button here is a clearer way out of
          seasonality mode than expecting the same button that opened it to also be the one that
          closes it. */}
      {showHeader && seasonalityOpen && (
        <div className="lq-chart__header" style={{ width: dims.width }}>
          <button type="button" className="lq-chart__icon-button" onClick={() => setSeasonalityOpen(false)} aria-label="Retour au graphique">
            <ChevronLeftIcon size={14} />
          </button>
          <span className="lq-chart__symbol-info-name">{symbol ? `${symbol} — Saisonnalité` : "Saisonnalité"}</span>
        </div>
      )}

      {seasonalityOpen ? (
        <SeasonalityView data={data} height={plotHeight} />
      ) : (
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
            canvas is: .lq-chart carries fullscreen's own position:fixed/border and only
            .lq-chart__plot's box lines up with where the svg/canvas content actually starts.
            Explicitly sized (not left to intrinsic sizing from its svg child) so it can never
            drift from `dims` regardless of how the fullscreen flex container's own
            stretch/centering behaves. */}
        {/* Width is the *entire* reserved left margin (not just TOOLS_RAIL_WIDTH) so its
            right border lands exactly where the plot content starts — sizing it to the
            constant alone left an unstyled gap equal to the base margin between the rail
            and the first candle. Height spans the full plot (candles + volume + the date-axis
            label strip below them), reaching all the way down to the chart's own bottom border. */}
        {drawingTools && (
          <div className="lq-chart__tools-rail" style={{ width: dims.margin.left, height: plotHeight }}>
            <div className="lq-chart__tools-rail-items">
              {/* One group per category (Lignes/Fibonacci/Vagues d'Elliott) — each button
                  represents whichever of its own tools was picked last (defaulting to the
                  first). The chevron is invisible until its own group (button or chevron) is
                  hovered — see .lq-chart__tool-chevron in charts-shared.css. Picking a tool from
                  a category's menu both changes what its button represents *and* activates it
                  immediately (see handleSelectToolType) — clicking the button itself afterward
                  just toggles that same tool on/off, same as any other tool selection. */}
              {DRAWING_TOOL_CATEGORIES.map((category) => {
                const selectedType = selectedToolByCategory[category.id] ?? category.tools[0].type;
                const selectedInCategory = category.tools.find((t) => t.type === selectedType) ?? category.tools[0];
                const CategoryIcon = selectedInCategory.icon;
                const menuOpen = openToolMenu === category.id;
                return (
                  <Fragment key={category.id}>
                    {/* A thin rule ahead of "Mesure" only — visually separates the shape/marker
                        tools above from the standalone measuring tool, which doesn't add a
                        drawing to the chart the way every category above it does. */}
                    {category.id === "measure" && <div className="lq-chart__tool-separator" aria-hidden="true" />}
                    <div className="lq-chart__tool-group">
                    <button
                      type="button"
                      className={["lq-chart__icon-button", activeTool === selectedInCategory.type && "lq-chart__icon-button--active"]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => handleToolClick(selectedInCategory.type)}
                      aria-label={selectedInCategory.label}
                      aria-pressed={activeTool === selectedInCategory.type}
                    >
                      <CategoryIcon size={14} />
                    </button>
                    {/* Only worth a dropdown once there's actually something to pick between —
                        a single-tool category (e.g. "Mesure" today) has nowhere else for the
                        chevron to lead, so it stays off entirely instead of opening an empty-ish
                        one-item menu. Adding a 2nd tool to that category later makes this
                        reappear on its own, no extra wiring needed. */}
                    {category.tools.length > 1 && (
                      <>
                        <button
                          ref={menuAnchorRefFor(category.id)}
                          type="button"
                          className={["lq-chart__tool-chevron", menuOpen && "lq-chart__tool-chevron--visible"].filter(Boolean).join(" ")}
                          onClick={() => setOpenToolMenu((o) => (o === category.id ? null : category.id))}
                          aria-label={`Autres outils — ${category.id}`}
                        >
                          <ChevronDownIcon size={8} />
                        </button>
                        <Popover
                          open={menuOpen}
                          onClose={() => setOpenToolMenu(null)}
                          anchorRef={menuAnchorRefFor(category.id)}
                          placement="bottom"
                        >
                          <div className="lq-chart__tool-menu">
                            {category.tools.map((opt) => {
                              const OptionIcon = opt.icon;
                              return (
                                <button
                                  key={opt.type}
                                  type="button"
                                  className={["lq-chart__tool-menu-option", opt.type === selectedType && "lq-chart__tool-menu-option--selected"]
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
                      </>
                    )}
                    </div>
                  </Fragment>
                );
              })}
              {/* A persistent modifier, not a tool of its own — stays on across tool switches
                  (see toDataPoint/magnetSnapPrice) until toggled off again, so it lives outside
                  DRAWING_TOOL_CATEGORIES' button+chevron+menu pattern as a plain toggle. */}
              <button
                type="button"
                className={["lq-chart__icon-button", magnetActive && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
                onClick={() => setMagnetActive((a) => !a)}
                aria-label="Aimant"
                aria-pressed={magnetActive}
                title="Aimant : accroche les nouveaux points au prix (O/H/L/C) le plus proche"
              >
                <MagnetIcon size={14} />
              </button>
              {/* Hides every drawing without deleting any of them — same eye/eye-off convention
                  the indicator legend already uses for a single indicator, applied here to all
                  of `drawings` at once. */}
              <button
                type="button"
                className={["lq-chart__icon-button", drawingsHidden && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
                onClick={() => setDrawingsHidden((h) => !h)}
                aria-label={drawingsHidden ? "Afficher les dessins" : "Masquer les dessins"}
                aria-pressed={drawingsHidden}
                title="Masquer/afficher tous les dessins"
              >
                {drawingsHidden ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
              </button>
              {/* Blocks dragging (body, endpoints, and axis handles all check this before
                  starting) without touching selectability — hover, Delete, and double-click to
                  edit all keep working on a locked drawing, only click-and-drag is refused. */}
              <button
                type="button"
                className={["lq-chart__icon-button", drawingsLocked && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
                onClick={() => setDrawingsLocked((l) => !l)}
                aria-label={drawingsLocked ? "Déverrouiller les dessins" : "Verrouiller les dessins"}
                aria-pressed={drawingsLocked}
                title="Verrouiller/déverrouiller le déplacement des dessins"
              >
                <LockIcon size={14} />
              </button>
              {/* Pinned to the rail's own bottom edge (see .lq-chart__tools-rail-bottom-button),
                  separate from every tool/toggle above — opens a flat, grouped list of every
                  drawing and indicator currently on the chart (overlay and own-pane alike) with
                  a settings/delete action per row, instead of having to hunt each one down on
                  the chart itself (hovering a legend entry, or a collapsed pane that hides its
                  own actions). Shown whenever the rail itself is (drawingTools) regardless of
                  showIndicators — even drawings-only usage benefits from a single place to see
                  and clear everything drawn. */}
              <button
                type="button"
                className={["lq-chart__icon-button", "lq-chart__tools-rail-bottom-button", indicatorsManagerOpen && "lq-chart__icon-button--active"]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setIndicatorsManagerOpen((o) => !o)}
                aria-label="Dessins et indicateurs"
                aria-pressed={indicatorsManagerOpen}
                title="Voir et gérer tous les dessins et indicateurs actifs"
              >
                <LayersIcon size={14} />
              </button>
            </div>
          </div>
        )}
        {/* Symbol/chart-type label + live OHLC readout, then the indicator legend right below it
            — one shared top-left column instead of two independently-positioned corners, so
            neither has to guess the other's height to avoid overlapping it. */}
        <div className="lq-chart__plot-topleft" style={{ top: dims.margin.top + 6, left: dims.margin.left + 6 }}>
          <div className="lq-chart__symbol-info">
            {/* Its own hoverable zone (background on hover) only once `symbolSearch` opts in —
                otherwise `symbol` still renders, just as inert text, same as before this
                existed. Double-click only (not single), matching the chart-type label right
                next to it — deliberately NOT also wired to onClick: Modal's own overlay closes
                on click, covering the full viewport once open, so a single click that opened it
                would leave the *second* click of the same double-click gesture landing on that
                overlay instead of this button, closing the modal again immediately. */}
            {symbol &&
              (symbolSearch ? (
                <button
                  type="button"
                  className="lq-chart__symbol-info-name lq-chart__symbol-info-name--clickable"
                  onDoubleClick={() => setSymbolSearchOpen(true)}
                  aria-label="Rechercher un symbole"
                  title="Double-clic : rechercher un symbole"
                >
                  {symbol}
                </button>
              ) : (
                <span className="lq-chart__symbol-info-name">{symbol}</span>
              ))}
            {symbol && <span className="lq-chart__symbol-info-sep">·</span>}
            <button
              type="button"
              className="lq-chart__symbol-info-name lq-chart__symbol-info-name--clickable"
              onDoubleClick={() => setSettingsOpen(true)}
              title="Double-clic : paramètres du graphique"
            >
              {currentModeEntry.label}
            </button>
            <span className={["lq-chart__symbol-info-ohlc", ohlcDelta >= 0 ? "lq-chart__symbol-info-ohlc--up" : "lq-chart__symbol-info-ohlc--down"].join(" ")}>
              O {pFmt(ohlcCandle.open)} H {pFmt(ohlcCandle.high)} L {pFmt(ohlcCandle.low)} C {pFmt(ohlcCandle.close)} {ohlcSign}
              {pFmt(ohlcDelta)} ({ohlcSign}
              {ohlcDeltaPct.toFixed(2)}%)
            </span>
          </div>
          {/* Price-overlay indicators (SMA/EMA/WMA/VWAP/Bollinger) only — "own"-pane ones
              (RSI/CHOP/MACD) already get their own pane header with the same
              gear/trash/collapse actions, and don't belong on top of the price section they're
              not even plotted on. Filtering unconditionally on `indicators` here used to list
              every indicator regardless of `pane`, which put RSI/CHOP/MACD's labels in this
              corner overlapping the OHLC readout above them — and made their "eye" button here a
              silent no-op, since an own-pane indicator's visibility reads `paneCollapsed`, not
              `hidden` (see `Indicator.hidden`'s own doc comment). */}
          {((showIndicators && overlayIndicators.length > 0) || symbolOverlays.length > 0) && (
          <div className="lq-chart__indicator-legend">
            {overlayIndicators.map((indicator) => {
              // The *full* indicators array's own index, not this filtered map's — the canvas
              // draw effect cycles defaultIndicatorColor off that same full-array position (see
              // visibleIndicators.forEach a bit further up), so this has to match it exactly or
              // an indicator's legend swatch and its actual line would disagree on its color the
              // moment an own-pane indicator (filtered out of this list) sits before it.
              const i = indicators.indexOf(indicator);
              return (
              <div
                key={indicator.id}
                className="lq-chart__indicator-legend-item"
                style={{ color: indicator.color ?? defaultIndicatorColor(i) }}
                onDoubleClick={() => openIndicatorSettings(indicator.id)}
                onMouseEnter={() => setHoveredIndicatorId(indicator.id)}
                onMouseLeave={() => setHoveredIndicatorId((id) => (id === indicator.id ? null : id))}
              >
                <span
                  className={["lq-chart__indicator-legend-label", indicator.hidden && "lq-chart__indicator-legend-label--hidden"]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {indicatorLabel(indicator)}
                </span>
                {/* Invisible until this item is hovered (see charts-shared.css) — double-click
                    the label itself opens the settings modal too, so the gear is a discoverable
                    shortcut, not the only way in. */}
                <div className="lq-chart__indicator-legend-actions">
                  <button
                    type="button"
                    className="lq-chart__indicator-legend-action"
                    onClick={() => toggleIndicatorHidden(indicator.id)}
                    aria-label={indicator.hidden ? `Afficher ${indicatorLabel(indicator)}` : `Masquer ${indicatorLabel(indicator)}`}
                  >
                    {indicator.hidden ? <EyeOffIcon size={11} /> : <EyeIcon size={11} />}
                  </button>
                  <button
                    type="button"
                    className="lq-chart__indicator-legend-action"
                    onClick={() => removeIndicator(indicator.id)}
                    aria-label={`Supprimer ${indicatorLabel(indicator)}`}
                  >
                    <TrashIcon size={11} />
                  </button>
                  <button
                    type="button"
                    className="lq-chart__indicator-legend-action"
                    onClick={() => openIndicatorSettings(indicator.id)}
                    aria-label={`Paramètres ${indicatorLabel(indicator)}`}
                  >
                    <SettingsIcon size={11} />
                  </button>
                </div>
              </div>
              );
            })}
            {/* Symbol-comparison overlays (see onAddSymbolOverlay) — same legend, same hover-
                revealed eye/trash/gear actions as a price-overlay indicator's own entry above,
                but wired to the drawing this one actually is: the gear/double-click open its
                edit modal (Style tab only, see there), the eye toggles its own `hidden` field,
                the trash removes it from `drawings` directly (no confirmation round-trip through
                the app needed, unlike adding one — removing never needs new data). Hovering it
                also sets `hoveredDrawingId`, the same state a mouse actually over its line on the
                canvas would — so the line highlights while its legend entry is hovered, and
                Suppr/Retour arrière removes it from here too, exactly like hovering the line
                itself would. */}
            {symbolOverlays.map((dr) => (
              <div
                key={dr.id}
                className="lq-chart__indicator-legend-item"
                style={{ color: dr.color ?? defaultIndicatorColor(symbolOverlays.indexOf(dr)) }}
                onDoubleClick={() => {
                  setEditingId(dr.id);
                  setDraft(dr);
                  setEditModalTab("style");
                }}
                onMouseEnter={() => setHoveredDrawingId(dr.id)}
                onMouseLeave={() => setHoveredDrawingId((id) => (id === dr.id ? null : id))}
              >
                <span className={["lq-chart__indicator-legend-label", dr.hidden && "lq-chart__indicator-legend-label--hidden"].filter(Boolean).join(" ")}>
                  {drawingLabel(dr)}
                </span>
                <div className="lq-chart__indicator-legend-actions">
                  <button
                    type="button"
                    className="lq-chart__indicator-legend-action"
                    onClick={() => commitDrawings(drawings.map((d) => (d.id === dr.id ? { ...d, hidden: !d.hidden } : d)))}
                    aria-label={dr.hidden ? `Afficher ${drawingLabel(dr)}` : `Masquer ${drawingLabel(dr)}`}
                  >
                    {dr.hidden ? <EyeOffIcon size={11} /> : <EyeIcon size={11} />}
                  </button>
                  <button
                    type="button"
                    className="lq-chart__indicator-legend-action"
                    onClick={() => removeSymbolOverlay(dr.overlaySymbol ?? "")}
                    aria-label={`Supprimer ${drawingLabel(dr)}`}
                  >
                    <TrashIcon size={11} />
                  </button>
                  <button
                    type="button"
                    className="lq-chart__indicator-legend-action"
                    onClick={() => {
                      setEditingId(dr.id);
                      setDraft(dr);
                      setEditModalTab("style");
                    }}
                    aria-label={`Paramètres ${drawingLabel(dr)}`}
                  >
                    <SettingsIcon size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
        {/* Header strip for the volume pane — a fixed-height row pinned to the top of the pane
            (whether expanded or collapsed, hence sharing SUB_PANE_COLLAPSED_HEIGHT: when
            collapsed the pane *is* this row, when expanded it's just the top slice of it). Name
            always visible; the remove/collapse actions only reveal on hover of the pane itself
            (hoverVolumeY, already tracked by handlePointerMove — reused here instead of a CSS
            :hover, since the hoverable zone is the whole pane, much bigger than this row).
            pointer-events: none on the row itself so it never blocks the zoom/pan overlay or
            drawing-tool clicks underneath — same pattern as .lq-chart__indicator-legend. */}
        {volumeVisible && (
          <div
            className={[
              "lq-chart__pane-header",
              volumeCollapsed && "lq-chart__pane-header--collapsed",
              draggingPaneId === "volume" && "lq-chart__pane-header--dragging",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ top: dims.margin.top + priceHeight + volumeTop, left: dims.margin.left, width: dims.boundedWidth, height: SUB_PANE_COLLAPSED_HEIGHT }}
          >
            {/* Drag-to-resize: a thin strip straddling the divider above this pane, only while
                expanded (collapsed panes are a fixed height, nothing to resize). */}
            {!volumeCollapsed && (
              <div
                className="lq-chart__pane-resize-handle"
                onPointerDown={(e) => startPaneResize("volume", e)}
                aria-hidden="true"
              />
            )}
            <div className="lq-chart__pane-header-primary">
              {/* Same drag-to-reorder grip as every indicator pane's own header — volume is just
                  another entry in the same unified order now (see `allPanesOrder`/
                  `volumePaneOrder`), not a pane fixed permanently under price. */}
              <button
                type="button"
                className="lq-chart__pane-drag-handle"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setDraggingPaneId("volume");
                }}
                aria-label="Réordonner Volume"
                title="Glisser pour réordonner les panneaux"
              >
                <GripIcon size={12} />
              </button>
              {/* The collapse/expand chevron sits right after the grip, before the name — a
                  "twisty" convention, and no longer pushed to the pane's far right edge via
                  space-between: that placement read as detached from the row it actually
                  controlled. Always visible collapsed (it's the only way back to expanded);
                  hover-revealed alongside the other actions otherwise, same as before. */}
              <div
                className={["lq-chart__pane-header-actions", (volumeCollapsed || hoverVolumeY !== null) && "lq-chart__pane-header-actions--visible"]
                  .filter(Boolean)
                  .join(" ")}
              >
                {volumeCollapsed ? (
                  <button
                    type="button"
                    className="lq-chart__pane-header-action"
                    onClick={() => setVolumePaneState("expanded")}
                    aria-label="Agrandir le panneau Volume"
                  >
                    <ChevronUpIcon size={12} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="lq-chart__pane-header-action"
                    onClick={() => setVolumePaneState("collapsed")}
                    aria-label="Réduire le panneau Volume"
                  >
                    <ChevronDownIcon size={12} />
                  </button>
                )}
              </div>
              {/* The header itself is pointer-events: none (see .lq-chart__pane-header-label's
                  own CSS) so double-clicking has to target the label specifically, not the
                  header div as a whole. Collapsed: expands. Expanded: opens the volume settings
                  modal, matching every other pane's double-click-on-name convention. */}
              <span
                className="lq-chart__pane-header-label"
                onDoubleClick={() => (volumeCollapsed ? setVolumePaneState("expanded") : setVolumeSettingsOpen(true))}
              >
                Volume
              </span>
              {/* The volume equivalent of the price pane's own OHLC readout — the hovered
                  candle's volume, falling back to the most recent one, same convention. Colored
                  by that candle's own up/down direction, matching the bars themselves. */}
              {!volumeCollapsed &&
                data.length > 0 &&
                (() => {
                  const candle = data[hoverIndex !== null ? hoverIndex : data.length - 1];
                  const up = candle.close >= candle.open;
                  return (
                    <span className={["lq-chart__symbol-info-ohlc", up ? "lq-chart__symbol-info-ohlc--up" : "lq-chart__symbol-info-ohlc--down"].join(" ")}>
                      {vFmt(candle.volume ?? 0)}
                    </span>
                  );
                })()}
              {!volumeCollapsed && (
                <div
                  className={["lq-chart__pane-header-actions", hoverVolumeY !== null && "lq-chart__pane-header-actions--visible"]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <button
                    type="button"
                    className="lq-chart__pane-header-action"
                    onClick={() => setVolumeSettingsOpen(true)}
                    aria-label="Paramètres du panneau Volume"
                  >
                    <SettingsIcon size={11} />
                  </button>
                  <button
                    type="button"
                    className="lq-chart__pane-header-action"
                    onClick={() => setVolumePaneState("hidden")}
                    aria-label="Supprimer le panneau Volume"
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {/* One header per "own"-pane indicator (RSI/CHOP/MACD), same strip as volume's above —
            actions stay at a constant reduced opacity instead of hover-revealed (there's no
            existing hover-tracking state covering these panes' own screen area the way
            hoverVolumeY already did for volume, and building one just for this would be a lot of
            plumbing for a cosmetic difference). Gear opens the same settings modal price-overlay
            indicators use (period, or MACD's fast/slow/signal) — double-clicking the label does
            the same, matching that same legend's convention. */}
        {ownPaneIndicators.map((ind, idx) => (
          <div
            key={ind.id}
            className={[
              "lq-chart__pane-header",
              "lq-chart__pane-header--always-visible",
              ind.paneCollapsed && "lq-chart__pane-header--collapsed",
              draggingPaneId === ind.id && "lq-chart__pane-header--dragging",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              top: dims.margin.top + priceHeight + indicatorPaneTops[idx],
              left: dims.margin.left,
              width: dims.boundedWidth,
              height: SUB_PANE_COLLAPSED_HEIGHT,
            }}
          >
            {!ind.paneCollapsed && (
              <div
                className="lq-chart__pane-resize-handle"
                onPointerDown={(e) => startPaneResize(ind.id, e)}
                aria-hidden="true"
              />
            )}
            <div className="lq-chart__pane-header-primary">
              <button
                type="button"
                className="lq-chart__pane-drag-handle"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setDraggingPaneId(ind.id);
                }}
                aria-label={`Réordonner ${indicatorLabel(ind)}`}
                title="Glisser pour réordonner les panneaux"
              >
                <GripIcon size={12} />
              </button>
              {/* Collapse/expand chevron, right after the grip handle — a "twisty" convention,
                  no longer pushed to the pane's far right edge via space-between. */}
              {ind.paneCollapsed ? (
                <button
                  type="button"
                  className="lq-chart__pane-header-action"
                  onClick={() => commitIndicators(indicators.map((i) => (i.id === ind.id ? { ...i, paneCollapsed: false } : i)))}
                  aria-label={`Agrandir le panneau ${indicatorLabel(ind)}`}
                >
                  <ChevronUpIcon size={12} />
                </button>
              ) : (
                <button
                  type="button"
                  className="lq-chart__pane-header-action"
                  onClick={() => commitIndicators(indicators.map((i) => (i.id === ind.id ? { ...i, paneCollapsed: true } : i)))}
                  aria-label={`Réduire le panneau ${indicatorLabel(ind)}`}
                >
                  <ChevronDownIcon size={12} />
                </button>
              )}
              {/* The header itself is pointer-events: none (see .lq-chart__pane-header-label's
                  own CSS) so double-clicking has to target the label specifically. Collapsed:
                  expands the pane instead of opening its settings — there's no gear button
                  visible to double-click toward while collapsed anyway (see below), so this is
                  the only way to reach it short of the chevron. Expanded: same settings shortcut
                  as before, matching the indicator legend's own double-click convention. */}
              <span
                className="lq-chart__pane-header-label"
                onDoubleClick={() =>
                  ind.paneCollapsed
                    ? commitIndicators(indicators.map((i) => (i.id === ind.id ? { ...i, paneCollapsed: false } : i)))
                    : openIndicatorSettings(ind.id)
                }
              >
                {indicatorLabel(ind)}
              </span>
              {/* The RSI/CHOP/MACD equivalent of the price pane's own OHLC readout — this
                  indicator's own value(s) at the hovered candle, falling back to the most
                  recent one, same convention. MACD shows all three of its own series since none
                  of them alone represents "the" value the way a single RSI/CHOP number does. */}
              {!ind.paneCollapsed &&
                data.length > 0 &&
                (() => {
                  const entry = indicatorValues.find((v) => v.indicator.id === ind.id);
                  const value = entry?.values[hoverIndex !== null ? hoverIndex : data.length - 1];
                  if (value === null || value === undefined) return null;
                  return (
                    <span className="lq-chart__symbol-info-ohlc">
                      {typeof value === "number"
                        ? isFundamentalKind(ind.kind)
                          ? formatFundamentalValue(ind.kind, value)
                          : value.toFixed(2)
                        : "macd" in value
                          ? `MACD ${value.macd.toFixed(2)} · Signal ${value.signal !== null ? value.signal.toFixed(2) : "–"} · Hist ${
                              value.histogram !== null ? value.histogram.toFixed(2) : "–"
                            }`
                          : null}
                    </span>
                  );
                })()}
              {!ind.paneCollapsed && (
                <div className="lq-chart__pane-header-actions lq-chart__pane-header-actions--visible">
                  <button
                    type="button"
                    className="lq-chart__pane-header-action"
                    onClick={() => openIndicatorSettings(ind.id)}
                    aria-label={`Paramètres ${indicatorLabel(ind)}`}
                  >
                    <SettingsIcon size={11} />
                  </button>
                  <button
                    type="button"
                    className="lq-chart__pane-header-action"
                    onClick={() => removeIndicator(ind.id)}
                    aria-label={`Supprimer ${indicatorLabel(ind)}`}
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
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
            <ChartAxis
              scale={zoomedPriceScale}
              orientation="right"
              transform={`translate(${dims.boundedWidth}, 0)`}
              tickFormat={(v) => priceAxisFmt(Number(v))}
            />

            {volumeVisible && (
              <>
                {!volumeCollapsed && (
                  <g transform={`translate(0, ${priceHeight + volumeTop})`}>
                    <ChartAxis
                      scale={zoomedVolumeScale}
                      orientation="right"
                      transform={`translate(${dims.boundedWidth}, 0)`}
                      ticks={2}
                      tickFormat={(v) => vFmt(Number(v))}
                    />
                    {/* Drag (or double-click to reset) the volume pane's own axis to rescale just
                        this pane vertically — same convention as the price axis's own strip,
                        independent of it and of every other pane's own rescale. */}
                    <rect
                      className="lq-chart__axis-drag lq-chart__axis-drag--y"
                      x={dims.boundedWidth}
                      y={0}
                      width={dims.margin.right}
                      height={volumeHeight}
                      onPointerDown={handlePaneYAxisPointerDown("volume", volumeHeight)}
                      onPointerMove={handlePaneYAxisPointerMove}
                      onPointerUp={handlePaneYAxisPointerUp}
                      onDoubleClick={() => resetPaneYAxis("volume")}
                    />
                  </g>
                )}
                {/* Continues the canvas-drawn divider above volume (which only covers
                    [0, boundedWidth], the canvas's own extent) across the price axis's
                    tick-label column so the divider reaches the full chart width and visually
                    separates volume's own ticks from whatever's above it — priceHeight + volumeTop,
                    not always priceHeight, now that volume isn't necessarily right after price. */}
                <line
                  className="lq-chart__price-volume-divider"
                  x1={dims.boundedWidth}
                  x2={dims.boundedWidth + dims.margin.right}
                  y1={snapPixel(priceHeight + volumeTop)}
                  y2={snapPixel(priceHeight + volumeTop)}
                />
              </>
            )}

            {/* Same pair (a few ticks + a divider extension into the price-axis label column) as
                volume above, once per "own"-pane indicator — zoomedOwnPaneScales is shared with
                the canvas draw effect so these ticks always land exactly on what's actually
                drawn, manual rescale included. A drag strip over the ticks lets that rescale
                happen in the first place, same convention as the price/volume axes. */}
            {ownPaneIndicators.map((ind, idx) => {
              const paneTop = priceHeight + indicatorPaneTops[idx];
              const paneHeight = indicatorPaneHeights[idx];
              const scale = zoomedOwnPaneScales[ind.id];
              if (!scale) return null;
              return (
                <g key={ind.id}>
                  {!ind.paneCollapsed && (
                    <g transform={`translate(0, ${paneTop})`}>
                      <ChartAxis
                        scale={scale}
                        orientation="right"
                        transform={`translate(${dims.boundedWidth}, 0)`}
                        ticks={3}
                        tickFormat={isFundamentalKind(ind.kind) ? (v) => formatFundamentalValue(ind.kind, Number(v)) : undefined}
                      />
                      <rect
                        className="lq-chart__axis-drag lq-chart__axis-drag--y"
                        x={dims.boundedWidth}
                        y={0}
                        width={dims.margin.right}
                        height={paneHeight}
                        onPointerDown={handlePaneYAxisPointerDown(ind.id, paneHeight)}
                        onPointerMove={handlePaneYAxisPointerMove}
                        onPointerUp={handlePaneYAxisPointerUp}
                        onDoubleClick={() => resetPaneYAxis(ind.id)}
                      />
                    </g>
                  )}
                  <line
                    className="lq-chart__price-volume-divider"
                    x1={dims.boundedWidth}
                    x2={dims.boundedWidth + dims.margin.right}
                    y1={snapPixel(paneTop)}
                    y2={snapPixel(paneTop)}
                  />
                </g>
              );
            })}

            <ChartAxis
              scale={zoomedXScale}
              orientation="bottom"
              transform={`translate(0, ${plotBoundedHeight})`}
              tickValues={dateTickValues}
              tickFormat={dateTickFormat}
            />
            {/* The date axis's own domain line only spans [0, boundedWidth] — its own scale's
                range, i.e. the canvas/plot area — so it stopped short of the chart's actual
                right edge, leaving the price-axis label column above it without a matching
                line underneath. Same fix as the price/volume divider above: continue it across
                that column with a plain SVG line. */}
            <line
              className="lq-chart__axis-line-extension"
              x1={dims.boundedWidth}
              x2={dims.boundedWidth + dims.margin.right}
              y1={snapPixel(plotBoundedHeight)}
              y2={snapPixel(plotBoundedHeight)}
            />

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
              {visibleDrawings.map((dr) => {
                const isHovered = hoveredDrawingId === dr.id;
                if (!isHovered) return null;
                // A freehand stroke can have dozens of sampled points — individually draggable
                // handles for each would be impractical clutter, so it only moves as a whole
                // (the generic whole-body drag in handlePointerMove already covers that, no
                // per-type code needed there since it shifts every point — extraPoints included —
                // by the same pixel delta regardless of how many there are).
                if (dr.lineType === "brush") return null;
                // Data-driven (see onAddSymbolOverlay) — x1/y1/x2/y2 aren't real coordinates for
                // it (see its own doc comment), so there's nothing meaningful to drag by point or
                // as a whole (see handlePointerMove's own exclusion). Still hoverable/selectable/
                // deletable via Suppr and editable via double-click, same as brush above.
                if (dr.lineType === "symbolOverlay") return null;
                // Axis-constrained lines get a single handle at a fixed point along the axis
                // they don't move on (never at their data endpoints, which aren't meaningful
                // drag targets here — the whole line only has one degree of freedom).
                if (dr.lineType === "horizontal") {
                  const cy = pixelYForDrawing(dr);
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
                      cx={zoomedXScale(indexForDate(dr.x1) + 0.5)}
                      cy={plotBoundedHeight * AXIS_HANDLE_FRACTION_Y}
                      r={5}
                      onPointerDown={handleAxisHandlePointerDown(dr.id)}
                      onPointerMove={handleAxisHandlePointerMove}
                      onPointerUp={handleAxisHandlePointerUp}
                    />
                  );
                }
                // A ray's one handle sits right at its actual anchor point (unlike
                // horizontal/vertical's fixed-fraction handle) since that anchor is itself
                // meaningful and draggable in both axes.
                if (dr.lineType === "ray") {
                  const cy = pixelYForDrawing(dr);
                  return (
                    <circle
                      key={dr.id}
                      className="lq-chart__drawing-handle"
                      cx={zoomedXScale(indexForDate(dr.x1) + 0.5)}
                      cy={cy}
                      r={5}
                      onPointerDown={handleAxisHandlePointerDown(dr.id)}
                      onPointerMove={handleAxisHandlePointerMove}
                      onPointerUp={handleAxisHandlePointerUp}
                    />
                  );
                }
                // An arrow marker's one handle sits at its own point, same as a ray's anchor
                // above — x2/y2 mirrors x1/y1 automatically (see handleAxisHandlePointerMove).
                if (dr.lineType === "arrowUp" || dr.lineType === "arrowDown") {
                  return (
                    <circle
                      key={dr.id}
                      className="lq-chart__drawing-handle"
                      cx={zoomedXScale(indexForDate(dr.x1) + 0.5)}
                      cy={zoomedPriceScale(dr.y1)}
                      r={5}
                      onPointerDown={handleAxisHandlePointerDown(dr.id)}
                      onPointerMove={handleAxisHandlePointerMove}
                      onPointerUp={handleAxisHandlePointerUp}
                    />
                  );
                }
                // Every point (x1/y1, x2/y2, and any extraPoints) gets its own independently
                // draggable handle via the same generic pointIndex-based handler — covers a
                // regular trend line/extended/fibonacci's two points and
                // fibonacciExtension/elliottCorrection/elliottImpulse's extra ones alike, with no
                // per-tool-specific handle code needed beyond channel's own 3rd (below), which
                // adjusts channelOffset instead of a raw point.
                const points = allPointsOf(dr);
                const x1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
                const x2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
                return (
                  <g key={dr.id}>
                    {points.map((p, i) => (
                      <circle
                        key={i}
                        className="lq-chart__drawing-handle"
                        cx={zoomedXScale(indexForDate(p.x) + 0.5)}
                        cy={zoomedPriceScale(p.y)}
                        r={5}
                        onPointerDown={handleEndpointPointerDown(dr.id, i)}
                        onPointerMove={handleEndpointPointerMove}
                        onPointerUp={handleEndpointPointerUp}
                      />
                    ))}
                    {dr.lineType === "channel" && (
                      <circle
                        className="lq-chart__drawing-handle"
                        cx={(x1 + x2) / 2}
                        cy={zoomedPriceScale((dr.y1 + dr.y2) / 2 + (dr.channelOffset ?? 0))}
                        r={5}
                        onPointerDown={handleAxisHandlePointerDown(dr.id)}
                        onPointerMove={handleAxisHandlePointerMove}
                        onPointerUp={handleAxisHandlePointerUp}
                      />
                    )}
                  </g>
                );
              })}
              {/* The measure tool's own two points, draggable to redefine the measurement after
                  the tool has already deselected itself (see the "measure" branch of
                  handleOverlayClick) — always shown while a measurement exists rather than
                  hover-gated like the drawing handles above, since there's only ever at most one
                  measurement on screen at a time. */}
              {measurePoints && (
                <>
                  <circle
                    className="lq-chart__drawing-handle"
                    cx={zoomedXScale(indexForDate(measurePoints.p1.x) + 0.5)}
                    cy={zoomedPriceScale(measurePoints.p1.y)}
                    r={5}
                    onPointerDown={handleMeasureHandlePointerDown("p1")}
                    onPointerMove={handleMeasureHandlePointerMove}
                    onPointerUp={handleMeasureHandlePointerUp}
                  />
                  <circle
                    className="lq-chart__drawing-handle"
                    cx={zoomedXScale(indexForDate(measurePoints.p2.x) + 0.5)}
                    cy={zoomedPriceScale(measurePoints.p2.y)}
                    r={5}
                    onPointerDown={handleMeasureHandlePointerDown("p2")}
                    onPointerMove={handleMeasureHandlePointerMove}
                    onPointerUp={handleMeasureHandlePointerUp}
                  />
                </>
              )}
            </g>

            {/* Rendered last, same reasoning as the drawing handles above — needs to sit on top
                of the pan/zoom overlay to receive the pointer events its own <title> tooltip
                (and, now, its click) depends on. Anchored to the price/volume divider (not the
                tallest/shortest visible candle) so the row stays put while panning/zooming. One
                marker per `eventStacks` entry, not per raw event — several events sharing a
                candle index render as a single "stack" marker (count as its glyph, neutral
                accent color instead of any one event's own) rather than fully overlapping,
                indistinguishable circles. */}
            {eventStacks.length > 0 && (
              <g className="lq-chart__events">
                {eventStacks.map((stack) => {
                  const cx = zoomedXScale(stack.i + 0.5);
                  const cy = priceHeight - EVENT_MARKER_OFFSET;
                  const stacked = stack.events.length > 1;
                  const color = stacked ? "var(--lq-color-accent)" : stack.events[0].color;
                  const glyph = stacked ? String(stack.events.length) : (stack.events[0].symbol ?? stack.events[0].kind.charAt(0)).slice(0, 2).toUpperCase();
                  const title = stacked
                    ? `${stack.events.length} évènements — cliquer pour les afficher`
                    : `${dFmt(stack.events[0].date)} — ${stack.events[0].label}`;
                  return (
                    <g
                      key={stack.i}
                      className="lq-chart__event-marker"
                      transform={`translate(${cx}, ${cy})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEventModalOpen(false);
                        setActiveEventStack({ i: stack.i, events: stack.events });
                      }}
                    >
                      <title>{title}</title>
                      <line x1={0} x2={0} y1={EVENT_MARKER_RADIUS} y2={priceHeight - cy} stroke={color} strokeDasharray="2,2" />
                      <circle r={EVENT_MARKER_RADIUS} fill={color} />
                      <text textAnchor="middle" dominantBaseline="central">
                        {glyph}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </g>
        </svg>

        {hoverY !== null && (
          // The badge itself is pinned flush to the axis boundary so it never bleeds into the
          // chart — only the standalone "+" button (own square, own background) is allowed to
          // Flush to the axis boundary and at least as wide as the axis gutter itself (min-width,
          // not width — a long price string must still be able to grow further right rather than
          // clip, exactly as before) so the badge reads as filling the axis, not a narrower chip
          // floating inside it. The "+" button lives inside this same flex row (stretched to its
          // full height via align-items: stretch, no border-radius/height of its own) so it reads
          // as one integrated piece — never a separate element overlapping the chart.
          <div
            className="lq-chart__axis-value lq-chart__axis-value--y"
            style={{ top: dims.margin.top + hoverY, left: dims.margin.left + dims.boundedWidth, minWidth: dims.margin.right }}
          >
            <button type="button" className="lq-chart__axis-value-add" onClick={addPriceLine} aria-label="Ajouter une ligne de prix horizontale">
              <PlusIcon size={9} />
            </button>
            <span className="lq-chart__axis-value-text">{priceAxisFmt(zoomedPriceScale.invert(hoverY))}</span>
          </div>
        )}
        {hoverVolumeY !== null && (
          <div
            className="lq-chart__axis-value lq-chart__axis-value--y"
            style={{
              top: dims.margin.top + priceHeight + hoverVolumeY,
              left: dims.margin.left + dims.boundedWidth,
              minWidth: dims.margin.right,
            }}
          >
            <button type="button" className="lq-chart__axis-value-add" onClick={addVolumeLine} aria-label="Ajouter une ligne de volume horizontale">
              <PlusIcon size={9} />
            </button>
            <span className="lq-chart__axis-value-text">{vFmt(zoomedVolumeScale.invert(hoverVolumeY))}</span>
          </div>
        )}
        {hovered && (
          <>
            <div
              className="lq-chart__axis-value lq-chart__axis-value--x"
              style={{ left: dims.margin.left + zoomedXScale(hoverIndex! + 0.5), top: dims.margin.top + plotBoundedHeight }}
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
              style={{ left: dims.margin.left + zoomedXScale(hoverIndex! + 0.5), top: dims.margin.top + plotBoundedHeight - CROSSHAIR_ADD_INSET }}
              onClick={addDateLine}
              aria-label="Ajouter une ligne de date verticale"
            >
              <PlusIcon size={9} />
            </button>
          </>
        )}

        {/* Live last-close price (up/down colored against the previous close) and, right below
            it, a countdown to the next candle — the dashed line itself is canvas (see the draw
            effect), this is just its own Y-axis badge plus the countdown, both plain DOM since
            the countdown needs to re-render every second independent of the canvas. The interval
            is inferred from the last two candles' own dates, not a separate prop. */}
        {livePrice &&
          data.length > 0 &&
          (() => {
            const lastCandle = data[data.length - 1];
            const prevCandle = data.length > 1 ? data[data.length - 2] : null;
            const up = prevCandle ? lastCandle.close >= prevCandle.close : true;
            const y = dims.margin.top + clampToPriceAxis(zoomedPriceScale(lastCandle.close));
            const intervalMs = prevCandle ? lastCandle.date.getTime() - prevCandle.date.getTime() : null;
            const remainingMs = intervalMs ? lastCandle.date.getTime() + intervalMs - now : null;
            return (
              <>
                <div
                  className="lq-chart__axis-value lq-chart__axis-value--y"
                  style={{
                    top: y,
                    left: dims.margin.left + dims.boundedWidth,
                    minWidth: dims.margin.right,
                    backgroundColor: `var(${up ? "--lq-color-up" : "--lq-color-down"})`,
                  }}
                >
                  <span className="lq-chart__axis-value-text">{priceAxisFmt(lastCandle.close)}</span>
                </div>
                {remainingMs !== null && (
                  <div
                    className="lq-chart__live-countdown"
                    style={{ top: y + LIVE_COUNTDOWN_OFFSET, left: dims.margin.left + dims.boundedWidth }}
                  >
                    {formatCountdown(remainingMs)}
                  </div>
                )}
              </>
            );
          })()}

        {/* Each active price-overlay indicator's own latest value, same axis-badge style,
            colored to match that indicator's own line instead of the theme accent. "own"-pane
            indicators (RSI/CHOP/MACD) already get axis ticks on their own separate scale below,
            so they're excluded here — this is price-pane overlays only (SMA/EMA/WMA/VWAP/
            Bollinger, whose "value" is a plain number; Bollinger's own band uses its middle
            line). */}
        {showIndicators &&
          indicatorValues.map(({ indicator, values }, idx) => {
            if (indicator.hidden || indicatorCatalogEntry(indicator.kind).pane !== "price") return null;
            const last = values[values.length - 1];
            if (last === null) return null;
            // Only ever a plain number (SMA/EMA/WMA/VWAP) or a band (Bollinger, use its middle
            // line) here — MACD's own shape only exists on the "own"-pane branch this filter
            // above already excludes, but the values array's type covers all three.
            const value = typeof last === "number" ? last : "middle" in last ? last.middle : null;
            if (value === null) return null;
            const color = indicator.color ?? defaultIndicatorColor(idx);
            return (
              <div
                key={indicator.id}
                className="lq-chart__axis-value lq-chart__axis-value--y"
                style={{
                  top: dims.margin.top + clampToPriceAxis(zoomedPriceScale(value)),
                  left: dims.margin.left + dims.boundedWidth,
                  minWidth: dims.margin.right,
                  backgroundColor: color,
                }}
              >
                <span className="lq-chart__axis-value-text">{priceAxisFmt(value)}</span>
              </div>
            );
          })}

        {/* A horizontal/ray line's own value, permanently on its own pane's axis (not just on
            hover, unlike the badges above) — same visual as the hover badge, minus its "+"
            button since there's nothing left to add. Anchored to whichever pane the line's
            `valueAxis` says (price, volume, or an own-pane indicator), same as the hover volume
            badge already does for volume specifically. Only clamped to stay within its own pane
            when that pane is price — volume/indicator ones are left unclamped, same as volume's
            badge always has been (no report of that being an issue in practice). */}
        {visibleDrawings
          .filter((dr) => (dr.lineType === "horizontal" || dr.lineType === "ray") && (dr.valueAxis !== "volume" || volumeVisible))
          .map((dr) => {
            const isPrice = !dr.valueAxis || dr.valueAxis === "price";
            const y = isPrice ? clampToPriceAxis(pixelYForDrawing(dr)) : pixelYForDrawing(dr);
            return (
              <div
                key={dr.id}
                className="lq-chart__axis-value lq-chart__axis-value--y"
                style={{
                  top: dims.margin.top + y,
                  left: dims.margin.left + dims.boundedWidth,
                  minWidth: dims.margin.right,
                }}
              >
                <span className="lq-chart__axis-value-text">{isPrice ? priceAxisFmt(dr.y1) : dr.valueAxis === "volume" ? vFmt(dr.y1) : dr.y1.toFixed(2)}</span>
              </div>
            );
          })}

        {/* A "ray"'s own start date, only while its line is hovered (unlike the price badge
            above, which stays up permanently) — same X-axis badge style as the hover date
            badge, anchored to the line's own x1 instead of the live cursor position. */}
        {visibleDrawings
          .filter((dr) => dr.lineType === "ray" && dr.id === hoveredDrawingId)
          .map((dr) => (
            <div
              key={dr.id}
              className="lq-chart__axis-value lq-chart__axis-value--x"
              style={{ left: dims.margin.left + zoomedXScale(indexForDate(dr.x1) + 0.5), top: dims.margin.top + plotBoundedHeight }}
            >
              <span className="lq-chart__axis-value-text">{dFmt(dr.x1)}</span>
            </div>
          ))}

        {/* Anchored via left/bottom (not top) so its own content-driven height — capped at
            350px, see EventTooltip.css — never needs measuring just to keep its bottom edge
            pinned EVENT_TOOLTIP_GAP above the marker; see the component's own doc comment. Hidden
            (not unmounted-with-different-props) once the modal takes over, same as any other
            "expand" hand-off in this file. */}
        {activeEventStack &&
          !eventModalOpen &&
          (() => {
            const anchorX = dims.margin.left + zoomedXScale(activeEventStack.i + 0.5);
            const anchorY = dims.margin.top + (priceHeight - EVENT_MARKER_OFFSET);
            const tooltipWidth = Math.min(EVENT_TOOLTIP_WIDTH, dims.width);
            let left = anchorX - tooltipWidth / 2;
            left = Math.min(left, dims.width - tooltipWidth);
            left = Math.max(left, 0);
            const bottom = plotHeight - (anchorY - EVENT_MARKER_RADIUS - EVENT_TOOLTIP_GAP);
            return (
              <ChartEventTooltip
                events={activeEventStack.events}
                mode="popover"
                left={left}
                bottom={bottom}
                width={tooltipWidth}
                formatDate={dFmt}
                onExpand={() => setEventModalOpen(true)}
                onClose={() => setActiveEventStack(null)}
              />
            );
          })()}
      </div>
      )}

      {/* Own positioned ancestor is the root .lq-chart (this sits outside .lq-chart__plot, which
          would otherwise become the nearer positioned ancestor and confine it to the plot area
          alone) — "fills the whole chart" is meant to include the header/toolbar too, same
          footprint as the native fullscreen overlay. Closing it also clears activeEventStack
          (not just eventModalOpen) so the popover never reappears underneath once the modal that
          replaced it is dismissed. */}
      {eventModalOpen && activeEventStack && (
        <ChartEventTooltip
          events={activeEventStack.events}
          mode="modal"
          formatDate={dFmt}
          onClose={() => {
            setEventModalOpen(false);
            setActiveEventStack(null);
          }}
        />
      )}

      {editingId && draft && (
        <Modal
          open
          onClose={closeEditModal}
          title={draft.lineType === "symbolOverlay" ? `Paramètres — ${drawingLabel(draft)}` : "Modifier la ligne"}
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
          {/* Coordonnées/Texte don't apply to a symbolOverlay — x1/y1/x2/y2 aren't real
              coordinates for it (see the lineType's own doc comment) and there's no text label to
              speak of, only Style (thickness/color/line style, plus its own "Visible" toggle)
              does anything — so it skips the tab bar entirely rather than showing two tabs with
              nothing in them. */}
          {draft.lineType !== "symbolOverlay" && (
            <Tabs
              items={[
                { id: "coords", label: "Coordonnées" },
                { id: "text", label: "Texte" },
                { id: "style", label: "Style" },
              ]}
              value={editModalTab}
              onChange={(id) => setEditModalTab(id as "coords" | "text" | "style")}
              className="lq-chart__edit-drawing-tabs"
            />
          )}

          {editModalTab === "coords" && draft.lineType !== "symbolOverlay" && (
            <>
              {/* A horizontal/vertical line only has one degree of freedom (see the single drag
                  handle above) — editing its two endpoints independently here would let them
                  drift apart and break that invariant, so it gets one field instead of the usual
                  two. */}
              {draft.lineType === "horizontal" && (
                <NumberField
                  label={valueAxisLabel(draft.valueAxis)}
                  step={0.01}
                  value={draft.y1}
                  onChange={(v) => setDraft({ ...draft, y1: v === "" ? draft.y1 : round4(v), y2: v === "" ? draft.y2 : round4(v) })}
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
              {/* A ray keeps both its degrees of freedom (unlike horizontal/vertical), so it gets
                  both fields — still just one of each, since x2/y2 always mirror x1/y1. Arrow
                  markers share this same one-point editor (never a volume value — they're always
                  price-anchored). */}
              {(draft.lineType === "ray" || draft.lineType === "arrowUp" || draft.lineType === "arrowDown") && (
                <div className="lq-chart__edit-drawing-row">
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
                  <NumberField
                    label={valueAxisLabel(draft.valueAxis)}
                    step={0.01}
                    value={draft.y1}
                    onChange={(v) => setDraft({ ...draft, y1: v === "" ? draft.y1 : round4(v), y2: v === "" ? draft.y2 : round4(v) })}
                  />
                </div>
              )}
              {/* Regular trend line, "extended" (same two points, just drawn further — see the
                  canvas draw effect), "channel" (line 1's own two points; its second, parallel
                  line is set by the "Décalage" field below instead of its own coordinates),
                  "fibonacci" (its retracement levels are all derived from these same two points,
                  0% at "Prix début" and 100% at "Prix fin") and "rectangle"/"zones" (opposite
                  corners) all share the same two-point editor. */}
              {(!draft.lineType ||
                draft.lineType === "extended" ||
                draft.lineType === "channel" ||
                draft.lineType === "fibonacci" ||
                draft.lineType === "rectangle" ||
                draft.lineType === "zones") && (
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
                    <NumberField
                      label="Prix début"
                      step={0.01}
                      value={draft.y1}
                      onChange={(v) => setDraft({ ...draft, y1: v === "" ? draft.y1 : round4(v) })}
                    />
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
                    <NumberField
                      label="Prix fin"
                      step={0.01}
                      value={draft.y2}
                      onChange={(v) => setDraft({ ...draft, y2: v === "" ? draft.y2 : round4(v) })}
                    />
                  </div>
                </>
              )}
              {draft.lineType === "channel" && (
                <NumberField
                  label="Décalage (ligne 2)"
                  step={0.01}
                  value={draft.channelOffset ?? 0}
                  onChange={(v) => setDraft({ ...draft, channelOffset: v === "" ? draft.channelOffset : round4(v) })}
                />
              )}
              {/* "disjointChannel"/"fibonacciExtension"/"elliottCorrection"/"elliottImpulse" — a
                  date+price row per point (x1/y1, x2/y2, then extraPoints), generic over however
                  many that tool needs instead of a fixed "Début"/"Fin" pair. */}
              {draft.lineType &&
                MULTI_POINT_TOOLS[draft.lineType as DrawingToolType]?.labels.map((label, i) => {
                  const point = i === 0 ? { x: draft.x1, y: draft.y1 } : i === 1 ? { x: draft.x2, y: draft.y2 } : draft.extraPoints?.[i - 2];
                  if (!point) return null;
                  const setPointField = (next: Partial<DataPoint>) => {
                    if (i === 0) {
                      setDraft({ ...draft, x1: next.x ?? draft.x1, y1: next.y ?? draft.y1 });
                    } else if (i === 1) {
                      setDraft({ ...draft, x2: next.x ?? draft.x2, y2: next.y ?? draft.y2 });
                    } else {
                      const extra = [...(draft.extraPoints ?? [])];
                      extra[i - 2] = { ...extra[i - 2], ...next };
                      setDraft({ ...draft, extraPoints: extra });
                    }
                  };
                  return (
                    <div className="lq-chart__edit-drawing-row" key={i}>
                      <div className="lq-field">
                        <label className="lq-field__label">{label}</label>
                        <input
                          type="date"
                          className="lq-chart__date-input"
                          value={toDateInputValue(point.x)}
                          onChange={(e) => setPointField({ x: fromDateInputValue(e.target.value, point.x) })}
                        />
                      </div>
                      <NumberField
                        label={`Prix (${label})`}
                        step={0.01}
                        value={point.y}
                        onChange={(v) => v !== "" && setPointField({ y: round4(v) })}
                      />
                    </div>
                  );
                })}
              {/* "elbowArrow" — same date+price-row-per-point idea as the generic multi-point
                  block above, but over allPointsOf directly (numbered "Point N") instead of
                  MULTI_POINT_TOOLS' fixed labels array, since it can have any number of points
                  depending on how many clicks it took before Escape finalized it. */}
              {draft.lineType === "elbowArrow" &&
                allPointsOf(draft).map((point, i) => {
                  const setPointField = (next: Partial<DataPoint>) => {
                    if (i === 0) {
                      setDraft({ ...draft, x1: next.x ?? draft.x1, y1: next.y ?? draft.y1 });
                    } else if (i === 1) {
                      setDraft({ ...draft, x2: next.x ?? draft.x2, y2: next.y ?? draft.y2 });
                    } else {
                      const extra = [...(draft.extraPoints ?? [])];
                      extra[i - 2] = { ...extra[i - 2], ...next };
                      setDraft({ ...draft, extraPoints: extra });
                    }
                  };
                  const label = `Point ${i + 1}`;
                  return (
                    <div className="lq-chart__edit-drawing-row" key={i}>
                      <div className="lq-field">
                        <label className="lq-field__label">{label}</label>
                        <input
                          type="date"
                          className="lq-chart__date-input"
                          value={toDateInputValue(point.x)}
                          onChange={(e) => setPointField({ x: fromDateInputValue(e.target.value, point.x) })}
                        />
                      </div>
                      <NumberField
                        label={`Prix (${label})`}
                        step={0.01}
                        value={point.y}
                        onChange={(v) => v !== "" && setPointField({ y: round4(v) })}
                      />
                    </div>
                  );
                })}
            </>
          )}

          {editModalTab === "text" && draft.lineType !== "symbolOverlay" && (
            <>
              <TextField
                label="Texte"
                placeholder="Étiquette (optionnel)"
                value={draft.text ?? ""}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              />
              <Checkbox
                checked={draft.textAlignWithLine ?? false}
                onChange={(textAlignWithLine) => setDraft({ ...draft, textAlignWithLine })}
                label="Aligner le texte avec la ligne"
              />
              <div className="lq-chart__edit-drawing-row">
                <NumberField
                  label="Taille du texte"
                  min={8}
                  max={48}
                  step={1}
                  value={draft.textSize ?? 11}
                  onChange={(v) => setDraft({ ...draft, textSize: v === "" ? 11 : v })}
                />
                <div className="lq-field">
                  <label className="lq-field__label">Couleur du texte</label>
                  <input
                    type="color"
                    className="lq-chart__color-input"
                    value={draft.textColor ?? draft.color ?? DEFAULT_DRAWING_COLOR}
                    onChange={(e) => setDraft({ ...draft, textColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="lq-field">
                <label className="lq-field__label">Couleur de fond</label>
                <input
                  type="color"
                  className="lq-chart__color-input"
                  value={draft.textBackgroundColor ?? "#000000"}
                  // Auto-picks a contrasting text color every time the background changes, so the
                  // label never accidentally lands on an unreadable pairing — still overridable by
                  // hand afterward via "Couleur du texte" above, which this doesn't touch again
                  // unless the background itself changes once more.
                  onChange={(e) => setDraft({ ...draft, textBackgroundColor: e.target.value, textColor: contrastingTextColor(e.target.value) })}
                />
              </div>
              {draft.textBackgroundColor && (
                <button
                  type="button"
                  className="lq-chart__text-bg-clear"
                  onClick={() => setDraft({ ...draft, textBackgroundColor: undefined })}
                >
                  Retirer la couleur de fond
                </button>
              )}
              <div className="lq-chart__edit-drawing-row">
                <Checkbox checked={draft.textBold ?? true} onChange={(textBold) => setDraft({ ...draft, textBold })} label="Gras" />
                <Checkbox checked={draft.textItalic ?? false} onChange={(textItalic) => setDraft({ ...draft, textItalic })} label="Italique" />
              </div>
              <div className="lq-chart__edit-drawing-row">
                <Select
                  label="Alignement vertical"
                  value={draft.textVerticalAlign ?? "top"}
                  onChange={(v) => setDraft({ ...draft, textVerticalAlign: v })}
                  options={[
                    { value: "top", label: "Haut" },
                    { value: "center", label: "Centre" },
                    { value: "bottom", label: "Bas" },
                  ]}
                />
                <Select
                  label="Alignement horizontal"
                  value={draft.textHorizontalAlign ?? "center"}
                  onChange={(v) => setDraft({ ...draft, textHorizontalAlign: v })}
                  options={[
                    { value: "left", label: "Gauche" },
                    { value: "center", label: "Centre" },
                    { value: "right", label: "Droite" },
                  ]}
                />
              </div>
            </>
          )}

          {editModalTab === "style" && (
            <>
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
              <Select
                label="Style de trait"
                value={draft.lineStyle ?? (draft.dashed ? "dashed" : "solid")}
                onChange={(v) => setDraft({ ...draft, lineStyle: v, dashed: undefined })}
                options={[
                  { value: "solid", label: "Continu" },
                  { value: "dashed", label: "Tirets" },
                  { value: "dotted", label: "Pointillés" },
                  { value: "dashdot", label: "Tiret-point" },
                ]}
              />
              {/* "extend" only applies to a plain 2-point line — the other line types (channel,
                  fibonacci, elliott, disjoint channel, horizontal/ray/vertical) each draw
                  themselves with their own fixed geometry and don't read this field (see the
                  canvas draw effect's per-lineType branches vs. its generic fallback). */}
              {(!draft.lineType || draft.lineType === "extended") && (
                <Select
                  label="Extension"
                  value={effectiveExtendOf(draft)}
                  onChange={(v) => setDraft({ ...draft, extend: v, lineType: draft.lineType === "extended" ? undefined : draft.lineType })}
                  options={[
                    { value: "none", label: "Ne pas étendre" },
                    { value: "right", label: "Étendre à droite" },
                    { value: "left", label: "Étendre à gauche" },
                    { value: "both", label: "Étendre des deux côtés" },
                  ]}
                />
              )}
              {/* Arrowheads only make sense on a line that actually stops somewhere — offered
                  only once "Extension" above is set to "Ne pas étendre" (an infinitely-extended
                  end has nothing to put an arrowhead on). "Gauche"/"Droite" are screen positions
                  (see arrowLeft/arrowRight's own doc), not tied to which point is x1 vs x2. */}
              {(!draft.lineType || draft.lineType === "extended") && effectiveExtendOf(draft) === "none" && (
                <div className="lq-chart__edit-drawing-row">
                  <Checkbox checked={draft.arrowLeft ?? false} onChange={(arrowLeft) => setDraft({ ...draft, arrowLeft })} label="Flèche à gauche" />
                  <Checkbox checked={draft.arrowRight ?? false} onChange={(arrowRight) => setDraft({ ...draft, arrowRight })} label="Flèche à droite" />
                </div>
              )}
              {draft.lineType === "zones" && (
                <>
                  <Checkbox
                    checked={draft.showZoneSides ?? false}
                    onChange={(showZoneSides) => setDraft({ ...draft, showZoneSides })}
                    label="Afficher les bords verticaux"
                  />
                  <div className="lq-chart__edit-drawing-row">
                    <div className="lq-field">
                      <label className="lq-field__label">Zone positive</label>
                      <input
                        type="color"
                        className="lq-chart__color-input"
                        value={draft.positiveColor ?? "#26a69a"}
                        onChange={(e) => setDraft({ ...draft, positiveColor: e.target.value })}
                      />
                    </div>
                    <div className="lq-field">
                      <label className="lq-field__label">Zone neutre</label>
                      <input
                        type="color"
                        className="lq-chart__color-input"
                        value={draft.neutralColor ?? "#9e9e9e"}
                        onChange={(e) => setDraft({ ...draft, neutralColor: e.target.value })}
                      />
                    </div>
                    <div className="lq-field">
                      <label className="lq-field__label">Zone négative</label>
                      <input
                        type="color"
                        className="lq-chart__color-input"
                        value={draft.negativeColor ?? "#ef5350"}
                        onChange={(e) => setDraft({ ...draft, negativeColor: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}
              {draft.lineType === "symbolOverlay" && (
                <Checkbox
                  checked={!draft.hidden}
                  onChange={(visible) => setDraft({ ...draft, hidden: !visible })}
                  label="Visible"
                />
              )}
            </>
          )}
        </Modal>
      )}

      {indicatorPickerOpen && (
        <Modal open onClose={() => setIndicatorPickerOpen(false)} title="Ajouter un indicateur">
          <TextField
            placeholder="Rechercher un indicateur…"
            value={indicatorSearchQuery}
            onChange={(e) => setIndicatorSearchQuery(e.target.value)}
            leadingIcon={<SearchIcon size={14} />}
            autoFocus
          />
          <div className="lq-chart__indicator-picker">
            {(() => {
              const query = indicatorSearchQuery.trim().toLowerCase();
              const showVolumeOption = showVolume && "volume".includes(query);
              const matches = INDICATOR_CATALOG.filter(
                (entry) => entry.label.toLowerCase().includes(query) || entry.shortLabel.toLowerCase().includes(query)
              );
              const groups: { category: string; entries: IndicatorCatalogEntry[] }[] = [];
              for (const entry of matches) {
                const group = groups.find((g) => g.category === entry.category);
                if (group) group.entries.push(entry);
                else groups.push({ category: entry.category, entries: [entry] });
              }
              if (!showVolumeOption && groups.length === 0) {
                return <p className="lq-chart__indicator-picker-empty">Aucun indicateur ne correspond à « {indicatorSearchQuery} ».</p>;
              }
              return (
                <>
                  {/* Volume isn't part of INDICATOR_CATALOG — it's the caller's own data (not
                      something computed), driven by `showVolume`/the volume pane's own header
                      rather than an `Indicator` entry — but it's still just as valid an "add a
                      pane" choice as RSI/CHOP/MACD, so it gets a slot here too, re-showing the
                      pane if it was previously collapsed or removed. */}
                  {showVolumeOption && (
                    <div className="lq-chart__indicator-picker-group">
                      <div className="lq-chart__indicator-picker-group-label">Volume</div>
                      <button
                        type="button"
                        className="lq-chart__indicator-picker-option"
                        onClick={() => setVolumePaneState("expanded")}
                      >
                        <span className="lq-chart__indicator-picker-name">Volume</span>
                        <span className="lq-chart__indicators-manager-badge" title="Panneau séparé">
                          <PaneBadgeIcon size={13} />
                        </span>
                      </button>
                    </div>
                  )}
                  {groups.map((group) => (
                    <div className="lq-chart__indicator-picker-group" key={group.category}>
                      <div className="lq-chart__indicator-picker-group-label">{group.category}</div>
                      {group.entries.map((entry) => (
                        <button
                          key={entry.kind}
                          type="button"
                          className="lq-chart__indicator-picker-option"
                          onClick={() => addIndicator(entry)}
                        >
                          <span className="lq-chart__indicator-picker-name">{entry.label}</span>
                          <span
                            className="lq-chart__indicators-manager-badge"
                            title={entry.pane === "price" ? "Superposé au prix" : "Panneau séparé"}
                          >
                            {entry.pane === "price" ? <OverlayBadgeIcon size={13} /> : <PaneBadgeIcon size={13} />}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </Modal>
      )}

      {indicatorsManagerOpen && (
        <Modal open onClose={() => setIndicatorsManagerOpen(false)} title="Dessins et indicateurs" footer={null}>
          <div className="lq-chart__indicators-manager">
            {(() => {
              const overlay = indicators.filter((ind) => indicatorCatalogEntry(ind.kind).pane === "price");
              const own = ownPaneIndicators;
              if (overlay.length === 0 && own.length === 0 && !volumeVisible && visibleDrawings.length === 0) {
                return <p className="lq-chart__indicator-picker-empty">Rien à gérer pour l'instant — aucun dessin ni indicateur actif.</p>;
              }
              // A row's own two actions mirror exactly what's already reachable from the chart
              // itself (the legend's roue crantée/corbeille for an overlay, a pane header's for an
              // "own" one, Suppr/double-clic for a drawing) — this list is a second way to reach
              // the same actions, not a new set of them, so nothing here can do anything the
              // chart's own hover/pane-header UI can't.
              const row = (label: string, badge: React.ReactNode, badgeTitle: string, onSettings: (() => void) | null, onDelete: () => void, key: string) => (
                <div className="lq-chart__indicators-manager-row" key={key}>
                  <span className="lq-chart__indicators-manager-badge" title={badgeTitle}>
                    {badge}
                  </span>
                  <span className="lq-chart__indicators-manager-name">{label}</span>
                  <span className="lq-chart__indicators-manager-actions">
                    {onSettings && (
                      <button type="button" className="lq-chart__pane-header-action" onClick={onSettings} aria-label={`Paramètres ${label}`}>
                        <SettingsIcon size={13} />
                      </button>
                    )}
                    <button type="button" className="lq-chart__pane-header-action" onClick={onDelete} aria-label={`Supprimer ${label}`}>
                      <TrashIcon size={13} />
                    </button>
                  </span>
                </div>
              );
              return (
                <>
                  {visibleDrawings.length > 0 && (
                    <div className="lq-chart__indicator-picker-group">
                      <div className="lq-chart__indicator-picker-group-label">Dessins</div>
                      {visibleDrawings.map((dr) => {
                        const ToolIcon = drawingToolMeta(dr).icon;
                        return row(
                          drawingLabel(dr),
                          <ToolIcon size={13} />,
                          drawingToolMeta(dr).label,
                          () => {
                            setEditingId(dr.id);
                            setDraft(dr);
                            setEditModalTab("coords");
                          },
                          () => commitDrawings(drawings.filter((d) => d.id !== dr.id)),
                          dr.id
                        );
                      })}
                    </div>
                  )}
                  {overlay.length > 0 && (
                    <div className="lq-chart__indicator-picker-group">
                      <div className="lq-chart__indicator-picker-group-label">Superposés au prix</div>
                      {overlay.map((ind) =>
                        row(
                          indicatorLabel(ind),
                          <OverlayBadgeIcon size={13} />,
                          "Superposé au prix",
                          () => openIndicatorSettings(ind.id),
                          () => removeIndicator(ind.id),
                          ind.id
                        )
                      )}
                    </div>
                  )}
                  {(own.length > 0 || volumeVisible) && (
                    <div className="lq-chart__indicator-picker-group">
                      <div className="lq-chart__indicator-picker-group-label">En sous-panneau</div>
                      {volumeVisible &&
                        row("Volume", <PaneBadgeIcon size={13} />, "Panneau séparé", () => setVolumeSettingsOpen(true), () => setVolumePaneState("hidden"), "volume")}
                      {own.map((ind) =>
                        row(
                          indicatorLabel(ind),
                          <PaneBadgeIcon size={13} />,
                          "Panneau séparé",
                          () => openIndicatorSettings(ind.id),
                          () => removeIndicator(ind.id),
                          ind.id
                        )
                      )}
                    </div>
                  )}
                </>
              );
            })()}
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
          {indicatorCatalogEntry(indicatorDraft.kind).hasPeriod && (
            <NumberField
              label="Période"
              min={1}
              max={500}
              step={1}
              value={indicatorDraft.period}
              onChange={(v) => setIndicatorDraft({ ...indicatorDraft, period: v === "" ? indicatorDraft.period : v })}
            />
          )}
          {indicatorCatalogEntry(indicatorDraft.kind).hasStdDev && (
            <NumberField
              label="Écart-type (bandes)"
              min={0.5}
              max={5}
              step={0.1}
              value={indicatorDraft.stdDev ?? 2}
              onChange={(v) => setIndicatorDraft({ ...indicatorDraft, stdDev: v === "" ? indicatorDraft.stdDev : v })}
            />
          )}
          {indicatorDraft.kind === "macd" && (
            <div className="lq-chart__edit-drawing-row">
              <NumberField
                label="Rapide"
                min={1}
                max={200}
                step={1}
                value={indicatorDraft.fastPeriod ?? 12}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, fastPeriod: v === "" ? indicatorDraft.fastPeriod : v })}
              />
              <NumberField
                label="Lent"
                min={1}
                max={400}
                step={1}
                value={indicatorDraft.slowPeriod ?? 26}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, slowPeriod: v === "" ? indicatorDraft.slowPeriod : v })}
              />
              <NumberField
                label="Signal"
                min={1}
                max={200}
                step={1}
                value={indicatorDraft.signalPeriod ?? 9}
                onChange={(v) => setIndicatorDraft({ ...indicatorDraft, signalPeriod: v === "" ? indicatorDraft.signalPeriod : v })}
              />
            </div>
          )}
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

      {settingsOpen && (
        <Modal open onClose={() => setSettingsOpen(false)} title="Paramètres du graphique">
          <div className="lq-chart__edit-drawing-row">
            <div className="lq-field">
              <label className="lq-field__label">Bougies haussières</label>
              <input
                type="color"
                className="lq-chart__color-input"
                value={upColorOverride ?? "#26a69a"}
                onChange={(e) => setUpColorOverride(e.target.value)}
              />
            </div>
            <div className="lq-field">
              <label className="lq-field__label">Bougies baissières</label>
              <input
                type="color"
                className="lq-chart__color-input"
                value={downColorOverride ?? "#ef5350"}
                onChange={(e) => setDownColorOverride(e.target.value)}
              />
            </div>
          </div>
          {(upColorOverride || downColorOverride) && (
            <button
              type="button"
              className="lq-chart__inline-reset"
              onClick={() => {
                setUpColorOverride(undefined);
                setDownColorOverride(undefined);
              }}
            >
              Réinitialiser aux couleurs du thème
            </button>
          )}
          <Checkbox
            checked={yAutoScalingState}
            onChange={(checked) => {
              setYAutoScalingState(checked);
              onYAutoScalingChange?.(checked);
            }}
            label="Rescale automatique de l'axe des prix au zoom"
          />
          {eventKinds.length > 0 && (
            <div className="lq-chart__settings-events">
              <span className="lq-field__label">Événements</span>
              {eventKinds.map((kind) => (
                <Checkbox
                  key={kind}
                  checked={!hiddenEventKinds.has(kind)}
                  onChange={() =>
                    setHiddenEventKinds((prev) => {
                      const next = new Set(prev);
                      if (next.has(kind)) next.delete(kind);
                      else next.add(kind);
                      return next;
                    })
                  }
                  label={kind}
                />
              ))}
            </div>
          )}
        </Modal>
      )}

      {volumeSettingsOpen && (
        <Modal open onClose={() => setVolumeSettingsOpen(false)} title="Paramètres du panneau Volume" footer={null}>
          <div className="lq-chart__edit-drawing-row">
            <div className="lq-field">
              <label className="lq-field__label">Barres haussières</label>
              <input
                type="color"
                className="lq-chart__color-input"
                value={volumeUpColorOverride ?? upColorOverride ?? "#26a69a"}
                onChange={(e) => setVolumeUpColorOverride(e.target.value)}
              />
            </div>
            <div className="lq-field">
              <label className="lq-field__label">Barres baissières</label>
              <input
                type="color"
                className="lq-chart__color-input"
                value={volumeDownColorOverride ?? downColorOverride ?? "#ef5350"}
                onChange={(e) => setVolumeDownColorOverride(e.target.value)}
              />
            </div>
          </div>
          {(volumeUpColorOverride || volumeDownColorOverride) && (
            <button
              type="button"
              className="lq-chart__inline-reset"
              onClick={() => {
                setVolumeUpColorOverride(undefined);
                setVolumeDownColorOverride(undefined);
              }}
            >
              Réinitialiser aux couleurs des bougies
            </button>
          )}
        </Modal>
      )}

      {symbolSearchOpen && (
        <Modal open onClose={() => setSymbolSearchOpen(false)} title="Symbol search" footer={null}>
          <TextField
            placeholder="Rechercher un symbole…"
            value={symbolSearchQuery}
            onChange={(e) => setSymbolSearchQuery(e.target.value)}
            leadingIcon={<SearchIcon size={14} />}
            trailingIcon={
              symbolSearchQuery ? (
                <button
                  type="button"
                  className="lq-chart__symbol-search-clear"
                  onClick={() => setSymbolSearchQuery("")}
                  aria-label="Effacer la recherche"
                >
                  <CloseIcon size={12} />
                </button>
              ) : undefined
            }
            autoFocus
          />
          {/* Single-select pills, not checkboxes (CheckboxButton) — only one category filters
              the results at a time, same "active" visual convention as the timeframe/
              display-mode menus above. */}
          <div className="lq-chart__symbol-search-categories">
            {SYMBOL_SEARCH_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={[
                  "lq-chart__symbol-search-category",
                  cat.value === symbolSearchCategory && "lq-chart__symbol-search-category--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSymbolSearchCategory(cat.value)}
                aria-pressed={cat.value === symbolSearchCategory}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="lq-chart__symbol-search-results">
            {(symbolSearchResults ?? []).length === 0 ? (
              <p className="lq-chart__symbol-search-empty">Aucun résultat.</p>
            ) : (
              (symbolSearchResults ?? []).map((result, i) => {
                const isFavorite = favoriteSymbolIds.includes(result.id);
                const isOverlayActive = symbolOverlays.some((d) => d.overlaySymbol === result.ticker);
                const isOverlayLoading = addingOverlaySymbols.has(result.ticker);
                return (
                  <div className="lq-chart__symbol-search-row" key={result.id}>
                    <button
                      type="button"
                      className="lq-chart__symbol-search-row-main"
                      onClick={() => {
                        onSymbolSelect?.(result);
                        setSymbolSearchOpen(false);
                      }}
                    >
                      <span
                        className="lq-chart__symbol-search-logo"
                        style={result.logoUrl ? undefined : { backgroundColor: result.logoColor ?? defaultSymbolLogoColor(i) }}
                      >
                        {result.logoUrl ? <img src={result.logoUrl} alt="" /> : result.ticker.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="lq-chart__symbol-search-ticker">{result.ticker}</span>
                      <span className="lq-chart__symbol-search-name">{result.name}</span>
                      <span className="lq-chart__symbol-search-source">{result.source}</span>
                    </button>
                    {/* Compare against the main symbol — hover-revealed like the favorite star,
                        but stays visible once active too, same reasoning. Turns into a checkmark
                        (click removes it) once that symbol is already an overlay, and a spinner
                        while onAddSymbolOverlay's own promise is in flight — a plain one-way "add"
                        button couldn't reflect either without the caller tracking that state
                        itself, which returning the data instead lets the chart do here. Only
                        rendered when the caller actually supports it (onAddSymbolOverlay set) —
                        a "+" that silently did nothing would be worse than no button at all. */}
                    {onAddSymbolOverlay && (
                      <button
                        type="button"
                        className={[
                          "lq-chart__symbol-search-overlay",
                          isOverlayActive && "lq-chart__symbol-search-overlay--active",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => (isOverlayActive ? removeSymbolOverlay(result.ticker) : handleAddSymbolOverlay(result))}
                        disabled={isOverlayLoading}
                        aria-label={isOverlayActive ? `Retirer ${result.ticker} de la comparaison` : `Comparer avec ${result.ticker}`}
                        title={isOverlayActive ? `Retirer ${result.ticker} de la comparaison` : `Comparer avec ${result.ticker}`}
                      >
                        {isOverlayLoading ? (
                          <RefreshIcon size={14} className="lq-chart__symbol-search-overlay-spinner" />
                        ) : isOverlayActive ? (
                          <CheckIcon size={14} />
                        ) : (
                          <PlusIcon size={14} />
                        )}
                      </button>
                    )}
                    {/* Invisible until the row is hovered/focused (see charts-shared.css) — unless
                        already favorited, in which case it stays visible so favorited results
                        can actually be told apart from a glance, not just while hovering. */}
                    <button
                      type="button"
                      className={[
                        "lq-chart__symbol-search-favorite",
                        isFavorite && "lq-chart__symbol-search-favorite--active",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => toggleFavoriteSymbol(result.id)}
                      aria-label={isFavorite ? `Retirer ${result.ticker} des favoris` : `Ajouter ${result.ticker} aux favoris`}
                    >
                      <StarIcon size={14} fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
