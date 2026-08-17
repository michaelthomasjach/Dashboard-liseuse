import type { RenderCandlestickChartParams } from "../interfaces/RenderCandlestickChartParams.interface";
import type { ChartCanvasStyle } from "../interfaces/ChartCanvasStyle.interface";
import type { DataPoint } from "../interfaces/DataPoint.interface";
import {
  FIBONACCI_LEVELS,
  FIBONACCI_EXTENSION_LEVELS,
  ELLIOTT_IMPULSE_VERTEX_LABELS,
  ELLIOTT_CORRECTION_VERTEX_LABELS,
  HEAD_SHOULDERS_VERTEX_LABELS,
  MULTI_POINT_TOOLS,
} from "../drawingCatalog";
import { allPointsOf, snapPixel, extendSegmentToEdges, effectiveExtendOf, channelOffsetFromClick } from "../drawingGeometry";
import { lineDashArray, drawDrawingText, drawArrowhead } from "../drawingRender";
import { defaultIndicatorColor } from "../indicators";

/** Phase 2 of `renderCandlestickChart`, continuing directly inside the price clip
 *  `drawPriceCandles` left open (closes it at the end, see that function's own doc comment):
 *  every drawing type (trend-line family, rectangle/zones/elbowArrow/brush/arrow markers), the
 *  active drawing tool's own live preview, the brush's in-progress stroke, the measure tool's
 *  completed measurement, the live-price dashed reference line, and symbol-comparison overlays. */
