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
import { useDrawingState } from "./candlestick/hooks/useDrawingState";
import { useDrawingInteractions } from "./candlestick/hooks/useDrawingInteractions";
import { ChartHeader } from "./candlestick/components/ChartHeader";
import { DrawingEditModal } from "./candlestick/components/DrawingEditModal";
import { IndicatorModals } from "./candlestick/components/IndicatorModals";
import { ChartSettingsModals } from "./candlestick/components/ChartSettingsModals";
import { SymbolSearchModal } from "./candlestick/components/SymbolSearchModal";
import { ChartAxis } from "./ChartAxis";
import { ChartEventTooltip } from "./EventTooltip";
import { SeasonalityView } from "./SeasonalityView";
import { Popover } from "../forms/Popover";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  PlusIcon,
  SettingsIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  MagnetIcon,
  LockIcon,
  GripIcon,
  LayersIcon,
} from "../icons";
import "./charts-shared.css";

import type { Candle } from "./candlestick/interfaces/Candle.interface";
import type { ChartEvent } from "./candlestick/interfaces/ChartEvent.interface";
import type { FundamentalDataPoint } from "./candlestick/interfaces/FundamentalDataPoint.interface";
import type { SymbolSearchCategory } from "./candlestick/interfaces/SymbolSearchCategory.interface";
import type { SymbolSearchResult } from "./candlestick/interfaces/SymbolSearchResult.interface";
import type { TrendLineDrawing } from "./candlestick/interfaces/TrendLineDrawing.interface";
import type { IndicatorKind } from "./candlestick/interfaces/IndicatorKind.interface";
import type { IndicatorBand } from "./candlestick/interfaces/IndicatorBand.interface";
import type { IndicatorMACD } from "./candlestick/interfaces/IndicatorMACD.interface";
import type { Indicator } from "./candlestick/interfaces/Indicator.interface";
import type { ChartDisplayMode } from "./candlestick/interfaces/ChartDisplayMode.interface";
import type { TimeframeOption } from "./candlestick/interfaces/TimeframeOption.interface";
import type { TimeframeGroup } from "./candlestick/interfaces/TimeframeGroup.interface";
import type { TimeframeEntry } from "./candlestick/interfaces/TimeframeEntry.interface";
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

