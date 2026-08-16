import { useEffect, useId, useRef, useState } from "react";
import * as d3 from "d3";
import { useChartDimensions } from "./internal/useChartDimensions";
import { useFullscreen } from "./internal/useFullscreen";
import { renderCandlestickChart } from "./candlestick/render/renderChart";
import { useSymbolSearchState } from "./candlestick/hooks/useSymbolSearchState";
import { useChartEvents } from "./candlestick/hooks/useChartEvents";
import { useChartDisplayMode } from "./candlestick/hooks/useChartDisplayMode";
import { useChartAppearance } from "./candlestick/hooks/useChartAppearance";
import { usePaneLayout } from "./candlestick/hooks/usePaneLayout";
import { useChartTemplates } from "./candlestick/hooks/useChartTemplates";
import { useHoverSync } from "./candlestick/hooks/useHoverSync";
import { usePaneDragReorder } from "./candlestick/hooks/usePaneDragReorder";
import { useThemePaletteTick } from "./candlestick/hooks/useThemePaletteTick";
import { useDefaultDrawingColor } from "./candlestick/hooks/useDefaultDrawingColor";
import { useAddLineHandlers } from "./candlestick/hooks/useAddLineHandlers";
import { useZoomAndScales } from "./candlestick/hooks/useZoomAndScales";
import { useIndicatorPaneScales } from "./candlestick/hooks/useIndicatorPaneScales";
import { useDrawingState } from "./candlestick/hooks/useDrawingState";
import { useDrawingInteractions } from "./candlestick/hooks/useDrawingInteractions";
import { ChartHeader } from "./candlestick/components/ChartHeader";
import { ToolsRail } from "./candlestick/components/ToolsRail";
import { ChartLegend } from "./candlestick/components/ChartLegend";
import { PaneHeaders } from "./candlestick/components/PaneHeaders";
import { ChartCanvasOverlay } from "./candlestick/components/ChartCanvasOverlay";
import { ChartHoverBadges } from "./candlestick/components/ChartHoverBadges";
import { DrawingEditModal } from "./candlestick/components/DrawingEditModal";
import { IndicatorModals } from "./candlestick/components/IndicatorModals";
import { ChartSettingsModals } from "./candlestick/components/ChartSettingsModals";
import { SymbolSearchModal } from "./candlestick/components/SymbolSearchModal";
import { ChartEventTooltip } from "./EventTooltip";
import { SeasonalityView } from "./SeasonalityView";
import "./charts-shared.css";

import type { Candle } from "./candlestick/interfaces/Candle.interface";
import type { ChartEvent } from "./candlestick/interfaces/ChartEvent.interface";
import type { FundamentalDataPoint } from "./candlestick/interfaces/FundamentalDataPoint.interface";
import type { SymbolSearchCategory } from "./candlestick/interfaces/SymbolSearchCategory.interface";
import type { SymbolSearchResult } from "./candlestick/interfaces/SymbolSearchResult.interface";
import type { TrendLineDrawing, OverlayDataPoint } from "./candlestick/interfaces/TrendLineDrawing.interface";
import type { IndicatorKind } from "./candlestick/interfaces/IndicatorKind.interface";
import type { IndicatorBand } from "./candlestick/interfaces/IndicatorBand.interface";
import type { IndicatorMACD } from "./candlestick/interfaces/IndicatorMACD.interface";
import type { Indicator } from "./candlestick/interfaces/Indicator.interface";
import type { ChartTemplate } from "./candlestick/interfaces/ChartTemplate.interface";
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
  OverlayDataPoint,
  IndicatorKind,
  IndicatorBand,
  IndicatorMACD,
  Indicator,
  ChartTemplate,
  ChartDisplayMode,
  TimeframeOption,
  TimeframeGroup,
  TimeframeEntry,
  CandlestickChartProps,
};

