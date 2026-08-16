import type { ScaleLinear } from "d3";
import type { ChartDimensions } from "../../internal/useChartDimensions";
import type { Candle } from "./Candle.interface";
import type { TrendLineDrawing } from "./TrendLineDrawing.interface";
import type { DataPoint } from "./DataPoint.interface";
import type { Indicator } from "./Indicator.interface";
import type { IndicatorBand } from "./IndicatorBand.interface";
import type { IndicatorMACD } from "./IndicatorMACD.interface";
import type { ChartDisplayMode } from "./ChartDisplayMode.interface";
import type { DrawingToolType } from "./DrawingToolType.interface";
import type { PriceBrick, TpoProfile } from "../chartModes";

/** Every value `renderCandlestickChart` (and the drawPriceCandles/drawPriceDrawings/
 *  drawVolumeAndPanes phase functions it calls) needs to paint one frame — a plain data bag, not
 *  a class, so the canvas draw effect in CandlestickChart.tsx can build a fresh one from its own
 *  render's state/memos on every call with no lifecycle of its own. */
export interface RenderCandlestickChartParams {
  dims: ChartDimensions;
  plotBoundedHeight: number;
  visible: { d: Candle; i: number }[];
  zoomedXScale: ScaleLinear<number, number>;
  zoomedPriceScale: ScaleLinear<number, number>;
  candleWidth: number;
  chartDisplayMode: ChartDisplayMode;
  heikinAshiCandles: Candle[] | null;
  renkoBricks: PriceBrick[];
  lineBreakBricks: PriceBrick[];
  tpoProfile: TpoProfile | null;
  data: Candle[];
  visibleRange: { start: number; end: number };
  upColorOverride: string | undefined;
  downColorOverride: string | undefined;
  volumeUpColorOverride: string | undefined;
  volumeDownColorOverride: string | undefined;
  volumeVisible: boolean;
  volumeCollapsed: boolean;
  zoomedVolumeScale: ScaleLinear<number, number>;
  volumeHeight: number;
  volumeTop: number;
  priceHeight: number;
  ownPaneIndicators: Indicator[];
  indicatorPaneHeights: number[];
  indicatorPaneTops: number[];
  zoomedOwnPaneScales: Record<string, ScaleLinear<number, number>>;
  indicators: Indicator[];
  overlayProjections: { drawing: TrendLineDrawing; mainReference: number; points: { i: number; price: number }[] }[];
  symbolOverlays: TrendLineDrawing[];
  hovered: Candle | null;
  hoverY: number | null;
  hoverVolumeY: number | null;
  hoverIndicatorPaneId: string | null;
  hoverIndicatorPaneY: number | null;
  hoverIndex: number | null;
  visibleDrawings: TrendLineDrawing[];
  hoveredDrawingId: string | null;
  activeTool: DrawingToolType | null;
  pendingPoint: DataPoint | null;
  previewPoint: DataPoint | null;
  pendingSecondPoint: DataPoint | null;
  pendingExtraPoints: DataPoint[];
  brushPreview: DataPoint[] | null;
  measurePoints: { p1: DataPoint; p2: DataPoint } | null;
  livePrice: boolean;
  visibleIndicators: { indicator: Indicator; points: { i: number; value: number | IndicatorBand | IndicatorMACD }[] }[];
  indexForDate: (d: Date) => number;
}