export function drawPriceDrawings(ctx: CanvasRenderingContext2D, params: RenderCandlestickChartParams, style: ChartCanvasStyle) {
  const {
    dims,
    priceHeight,
    zoomedPriceScale,
    zoomedXScale,
    data,
    visibleRange,
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
    overlayProjections,
    symbolOverlays,
    indexForDate,
    candleWidth,
  } = params;
  const { colorUp, colorDown, colorBg, colorMuted, colorAccent, fontFamily } = style;


    // Regular trend lines plus "horizontal"/"ray" price lines (ones anchored to volume or an
    // own-pane indicator are drawn within that pane's own clipped section instead, "vertical"
    // ones are drawn full-height further down, outside any clip).
    for (const dr of visibleDrawings) {
      // "rectangle"/"zones"/"elbowArrow"/"brush"/"arrowUp"/"arrowDown"/"forecast" have their own
      // geometry entirely unlike the "diagonal x1/y1–x2/y2, optionally extended, plus per-lineType
      // extras" shape every other type below shares — drawn in their own dedicated loops further
      // down instead, same reasoning "vertical" (full-height, outside this clip) already skips
      // this one for. "forecast" specifically draws a *curved* line between the same two points
      // instead of a straight one, so it can't share this loop's own straight moveTo/lineTo call
      // the way even every other excluded type here still visually builds on in its own loop.
      if (
        dr.lineType === "vertical" ||
        dr.lineType === "rectangle" ||
        dr.lineType === "zones" ||
        dr.lineType === "elbowArrow" ||
        dr.lineType === "brush" ||
        dr.lineType === "arrowUp" ||
        dr.lineType === "arrowDown" ||
        dr.lineType === "forecast" ||
        // Its x1/y1/x2/y2 aren't real coordinates (see the lineType's own doc comment) — just
        // the overlay's own first/last raw points, unrelated to the main series' price space.
        // Drawn separately, correctly rebased, by the dedicated symbol-overlay loop further
        // down — without this exclusion it also fell through to here and got drawn a second
        // time, as a straight line connecting those two raw (wrongly-scaled) points.
        dr.lineType === "symbolOverlay" ||
        ((dr.lineType === "horizontal" || dr.lineType === "ray") && dr.valueAxis && dr.valueAxis !== "price")
      )
        continue;
      const lineColor = dr.color ?? colorAccent;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      ctx.setLineDash(lineDashArray(dr));
      const startsFromEdge = dr.lineType === "horizontal";
      let x1: number, y1: number, x2: number, y2: number;
      if (dr.lineType === "horizontal" || dr.lineType === "ray") {
        // "ray" starts at its own anchor date instead of the plot's left edge — everything else
        // about it (ends at the right edge, single price/volume value) matches "horizontal".
        x1 = startsFromEdge ? 0 : zoomedXScale(indexForDate(dr.x1) + 0.5);
        x2 = dims.boundedWidth;
        y1 = y2 = zoomedPriceScale(dr.y1);
      } else {
        x1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
        y1 = zoomedPriceScale(dr.y1);
        x2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
        y2 = zoomedPriceScale(dr.y2);
      }

      // A regular trend line ("extended" included — see effectiveExtendOf) can be extended past
      // x1/x2 (fully, or just one side) via the Style tab, not only when drawn with the dedicated
      // "extended" tool — computed separately from x1/y1/x2/y2 themselves, which stay the two
      // defining (and draggable, and text-anchoring) points regardless of how far the line
      // itself actually reaches.
      const extend = effectiveExtendOf(dr);
      let drawX1 = x1,
        drawY1 = y1,
        drawX2 = x2,
        drawY2 = y2;
      if (extend !== "none") {
        const extended = extendSegmentToEdges(x1, y1, x2, y2, 0, dims.boundedWidth, extend);
        drawX1 = extended.x1;
        drawY1 = extended.y1;
        drawX2 = extended.x2;
        drawY2 = extended.y2;
      }
      ctx.beginPath();
      ctx.moveTo(drawX1, drawY1);
      ctx.lineTo(drawX2, drawY2);
      ctx.stroke();

      // arrowLeft/arrowRight only apply to a free two-point line — always drawn at x1/y1–x2/y2
      // themselves (never the extended edges above, since the two are mutually exclusive in the
      // edit modal anyway) and identified by screen position, not by which of x1/x2 is smaller.
      if ((!dr.lineType || dr.lineType === "extended") && (dr.arrowLeft || dr.arrowRight)) {
        const leftPoint = x1 <= x2 ? { x: x1, y: y1 } : { x: x2, y: y2 };
        const rightPoint = x1 <= x2 ? { x: x2, y: y2 } : { x: x1, y: y1 };
        if (dr.arrowLeft) drawArrowhead(ctx, rightPoint.x, rightPoint.y, leftPoint.x, leftPoint.y, lineColor);
        if (dr.arrowRight) drawArrowhead(ctx, leftPoint.x, leftPoint.y, rightPoint.x, rightPoint.y, lineColor);
      }

      // "channel" draws a second segment parallel to x1/x2, offset by channelOffset (a price
      // delta — constant in pixel terms too, since zoomedPriceScale is linear).
      if (dr.lineType === "channel") {
        const offsetPx = zoomedPriceScale(dr.y1 + (dr.channelOffset ?? 0)) - zoomedPriceScale(dr.y1);
        ctx.beginPath();
        ctx.moveTo(x1, y1 + offsetPx);
        ctx.lineTo(x2, y2 + offsetPx);
        ctx.stroke();
      }

      // "disjointChannel"'s line 2 is just its own two stored, independently-draggable points
      // (extraPoints[0]/[1]) — no offset/mirror math needed here, that only happens once, at
      // placement time (see handleOverlayClick).
      if (dr.lineType === "disjointChannel" && dr.extraPoints?.length === 2) {
        const [p3, p4] = dr.extraPoints;
        ctx.beginPath();
        ctx.moveTo(zoomedXScale(indexForDate(p3.x) + 0.5), zoomedPriceScale(p3.y));
        ctx.lineTo(zoomedXScale(indexForDate(p4.x) + 0.5), zoomedPriceScale(p4.y));
        ctx.stroke();
      }

      // "fibonacci" slices y1 (0%) to y2 (100%) into the standard retracement ratios, each its
      // own horizontal segment spanning x1/x2 — on top of the diagonal x1/y1–x2/y2 already drawn
      // above, which is unaffected (drawX*/drawY* only differ from x1/y1/x2/y2 when extended).
      // Labeled directly (not through the `formatPrice` prop's pFmt — that's declared after this
      // effect in source order, and pulling it in as a dependency would rerun the whole effect
      // on every render since it's a fresh function each time, unless the caller memoizes it).
      if (dr.lineType === "fibonacci") {
        ctx.save();
        ctx.setLineDash(lineDashArray(dr));
        ctx.font = `600 10px ${fontFamily}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        for (const ratio of FIBONACCI_LEVELS) {
          const price = dr.y1 + (dr.y2 - dr.y1) * ratio;
          const y = zoomedPriceScale(price);
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
          ctx.fillStyle = lineColor;
          ctx.fillText(`${(ratio * 100).toFixed(1)}% · ${price.toFixed(2)}`, Math.max(x1, x2) - 4, y - 3);
        }
        ctx.restore();
      }

      // "elliottImpulse"/"elliottCorrection": x1/x2 (already drawn above as the diagonal) is
      // just the first of several segments — draws the rest of the polyline through
      // extraPoints, then labels every vertex (0-1-2-3-4-5 or 0-A-B-C).
      if ((dr.lineType === "elliottImpulse" || dr.lineType === "elliottCorrection") && dr.extraPoints?.length) {
        const restScreen = dr.extraPoints.map((p) => ({ x: zoomedXScale(indexForDate(p.x) + 0.5), y: zoomedPriceScale(p.y) }));
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        for (const p of restScreen) ctx.lineTo(p.x, p.y);
        ctx.stroke();

        const vertexLabels = dr.lineType === "elliottImpulse" ? ELLIOTT_IMPULSE_VERTEX_LABELS : ELLIOTT_CORRECTION_VERTEX_LABELS;
        const allScreen = [{ x: x1, y: y1 }, { x: x2, y: y2 }, ...restScreen];
        ctx.save();
        ctx.setLineDash([]);
        ctx.font = `700 10px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = lineColor;
        allScreen.forEach((p, i) => ctx.fillText(vertexLabels[i] ?? "", p.x, p.y - 6));
        ctx.restore();
      }

      // "headShoulders": same shape as elliottImpulse/elliottCorrection just above — x1/x2 (left
      // shoulder to head, already drawn above) is the first segment, extraPoints continue the
      // polyline through the right shoulder and the neckline's own two points — but only the
      // three peaks (left shoulder/head/right shoulder) get a vertex label, not the neckline ends.
      if (dr.lineType === "headShoulders" && dr.extraPoints?.length) {
        const restScreen = dr.extraPoints.map((p) => ({ x: zoomedXScale(indexForDate(p.x) + 0.5), y: zoomedPriceScale(p.y) }));
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        for (const p of restScreen) ctx.lineTo(p.x, p.y);
        ctx.stroke();

        const allScreen = [{ x: x1, y: y1 }, { x: x2, y: y2 }, ...restScreen];
        ctx.save();
        ctx.setLineDash([]);
        ctx.font = `700 10px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = lineColor;
        allScreen.forEach((p, i) => {
          const label = HEAD_SHOULDERS_VERTEX_LABELS[i];
          if (label) ctx.fillText(label, p.x, p.y - 6);
        });
        ctx.restore();
      }

      // "fibonacciExtension": x1/x2 (the A-B leg, already drawn above) is followed by a B-C
      // segment to its 3rd point, then extension levels projected from C by each ratio's share
      // of the A-B leg's own price span — the conventional "trend-based" extension formula.
      if (dr.lineType === "fibonacciExtension" && dr.extraPoints?.length) {
        const pointC = dr.extraPoints[0];
        const cx = zoomedXScale(indexForDate(pointC.x) + 0.5);
        const cy = zoomedPriceScale(pointC.y);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(cx, cy);
        ctx.stroke();

        ctx.save();
        ctx.setLineDash(lineDashArray(dr));
        ctx.font = `600 10px ${fontFamily}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        const legDelta = dr.y2 - dr.y1;
        const levelX1 = Math.min(x2, cx);
        const levelX2 = Math.max(x2, cx);
        for (const ratio of FIBONACCI_EXTENSION_LEVELS) {
          const price = pointC.y + legDelta * ratio;
          const y = zoomedPriceScale(price);
          ctx.beginPath();
          ctx.moveTo(levelX1, y);
          ctx.lineTo(levelX2, y);
          ctx.stroke();
          ctx.fillStyle = lineColor;
          ctx.fillText(`${(ratio * 100).toFixed(1)}% · ${price.toFixed(2)}`, levelX2 - 4, y - 3);
        }
        ctx.restore();
      }

      // "horizontal"/"ray" ignore textHorizontalAlign/textAlignWithLine — they're always
      // perfectly flat and span to the plot's own right edge, so anchoring "with the line" or at
      // its "left"/"right" wouldn't mean anything different from what this already does.
      if (dr.lineType === "horizontal" || dr.lineType === "ray") {
        if (dr.text) {
          ctx.save();
          ctx.font = `${dr.textBold === false ? 400 : 600} ${dr.textSize ?? 11}px ${fontFamily}`;
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillStyle = dr.color ?? lineColor;
          ctx.fillText(dr.text, dims.boundedWidth - 4, Math.min(y1, y2) - 6);
          ctx.restore();
        }
      } else {
        drawDrawingText(ctx, dr, x1, y1, x2, y2, lineColor, fontFamily);
      }
    }

    // "rectangle": x1/y1 and x2/y2 as opposite corners — stroked, plus a faint fill of its own
    // color so it reads as a filled region instead of just an outline.
    for (const dr of visibleDrawings) {
      if (dr.lineType !== "rectangle") continue;
      const lineColor = dr.color ?? colorAccent;
      const rx1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
      const ry1 = zoomedPriceScale(dr.y1);
      const rx2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
      const ry2 = zoomedPriceScale(dr.y2);
      const rectX = Math.min(rx1, rx2);
      const rectY = Math.min(ry1, ry2);
      const rectW = Math.abs(rx2 - rx1);
      const rectH = Math.abs(ry2 - ry1);
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = lineColor;
      ctx.fillRect(rectX, rectY, rectW, rectH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      ctx.setLineDash(lineDashArray(dr));
      ctx.strokeRect(rectX, rectY, rectW, rectH);
      ctx.restore();
      drawDrawingText(ctx, dr, rx1, ry1, rx2, ry2, lineColor, fontFamily);
    }

    // "zones": x1/y1 and x2/y2 as opposite corners, same as "rectangle", but instead of one
    // filled box they split the whole price pane into three horizontal bands — above the higher
    // boundary (positive), the box itself (neutral), below the lower boundary (negative). The
    // positive/negative bands always extend to the pane's own top/bottom edge (0/priceHeight),
    // not to the drawing's own data range, since they represent "everything above/below", not a
    // bounded region. Only the two horizontal boundaries always draw; the box's left/right sides
    // are opt-in (showZoneSides) since the bands read as open regions without them.
    for (const dr of visibleDrawings) {
      if (dr.lineType !== "zones") continue;
      const lineColor = dr.color ?? colorAccent;
      const posColor = dr.positiveColor ?? colorUp;
      const negColor = dr.negativeColor ?? colorDown;
      const neutColor = dr.neutralColor ?? colorMuted;
      const rx1 = zoomedXScale(indexForDate(dr.x1) + 0.5);
      const ry1 = zoomedPriceScale(dr.y1);
      const rx2 = zoomedXScale(indexForDate(dr.x2) + 0.5);
      const ry2 = zoomedPriceScale(dr.y2);
      const rectX = Math.min(rx1, rx2);
      const rectW = Math.abs(rx2 - rx1);
      const topY = Math.min(ry1, ry2);
      const bottomY = Math.max(ry1, ry2);
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = posColor;
      ctx.fillRect(rectX, 0, rectW, topY);
      ctx.fillStyle = neutColor;
      ctx.fillRect(rectX, topY, rectW, bottomY - topY);
      ctx.fillStyle = negColor;
      ctx.fillRect(rectX, bottomY, rectW, priceHeight - bottomY);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      ctx.setLineDash(lineDashArray(dr));
      ctx.beginPath();
      ctx.moveTo(rectX, topY);
      ctx.lineTo(rectX + rectW, topY);
      ctx.moveTo(rectX, bottomY);
      ctx.lineTo(rectX + rectW, bottomY);
      ctx.stroke();
      if (dr.showZoneSides) {
        ctx.beginPath();
        ctx.moveTo(rectX, topY);
        ctx.lineTo(rectX, bottomY);
        ctx.moveTo(rectX + rectW, topY);
        ctx.lineTo(rectX + rectW, bottomY);
        ctx.stroke();
      }
      ctx.restore();
      drawDrawingText(ctx, dr, rx1, ry1, rx2, ry2, lineColor, fontFamily);
    }

    // "elbowArrow": an open-ended polyline (x1/y1, x2/y2, then however many extraPoints were
    // clicked before Escape finalized it — see handleOverlayClick/the keydown effect), drawn as
    // a straight segment between each consecutive point, with a single arrowhead at the last one
    // pointing in that final segment's own direction.
    for (const dr of visibleDrawings) {
      if (dr.lineType !== "elbowArrow") continue;
      const lineColor = dr.color ?? colorAccent;
      const screenPoints = allPointsOf(dr).map((p) => ({ x: zoomedXScale(indexForDate(p.x) + 0.5), y: zoomedPriceScale(p.y) }));
      if (screenPoints.length < 2) continue;
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      ctx.lineJoin = "round";
      ctx.setLineDash(lineDashArray(dr));
      ctx.beginPath();
      screenPoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
      const last = screenPoints[screenPoints.length - 1];
      const secondToLast = screenPoints[screenPoints.length - 2];
      drawArrowhead(ctx, secondToLast.x, secondToLast.y, last.x, last.y, lineColor);
      drawDrawingText(ctx, dr, screenPoints[0].x, screenPoints[0].y, last.x, last.y, lineColor, fontFamily);
    }

    // "brush": a freehand polyline through x1/y1, extraPoints (in order), then x2/y2 — no
    // per-point handles/hit-testing (see allPointsOf's callers), the whole stroke only moves or
    // deletes as one piece.
    for (const dr of visibleDrawings) {
      if (dr.lineType !== "brush") continue;
      const lineColor = dr.color ?? colorAccent;
      const screenPoints = allPointsOf(dr).map((p) => ({ x: zoomedXScale(indexForDate(p.x) + 0.5), y: zoomedPriceScale(p.y) }));
      if (screenPoints.length < 2) continue;
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 2.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.setLineDash(lineDashArray(dr));
      ctx.beginPath();
      screenPoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
    }

    // "forecast": a curved (not straight) arrow from x1/y1 to x2/y2 — a price-projection
    // annotation, not a support/resistance line — each end labeled with its own price/date, and
    // the end additionally with the price change and elapsed time from the start. Bows via a
    // quadratic curve through a control point offset perpendicular to the straight A-B segment,
    // by a fixed fraction of that segment's own length — the same bow ratio regardless of whether
    // B is above or below A, so a rise and a decline read as mirror images of the same arc (same
    // radius of curvature) rather than two different curve families.
    for (const dr of visibleDrawings) {
      if (dr.lineType !== "forecast") continue;
      const lineColor = dr.color ?? colorAccent;
      const ax = zoomedXScale(indexForDate(dr.x1) + 0.5);
      const ay = zoomedPriceScale(dr.y1);
      const bx = zoomedXScale(indexForDate(dr.x2) + 0.5);
      const by = zoomedPriceScale(dr.y2);

      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
      ctx.setLineDash(lineDashArray(dr));
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const bow = len * 0.28;
      const cx = (ax + bx) / 2 - (dy / len) * bow;
      const cy = (ay + by) / 2 + (dx / len) * bow;
      ctx.quadraticCurveTo(cx, cy, bx, by);
      const tangentFromX = cx;
      const tangentFromY = cy;
      ctx.stroke();
      ctx.restore();
      // Arrowhead direction follows the curve's own tangent at B (its last segment, whichever
      // shape drew it), not the straight A->B direction, so it visually continues the curve
      // instead of pointing slightly off from where it actually arrives.
      drawArrowhead(ctx, tangentFromX, tangentFromY, bx, by, lineColor);

      ctx.beginPath();
      ctx.arc(ax, ay, 3, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();

      const days = Math.round((dr.x2.getTime() - dr.x1.getTime()) / 86_400_000);
      const pctChange = dr.y1 !== 0 ? ((dr.y2 - dr.y1) / dr.y1) * 100 : 0;
      const sign = dr.y2 >= dr.y1 ? "+" : "";
      const fmtDate = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = lineColor;
      ctx.font = `600 11px ${fontFamily}`;
      ctx.fillText(dr.y1.toFixed(2), ax + 6, ay - 4);
      ctx.font = `400 10px ${fontFamily}`;
      ctx.fillText(fmtDate(dr.x1), ax + 6, ay + 12);

      ctx.fillStyle = pctChange >= 0 ? colorUp : colorDown;
      ctx.font = `600 11px ${fontFamily}`;
      ctx.fillText(`${sign}${(dr.y2 - dr.y1).toFixed(2)} (${sign}${pctChange.toFixed(2)}%) en ${days}j`, bx + 6, by - 12);
      ctx.fillStyle = lineColor;
      ctx.font = `400 10px ${fontFamily}`;
      ctx.fillText(`${dr.y2.toFixed(2)} · ${fmtDate(dr.x2)}`, bx + 6, by + 4);
      ctx.restore();

      drawDrawingText(ctx, dr, ax, ay, bx, by, lineColor, fontFamily);
    }

    // "arrowUp"/"arrowDown": a single-point marker, drawn as a small triangle just clear of its
    // own point (below it pointing up, above it pointing down) rather than centered on it, so it
    // doesn't sit on top of whatever candle it's marking.
    for (const dr of visibleDrawings) {
      if (dr.lineType !== "arrowUp" && dr.lineType !== "arrowDown") continue;
      const lineColor = dr.color ?? colorAccent;
      const ax = zoomedXScale(indexForDate(dr.x1) + 0.5);
      const ay = zoomedPriceScale(dr.y1);
      const markerSize = (dr.strokeWidth ?? 1.5) * 6 + 6;
      const gap = 4;
      if (dr.lineType === "arrowUp") {
        drawArrowhead(ctx, ax, ay + gap + markerSize, ax, ay + gap, lineColor, markerSize);
      } else {
        drawArrowhead(ctx, ax, ay - gap - markerSize, ax, ay - gap, lineColor, markerSize);
      }
      if (dr.text) {
        ctx.save();
        ctx.font = `${dr.textBold === false ? 400 : 600} ${dr.textSize ?? 11}px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = dr.lineType === "arrowUp" ? "top" : "bottom";
        ctx.fillStyle = dr.color ?? lineColor;
        ctx.fillText(dr.text, ax, dr.lineType === "arrowUp" ? ay + gap + markerSize + 4 : ay - gap - markerSize - 4);
        ctx.restore();
      }
    }

    if (activeTool && pendingPoint && previewPoint) {
      ctx.save();
      ctx.strokeStyle = colorAccent;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      if (activeTool === "channel" && pendingSecondPoint) {
        // Line 1 is fixed now (points 1 and 2 already placed) — the live cursor (previewPoint)
        // instead previews line 2's offset, the tool's 3rd/final click.
        const x1 = zoomedXScale(indexForDate(pendingPoint.x) + 0.5);
        const y1 = zoomedPriceScale(pendingPoint.y);
        const x2 = zoomedXScale(indexForDate(pendingSecondPoint.x) + 0.5);
        const y2 = zoomedPriceScale(pendingSecondPoint.y);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const x1i = indexForDate(pendingPoint.x);
        const x2i = indexForDate(pendingSecondPoint.x);
        const onLineY =
          x2i === x1i
            ? pendingPoint.y
            : pendingPoint.y + (pendingSecondPoint.y - pendingPoint.y) * ((indexForDate(previewPoint.x) - x1i) / (x2i - x1i));
        const offsetPx = zoomedPriceScale(pendingPoint.y + (previewPoint.y - onLineY)) - zoomedPriceScale(pendingPoint.y);
        ctx.beginPath();
        ctx.moveTo(x1, y1 + offsetPx);
        ctx.lineTo(x2, y2 + offsetPx);
        ctx.stroke();
      } else if (activeTool === "disjointChannel" && pendingSecondPoint) {
        // Same 3rd-click offset preview as "channel" above, but line 2 is the point-2-centered
        // mirror of line 1 (opposite slope) rather than a parallel copy — matches the commit
        // branch's channelOffsetFromClick + mirror math in handleOverlayClick.
        const x1 = zoomedXScale(indexForDate(pendingPoint.x) + 0.5);
        const y1 = zoomedPriceScale(pendingPoint.y);
        const x2 = zoomedXScale(indexForDate(pendingSecondPoint.x) + 0.5);
        const y2 = zoomedPriceScale(pendingSecondPoint.y);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const offset = channelOffsetFromClick(pendingPoint, pendingSecondPoint, previewPoint, indexForDate);
        const p3 = { x: pendingSecondPoint.x, y: pendingSecondPoint.y + offset };
        const p4 = { x: pendingPoint.x, y: 2 * pendingSecondPoint.y - pendingPoint.y + offset };
        ctx.beginPath();
        ctx.moveTo(zoomedXScale(indexForDate(p3.x) + 0.5), zoomedPriceScale(p3.y));
        ctx.lineTo(zoomedXScale(indexForDate(p4.x) + 0.5), zoomedPriceScale(p4.y));
        ctx.stroke();
      } else if (activeTool === "rectangle" || activeTool === "zones") {
        const x1 = zoomedXScale(indexForDate(pendingPoint.x) + 0.5);
        const y1 = zoomedPriceScale(pendingPoint.y);
        const x2 = zoomedXScale(indexForDate(previewPoint.x) + 0.5);
        const y2 = zoomedPriceScale(previewPoint.y);
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      } else if (activeTool === "elbowArrow") {
        // Open-ended — same "polyline through whatever's placed so far, plus a live segment to
        // the cursor" preview as the fixed-count multi-point tools below, just without a point
        // count to stop at (Escape is what ends it, see the keydown effect).
        const placed = [pendingPoint, ...pendingExtraPoints];
        ctx.beginPath();
        placed.forEach((p, i) => {
          const x = zoomedXScale(indexForDate(p.x) + 0.5);
          const y = zoomedPriceScale(p.y);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(zoomedXScale(indexForDate(previewPoint.x) + 0.5), zoomedPriceScale(previewPoint.y));
        ctx.stroke();
      } else if (MULTI_POINT_TOOLS[activeTool]) {
        // fibonacciExtension/elliottCorrection/elliottImpulse: preview the polyline through
        // whatever points have been placed so far, plus one more segment out to the live cursor
        // for whichever point comes next.
        const placed = [pendingPoint, pendingSecondPoint, ...pendingExtraPoints].filter((p): p is DataPoint => p !== null);
        ctx.beginPath();
        placed.forEach((p, i) => {
          const x = zoomedXScale(indexForDate(p.x) + 0.5);
          const y = zoomedPriceScale(p.y);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(zoomedXScale(indexForDate(previewPoint.x) + 0.5), zoomedPriceScale(previewPoint.y));
        ctx.stroke();
      } else if (activeTool === "forecast") {
        // Same bow formula as the committed render (see the "forecast" loop below), so the
        // preview doesn't visually snap to a different curve the instant the 2nd click commits it.
        const x1 = zoomedXScale(indexForDate(pendingPoint.x) + 0.5);
        const y1 = zoomedPriceScale(pendingPoint.y);
        const x2 = zoomedXScale(indexForDate(previewPoint.x) + 0.5);
        const y2 = zoomedPriceScale(previewPoint.y);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const bow = len * 0.28;
        const cx = (x1 + x2) / 2 - (dy / len) * bow;
        const cy = (y1 + y2) / 2 + (dx / len) * bow;
        ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.stroke();
      } else {
        const x1 = zoomedXScale(indexForDate(pendingPoint.x) + 0.5);
        const y1 = zoomedPriceScale(pendingPoint.y);
        const x2 = zoomedXScale(indexForDate(previewPoint.x) + 0.5);
        const y2 = zoomedPriceScale(previewPoint.y);
        let drawX1 = x1,
          drawY1 = y1,
          drawX2 = x2,
          drawY2 = y2;
        if (activeTool === "extended") {
          const extended = extendSegmentToEdges(x1, y1, x2, y2, 0, dims.boundedWidth);
          drawX1 = extended.x1;
          drawY1 = extended.y1;
          drawX2 = extended.x2;
          drawY2 = extended.y2;
        }
        ctx.beginPath();
        ctx.moveTo(drawX1, drawY1);
        ctx.lineTo(drawX2, drawY2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Brush's own in-progress stroke — driven by brushPreview state (mirrored from
    // brushPointsRef on every sampled point, see handlePointerMove) rather than
    // pendingPoint/previewPoint, since it's a drag gesture, not a click sequence.
    if (brushPreview && brushPreview.length >= 2) {
      ctx.save();
      ctx.strokeStyle = colorAccent;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      brushPreview.forEach((p, i) => {
        const x = zoomedXScale(indexForDate(p.x) + 0.5);
        const y = zoomedPriceScale(p.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // Measure's own last completed measurement — a translucent box between the two points (green
    // if the price went up from p1 to p2, red if down, same up/down convention as candles) plus a
    // small stats panel: % change, price delta ("points"), bar count and calendar-day count
    // between them.
    if (measurePoints) {
      const { p1, p2 } = measurePoints;
      const mx1 = zoomedXScale(indexForDate(p1.x) + 0.5);
      const my1 = zoomedPriceScale(p1.y);
      const mx2 = zoomedXScale(indexForDate(p2.x) + 0.5);
      const my2 = zoomedPriceScale(p2.y);
      const up = p2.y >= p1.y;
      const boxColor = up ? colorUp : colorDown;

      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = boxColor;
      ctx.fillRect(Math.min(mx1, mx2), Math.min(my1, my2), Math.abs(mx2 - mx1), Math.abs(my2 - my1));
      ctx.globalAlpha = 1;
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(mx1, my1);
      ctx.lineTo(mx2, my2);
      ctx.stroke();

      const bars = Math.abs(indexForDate(p2.x) - indexForDate(p1.x));
      const days = Math.round(Math.abs(p2.x.getTime() - p1.x.getTime()) / 86_400_000);
      const priceDelta = p2.y - p1.y;
      const pct = p1.y !== 0 ? (priceDelta / p1.y) * 100 : 0;
      const sign = priceDelta >= 0 ? "+" : "";
      const lines = [
        `${sign}${pct.toFixed(2)}%`,
        `${bars} barre${bars > 1 ? "s" : ""}`,
        `${days} jour${days > 1 ? "s" : ""}`,
        `${sign}${priceDelta.toFixed(2)} points`,
      ];
      ctx.setLineDash([]);
      ctx.font = `600 11px ${fontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const padding = 6;
      const lineHeight = 14;
      const boxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2;
      const boxHeight = lines.length * lineHeight + padding * 2;
      const labelX = Math.max(mx1, mx2) + 8;
      const labelY = Math.min(my1, my2);
      ctx.fillStyle = colorBg;
      ctx.fillRect(labelX, labelY, boxWidth, boxHeight);
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(labelX, labelY, boxWidth, boxHeight);
      ctx.fillStyle = boxColor;
      lines.forEach((line, i) => ctx.fillText(line, labelX + padding, labelY + padding + i * lineHeight));
      ctx.restore();
    }

    // Live last-close reference line — drawn last (on top of candles/indicators/TPO) so it's
    // never obscured. Its own Y-axis price badge and the countdown-to-next-candle badge below it
    // are plain DOM (not canvas), see the JSX further down — this is only the dashed line itself.
    if (livePrice && data.length > 0) {
      const lastCandle = data[data.length - 1];
      const prevCandle = data.length > 1 ? data[data.length - 2] : null;
      const up = prevCandle ? lastCandle.close >= prevCandle.close : true;
      const y = snapPixel(zoomedPriceScale(lastCandle.close));
      ctx.save();
      ctx.strokeStyle = up ? colorUp : colorDown;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dims.boundedWidth, y);
      ctx.stroke();
      ctx.restore();
    }

    // Symbol-comparison overlays (see onAddSymbolOverlay/compareMode) — drawn through their own
    // overlayProjections (already rebased onto the main series' own price space, see that memo's
    // own doc comment), same clip as everything else in this section since it's conceptually
    // "another series over price", same as SMA/EMA above. `overlayDisplayMode` picks the shape: a
    // plain line through each point's rebased close (the default, and the only option when
    // `overlayData` doesn't carry open/high/low), full OHLC bars ("candle"/"heikinAshi"), or
    // bricks ("renko"/"lineBreak") — every non-line shape hollow (stroke-only, never filled) in
    // the overlay's own color rather than the theme's up/down hues, so it reads as "a comparison
    // instrument" instead of a second primary series competing with `data`'s own filled candles,
    // and so multiple overlays in the same mode still stay visually distinct from each other by
    // outline color alone.
    const windowStart = Math.max(0, visibleRange.start - 2);
    const windowEnd = Math.min(data.length, visibleRange.end + 2);
    for (const { drawing: dr, points, haPoints, bricks } of overlayProjections) {
      if (dr.hidden) continue;
      const visiblePoints = points.filter((p) => p.i >= windowStart && p.i <= windowEnd);
      if (visiblePoints.length < 2) continue;
      const color = dr.color ?? defaultIndicatorColor(symbolOverlays.indexOf(dr));

      if (dr.overlayDisplayMode === "heikinAshi" && haPoints) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
        for (const p of haPoints) {
          if (p.i < windowStart || p.i > windowEnd) continue;
          const cx = zoomedXScale(p.i + 0.5);
          const bodyTop = zoomedPriceScale(Math.max(p.open, p.price));
          const bodyBottom = zoomedPriceScale(Math.min(p.open, p.price));
          ctx.beginPath();
          ctx.moveTo(cx, zoomedPriceScale(p.high));
          ctx.lineTo(cx, zoomedPriceScale(p.low));
          ctx.stroke();
          ctx.strokeRect(cx - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyBottom - bodyTop));
        }
        ctx.restore();
      } else if ((dr.overlayDisplayMode === "renko" || dr.overlayDisplayMode === "lineBreak") && bricks) {
        // Same geometry as the main series' own renko/lineBreak rendering (see drawPriceCandles)
        // — bricks positioned on the existing index-based X scale, one slot's worth of overlap
        // trimmed off whichever brick shares a boundary with the previous one — just hollow and
        // in the overlay's own color instead of filled with the theme's up/down hue.
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
        for (let bi = 0; bi < bricks.length; bi++) {
          const brick = bricks[bi];
          if (brick.endIndex < windowStart || brick.startIndex > windowEnd) continue;
          const prevBrick = bi > 0 ? bricks[bi - 1] : null;
          const sharesBoundaryWithPrev = prevBrick !== null && brick.startIndex === prevBrick.endIndex && brick.startIndex !== brick.endIndex;
          const renderStartIndex = sharesBoundaryWithPrev ? brick.startIndex + 1 : brick.startIndex;
          const x1 = zoomedXScale(renderStartIndex);
          const x2 = zoomedXScale(brick.endIndex + 1);
          const top = zoomedPriceScale(Math.max(brick.open, brick.close));
          const bottom = zoomedPriceScale(Math.min(brick.open, brick.close));
          const inset = Math.min(1.5, (x2 - x1) / 4);
          ctx.strokeRect(x1 + inset, top, Math.max(1, x2 - x1 - inset * 2), Math.max(1, bottom - top));
        }
        ctx.restore();
      } else if (dr.overlayDisplayMode === "candle" && visiblePoints.every((p) => p.open !== undefined && p.high !== undefined && p.low !== undefined)) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
        for (const p of visiblePoints) {
          const cx = zoomedXScale(p.i + 0.5);
          const bodyTop = zoomedPriceScale(Math.max(p.open!, p.price));
          const bodyBottom = zoomedPriceScale(Math.min(p.open!, p.price));
          ctx.beginPath();
          ctx.moveTo(cx, zoomedPriceScale(p.high!));
          ctx.lineTo(cx, zoomedPriceScale(p.low!));
          ctx.stroke();
          ctx.strokeRect(cx - candleWidth / 2, bodyTop, candleWidth, Math.max(1, bodyBottom - bodyTop));
        }
        ctx.restore();
      } else {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = (dr.strokeWidth ?? 1.5) + (hoveredDrawingId === dr.id ? 1 : 0);
        ctx.setLineDash(lineDashArray(dr));
        ctx.beginPath();
        visiblePoints.forEach((p, k) => {
          const x = zoomedXScale(p.i + 0.5);
          const y = zoomedPriceScale(p.price);
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore(); // end price-section clip
}
