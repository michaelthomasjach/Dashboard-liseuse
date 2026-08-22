import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as d3 from "d3";
import { CHART_PALETTE } from "./internal/palette";
import "./charts-shared.css";
import "./DonutChart.css";

export interface DonutDatum {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  data: DonutDatum[];
  size?: number;
  innerRadiusRatio?: number;
  formatValue?: (value: number) => string;
  showLegend?: boolean;
  className?: string;
  /** Overrides the center's own default (non-hovered) value/caption — e.g. a distinct-category
   *  count ("5" over "Types de symboles") instead of the sum of every slice's own value / "Total".
   *  Hovering a slice still shows that slice's own value/label as usual either way. */
  centerValue?: ReactNode;
  centerCaption?: string;
  /** Where the legend renders relative to the plot itself. Default "bottom". */
  legendPosition?: "bottom" | "left" | "right";
  /** "circle" (default): the usual round donut. "square": each slice's own outer edge follows a
   *  square frame instead of a circular arc (see `squareSlicePath`'s own doc) — same overall
   *  footprint either way (the square's own corners reach exactly as far as the circle's edge
   *  would have), just a different silhouette. The inner (hole) boundary stays circular in both. */
  shape?: "circle" | "square";
}

// Extra room reserved around the plot's own visual radius, purely so the *hovered* slice's own
// larger outerRadius (see ACTIVE_RADIUS_GROWTH below) still fits inside the SVG's own viewBox —
// an SVG clips anything drawn past its own bounds by default, and a plain `size`-by-`size` box
// left exactly zero slack for that growth, so hovering a slice near the plot's own edge visibly
// cut it off there instead of highlighting it.
const HOVER_PADDING = 6;
const ACTIVE_RADIUS_GROWTH = 4;
const SAMPLES_PER_SLICE = 20;

// A pie slice's own outer boundary, sampled at `angle` (d3's own "0 at 12 o'clock, clockwise, in
// radians" convention — the same one d3.arc's own startAngle/endAngle already use) — the distance
// from center to a square frame of half-width `halfSize` along that direction, so a slice's outer
// edge reads as a square instead of an arc once it reaches one. `dx`/`dy` are the ray's own unit
// direction in that same convention; the ray leaves the square exactly when either axis first
// reaches ±halfSize.
function squareRadiusAt(angle: number, halfSize: number): number {
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  return halfSize / Math.max(Math.abs(dx), Math.abs(dy), 1e-6);
}

// Builds one slice's own path for shape="square": the inner edge stays a plain circular arc (the
// donut hole reads the same regardless of shape), the outer edge follows squareRadiusAt sampled
// across the slice's own angular span instead of d3.arc's fixed-radius one. `cornerRadius` is the
// distance from center to the square's own *corner* (not its side) — dividing by √2 for the
// side's own half-length is what keeps a square slice's footprint identical to what the same
// value would occupy as a circle's outerRadius, corner included, rather than growing the whole
// plot every time this shape is picked. SAMPLES_PER_SLICE points is plenty for a frame with only
// 4 corners to resolve — a circular arc this coarse would look faceted, a square-bound edge
// doesn't need nearly as many.
function squareSlicePath(a: d3.PieArcDatum<DonutDatum>, innerRadius: number, cornerRadius: number): string {
  const halfSize = cornerRadius / Math.SQRT2;
  const point = (r: number, angle: number): [number, number] => [r * Math.sin(angle), -r * Math.cos(angle)];
  const outerPoints: [number, number][] = [];
  for (let i = 0; i <= SAMPLES_PER_SLICE; i++) {
    const angle = a.startAngle + ((a.endAngle - a.startAngle) * i) / SAMPLES_PER_SLICE;
    outerPoints.push(point(squareRadiusAt(angle, halfSize), angle));
  }
  const innerPoints: [number, number][] = [];
  for (let i = SAMPLES_PER_SLICE; i >= 0; i--) {
    const angle = a.startAngle + ((a.endAngle - a.startAngle) * i) / SAMPLES_PER_SLICE;
    innerPoints.push(point(innerRadius, angle));
  }
  const all = [...outerPoints, ...innerPoints];
  return `M${all.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join("L")}Z`;
}