import { drawingLabel } from "./candlestick/drawingCatalog";
import { indicatorCatalogEntry, indicatorLabel, defaultIndicatorColor } from "./candlestick/indicators";
import { CHART_DISPLAY_MODES } from "./candlestick/chartModes";
import { findTimeframeLabel } from "./candlestick/timeframes";
import {
  DEFAULT_MARGIN,
  TOOLS_RAIL_WIDTH,
  HEADER_HEIGHT,
  SUB_PANE_COLLAPSED_HEIGHT,
} from "./candlestick/constants";
import { formatPercentFromReference, computeOhlcReadout } from "./candlestick/formatting";

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
  showTemplates = false,
  defaultTemplates,
  onTemplatesChange,
  initialVisibleCandles = 500,
  YAutoScaling = true,
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
  syncedHoverDate,
  onHoverDateChange,
  linkable = false,
  isLinked = false,
  onLinkClick,
  showSplitScreen = false,
  splitScreenPanels,
  onSplitScreenChange,
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
    hoverIndicatorPaneId,
    setHoverIndicatorPaneId,
    hoverIndicatorPaneY,
    setHoverIndicatorPaneY,
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
  // One per category (a fixed, known-at-compile-time list, so plain individual refs rather than a
  // dynamic map — Popover needs a real RefObject per anchor, and refs can't be created in a loop).
  const linesMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const fibonacciMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const elliottMenuAnchorRef = useRef<HTMLButtonElement>(null);
  function menuAnchorRefFor(categoryId: string) {
    if (categoryId === "fibonacci") return fibonacciMenuAnchorRef;
    if (categoryId === "elliott") return elliottMenuAnchorRef;
    return linesMenuAnchorRef;
  }
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

  const themeTick = useThemePaletteTick(ref);
  const defaultDrawingColor = useDefaultDrawingColor(ref, themeTick);

  const {
    indicators,
    indicatorPickerOpen,
    setIndicatorPickerOpen,
    indicatorSearchQuery,
    setIndicatorSearchQuery,
    editingIndicatorId,
    indicatorDraft,
    setIndicatorDraft,
    setHoveredIndicatorId,
    indicatorsManagerOpen,
    setIndicatorsManagerOpen,
    draggingPaneId,
    setDraggingPaneId,
    volumePaneOrder,
    volumePaneState,
    setVolumePaneState,
    paneHeightFractions,
    paneYTransform,
    handlePaneYAxisPointerDown,
    handlePaneYAxisPointerMove,
    handlePaneYAxisPointerUp,
    resetPaneYAxis,
    commitIndicators,
    loadIndicatorLayout,
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
    templates,
    activeTemplateId,
    isDirty: templatesDirty,
    saveTemplate,
    saveTemplateAs,
    loadTemplate,
    deleteTemplate,
  } = useChartTemplates({
    defaultTemplates,
    onTemplatesChange,
    indicators,
    volumePaneOrder,
    volumePaneState,
    paneHeightFractions,
    loadIndicatorLayout,
  });

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
    candleWidth,
    dateTickValues,
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

  const { effectiveHoverIndex, effectiveHovered } = useHoverSync({ data, hoverIndex, indexForDate, dateForIndex, syncedHoverDate, onHoverDateChange });

  usePaneDragReorder({
    draggingPaneId,
    setDraggingPaneId,
    allPanesOrder,
    ownPaneIndicators,
    indicatorPaneTops,
    indicatorPaneHeights,
    volumeTop,
    volumeHeight,
    priceHeight,
    zoomRef,
    reorderPanesRef,
  });

  const { chartDisplayMode, setChartDisplayMode, displayModeOpen, setDisplayModeOpen, displayModeAnchorRef, visible, heikinAshiCandles, renkoBricks, lineBreakBricks, tpoProfile } =
    useChartDisplayMode({ data, visibleRange, renkoAtrPeriod, defaultChartDisplayMode });

  const { hiddenEventKinds, setHiddenEventKinds, activeEventStack, setActiveEventStack, eventModalOpen, setEventModalOpen, eventKinds, eventStacks } =
    useChartEvents({ events, indexForDate, visibleRange, dataLength: data.length });

  // The bottom axis's own scale is index-based, so its automatic tick generator would label ticks
  // with raw indices (0, 100, 200…) instead of dates — same fix BarChart/DeltaChart already use
  // for their categorical axis: explicit tickValues (see useZoomAndScales' own dateTickValues)
  // plus a tickFormat that looks the date up by index, this one.
  function dateTickFormat(v: number): string {
    const idx = Math.min(data.length - 1, Math.max(0, Math.round(v - 0.5)));
    return dFmt(data[idx].date);
  }

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

  const { addPriceLine, addVolumeLine, addDateLine, addIndicatorPaneLine } = useAddLineHandlers({
    data,
    drawings,
    commitDrawings,
    drawingIdRef,
    hoverY,
    zoomedPriceScale,
    hoverVolumeY,
    zoomedVolumeScale,
    hovered,
    priceScale,
    hoverIndicatorPaneId,
    hoverIndicatorPaneY,
    paneScaleAndOffset,
  });

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
    setHoverIndicatorPaneId,
    setHoverIndicatorPaneY,
    ownPaneIndicators,
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
      hovered: effectiveHovered,
      hoverY,
      hoverVolumeY,
      hoverIndicatorPaneId,
      hoverIndicatorPaneY,
      hoverIndex: effectiveHoverIndex,
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
    effectiveHovered,
    hoverY,
    hoverVolumeY,
    hoverIndicatorPaneId,
    hoverIndicatorPaneY,
    effectiveHoverIndex,
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

  const { candle: ohlcCandle, delta: ohlcDelta, deltaPct: ohlcDeltaPct, sign: ohlcSign } = computeOhlcReadout(data, effectiveHoverIndex);

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
          showTemplates={showTemplates}
          templates={templates}
          activeTemplateId={activeTemplateId}
          templatesDirty={templatesDirty}
          onSaveTemplate={saveTemplate}
          onSaveTemplateAs={saveTemplateAs}
          onLoadTemplate={loadTemplate}
          onDeleteTemplate={deleteTemplate}
          linkable={linkable}
          isLinked={isLinked}
          onLinkClick={onLinkClick}
          showSplitScreen={showSplitScreen}
          splitScreenPanels={splitScreenPanels}
          onSplitScreenChange={onSplitScreenChange}
        />
      )}

      {seasonalityOpen ? (
        <SeasonalityView data={data} symbol={symbol} onBack={() => setSeasonalityOpen(false)} showHeader={showHeader} height={plotHeight} />
      ) : (
      <div
        className="lq-chart__plot"
        style={{ width: dims.width, height: plotHeight }}
        onPointerLeave={() => {
          setHoverIndex(null);
          setHoverY(null);
          setHoverVolumeY(null);
          setHoverIndicatorPaneId(null);
          setHoverIndicatorPaneY(null);
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
          eventKinds={eventKinds}
          hiddenEventKinds={hiddenEventKinds}
          setHiddenEventKinds={setHiddenEventKinds}
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
          hoverIndex={effectiveHoverIndex}
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
        <ChartHoverBadges
          hoverY={hoverY}
          dims={dims}
          addPriceLine={addPriceLine}
          zoomedPriceScale={zoomedPriceScale}
          priceAxisFmt={priceAxisFmt}
          hoverVolumeY={hoverVolumeY}
          priceHeight={priceHeight}
          volumeTop={volumeTop}
          addVolumeLine={addVolumeLine}
          zoomedVolumeScale={zoomedVolumeScale}
          vFmt={vFmt}
          hoverIndicatorPaneId={hoverIndicatorPaneId}
          hoverIndicatorPaneY={hoverIndicatorPaneY}
          addIndicatorPaneLine={addIndicatorPaneLine}
          paneScaleAndOffset={paneScaleAndOffset}
          hovered={effectiveHovered}
          zoomedXScale={zoomedXScale}
          hoverIndex={effectiveHoverIndex}
          plotBoundedHeight={plotBoundedHeight}
          dFmt={dFmt}
          addDateLine={addDateLine}
          livePrice={livePrice}
          data={data}
          clampToPriceAxis={clampToPriceAxis}
          now={now}
          showIndicators={showIndicators}
          indicatorValues={indicatorValues}
          visibleDrawings={visibleDrawings}
          volumeVisible={volumeVisible}
          pixelYForDrawing={pixelYForDrawing}
          hoveredDrawingId={hoveredDrawingId}
          indexForDate={indexForDate}
          activeEventStack={activeEventStack}
          eventModalOpen={eventModalOpen}
          plotHeight={plotHeight}
          setEventModalOpen={setEventModalOpen}
          setActiveEventStack={setActiveEventStack}
        />
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
        defaultColor={defaultDrawingColor}
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
