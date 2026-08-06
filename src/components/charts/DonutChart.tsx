import { useMemo, useState } from "react";
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
}

/** Allocation / breakdown donut, e.g. portfolio composition by asset class. */
export function DonutChart({
  data,
  size = 220,
  innerRadiusRatio = 0.65,
  formatValue,
  showLegend = true,
  className,
}: DonutChartProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const radius = size / 2;
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
    .outerRadius(radius + 4);

  if (data.length === 0 || total === 0) {
    return (
      <div className={["lq-chart", className].filter(Boolean).join(" ")} style={{ width: size, height: size }}>
        <div className="lq-chart__empty">Aucune donnée</div>
      </div>
    );
  }

  const active = data.find((d) => d.id === activeId);

  return (
    <div className={["lq-donut-chart", className].filter(Boolean).join(" ")}>
      <div className="lq-donut-chart__plot" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
          <g transform={`translate(${radius}, ${radius})`}>
            {arcs.map((a, i) => (
              <path
                key={a.data.id}
                d={(activeId === a.data.id ? arcGenActive(a) : arcGen(a)) ?? undefined}
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
            {active ? (formatValue ? formatValue(active.value) : active.value) : formatValue ? formatValue(total) : total}
          </span>
          <span className="lq-donut-chart__center-label">{active ? active.label : "Total"}</span>
        </div>
      </div>

      {showLegend && (
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
      )}
    </div>
  );
}
