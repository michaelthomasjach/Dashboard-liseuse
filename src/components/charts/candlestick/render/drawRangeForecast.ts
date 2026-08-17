import type { RenderCandlestickChartParams } from "../interfaces/RenderCandlestickChartParams.interface";
import type { ChartCanvasStyle } from "../interfaces/ChartCanvasStyle.interface";
import { drawPillLabel } from "../drawingRender";

/** "rangeForecast" (see TrendLineDrawing.lineType's own doc): 3 lines fanning from the same
 *  start point (Current) to Max/Avg/Min — x2/y2 and extraPoints[0] are this drawing's own stored,
 *  freely and independently draggable target points, but *which* of the two currently reads as
 *  "Max" vs. "Min" is never fixed to either field — always whichever one's own price is higher
 *  right now, so dragging one target past the other swaps the labels/colors instead of leaving
 *  "Max" sitting below "Min" on the chart. Avg is never a stored point of its own — always the
 *  screen-space midpoint of the two targets, recomputed here so it never drifts out of sync after
 *  either is redragged by hand. Max/Min solid, Avg dotted, the triangular area between the Max and
 *  Min lines filled, and every point labeled with a colored pill badge (green/red by sign of its
 *  own % change from Current, like the plain "forecast" tool's own end label already is). Called
 *  from `drawPriceDrawings` while its own price-section clip is still open, same as every other
 *  price-space drawing type. */
export function drawRangeForecastDrawings(ctx: CanvasRenderingContext2D, params: RenderCandlestickChartParams, style: ChartCanvasStyle) {
  const { visibleDrawings, hoveredDrawingId, zoomedXScale, zoomedPriceScale, indexForDate } = params;
  const { colorUp, colorDown, colorAccent, colorBg, fontFamily } = style;
  for (const dr of visibleDrawings) {
    if (dr.lineType !== "rangeForecast" || !dr.extraPoints?.length) continue;
    const otherPoint = dr.extraPoints[0];
    const start = { x: zoomedXScale(indexForDate(dr.x1) + 0.5), y: zoomedPriceScale(dr.y1) };
    const targetA = { x: zoomedXScale(indexForDate(dr.x2) + 0.5), y: zoomedPriceScale(dr.y2) };
    const targetB = { x: zoomedXScale(indexForDate(otherPoint.x) + 0.5), y: zoomedPriceScale(otherPoint.y) };

    // Whichever target's own price is currently higher is "Max" — never assumed to be x2/y2 vs.
    // extraPoints[0], since both are independently draggable and can cross each other.
    const aIsMax = dr.y2 >= otherPoint.y;
    const max = aIsMax ? targetA : targetB;
    const min = aIsMax ? targetB : targetA;
    const maxPrice = aIsMax ? dr.y2 : otherPoint.y;
    const minPrice = aIsMax ? otherPoint.y : dr.y2;

    const avg = { x: (max.x + min.x) / 2, y: (max.y + min.y) / 2 };
    const lineColor = dr.color ?? colorAccent;

    ctx.save();
    ctx.fillStyle = lineColor;
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(max.x, max.y);
    ctx.lineTo(min.x, min.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
    for (const target of [max, min]) {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
    ctx.setLineDash([1.5, 3]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(avg.x, avg.y);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.fillStyle = lineColor;
    ctx.arc(start.x, start.y, 3, 0, Math.PI * 2);
    ctx.fill();

    const fmt = (v: number) => v.toFixed(2);
    const pctOf = (y: number) => (dr.y1 !== 0 ? ((y - dr.y1) / dr.y1) * 100 : 0);
    const pillFor = (label: string, y: number) => {
      const pct = pctOf(y);
      const sign = pct >= 0 ? "+" : "";
      return { text: `${label} ${sign}${pct.toFixed(2)}% ${fmt(y)}`, bg: pct >= 0 ? colorUp : colorDown };
    };

    drawPillLabel(ctx, start.x, start.y, `Current ${fmt(dr.y1)}`, lineColor, colorBg, fontFamily, "left");
    const maxPill = pillFor("Max", maxPrice);
    drawPillLabel(ctx, max.x, max.y, maxPill.text, maxPill.bg, colorBg, fontFamily, "right");
    const avgPill = pillFor("Avg", (maxPrice + minPrice) / 2);
    drawPillLabel(ctx, avg.x, avg.y, avgPill.text, avgPill.bg, colorBg, fontFamily, "right");
    const minPill = pillFor("Min", minPrice);
    drawPillLabel(ctx, min.x, min.y, minPill.text, minPill.bg, colorBg, fontFamily, "right");
  }
}
