import type { ChartPoint } from "../LineAreaChart";

function interpolateX(x1: Date | number, x2: Date | number, t: number): Date | number {
  if (x1 instanceof Date && x2 instanceof Date) return new Date(x1.getTime() + (x2.getTime() - x1.getTime()) * t);
  return (x1 as number) + ((x2 as number) - (x1 as number)) * t;
}

export interface ReferenceFillSegment {
  positive: boolean;
  points: ChartPoint[];
}

/** Splits `data` into contiguous runs all on the same side of `reference` (e.g. a series' own
 *  0% reference line) — wherever the line actually crosses it, an exact linearly-interpolated
 *  point is inserted and shared by both the outgoing and incoming segment, so the two segments'
 *  own area fills always meet exactly with no gap or overlap. Segments are meant to be rendered
 *  with `curveLinear` (not the line's own `curveMonotoneX`) — splitting a monotone curve into
 *  independent pieces would lose the neighboring-point context that curve needs to shape itself,
 *  producing visible kinks right at the split; a straight-line fill is a close enough
 *  approximation of "which side of the reference the curve is on" for a background fill. */
export function splitAtReference(data: ChartPoint[], reference: number): ReferenceFillSegment[] {
  if (data.length === 0) return [];
  const segments: ReferenceFillSegment[] = [];
  let current: ChartPoint[] = [data[0]];
  let currentPositive = data[0].y >= reference;
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const point = data[i];
    const pointPositive = point.y >= reference;
    if (pointPositive !== currentPositive && prev.y !== point.y) {
      const t = (reference - prev.y) / (point.y - prev.y);
      const crossPoint: ChartPoint = { x: interpolateX(prev.x, point.x, t), y: reference };
      current.push(crossPoint);
      segments.push({ positive: currentPositive, points: current });
      current = [crossPoint, point];
      currentPositive = pointPositive;
    } else {
      current.push(point);
    }
  }
  segments.push({ positive: currentPositive, points: current });
  return segments;
}

export interface BetweenFillPoint {
  x: Date | number;
  yA: number;
  yB: number;
}

export interface BetweenFillSegment {
  aAbove: boolean;
  points: BetweenFillPoint[];
}

/** Same idea as `splitAtReference`, comparing two series against each other instead of a fixed
 *  reference value — segments split wherever which one is on top changes, again sharing an exact
 *  interpolated crossing point between adjacent segments. Only defined over x-values present in
 *  *both* input arrays (exact match on `+x`, not interpolated across a mismatched grid) — the one
 *  caller today (SeasonalityView's average/current-year pair) already shares the same bucket-index
 *  grid, so this doesn't need to solve the harder general "compare two arbitrary series" problem. */
export function splitBetweenSeries(dataA: ChartPoint[], dataB: ChartPoint[]): BetweenFillSegment[] {
  const bByX = new Map<number, number>();
  for (const p of dataB) bByX.set(+p.x, p.y);
  const shared: BetweenFillPoint[] = [];
  for (const p of dataA) {
    const yB = bByX.get(+p.x);
    if (yB !== undefined) shared.push({ x: p.x, yA: p.y, yB });
  }
  if (shared.length === 0) return [];
  const segments: BetweenFillSegment[] = [];
  let current: BetweenFillPoint[] = [shared[0]];
  let currentAbove = shared[0].yA >= shared[0].yB;
  for (let i = 1; i < shared.length; i++) {
    const prev = shared[i - 1];
    const point = shared[i];
    const pointAbove = point.yA >= point.yB;
    if (pointAbove !== currentAbove) {
      const prevDiff = prev.yA - prev.yB;
      const pointDiff = point.yA - point.yB;
      const t = prevDiff / (prevDiff - pointDiff);
      const crossY = prev.yA + (point.yA - prev.yA) * t;
      const crossPoint: BetweenFillPoint = { x: interpolateX(prev.x, point.x, t), yA: crossY, yB: crossY };
      current.push(crossPoint);
      segments.push({ aAbove: currentAbove, points: current });
      current = [crossPoint, point];
      currentAbove = pointAbove;
    } else {
      current.push(point);
    }
  }
  segments.push({ aAbove: currentAbove, points: current });
  return segments;
}