/** Allocation / breakdown donut, e.g. portfolio composition by asset class. */
export function DonutChart({
  data,
  size = 220,
  innerRadiusRatio = 0.65,
  formatValue,
  showLegend = true,
  className,
  centerValue,
  centerCaption,
  legendPosition = "bottom",
  shape = "circle",
}: DonutChartProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const radius = size / 2;
  // The SVG itself is padded beyond the plot's own visual size (see HOVER_PADDING's own doc) —
  // every arc/path calculation below still works in the original `radius`-based coordinate space,
  // this only widens the *canvas* they're drawn onto and re-centers the origin within it.
  const svgSize = size + HOVER_PADDING * 2;
  const center = svgSize / 2;
  const total = d3.sum(data, (d) => d.value);

  const colorFor = (d: DonutDatum, i: number) => d.color ?? CHART_PALETTE[i % CHART_PALETTE.length];

  const arcs = useMemo(() => {
    const pie = d3
      .pie<DonutDatum>()
      .value((d) => d.value)
      .sort(null);
    return pie(data);
  }, [data]);

  const arcGen = d3
    .arc<d3.PieArcDatum<DonutDatum>>()
    .innerRadius(radius * innerRadiusRatio)
    .outerRadius(radius - 2);

  const arcGenActive = d3
    .arc<d3.PieArcDatum<DonutDatum>>()
    .innerRadius(radius * innerRadiusRatio)
    .outerRadius(radius + ACTIVE_RADIUS_GROWTH);

  function pathFor(a: d3.PieArcDatum<DonutDatum>, isActive: boolean): string | undefined {
    const outerRadius = isActive ? radius + ACTIVE_RADIUS_GROWTH : radius - 2;
    if (shape === "square") return squareSlicePath(a, radius * innerRadiusRatio, outerRadius);
    return (isActive ? arcGenActive(a) : arcGen(a)) ?? undefined;
  }

  if (data.length === 0 || total === 0) {
    return (
      <div className={["lq-chart", className].filter(Boolean).join(" ")} style={{ width: size, height: size }}>
        <div className="lq-chart__empty">Aucune donnée</div>
      </div>
    );
  }

  const active = data.find((d) => d.id === activeId);

  const legend = showLegend && (
    <div className="lq-chart__legend lq-donut-chart__legend">
      {data.map((d, i) => (
        <div
          key={d.id}
          className="lq-chart__legend-item"
          style={{ opacity: activeId && activeId !== d.id ? 0.5 : 1 }}
          onPointerEnter={() => setActiveId(d.id)}
          onPointerLeave={() => setActiveId(null)}
        >
          <span className="lq-chart__legend-swatch" style={{ backgroundColor: colorFor(d, i) }} />
          {d.label} · {((d.value / total) * 100).toFixed(0)}%
        </div>
      ))}
    </div>
  );

  return (
    <div className={["lq-donut-chart", `lq-donut-chart--legend-${legendPosition}`, className].filter(Boolean).join(" ")}>
      {legendPosition === "left" && legend}

      <div className="lq-donut-chart__plot" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} role="img">
          <g transform={`translate(${center}, ${center})`}>
            {arcs.map((a, i) => (
              <path
                key={a.data.id}
                d={pathFor(a, activeId === a.data.id)}
                fill={colorFor(a.data, i)}
                className="lq-donut-chart__slice"
                onPointerEnter={() => setActiveId(a.data.id)}
                onPointerLeave={() => setActiveId(null)}
              />
            ))}
          </g>
        </svg>
        <div className="lq-donut-chart__center">
          <span className="lq-donut-chart__center-value">
            {active
              ? formatValue
                ? formatValue(active.value)
                : active.value
              : (centerValue ?? (formatValue ? formatValue(total) : total))}
          </span>
          <span className="lq-donut-chart__center-label">{active ? active.label : (centerCaption ?? "Total")}</span>
        </div>
      </div>

      {(legendPosition === "bottom" || legendPosition === "right") && legend}
    </div>
  );
}
