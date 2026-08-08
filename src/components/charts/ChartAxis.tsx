import { useEffect, useRef } from "react";
import * as d3 from "d3";
import "./ChartAxis.css";

export interface ChartAxisProps<Domain extends d3.AxisDomain = d3.AxisDomain> {
  scale: d3.AxisScale<Domain>;
  orientation: "bottom" | "left" | "right";
  transform?: string;
  ticks?: number;
  tickFormat?: (value: Domain, index: number) => string;
  /** Explicit tick positions, e.g. one per visible bar on an index-based categorical axis.
   *  Overrides the automatic `ticks` count when provided. */
  tickValues?: Domain[];
  tickSizeOuter?: number;
  grid?: boolean;
  /** Length of grid lines (usually the plot's bounded width/height). Required when `grid` is true. */
  gridLength?: number;
}

/**
 * Thin React wrapper around d3-axis: d3 owns the tick DOM inside a single
 * `<g>`, React owns everything else. This is the one place components in
 * this file "hand off" to imperative D3, which is the idiomatic way to mix
 * the two without them fighting over the same nodes.
 */
export function ChartAxis<Domain extends d3.AxisDomain = d3.AxisDomain>({
  scale,
  orientation,
  transform,
  ticks = 5,
  tickFormat,
  tickValues,
  tickSizeOuter = 0,
  grid = false,
  gridLength = 0,
}: ChartAxisProps<Domain>) {
  const ref = useRef<SVGGElement>(null);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;

    const axis =
      orientation === "bottom" ? d3.axisBottom<Domain>(scale) : orientation === "right" ? d3.axisRight<Domain>(scale) : d3.axisLeft<Domain>(scale);
    if (tickValues) axis.tickValues(tickValues);
    else axis.ticks(ticks);
    axis.tickSizeOuter(tickSizeOuter);
    if (tickFormat) axis.tickFormat(tickFormat);
    if (grid) axis.tickSizeInner(-gridLength);

    const selection = d3.select(g);
    selection.call(axis);
    selection.select(".domain").attr("class", "lq-chart-axis__domain");
    selection.selectAll(".tick line").attr("class", grid ? "lq-chart-axis__grid-line" : "lq-chart-axis__tick-line");
    selection.selectAll(".tick text").attr("class", "lq-chart-axis__label");
  });

  return <g ref={ref} className="lq-chart-axis" transform={transform} />;
}
