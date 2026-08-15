import { useMemo, useRef, useState } from "react";
import type { Candle } from "./CandlestickChart";
import { computeSeasonality, type SeasonalityGranularity } from "./internal/seasonality";
import { LineAreaChart } from "./LineAreaChart";
import { Select } from "../forms/Select";
import { Popover } from "../forms/Popover";
import { Checkbox } from "../forms/Checkbox";
import { ChevronDownIcon } from "../icons";
import "./charts-shared.css";

const GRANULARITY_OPTIONS: { value: SeasonalityGranularity; label: string }[] = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Année" },
];

export interface SeasonalityViewProps {
  data: Candle[];
  /** Fixed height in px for the chart area (controls stack above it, adding a little of their
   *  own). Fills 100% of the container's width regardless. */
  height?: number;
  className?: string;
}

/**
 * Presentational half of the seasonality feature — `computeSeasonality` (see
 * `internal/seasonality.ts`) does the actual aggregation, kept entirely independent of this
 * component (and of React) so it can be tested, reused, or extended on its own. This component
 * owns only its own controls (granularity, year include/exclude) and renders the result through
 * `LineAreaChart` rather than a bespoke chart of its own — a seasonal path is just one more line
 * series once it's been computed, no reason to re-implement axes/zoom/hover for it.
 */
export function SeasonalityView({ data, height = 380, className }: SeasonalityViewProps) {
  const [granularity, setGranularity] = useState<SeasonalityGranularity>("week");
  const availableYears = useMemo(() => Array.from(new Set(data.map((d) => d.date.getUTCFullYear()))).sort((a, b) => a - b), [data]);
  // Excluded, not included: unchecking a handful of years (an election year, a crash) out of a
  // long history is the common case — a whitelist would make every *other* year the odd one out.
  const [excludedYears, setExcludedYears] = useState<Set<number>>(new Set());
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const yearPickerAnchorRef = useRef<HTMLButtonElement>(null);

  const result = useMemo(() => computeSeasonality(data, granularity, excludedYears), [data, granularity, excludedYears]);
  const includedCount = availableYears.length - excludedYears.size;

  function toggleYear(year: number) {
    setExcludedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  const yearsLabel = `${includedCount} année${includedCount > 1 ? "s" : ""}`;

  return (
    <div className={["lq-chart__seasonality", className].filter(Boolean).join(" ")}>
      <div className="lq-chart__seasonality-controls">
        <Select
          value={granularity}
          onChange={(v) => setGranularity(v as SeasonalityGranularity)}
          options={GRANULARITY_OPTIONS}
          ariaLabel="Granularité de la saisonnalité"
        />
        <button
          ref={yearPickerAnchorRef}
          type="button"
          className="lq-chart__timeframe-trigger"
          onClick={() => setYearPickerOpen((o) => !o)}
          aria-label={`Années incluses : ${yearsLabel}`}
        >
          {yearsLabel}
          <ChevronDownIcon size={12} />
        </button>
        <Popover open={yearPickerOpen} onClose={() => setYearPickerOpen(false)} anchorRef={yearPickerAnchorRef} placement="bottom">
          <div className="lq-chart__seasonality-year-picker">
            {availableYears.map((year) => (
              <Checkbox key={year} checked={!excludedYears.has(year)} onChange={() => toggleYear(year)} label={String(year)} />
            ))}
          </div>
        </Popover>
      </div>

      {result.buckets.length === 0 ? (
        <div className="lq-chart__empty">Pas assez de données pour calculer une saisonnalité.</div>
      ) : result.buckets.length === 1 ? (
        // "Année" granularity: a single bucket (the whole year's own return) reads better as one
        // big number than as a one-point "chart" — LineAreaChart needs at least two points along
        // its own x-domain to draw anything meaningful.
        <div className="lq-chart__seasonality-summary" style={{ height }}>
          <span
            className="lq-chart__seasonality-summary-value"
            style={{ color: `var(${result.buckets[0].average >= 0 ? "--lq-color-up" : "--lq-color-down"})` }}
          >
            {result.buckets[0].average >= 0 ? "+" : ""}
            {result.buckets[0].average.toFixed(1)}%
          </span>
          <span className="lq-chart__seasonality-summary-label">
            Performance moyenne sur l'année — {result.years.length} occurrence{result.years.length > 1 ? "s" : ""} (
            {result.years.join(", ")})
          </span>
        </div>
      ) : (
        <LineAreaChart
          series={[
            {
              id: "seasonality",
              label: `Moyenne (${result.years.length} année${result.years.length > 1 ? "s" : ""})`,
              data: result.buckets.map((b) => ({ x: b.index, y: b.average })),
            },
          ]}
          xType="linear"
          formatX={(x) => result.buckets.find((b) => b.index === x)?.label ?? String(x)}
          formatY={(y) => `${Number(y) >= 0 ? "+" : ""}${Number(y).toFixed(1)}%`}
          showLegend={false}
          fullscreenToggle={false}
          height={height}
        />
      )}
    </div>
  );
}
