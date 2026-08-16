import { useMemo, useRef, useState } from "react";
import type { Candle } from "./CandlestickChart";
import { computeSeasonality, type SeasonalityGranularity } from "./internal/seasonality";
import { LineAreaChart } from "./LineAreaChart";
import { Popover } from "../forms/Popover";
import { Checkbox } from "../forms/Checkbox";
import { DropdownPanel } from "../primitives/DropdownPanel";
import { ChevronLeftIcon, CalendarIcon, LayersIcon } from "../icons";
import { DEFAULT_MARGIN, TOOLS_RAIL_WIDTH } from "./candlestick/constants";
import "./charts-shared.css";

const GRANULARITY_OPTIONS: { value: SeasonalityGranularity; label: string }[] = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Année" },
];

// US presidential elections land every 4 years on the nose (1788, 1792, … 2024, 2028…) — no
// lookup table needed, just the one arithmetic fact.
const isUSPresidentialElectionYear = (year: number) => year % 4 === 0;

export interface SeasonalityViewProps {
  data: Candle[];
  /** Shown in the header, next to "— Saisonnalité" — same convention as the main chart's own
   *  symbol label. */
  symbol?: string;
  /** Returns to the regular (non-seasonality) chart body. */
  onBack: () => void;
  /** Same gate CandlestickChart's own header uses (`showHeader`) — without it there'd be no way
   *  back out of seasonality mode, so this only ever hides the header in the same edge case the
   *  main chart's own header would already be hidden in. Default true. */
  showHeader?: boolean;
  /** Fixed height in px for the chart area. Fills 100% of the container's width regardless. */
  height?: number;
  className?: string;
}

/**
 * Presentational half of the seasonality feature — `computeSeasonality` (see
 * `internal/seasonality.ts`) does the actual aggregation, kept entirely independent of this
 * component (and of React) so it can be tested, reused, or extended on its own. The header holds
 * just the back button and title, same as before; granularity and the years filter now live in
 * their own left-docked icon rail — same `TOOLS_RAIL_WIDTH`/visual convention as
 * `CandlestickChart`'s own drawing-tools rail — rather than crowding the header row, each opening
 * its own popover (`DropdownPanel` for years, since a multi-select with its own bulk actions
 * needs more than the plain option list a `Select` gives). The chart body itself renders through
 * `LineAreaChart` rather than a bespoke chart of its own — a seasonal path is just one more line
 * series once it's been computed, no reason to re-implement axes/zoom/hover for it — told to
 * match the main chart's own right-side price-axis convention (`yAxisOrientation="right"`,
 * `margin` reserving the same rail width on its own left edge) and to drop its own border
 * (`embedded`) since it's nested inside CandlestickChart's own bordered root.
 */
