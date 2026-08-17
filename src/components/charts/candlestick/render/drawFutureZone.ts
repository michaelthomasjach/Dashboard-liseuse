import type { RenderCandlestickChartParams } from "../interfaces/RenderCandlestickChartParams.interface";
import type { ChartCanvasStyle } from "../interfaces/ChartCanvasStyle.interface";

const HATCH_SPACING = 10;

/** The "future" marker (see CandlestickChartProps.futureZoneVisible... actually a chart-settings
 *  toggle, not a prop — see useChartAppearance's own futureZoneVisible) — a diagonal-hatched
 *  rectangle spanning the price pane's full height, from just past the last candle to the plot's
 *  own right edge, marking the boundary between real data and the timeline's unbounded future
 *  beyond it. Drawn first, before candles/drawings/grid, so it reads as a background layer
 *  everything else paints over rather than under. */
export function drawFutureZone(ctx: CanvasRenderingContext2D, params: RenderCandlestickChartParams, style: ChartCanvasStyle) {
  const { futureZoneVisible, data, zoomedXScale, dims, priceHeight, indexForDate } = params;
  if (!futureZoneVisible || data.length === 0) return;

  const lastCandle = data[data.length - 1];
  const zoneLeft = zoomedXScale(indexForDate(lastCandle.date) + 1);
  if (zoneLeft >= dims.boundedWidth) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(zoneLeft, 0, dims.boundedWidth - zoneLeft, priceHeight);
  ctx.clip();
  ctx.strokeStyle = style.colorMuted;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  // Diagonal (45°) lines swept across the whole plot width at a fixed spacing, not just the
  // zone's own narrower span — the clip above confines what actually paints, so the pattern
  // always lines up the same way regardless of where the zone's own left edge happens to land as
  // the chart zooms/pans.
  for (let x = -priceHeight; x < dims.boundedWidth; x += HATCH_SPACING) {
    ctx.beginPath();
    ctx.moveTo(x, priceHeight);
    ctx.lineTo(x + priceHeight, 0);
    ctx.stroke();
  }
  ctx.restore();
}
