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

    // A label is centered on its tick, so it can visually spill past the axis's own valid
    // range even while the tick itself stays inside it — most obviously the first/last tick,
    // sitting right at the domain's edge, whose label extends half its width/height past that
    // edge. Hide any label whose own rendered extent falls outside `scale.range()` (converted
    // to screen space via the axis group's CTM, since the range is expressed in the group's
    // local coordinates). Judged purely against the axis's own bounds, tick by tick — not
    // against neighboring labels: an earlier version hid labels based on collisions with their
    // neighbors, which made hiding order-dependent and could hide labels that weren't actually
    // overflowing anything.
    const svg = g.ownerSVGElement;
    const ctm = g.getScreenCTM();
    if (svg && ctm) {
      const horizontal = orientation === "bottom";
      const [r0, r1] = scale.range() as unknown as [number, number];
      const p1 = svg.createSVGPoint();
      const p2 = svg.createSVGPoint();
      if (horizontal) {
        p1.x = r0;
        p1.y = 0;
        p2.x = r1;
        p2.y = 0;
      } else {
        p1.x = 0;
        p1.y = r0;
        p2.x = 0;
        p2.y = r1;
      }
      const s1 = p1.matrixTransform(ctm);
      const s2 = p2.matrixTransform(ctm);
      const zoneStart = horizontal ? Math.min(s1.x, s2.x) : Math.min(s1.y, s2.y);
      const zoneEnd = horizontal ? Math.max(s1.x, s2.x) : Math.max(s1.y, s2.y);

      selection.selectAll<SVGTextElement, unknown>(".tick text").each(function () {
        const rect = this.getBoundingClientRect();
        const start = horizontal ? rect.left : rect.top;
        const end = horizontal ? rect.right : rect.bottom;
        this.style.display = start < zoneStart || end > zoneEnd ? "none" : "";
      });
    }
  });

  return <g ref={ref} className="lq-chart-axis" transform={transform} />;
}
