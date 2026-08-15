import type { TrendLineDrawing } from "./interfaces/TrendLineDrawing.interface";

// `lineStyle` supersedes the older `dashed` boolean (kept for drawings saved before it existed —
// see its own doc on TrendLineDrawing).
export function lineDashArray(dr: TrendLineDrawing): number[] {
  switch (dr.lineStyle ?? (dr.dashed ? "dashed" : "solid")) {
    case "dashed":
      return [6, 4];
    case "dotted":
      return [1.5, 3];
    case "dashdot":
      return [6, 3, 1.5, 3];
    case "solid":
    default:
      return [];
  }
}

// Shared by every drawing type's `dr.text` label instead of each duplicating its own
// font/alignment/positioning — anchored along the line's own length (textHorizontalAlign) and
// offset to one side of it or centered on it (textVerticalAlign), optionally rotated to match the
// line's own on-screen slope (textAlignWithLine) and/or painted over its own background rect.
// (x1,y1)-(x2,y2) is whatever segment the caller considers "the line" for anchoring purposes —
// for multi-point tools that's usually just the first two points, not literally everything drawn.
export function drawDrawingText(
  ctx: CanvasRenderingContext2D,
  dr: TrendLineDrawing,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fallbackColor: string,
  fontFamily: string
) {
  if (!dr.text) return;
  const hAlign = dr.textHorizontalAlign ?? "center";
  const vAlign = dr.textVerticalAlign ?? "top";
  const t = hAlign === "left" ? 0 : hAlign === "right" ? 1 : 0.5;
  const anchorX = x1 + (x2 - x1) * t;
  const anchorY = y1 + (y2 - y1) * t;
  const size = dr.textSize ?? 11;
  const weight = dr.textBold === false ? 400 : 600;
  const style = dr.textItalic ? "italic" : "normal";
  const offset = 6;

  ctx.save();
  ctx.font = `${style} ${weight} ${size}px ${fontFamily}`;
  ctx.textAlign = hAlign;
  ctx.textBaseline = vAlign === "top" ? "bottom" : vAlign === "bottom" ? "top" : "middle";

  let angle = 0;
  if (dr.textAlignWithLine) {
    angle = Math.atan2(y2 - y1, x2 - x1);
    // Keeps the text upright (never upside-down) regardless of which of the two points is
    // actually "first" on screen.
    if (angle > Math.PI / 2) angle -= Math.PI;
    else if (angle < -Math.PI / 2) angle += Math.PI;
  }

  ctx.translate(anchorX, anchorY);
  if (angle !== 0) ctx.rotate(angle);
  const drawY = vAlign === "top" ? -offset : vAlign === "bottom" ? offset : 0;

  if (dr.textBackgroundColor) {
    // actualBoundingBoxAscent/Descent are already relative to whatever textBaseline is
    // currently set, so this works out regardless of vAlign.
    const metrics = ctx.measureText(dr.text);
    const ascent = metrics.actualBoundingBoxAscent ?? size * 0.8;
    const descent = metrics.actualBoundingBoxDescent ?? size * 0.25;
    const pad = 3;
    let bgX = 0;
    if (hAlign === "center") bgX = -metrics.width / 2;
    else if (hAlign === "right") bgX = -metrics.width;
    ctx.fillStyle = dr.textBackgroundColor;
    ctx.fillRect(bgX - pad, drawY - ascent - pad, metrics.width + pad * 2, ascent + descent + pad * 2);
  }

  ctx.fillStyle = dr.textColor ?? dr.color ?? fallbackColor;
  ctx.fillText(dr.text, 0, drawY);
  ctx.restore();
}

/** A small filled triangle at (toX, toY), pointing away from (fromX, fromY) — the shared
 *  arrowhead shape for arrowLeft/arrowRight on plain trend lines, the elbow-arrow tool's end,
 *  and the arrow-line tool (a trend line with arrowRight preset). */
export function drawArrowhead(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string, size = 9) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const spread = Math.PI / 7;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - spread), toY - size * Math.sin(angle - spread));
  ctx.lineTo(toX - size * Math.cos(angle + spread), toY - size * Math.sin(angle + spread));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