import { DRAWING_TOOL_CATEGORIES, drawingLabel } from "./candlestick/drawingCatalog";
import { allPointsOf, snapPixel } from "./candlestick/drawingGeometry";
import { isFundamentalKind, formatFundamentalValue, indicatorCatalogEntry, indicatorLabel, defaultIndicatorColor } from "./candlestick/indicators";
import { EVENT_MARKER_OFFSET, EVENT_MARKER_RADIUS, EVENT_TOOLTIP_WIDTH, EVENT_TOOLTIP_GAP } from "./candlestick/eventsCatalog";
import { CHART_DISPLAY_MODES } from "./candlestick/chartModes";
import { findTimeframeLabel } from "./candlestick/timeframes";
import {
  DEFAULT_MARGIN,
  TOOLS_RAIL_WIDTH,
  HEADER_HEIGHT,
  CROSSHAIR_ADD_INSET,
  LIVE_COUNTDOWN_OFFSET,
  AXIS_HANDLE_FRACTION_X,
  AXIS_HANDLE_FRACTION_Y,
  MAX_DATE_TICKS,
  SUB_PANE_COLLAPSED_HEIGHT,
} from "./candlestick/constants";
import { formatCountdown, formatPercentFromReference } from "./candlestick/formatting";

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
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  const {
    drawings,
    activeTool,
    setActiveTool,
    selectedToolByCategory,
    openToolMenu,
    setOpenToolMenu,
    pendingPoint,
    setPendingPoint,
    previewPoint,
    setPreviewPoint,
    pendingSecondPoint,
    setPendingSecondPoint,
    pendingExtraPoints,
    setPendingExtraPoints,
    magnetActive,
    setMagnetActive,
    drawingsHidden,
    setDrawingsHidden,
    drawingsLocked,
    setDrawingsLocked,
    visibleDrawings,
    measurePoints,
    setMeasurePoints,
    brushPreview,
    setBrushPreview,
    brushPointsRef,
    brushDrawingRef,
    hoveredDrawingId,
    setHoveredDrawingId,
    hoverY,
    setHoverY,
    hoverVolumeY,
    setHoverVolumeY,
    setEditingId,
    draft,
    setDraft,
    editModalTab,
    setEditModalTab,
    addingOverlaySymbols,
    dragEndpointRef,
    dragAxisRef,
    dragMeasureRef,
    drawingIdRef,
    hoveredDrawingIdRef,
    updateHoveredDrawingId,
    dragLineRef,
    isPanningYRef,
    commitDrawings,
    removeSymbolOverlay,
    handleAddSymbolOverlay,
    cancelDrawingTool,
    handleToolClick,
    handleSelectToolType,
    magnetSnapPrice,
    closeEditModal,
    saveEditModal,
    deleteEditingDrawing,
  } = useDrawingState({ data, defaultDrawings, onDrawingsChange, onAddSymbolOverlay });

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

  const {
    handleOverlayClick,
    handleOverlayDoubleClick,
    handleEndpointPointerDown,
    handleEndpointPointerMove,
    handleEndpointPointerUp,
    handleMeasureHandlePointerDown,
    handleMeasureHandlePointerMove,
    handleMeasureHandlePointerUp,
    handleAxisHandlePointerDown,
    handleAxisHandlePointerMove,
    handleAxisHandlePointerUp,
    handlePointerMove,
    handleOverlayPointerDown,
    handleOverlayPointerUp,
  } = useDrawingInteractions({
    data,
    dims,
    plotBoundedHeight,
    priceHeight,
    volumeHeight,
    volumeTop,
    volumeVisible,
    volumeCollapsed,
    setHoverIndex,
    setHoverY,
    setHoverVolumeY,
    drawings,
    commitDrawings,
    drawingIdRef,
    activeTool,
    setActiveTool,
    pendingPoint,
    setPendingPoint,
    setPreviewPoint,
    pendingSecondPoint,
    setPendingSecondPoint,
    pendingExtraPoints,
    setPendingExtraPoints,
    setMeasurePoints,
    drawingsLocked,
    visibleDrawings,
    setBrushPreview,
    brushPointsRef,
    brushDrawingRef,
    hoveredDrawingId,
    updateHoveredDrawingId,
    setEditingId,
    setDraft,
    setEditModalTab,
    dragEndpointRef,
    dragAxisRef,
    dragMeasureRef,
    dragLineRef,
    isPanningYRef,
    cancelDrawingTool,
    magnetSnapPrice,
    zoomRef,
    zoomedXScale,
    zoomedPriceScale,
    indexForDate,
    dateForIndex,
    priceScale,
    resetZoom,
    yTransform,
    setYTransform,
    setYManuallyAdjusted,
    zoomable,
    paneScaleAndOffset,
    pixelYForDrawing,
    resolveValueAxisAtY,
    overlayProjections,
  });

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
        <ChartHeader
          dims={dims}
          timeframes={timeframes}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
          tfOpen={tfOpen}
          setTfOpen={setTfOpen}
          tfAnchorRef={tfAnchorRef}
          currentTimeframeLabel={currentTimeframeLabel}
          displayModeAnchorRef={displayModeAnchorRef}
          displayModeOpen={displayModeOpen}
          setDisplayModeOpen={setDisplayModeOpen}
          currentModeEntry={currentModeEntry}
          chartDisplayMode={chartDisplayMode}
          setChartDisplayMode={setChartDisplayMode}
          onChartDisplayModeChange={onChartDisplayModeChange}
          events={events}
          eventsVisible={eventsVisible}
          setEventsVisible={setEventsVisible}
          showIndicators={showIndicators}
          setIndicatorSearchQuery={setIndicatorSearchQuery}
          setIndicatorPickerOpen={setIndicatorPickerOpen}
          zoomable={zoomable}
          isZoomed={isZoomed}
          resetZoom={resetZoom}
          seasonality={seasonality}
          setSeasonalityOpen={setSeasonalityOpen}
          fullscreenToggle={fullscreenToggle}
          toggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
        />
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

      <DrawingEditModal
        draft={draft}
        setDraft={setDraft}
        editModalTab={editModalTab}
        setEditModalTab={setEditModalTab}
        closeEditModal={closeEditModal}
        saveEditModal={saveEditModal}
        deleteEditingDrawing={deleteEditingDrawing}
        valueAxisLabel={valueAxisLabel}
      />

      <IndicatorModals
        indicatorPickerOpen={indicatorPickerOpen}
        setIndicatorPickerOpen={setIndicatorPickerOpen}
        indicatorSearchQuery={indicatorSearchQuery}
        setIndicatorSearchQuery={setIndicatorSearchQuery}
        showVolume={showVolume}
        setVolumePaneState={setVolumePaneState}
        addIndicator={addIndicator}
        indicatorsManagerOpen={indicatorsManagerOpen}
        setIndicatorsManagerOpen={setIndicatorsManagerOpen}
        indicators={indicators}
        ownPaneIndicators={ownPaneIndicators}
        volumeVisible={volumeVisible}
        visibleDrawings={visibleDrawings}
        setEditingId={setEditingId}
        setDraft={setDraft}
        setEditModalTab={setEditModalTab}
        commitDrawings={commitDrawings}
        drawings={drawings}
        openIndicatorSettings={openIndicatorSettings}
        removeIndicator={removeIndicator}
        setVolumeSettingsOpen={setVolumeSettingsOpen}
        editingIndicatorId={editingIndicatorId}
        indicatorDraft={indicatorDraft}
        setIndicatorDraft={setIndicatorDraft}
        closeIndicatorSettings={closeIndicatorSettings}
        deleteEditingIndicator={deleteEditingIndicator}
        saveIndicatorSettings={saveIndicatorSettings}
      />

      <ChartSettingsModals
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        upColorOverride={upColorOverride}
        setUpColorOverride={setUpColorOverride}
        downColorOverride={downColorOverride}
        setDownColorOverride={setDownColorOverride}
        yAutoScalingState={yAutoScalingState}
        setYAutoScalingState={setYAutoScalingState}
        onYAutoScalingChange={onYAutoScalingChange}
        eventKinds={eventKinds}
        hiddenEventKinds={hiddenEventKinds}
        setHiddenEventKinds={setHiddenEventKinds}
        volumeSettingsOpen={volumeSettingsOpen}
        setVolumeSettingsOpen={setVolumeSettingsOpen}
        volumeUpColorOverride={volumeUpColorOverride}
        setVolumeUpColorOverride={setVolumeUpColorOverride}
        volumeDownColorOverride={volumeDownColorOverride}
        setVolumeDownColorOverride={setVolumeDownColorOverride}
      />

      <SymbolSearchModal
        symbolSearchOpen={symbolSearchOpen}
        setSymbolSearchOpen={setSymbolSearchOpen}
        symbolSearchQuery={symbolSearchQuery}
        setSymbolSearchQuery={setSymbolSearchQuery}
        symbolSearchCategory={symbolSearchCategory}
        setSymbolSearchCategory={setSymbolSearchCategory}
        symbolSearchResults={symbolSearchResults}
        favoriteSymbolIds={favoriteSymbolIds}
        toggleFavoriteSymbol={toggleFavoriteSymbol}
        onSymbolSelect={onSymbolSelect}
        onAddSymbolOverlay={onAddSymbolOverlay}
        symbolOverlays={symbolOverlays}
        addingOverlaySymbols={addingOverlaySymbols}
        handleAddSymbolOverlay={handleAddSymbolOverlay}
        removeSymbolOverlay={removeSymbolOverlay}
      />
    </div>
  );
}
