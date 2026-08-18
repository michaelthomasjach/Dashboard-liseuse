import { extendSegmentToEdges } from "./drawingGeometry";

export type PitchforkVariant = "pitchfork" | "schiffPitchfork" | "modifiedSchiffPitchfork" | "insidePitchfork";

// Screen-space (pixel) points, like every other geometry helper here (drawingGeometry.ts's own
// forecastControlPoint, channelOffsetFromClick) — not DataPoint (Date-based), which has no
// meaningful "midpoint" of its own without first converting through a scale.
export interface ScreenPoint {
  x: number;
  y: number;
}

function midpoint(a: ScreenPoint, b: ScreenPoint): ScreenPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Where each pitchfork variant's own median line starts from and heads toward — P0 is the
 *  "handle" (the tool's 1st click), P1/P2 the two points defining the fork's own width (the two
 *  parallel "tine" lines pass through these, unchanged across every variant). Only the median's
 *  own start/target move: "pitchfork" (standard/Andrews') starts at P0 itself; "schiffPitchfork"
 *  moves the start 50% of the way from P0 toward P1 in *price only* (its own time/x stays at
 *  P0's — Schiff's own original modification); "modifiedSchiffPitchfork" moves that same 50% in
 *  *both* price and time (a plain 2D midpoint of P0-P1) — Dr. Andrews' own response to Schiff's
 *  variation, going one step further by moving the origin equally on both axes instead of price
 *  alone; "insidePitchfork" swaps the median's own start and target entirely, starting at the
 *  midpoint of P1-P2 and heading through P0 instead. */
export function pitchforkMedianEndpoints(p0: ScreenPoint, p1: ScreenPoint, p2: ScreenPoint, variant: PitchforkVariant): { start: ScreenPoint; target: ScreenPoint } {
  const mid12 = midpoint(p1, p2);
  switch (variant) {
    case "schiffPitchfork":
      return { start: { x: p0.x, y: midpoint(p0, p1).y }, target: mid12 };
    case "modifiedSchiffPitchfork":
      return { start: midpoint(p0, p1), target: mid12 };
    case "insidePitchfork":
      return { start: mid12, target: p0 };
    case "pitchfork":
    default:
      return { start: p0, target: mid12 };
  }
}

export interface PitchforkLines {
  median: { x1: number; y1: number; x2: number; y2: number };
  tine1: { x1: number; y1: number; x2: number; y2: number };
  tine2: { x1: number; y1: number; x2: number; y2: number };
}

/** The 3 actual on-screen lines for a pitchfork drawing — median (via pitchforkMedianEndpoints)
 *  plus the two tines through P1/P2, all extended to the plot's own left/right edges (xMin/xMax).
 *  The single source of truth both the renderer and hover/hit-testing build from, so hovering
 *  always matches exactly what's drawn instead of drifting out of sync with a second, hand-copied
 *  formula (same reasoning drawingGeometry.ts's own forecastCurvePoints already follows for the
 *  "forecast" tool's curve). */
export function pitchforkLines(p0: ScreenPoint, p1: ScreenPoint, p2: ScreenPoint, variant: PitchforkVariant, xMin: number, xMax: number): PitchforkLines {
  const { start, target } = pitchforkMedianEndpoints(p0, p1, p2, variant);
  const median = extendSegmentToEdges(start.x, start.y, target.x, target.y, xMin, xMax);
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  const tine1 = extendSegmentToEdges(p1.x, p1.y, p1.x + dx, p1.y + dy, xMin, xMax);
  const tine2 = extendSegmentToEdges(p2.x, p2.y, p2.x + dx, p2.y + dy, xMin, xMax);
  return { median, tine1, tine2 };
}