export function SeasonalityView({ data, symbol, onBack, showHeader = true, height = 380, className }: SeasonalityViewProps) {
  const [granularity, setGranularity] = useState<SeasonalityGranularity>("week");
  const availableYears = useMemo(() => Array.from(new Set(data.map((d) => d.date.getUTCFullYear()))).sort((a, b) => a - b), [data]);
  // Excluded, not included: unchecking a handful of years (an election year, a crash) out of a
  // long history is the common case — a whitelist would make every *other* year the odd one out.
  const [excludedYears, setExcludedYears] = useState<Set<number>>(new Set());
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const yearPickerAnchorRef = useRef<HTMLButtonElement>(null);
  const [granularityMenuOpen, setGranularityMenuOpen] = useState(false);
  const granularityAnchorRef = useRef<HTMLButtonElement>(null);

  const result = useMemo(() => computeSeasonality(data, granularity, excludedYears), [data, granularity, excludedYears]);
  const includedCount = availableYears.length - excludedYears.size;
  const currentGranularityLabel = GRANULARITY_OPTIONS.find((o) => o.value === granularity)?.label ?? "";

  function toggleYear(year: number) {
    setExcludedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  // Every footer preset works the same way: decide which years should end up *included*, then
  // exclude everything else — a plain re-derivation of `excludedYears` rather than toggling
  // individual years, so each preset always lands on the exact same result regardless of
  // whatever was selected before it.
  function includeOnly(predicate: (year: number) => boolean) {
    setExcludedYears(new Set(availableYears.filter((y) => !predicate(y))));
  }

  const yearsLabel = `${includedCount} année${includedCount > 1 ? "s" : ""}`;
  const recentYearsCount = Math.min(5, availableYears.length);
  const recentYearsCutoff = availableYears[availableYears.length - recentYearsCount];

  return (
    <div className={["lq-chart__seasonality", className].filter(Boolean).join(" ")}>
      {showHeader && (
        <div className="lq-chart__header">
          <button type="button" className="lq-chart__icon-button" onClick={onBack} aria-label="Retour au graphique">
            <ChevronLeftIcon size={14} />
          </button>
          <span className="lq-chart__symbol-info-name">{symbol ? `${symbol} — Saisonnalité` : "Saisonnalité"}</span>
        </div>
      )}

      <div style={{ position: "relative" }}>
        <div className="lq-chart__tools-rail" style={{ width: TOOLS_RAIL_WIDTH, height }}>
          <div className="lq-chart__tools-rail-items">
            <button
              ref={granularityAnchorRef}
              type="button"
              className={["lq-chart__icon-button", granularityMenuOpen && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
              onClick={() => setGranularityMenuOpen((o) => !o)}
              aria-label={`Granularité : ${currentGranularityLabel}`}
              title="Granularité de la saisonnalité"
            >
              <CalendarIcon size={14} />
            </button>
            <Popover open={granularityMenuOpen} onClose={() => setGranularityMenuOpen(false)} anchorRef={granularityAnchorRef} placement="bottom">
              <div className="lq-chart__tool-menu">
                {GRANULARITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={["lq-chart__tool-menu-option", opt.value === granularity && "lq-chart__tool-menu-option--selected"]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      setGranularity(opt.value);
                      setGranularityMenuOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Popover>

            <button
              ref={yearPickerAnchorRef}
              type="button"
              className={["lq-chart__icon-button", yearPickerOpen && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
              onClick={() => setYearPickerOpen((o) => !o)}
              aria-label={`Années incluses : ${yearsLabel}`}
              title="Années incluses dans le calcul"
            >
              <LayersIcon size={14} />
            </button>
            <DropdownPanel
              open={yearPickerOpen}
              onClose={() => setYearPickerOpen(false)}
              anchorRef={yearPickerAnchorRef}
              placement="bottom"
              header={
                <div className="lq-dropdown-panel__header-row">
                  <span>Années incluses</span>
                  <span className="lq-dropdown-panel__header-count">{yearsLabel}</span>
                </div>
              }
              footer={
                <>
                  <button type="button" className="lq-dropdown-panel__footer-action" onClick={() => setExcludedYears(new Set())}>
                    Tout cocher
                  </button>
                  <button
                    type="button"
                    className="lq-dropdown-panel__footer-action"
                    onClick={() => setExcludedYears(new Set(availableYears))}
                  >
                    Tout décocher
                  </button>
                  <button
                    type="button"
                    className="lq-dropdown-panel__footer-action"
                    onClick={() => includeOnly(isUSPresidentialElectionYear)}
                    title="Ne garder que les années d'élection présidentielle américaine (1988, 1992, 1996…)"
                  >
                    Années d'élection (US)
                  </button>
                  {recentYearsCount < availableYears.length && (
                    <button
                      type="button"
                      className="lq-dropdown-panel__footer-action"
                      onClick={() => includeOnly((y) => y >= recentYearsCutoff)}
                    >
                      {recentYearsCount} dernières années
                    </button>
                  )}
                </>
              }
            >
              {availableYears.map((year) => (
                <Checkbox key={year} checked={!excludedYears.has(year)} onChange={() => toggleYear(year)} label={String(year)} />
              ))}
            </DropdownPanel>
          </div>
        </div>

        {result.buckets.length === 0 ? (
          <div className="lq-chart__empty" style={{ paddingLeft: TOOLS_RAIL_WIDTH }}>
            Pas assez de données pour calculer une saisonnalité.
          </div>
        ) : result.buckets.length === 1 ? (
          // "Année" granularity: a single bucket (the whole year's own return) reads better as
          // one big number than as a one-point "chart" — LineAreaChart needs at least two points
          // along its own x-domain to draw anything meaningful.
          <div className="lq-chart__seasonality-summary" style={{ height, paddingLeft: TOOLS_RAIL_WIDTH }}>
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
            yAxisOrientation="right"
            embedded
            margin={{ ...DEFAULT_MARGIN, left: TOOLS_RAIL_WIDTH }}
            height={height}
          />
        )}
      </div>
    </div>
  );
}
