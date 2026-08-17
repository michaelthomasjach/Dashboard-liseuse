import { useMemo } from "react";
import * as d3 from "d3";
import "./GaugeChart.css";

export interface GaugeThreshold {
  /** Upper bound of this band, in the same units as `value`. */
  upTo: number;
  color: string;
  label?: string;
}

export interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  size?: number;
  label?: string;
  formatValue?: (value: number) => string;
  /** Color bands drawn as the track, e.g. [{upTo:33,color:'var(--lq-color-down)'}, {upTo:66,color:'var(--lq-color-warning)'}, {upTo:100,color:'var(--lq-color-up)'}]. */
  thresholds?: GaugeThreshold[];
  /** Draws each threshold's own `label` (see GaugeThreshold — declared for exactly this, unused
   *  until now) just outside the arc, at that band's own angular midpoint — e.g. "Vente forte" /
   *  "Vente" / "Neutre" / "Achat" / "Achat fort" around a 5-band analyst-rating gauge. A band with
   *  no `label` simply gets no text. Ignored without `thresholds` (there's no band to label a
   *  midpoint of). Default false. Reserves extra room around the arc itself (see LABEL_MARGIN/
   *  LABEL_TOP_MARGIN below) so the outermost labels don't clip the SVG's own edge — the arc stays
   *  exactly `size` wide either way, only the surrounding canvas grows. */
  showBandLabels?: boolean;
  className?: string;
}

const START_ANGLE = -Math.PI / 2;
const END_ANGLE = Math.PI / 2;
// Extra canvas reserved around the arc when showBandLabels is on: sideways for the two outermost
// labels (anchored to grow further outward, away from the arc, via text-anchor "end"/"start" —
// see anchorForAngle), and above for the topmost one (anchored "middle", growing both ways from
// straight up).
const LABEL_SIDE_MARGIN = 78;
const LABEL_TOP_MARGIN = 26;
const LABEL_RADIUS_GAP = 14;

// A label's own text-anchor, chosen by its angle so it grows *away* from the arc (out into the
// margin reserved for it) rather than back over the colored band itself: past ±15° off top-center
// it anchors to its far end so the text trails outward, dead-center keeps it centered over the
// topmost point.
function anchorForAngle(angle: number): "start" | "middle" | "end" {
  const deg = (angle * 180) / Math.PI;
  if (deg < -15) return "end";
  if (deg > 15) return "start";
  return "middle";
}

export function GaugeChart({
  value,
  min = 0,
  max = 100,
  size = 220,
  label,
  formatValue,
  thresholds,
  showBandLabels = false,
  className,
}: GaugeChartProps) {
  const hasBandLabels = showBandLabels && !!thresholds?.length;
  const width = size + (hasBandLabels ? LABEL_SIDE_MARGIN * 2 : 0);
  const height = size / 2 + 24 + (hasBandLabels ? LABEL_TOP_MARGIN : 0);
  const radius = size / 2 - 8;
  const cx = width / 2;
  const cy = height - 16;

  const angleScale = useMemo(() => d3.scaleLinear().domain([min, max]).range([START_ANGLE, END_ANGLE]).clamp(true), [min, max]);

  const trackArc = d3
    .arc()
    .innerRadius(radius - 16)
    .outerRadius(radius)
    .startAngle(START_ANGLE)
    .endAngle(END_ANGLE);

  const valueAngle = angleScale(value);
  const valueArc = d3
    .arc()
    .innerRadius(radius - 16)
    .outerRadius(radius)
    .startAngle(START_ANGLE)
    .endAngle(valueAngle);

  const needleAngleDeg = (valueAngle * 180) / Math.PI;

  const bands = thresholds?.map((t, i) => {
    const prevUpTo = i === 0 ? min : thresholds[i - 1].upTo;
    return {
      ...t,
      startAngle: angleScale(prevUpTo),
      endAngle: angleScale(t.upTo),
    };
  });

  return (
    <div className={["lq-gauge-chart", className].filter(Boolean).join(" ")} style={{ width }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        <g transform={`translate(${cx}, ${cy})`}>
          {bands ? (
            bands.map((b, i) => (
              <path
                key={i}
                d={
                  d3
                    .arc()
                    .innerRadius(radius - 16)
                    .outerRadius(radius)
                    .startAngle(b.startAngle)
                    .endAngle(b.endAngle)({} as never) ?? undefined
                }
                fill={b.color}
              />
            ))
          ) : (
            <path d={trackArc({} as never) ?? undefined} className="lq-gauge-chart__track" />
          )}
          {!bands && <path d={valueArc({} as never) ?? undefined} className="lq-gauge-chart__value" />}
          {hasBandLabels &&
            bands?.map(
              (b, i) =>
                b.label && (
                  <text
                    key={i}
                    className="lq-gauge-chart__band-label"
                    x={(radius + LABEL_RADIUS_GAP) * Math.sin((b.startAngle + b.endAngle) / 2)}
                    y={-(radius + LABEL_RADIUS_GAP) * Math.cos((b.startAngle + b.endAngle) / 2)}
                    textAnchor={anchorForAngle((b.startAngle + b.endAngle) / 2)}
                    dominantBaseline="central"
                  >
                    {b.label}
                  </text>
                )
            )}
          <line
            className="lq-gauge-chart__needle"
            x1={0}
            y1={0}
            x2={0}
            y2={-(radius - 6)}
            transform={`rotate(${needleAngleDeg})`}
          />
          <circle className="lq-gauge-chart__pivot" r={5} />
        </g>
      </svg>
      <div className="lq-gauge-chart__readout">
        <span className="lq-gauge-chart__value-text">{formatValue ? formatValue(value) : value}</span>
        {label && <span className="lq-gauge-chart__label">{label}</span>}
      </div>
    </div>
  );
}
