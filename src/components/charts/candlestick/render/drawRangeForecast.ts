import type { RenderCandlestickChartParams } from "../interfaces/RenderCandlestickChartParams.interface";
import type { ChartCanvasStyle } from "../interfaces/ChartCanvasStyle.interface";

/** A small rounded, filled "badge" label (unlike every other drawing type's plain `fillText` —
 *  see drawDrawingText) — the pill shape "Range forecast" itself is always shown with (Current/
 *  Max/Avg/Min, each with its own price and % change), anchored to one side of a point and
 *  vertically centered on it. */
function drawPill(ctx: CanvasRenderingContext2D, anchorX: number, anchorY: number, text: string, bg: string, fg: string, fontFamily: string, side: "left" | "right") {
  ctx.save();
  ctx.font = `700 10px ${fontFamily}`;
  const width = ctx.measureText(text).width;
  const paddingX = 7;
  const height = 17;
  const boxWidth = width + paddingX * 2;
  const gap = 8;
  const x = side === "right" ? anchorX + gap : anchorX - gap - boxWidth;
  const y = anchorY - height / 2;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, boxWidth, height, height / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + paddingX, anchorY + 0.5);
  ctx.restore();
}

/** "rangeForecast" (see TrendLineDrawing.lineType's own doc): 3 lines fanning from the same
 *  start point (Current) to Max/Avg/Min — Max/Min are this drawing's own stored (and freely
 *  draggable) points, Avg is never one of its own — always their screen-space midpoint,
 *  recomputed here so it never drifts out of sync after Max/Min are redragged by hand. Max/Min
 *  solid, Avg dotted, the triangular area between the Max and Min lines filled, and every point
 *  labeled with a colored pill badge (green/red by sign of its own % change from Current, like
 *  the plain "forecast" tool's own end label already is). Called from `drawPriceDrawings` while
 *  its own price-section clip is still open, same as every other price-space drawing type. */
export function drawRangeForecastDrawings(ctx: CanvasRenderingContext2D, params: RenderCandlestickChartParams, style: ChartCanvasStyle) {
  const { visibleDrawings, hoveredDrawingId, zoomedXScale, zoomedPriceScale, indexForDate } = params;
  const { colorUp, colorDown, colorAccent, colorBg, fontFamily } = style;
  for (const dr of visibleDrawings) {
    if (dr.lineType !== "rangeForecast" || !dr.extraPoints?.length) continue;
    const minPoint = dr.extraPoints[0];
    const start = { x: zoomedXScale(indexForDate(dr.x1) + 0.5), y: zoomedPriceScale(dr.y1) };
    const max = { x: zoomedXScale(indexForDate(dr.x2) + 0.5), y: zoomedPriceScale(dr.y2) };
    const min = { x: zoomedXScale(indexForDate(minPoint.x) + 0.5), y: zoomedPriceScale(minPoint.y) };
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

    drawPill(ctx, start.x, start.y, `Current ${fmt(dr.y1)}`, lineColor, colorBg, fontFamily, "left");
    const maxPill = pillFor("Max", dr.y2);
    drawPill(ctx, max.x, max.y, maxPill.text, maxPill.bg, colorBg, fontFamily, "right");
    const avgPill = pillFor("Avg", (dr.y2 + minPoint.y) / 2);
    drawPill(ctx, avg.x, avg.y, avgPill.text, avgPill.bg, colorBg, fontFamily, "right");
    const minPill = pillFor("Min", minPoint.y);
    drawPill(ctx, min.x, min.y, minPill.text, minPill.bg, colorBg, fontFamily, "right");
  }
}
