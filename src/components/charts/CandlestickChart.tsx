import { useEffect, useId, useMemo, useRef, useState } from "react";
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
import { ToolsRail } from "./candlestick/components/ToolsRail";
import { ChartLegend } from "./candlestick/components/ChartLegend";
import { PaneHeaders } from "./candlestick/components/PaneHeaders";
import { ChartCanvasOverlay } from "./candlestick/components/ChartCanvasOverlay";
import { DrawingEditModal } from "./candlestick/components/DrawingEditModal";
import { IndicatorModals } from "./candlestick/components/IndicatorModals";
import { ChartSettingsModals } from "./candlestick/components/ChartSettingsModals";
import { SymbolSearchModal } from "./candlestick/components/SymbolSearchModal";
import { ChartEventTooltip } from "./EventTooltip";
import { SeasonalityView } from "./SeasonalityView";
import { ChevronLeftIcon, PlusIcon } from "../icons";
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

import { drawingLabel } from "./candlestick/drawingCatalog";
import { indicatorCatalogEntry, indicatorLabel, defaultIndicatorColor } from "./candlestick/indicators";
import { EVENT_MARKER_OFFSET, EVENT_MARKER_RADIUS, EVENT_TOOLTIP_WIDTH, EVENT_TOOLTIP_GAP } from "./candlestick/eventsCatalog";
import { CHART_DISPLAY_MODES } from "./candlestick/chartModes";
import { findTimeframeLabel } from "./candlestick/timeframes";
import {
  DEFAULT_MARGIN,
  TOOLS_RAIL_WIDTH,
  HEADER_HEIGHT,
  CROSSHAIR_ADD_INSET,
  LIVE_COUNTDOWN_OFFSET,
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
        <ToolsRail
          drawingTools={drawingTools}
          dims={dims}
          plotHeight={plotHeight}
          selectedToolByCategory={selectedToolByCategory}
          openToolMenu={openToolMenu}
          setOpenToolMenu={setOpenToolMenu}
          activeTool={activeTool}
          handleToolClick={handleToolClick}
          handleSelectToolType={handleSelectToolType}
          menuAnchorRefFor={menuAnchorRefFor}
          magnetActive={magnetActive}
          setMagnetActive={setMagnetActive}
          drawingsHidden={drawingsHidden}
          setDrawingsHidden={setDrawingsHidden}
          drawingsLocked={drawingsLocked}
          setDrawingsLocked={setDrawingsLocked}
          indicatorsManagerOpen={indicatorsManagerOpen}
          setIndicatorsManagerOpen={setIndicatorsManagerOpen}
        />
        <ChartLegend
          dims={dims}
          symbol={symbol}
          symbolSearch={symbolSearch}
          setSymbolSearchOpen={setSymbolSearchOpen}
          setSettingsOpen={setSettingsOpen}
          currentModeEntry={currentModeEntry}
          ohlcCandle={ohlcCandle}
          ohlcDelta={ohlcDelta}
          ohlcDeltaPct={ohlcDeltaPct}
          ohlcSign={ohlcSign}
          pFmt={pFmt}
          showIndicators={showIndicators}
          overlayIndicators={overlayIndicators}
          indicators={indicators}
          defaultIndicatorColor={defaultIndicatorColor}
          openIndicatorSettings={openIndicatorSettings}
          setHoveredIndicatorId={setHoveredIndicatorId}
          indicatorLabel={indicatorLabel}
          toggleIndicatorHidden={toggleIndicatorHidden}
          removeIndicator={removeIndicator}
          symbolOverlays={symbolOverlays}
          drawings={drawings}
          commitDrawings={commitDrawings}
          drawingLabel={drawingLabel}
          setHoveredDrawingId={setHoveredDrawingId}
          setEditingId={setEditingId}
          setDraft={setDraft}
          setEditModalTab={setEditModalTab}
          removeSymbolOverlay={removeSymbolOverlay}
        />
        <PaneHeaders
          volumeVisible={volumeVisible}
          dims={dims}
          priceHeight={priceHeight}
          volumeTop={volumeTop}
          volumeCollapsed={volumeCollapsed}
          draggingPaneId={draggingPaneId}
          setDraggingPaneId={setDraggingPaneId}
          startPaneResize={startPaneResize}
          SUB_PANE_COLLAPSED_HEIGHT={SUB_PANE_COLLAPSED_HEIGHT}
          hoverVolumeY={hoverVolumeY}
          setVolumePaneState={setVolumePaneState}
          setVolumeSettingsOpen={setVolumeSettingsOpen}
          data={data}
          hoverIndex={hoverIndex}
          vFmt={vFmt}
          ownPaneIndicators={ownPaneIndicators}
          indicatorPaneTops={indicatorPaneTops}
          commitIndicators={commitIndicators}
          indicators={indicators}
          indicatorLabel={indicatorLabel}
          openIndicatorSettings={openIndicatorSettings}
          removeIndicator={removeIndicator}
          indicatorValues={indicatorValues}
        />
        <ChartCanvasOverlay
          canvasRef={canvasRef}
          dims={dims}
          plotBoundedHeight={plotBoundedHeight}
          plotHeight={plotHeight}
          clipId={clipId}
          zoomedPriceScale={zoomedPriceScale}
          priceAxisFmt={priceAxisFmt}
          volumeVisible={volumeVisible}
          volumeCollapsed={volumeCollapsed}
          priceHeight={priceHeight}
          volumeTop={volumeTop}
          zoomedVolumeScale={zoomedVolumeScale}
          vFmt={vFmt}
          handlePaneYAxisPointerDown={handlePaneYAxisPointerDown}
          handlePaneYAxisPointerMove={handlePaneYAxisPointerMove}
          handlePaneYAxisPointerUp={handlePaneYAxisPointerUp}
          resetPaneYAxis={resetPaneYAxis}
          volumeHeight={volumeHeight}
          ownPaneIndicators={ownPaneIndicators}
          indicatorPaneTops={indicatorPaneTops}
          indicatorPaneHeights={indicatorPaneHeights}
          zoomedOwnPaneScales={zoomedOwnPaneScales}
          zoomedXScale={zoomedXScale}
          dateTickValues={dateTickValues}
          dateTickFormat={dateTickFormat}
          zoomRef={zoomRef}
          activeTool={activeTool}
          handleOverlayPointerDown={handleOverlayPointerDown}
          handlePointerMove={handlePointerMove}
          handleOverlayPointerUp={handleOverlayPointerUp}
          handleOverlayClick={handleOverlayClick}
          handleOverlayDoubleClick={handleOverlayDoubleClick}
          yAxisWheelRef={yAxisWheelRef}
          yAxisDrag={yAxisDrag}
          resetYAxis={resetYAxis}
          xAxisWheelRef={xAxisWheelRef}
          xAxisDrag={xAxisDrag}
          resetX={resetX}
          visibleDrawings={visibleDrawings}
          hoveredDrawingId={hoveredDrawingId}
          indexForDate={indexForDate}
          pixelYForDrawing={pixelYForDrawing}
          handleAxisHandlePointerDown={handleAxisHandlePointerDown}
          handleAxisHandlePointerMove={handleAxisHandlePointerMove}
          handleAxisHandlePointerUp={handleAxisHandlePointerUp}
          handleEndpointPointerDown={handleEndpointPointerDown}
          handleEndpointPointerMove={handleEndpointPointerMove}
          handleEndpointPointerUp={handleEndpointPointerUp}
          measurePoints={measurePoints}
          handleMeasureHandlePointerDown={handleMeasureHandlePointerDown}
          handleMeasureHandlePointerMove={handleMeasureHandlePointerMove}
          handleMeasureHandlePointerUp={handleMeasureHandlePointerUp}
          eventStacks={eventStacks}
          dFmt={dFmt}
          setEventModalOpen={setEventModalOpen}
          setActiveEventStack={setActiveEventStack}
        />

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
