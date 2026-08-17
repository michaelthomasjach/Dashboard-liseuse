import type { TrendLineDrawing } from "./interfaces/TrendLineDrawing.interface";
import type { DataPoint } from "./interfaces/DataPoint.interface";

/** All of a drawing's points in path order — the shape every multi-point tool's rendering/
 *  hit-testing/dragging works off of instead of the named fields directly. For every *clicked*
 *  multi-point tool (fibonacciExtension, elliott*, disjointChannel, elbowArrow) that's x1/y1,
 *  x2/y2, then extraPoints, since x2 is always the 2nd click and extraPoints are whatever came
 *  after. "brush" is the one exception: it's a *dragged* stroke, not a sequence of clicks — x1/y1
 *  is where the drag started, x2/y2 where it ended, and extraPoints are the samples in between
 *  (see TrendLineDrawing's own doc), so x2 is chronologically *last*, not 2nd. Walking it in the
 *  same x1→x2→extraPoints order as every other tool would jump straight from the start to the end
 *  and then zigzag back through the middle samples — this returns x1→extraPoints→x2 for brush
 *  specifically so callers can keep walking the result pairwise without knowing the difference. */
export function allPointsOf(dr: TrendLineDrawing): DataPoint[] {
  if (dr.lineType === "brush") return [{ x: dr.x1, y: dr.y1 }, ...(dr.extraPoints ?? []), { x: dr.x2, y: dr.y2 }];
  return [{ x: dr.x1, y: dr.y1 }, { x: dr.x2, y: dr.y2 }, ...(dr.extraPoints ?? [])];
}

// A canvas 1px line drawn at an integer y (e.g. moveTo(0, 40)) straddles two physical pixel rows
// half-and-half, so it rasterizes as a ~2px anti-aliased blur instead of a crisp line — unlike an
// SVG/CSS border at the same nominal position, which renders crisp. Offsetting to the pixel's
// center (y + 0.5) keeps the 1px stroke entirely within one row, matching the SVG-drawn dividers
// these canvas lines are meant to continue seamlessly into.
export function snapPixel(v: number): number {
  return Math.round(v) + 0.5;
}

export function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Rounded at the *source* — every place a price gets computed from a pixel position (a new
 *  point's placement, any kind of drag) — not just when the edit modal's own fields are typed
 *  into, so a freshly-drawn or freshly-dragged line's coordinates never carry more precision
 *  than the modal shows in the first place (a raw scale.invert() pixel→price conversion easily
 *  produces a dozen-plus decimal digits). */
export function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// "extended" lines keep their own two defining points (x1/y1/x2/y2, still what's draggable) but
// draw all the way to the price section's left/right edges instead of stopping at them —
// screen-space linear extrapolation along the same slope. A perfectly vertical segment (in
// screen space) has nothing to extend into on the X axis, so it's returned unchanged. `direction`
// picks which edge(s) actually move — "left"/"right" only push the one endpoint on that side out
// to xMin/xMax respectively, leaving the other exactly where it was; "both" does what the
// original two-direction-only version always did.
export function extendSegmentToEdges(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  xMin: number,
  xMax: number,
  direction: "left" | "right" | "both" = "both"
): { x1: number; y1: number; x2: number; y2: number } {
  if (x1 === x2) return { x1, y1, x2, y2 };
  const slope = (y2 - y1) / (x2 - x1);
  const left = direction === "right" ? { x1, y1 } : { x1: xMin, y1: y1 + slope * (xMin - x1) };
  const right = direction === "left" ? { x2, y2 } : { x2: xMax, y2: y1 + slope * (xMax - x1) };
  return { ...left, ...right };
}

// A drawing's actual extend setting, folding in the "extended" tool's own implicit "both" for a
// drawing saved before the `extend` field existed (see TrendLineDrawing.extend's own doc for why
// it's independent of lineType instead of just always being "extended" vs. not).
export function effectiveExtendOf(dr: TrendLineDrawing): "none" | "left" | "right" | "both" {
  return dr.extend ?? (dr.lineType === "extended" ? "both" : "none");
}

// A pasted duplicate (see useDrawingState's own Ctrl+C/Ctrl+V) lands at *exactly* its source's own
// coordinates — invisible until dragged, with no way to tell a paste actually happened. Nudged up
// by 1% of its own reference price (y1) instead, the same delta applied uniformly across every one
// of its points (never scaled per-point) so a multi-point shape — channel, fibonacci, elliott —
// keeps its own relative geometry, just translated as a whole rather than distorted. Falls back to
// a tiny fixed nudge only when y1 is exactly 0 (1% of nothing is still nothing).
export function offsetDrawingUp(dr: TrendLineDrawing): TrendLineDrawing {
  const delta = Math.abs(dr.y1) * 0.01 || 0.01;
  return {
    ...dr,
    y1: round4(dr.y1 + delta),
    y2: round4(dr.y2 + delta),
    extraPoints: dr.extraPoints?.map((p) => ({ ...p, y: round4(p.y + delta) })),
  };
}

// Shared by "channel" and "disjointChannel": the 3rd click's own vertical distance from line 1
// (p1→p2) at that click's date — a constant applied uniformly to line 2 rather than a true
// perpendicular distance, the same simplification most trading platforms use for this tool.
export function channelOffsetFromClick(p1: DataPoint, p2: DataPoint, click: DataPoint, indexForDate: (d: Date) => number): number {
  const x1i = indexForDate(p1.x);
  const x2i = indexForDate(p2.x);
  const onLineY = x2i === x1i ? p1.y : p1.y + (p2.y - p1.y) * ((indexForDate(click.x) - x1i) / (x2i - x1i));
  return click.y - onLineY;
}
