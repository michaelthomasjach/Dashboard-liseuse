import type { RenderCandlestickChartParams } from "../interfaces/RenderCandlestickChartParams.interface";
import type { ChartCanvasStyle } from "../interfaces/ChartCanvasStyle.interface";
import type { IndicatorBand } from "../interfaces/IndicatorBand.interface";
import type { IndicatorZigZagPoint } from "../interfaces/IndicatorZigZagPoint.interface";
import { snapPixel } from "../drawingGeometry";
import { indicatorCatalogEntry, defaultIndicatorColor } from "../indicators";

/** Phase 1 of `renderCandlestickChart`: opens the price section's own clip (left open — closed by
 *  `drawPriceDrawings`, always called right after this in the same synchronous pass, see
 *  `renderChart.ts`), then paints its gridlines, the candles themselves (or Renko/Line Break
 *  bricks, a plain close line, or TPO's histogram overlay — whichever `chartDisplayMode` is
 *  active), price-overlay indicator lines (SMA/EMA/WMA/VWAP/Bollinger), and the hover crosshair's
 *  horizontal line. */
export function drawPriceCandles(ctx: CanvasRenderingContext2D, params: RenderCandlestickChartParams, style: ChartCanvasStyle) {
  const { dims, priceHeight, zoomedPriceScale, zoomedXScale, chartDisplayMode, visible, heikinAshiCandles, candleWidth, tpoProfile, visibleIndicators, hovered, hoverY, data, visibleRange, renkoBricks, lineBreakBricks, overlayProjections } =
    params;
  const { colorUp, colorDown, colorBg, colorText, colorMuted, colorAccent, colorGrid, fontFamily, isEink } = style;

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
      const y = snapPixel(zoomedPriceScale(tick));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dims.boundedWidth, y);
      ctx.stroke();
    }
    ctx.restore();

    // The "0%" baseline while comparing against a symbol overlay (see compareMode/
    // overlayProjections) — every overlay projects onto the same mainReference price, so any one
    // of them gives the level. A solid, slightly darker line (colorMuted, not the dashed
    // colorGrid above) since this one's a meaningful reference threshold, not just a scale tick.
    if (overlayProjections.length > 0) {
      const y = snapPixel(zoomedPriceScale(overlayProjections[0].mainReference));
      ctx.save();
      ctx.strokeStyle = colorMuted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dims.boundedWidth, y);
      ctx.stroke();
      ctx.restore();
    }

    if (chartDisplayMode === "line") {
      // A plain close-price line, same treatment as the light area fill under an indicator
      // band (globalAlpha 0.08) rather than a fully opaque fill, so gridlines/drawings under it
      // stay legible.
      if (visible.length > 0) {
        ctx.save();
        ctx.strokeStyle = colorAccent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        visible.forEach(({ d, i }, k) => {
          const x = zoomedXScale(i + 0.5);
          const y = zoomedPriceScale(d.close);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        if (visible.length > 1) {
          ctx.lineTo(zoomedXScale(visible[visible.length - 1].i + 0.5), priceHeight);
          ctx.lineTo(zoomedXScale(visible[0].i + 0.5), priceHeight);
          ctx.closePath();
          ctx.globalAlpha = 0.08;
          ctx.fillStyle = colorAccent;
          ctx.fill();
        }
        ctx.restore();
      }
    } else if (chartDisplayMode === "renko" || chartDisplayMode === "lineBreak") {
      // Bricks are positioned on the *existing* index-based X scale (see PriceBrick's own
      // comment) rather than a dedicated brick-index axis, so they zoom/pan in lockstep with
      // everything else instead of needing a parallel scale threaded through the whole file.
      const bricks = chartDisplayMode === "renko" ? renkoBricks : lineBreakBricks;
      const rangeStart = Math.max(0, visibleRange.start - 2);
      const rangeEnd = Math.min(data.length, visibleRange.end + 2);
      for (let bi = 0; bi < bricks.length; bi++) {
        const brick = bricks[bi];
        if (brick.endIndex < rangeStart || brick.startIndex > rangeEnd) continue;
        const up = brick.direction > 0;
        const hueColor = up ? colorUp : colorDown;
        // A brick's own `startIndex` is set to the *previous* brick's `endIndex` (see
        // computeRenkoBricks/computeLineBreakBricks) — both bricks legitimately claim that same
        // candle when it's the one that confirmed the earlier brick AND kicked off this one, so
        // rendering both from that literal index doubled up one full candle-slot's width of
        // overlap at every single transition, painting the new brick's color over part of the
        // old one. Bumped forward by one slot here (render-only — the stored index driving the
        // price math is untouched) whenever that overlap actually applies, i.e. never for the
        // very first brick and never for one of several bricks confirmed within the same candle
        // (startIndex === endIndex there already renders as a single deliberate 1-slot sliver).
        const prevBrick = bi > 0 ? bricks[bi - 1] : null;
        const sharesBoundaryWithPrev = prevBrick !== null && brick.startIndex === prevBrick.endIndex && brick.startIndex !== brick.endIndex;
        const renderStartIndex = sharesBoundaryWithPrev ? brick.startIndex + 1 : brick.startIndex;
        const x1 = zoomedXScale(renderStartIndex);
        const x2 = zoomedXScale(brick.endIndex + 1);
        const top = zoomedPriceScale(Math.max(brick.open, brick.close));
        const bottom = zoomedPriceScale(Math.min(brick.open, brick.close));
        const inset = Math.min(1.5, (x2 - x1) / 4);
        const rectX = x1 + inset;
        const rectWidth = Math.max(1, x2 - x1 - inset * 2);
        const rectHeight = Math.max(1, bottom - top);

        ctx.lineWidth = 1;
        ctx.fillStyle = isEink ? (up ? colorBg : colorText) : hueColor;
        ctx.strokeStyle = isEink ? colorText : hueColor;
        ctx.fillRect(rectX, top, rectWidth, rectHeight);
        ctx.strokeRect(rectX, top, rectWidth, rectHeight);
      }
    } else {
      // "candle"/"tpo" (TPO overlays its histogram + VAH/POC/VAL on top of ordinary candles
      // rather than replacing them — a profile with nothing to show it against wouldn't mean
      // much) and "heikinAshi" (same candle body/wick drawing, just fed transformed OHLC values
      // that stay 1:1 with `data`'s own indices).
      const useHA = chartDisplayMode === "heikinAshi" && heikinAshiCandles;
      for (const { d: rawD, i } of visible) {
        const d = useHA ? heikinAshiCandles![i] : rawD;
        const cx = zoomedXScale(i + 0.5);
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
    }

    if (chartDisplayMode === "tpo" && tpoProfile) {
      const { bins, poc, vah, val } = tpoProfile;
      const maxCount = Math.max(1, ...bins.map((b) => b.count));
      const histMaxWidth = dims.boundedWidth * 0.16;
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = colorAccent;
      for (const bin of bins) {
        if (bin.count <= 0) continue;
        const barWidth = (bin.count / maxCount) * histMaxWidth;
        const yTop = zoomedPriceScale(bin.priceHigh);
        const yBottom = zoomedPriceScale(bin.priceLow);
        ctx.fillRect(dims.boundedWidth - barWidth, yTop, barWidth, Math.max(1, yBottom - yTop));
      }
      ctx.restore();

      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.font = `600 10px ${fontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      for (const level of [
        { price: vah, label: "VAH" },
        { price: poc, label: "POC" },
        { price: val, label: "VAL" },
      ]) {
        const y = snapPixel(zoomedPriceScale(level.price));
        ctx.strokeStyle = colorMuted;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(dims.boundedWidth, y);
        ctx.stroke();
        ctx.fillStyle = colorMuted;
        ctx.fillText(level.label, 4, y - 2);
      }
      ctx.restore();
    }

    // Only price-overlay indicators (SMA/EMA/WMA/VWAP/Bollinger/ZigZag) draw here — "own"-pane
    // ones (RSI/CHOP/MACD) get their own clipped section further down, alongside volume.
    visibleIndicators.forEach(({ indicator, points }, index) => {
      if (indicator.hidden || points.length < 2 || indicatorCatalogEntry(indicator.kind).pane !== "price") return;
      const color = indicator.color ?? defaultIndicatorColor(index);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.setLineDash([]);

      if (indicator.kind === "zigzag") {
        // A straight line through each confirmed pivot only (points is already compacted down to
        // just those — see computeZigZagValues/visibleIndicators), not a value at every candle —
        // this reuses the same moveTo/lineTo shape as the plain-number branch below, just walking
        // far fewer points since everything in between two pivots is skipped entirely.
        const zzPoints = points as { i: number; value: IndicatorZigZagPoint }[];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        zzPoints.forEach((p, k) => {
          const x = zoomedXScale(p.i + 0.5);
          const y = zoomedPriceScale(p.value.price);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        if (indicator.zigzagShowLabels ?? true) {
          ctx.font = `600 10px ${fontFamily}`;
          ctx.textAlign = "center";
          ctx.fillStyle = color;
          for (const p of zzPoints) {
            if (!p.value.label) continue; // First high/first low: nothing to compare against yet.
            const x = zoomedXScale(p.i + 0.5);
            const y = zoomedPriceScale(p.value.price);
            // Above a high pivot, below a low one, so the label never sits on top of the line
            // itself or the candle wick right at the pivot.
            ctx.textBaseline = p.value.kind === "high" ? "bottom" : "top";
            ctx.fillText(p.value.label, x, y + (p.value.kind === "high" ? -5 : 5));
          }
        }
      } else if (typeof points[0].value === "number") {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        points.forEach((p, k) => {
          const x = zoomedXScale(p.i + 0.5);
          const y = zoomedPriceScale(p.value as number);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      } else {
        // Band indicator (Bollinger): translucent fill between the bands, thin upper/lower
        // lines, and a solid middle line — the conventional "channel" rendering.
        const bandPoints = points as { i: number; value: IndicatorBand }[];
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = color;
        ctx.beginPath();
        bandPoints.forEach((p, k) => {
          const x = zoomedXScale(p.i + 0.5);
          const y = zoomedPriceScale(p.value.upper);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        for (let k = bandPoints.length - 1; k >= 0; k--) {
          ctx.lineTo(zoomedXScale(bandPoints[k].i + 0.5), zoomedPriceScale(bandPoints[k].value.lower));
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.lineWidth = 1;
        (["upper", "lower"] as const).forEach((key) => {
          ctx.beginPath();
          bandPoints.forEach((p, k) => {
            const x = zoomedXScale(p.i + 0.5);
            const y = zoomedPriceScale(p.value[key]);
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        });

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        bandPoints.forEach((p, k) => {
          const x = zoomedXScale(p.i + 0.5);
          const y = zoomedPriceScale(p.value.middle);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
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
}
