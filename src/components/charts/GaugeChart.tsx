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
  className?: string;
}

const START_ANGLE = -Math.PI / 2;
const END_ANGLE = Math.PI / 2;

export function GaugeChart({
  value,
  min = 0,
  max = 100,
  size = 220,
  label,
  formatValue,
  thresholds,
  className,
}: GaugeChartProps) {
  const width = size;
  const height = size / 2 + 24;
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
