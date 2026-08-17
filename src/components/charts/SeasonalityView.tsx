import { useMemo, useRef, useState } from "react";
import type { Candle } from "./CandlestickChart";
import { computeSeasonality, type SeasonalityGranularity, type SeasonalityBucket } from "./internal/seasonality";
import { LineAreaChart, type LineAreaChartHandle, type ChartSeries, type ChartPoint } from "./LineAreaChart";
import { Popover } from "../forms/Popover";
import { Checkbox } from "../forms/Checkbox";
import { DropdownPanel } from "../primitives/DropdownPanel";
import { Modal } from "../primitives/Modal";
import { ChevronLeftIcon, CalendarIcon, DisjointChannelIcon, ActivityIcon, EyeIcon, EyeOffIcon, SettingsIcon, TrashIcon } from "../icons";
import { DEFAULT_MARGIN, TOOLS_RAIL_WIDTH } from "./candlestick/constants";
import "./charts-shared.css";

const GRANULARITY_OPTIONS: { value: SeasonalityGranularity; label: string }[] = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Année" },
];

// One letter per granularity, shown on the rail button in place of a generic calendar glyph so
// the button reads its own current value at a glance (same idea as a toggle button showing its
// own state) — spelled out here rather than derived from GRANULARITY_OPTIONS' own French label
// (its first letter) so a future label wording change can't silently change the letter too.
const GRANULARITY_LETTERS: Record<SeasonalityGranularity, string> = { week: "S", month: "M", quarter: "T", year: "A" };

// US presidential elections land every 4 years on the nose (1788, 1792, … 2024, 2028…) — no
// lookup table needed, just the one arithmetic fact.
const isUSPresidentialElectionYear = (year: number) => year % 4 === 0;

// A dedicated pastel palette for year lines — not indicators.ts's own INDICATOR_COLORS (sharper,
// built for a single indicator line standing alone against the price series), since several
// pastel lines sharing one small chart read as a *set* without any one of them fighting for
// attention — only the current year (drawn thicker, see `series` below) is meant to stand out.
// Literal hex, not a CSS var: a native `<input type="color">` can't open on a `var()` reference.
const YEAR_PASTEL_COLORS = ["#a8c3e8", "#a8d8b8", "#f0c99a", "#e8b4c8", "#c9b8e8", "#9ed9d3"];

/** A single letter rendered through the same 24x24/currentColor convention every other icon in
 *  this library follows (see IconBase) — filled text instead of a stroked glyph, since there's no
 *  static-path precedent for dynamic per-instance content in the shared icon catalog. Kept local
 *  to this file rather than added to icons.tsx: every entry there is a fixed SVG shape with no
 *  props of its own, and a parameterized "draw this exact letter" component doesn't fit that
 *  pattern. */
function LetterIcon({ letter, size = 24 }: { letter: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <text x="12" y="17" textAnchor="middle" fontSize="15" fontWeight="700">
        {letter}
      </text>
    </svg>
  );
}

/** One year's own occurrence value at every bucket it has data for — gaps (a bucket that year
 *  never reached, e.g. an in-progress current year past "today") are simply omitted rather than
 *  interpolated or zeroed, so the resulting line stops exactly where that year's own data does. */
function occurrencesForYear(buckets: SeasonalityBucket[], year: number): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const bucket of buckets) {
    const occurrence = bucket.occurrences.find((o) => o.year === year);
    if (occurrence) points.push({ x: bucket.index, y: occurrence.value });
  }
  return points;
}

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
  const [granularity, setGranularity] = useState<SeasonalityGranularity>("month");
  const availableYears = useMemo(() => Array.from(new Set(data.map((d) => d.date.getUTCFullYear()))).sort((a, b) => a - b), [data]);
  // Excluded, not included: unchecking a handful of years (an election year, a crash) out of a
  // long history is the common case — a whitelist would make every *other* year the odd one out.
  const [excludedYears, setExcludedYears] = useState<Set<number>>(new Set());
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const yearPickerAnchorRef = useRef<HTMLButtonElement>(null);
  const [granularityMenuOpen, setGranularityMenuOpen] = useState(false);
  const granularityAnchorRef = useRef<HTMLButtonElement>(null);
  // The chart's own built-in reset button (`LineAreaChart`'s `showZoomReset`) is hidden in favor
  // of this one, rendered in the header instead — same spot the main (non-seasonality) chart's
  // own "Réinitialiser le zoom" lives, rather than floating over the plot's own top-right corner
  // (where LineAreaChart's default toolbar sits, fine standalone but visually stranded once this
  // rail/header layout wraps around it).
  const lineChartRef = useRef<LineAreaChartHandle>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  // Overlays the current (in-progress) year's own line on top of the average — only meaningful in
  // the default "average" view, since `independentYears` below already shows every included year
  // (current one included) as its own line. Mutually exclusive with `independentYears` (see the
  // two toggle functions below) — both stay visible regardless of which is active, rather than
  // one hiding the other, so switching between the two view modes never requires first hunting
  // down whichever button turns the current one off.
  const [showCurrentYear, setShowCurrentYear] = useState(false);
  // Replaces the single averaged line with one line per included year (see image the user
  // attached: several thin past-year lines plus a thicker current-year one ending in a dot where
  // its data currently stops) instead of collapsing them into `average`.
  const [independentYears, setIndependentYears] = useState(false);

  function toggleIndependentYears() {
    setIndependentYears((v) => {
      const next = !v;
      if (next) setShowCurrentYear(false);
      return next;
    });
  }

  function toggleShowCurrentYear() {
    setShowCurrentYear((v) => {
      const next = !v;
      if (next) setIndependentYears(false);
      return next;
    });
  }
  // Per-year display state for whichever years currently render as their own line (see
  // managedYears below) — deliberately separate from `excludedYears` above: that one decides what
  // feeds the *average*, this one only ever hides/recolors an already-individual line, and the two
  // shouldn't fight over the same checkbox. A year hidden this way, then later dropped out of
  // `result.years` entirely (e.g. via `excludedYears`), just leaves an inert, harmless entry here.
  const [hiddenYears, setHiddenYears] = useState<Set<number>>(new Set());
  const [yearColors, setYearColors] = useState<Record<number, string>>({});
  // Which year's own settings modal (currently just a color picker) is open — null when none is.
  const [colorModalYear, setColorModalYear] = useState<number | null>(null);

  const result = useMemo(() => computeSeasonality(data, granularity, excludedYears), [data, granularity, excludedYears]);
  const includedCount = availableYears.length - excludedYears.size;
  const currentGranularityLabel = GRANULARITY_OPTIONS.find((o) => o.value === granularity)?.label ?? "";
  const currentYear = new Date().getUTCFullYear();
  const hasCurrentYear = result.years.includes(currentYear);

  // A year's own line color: a caller override if one was ever set via the "Années affichées"
  // list, else a slot in YEAR_PASTEL_COLORS above — a literal hex palette (a native
  // `<input type="color">` can't open on a `var(--lq-color-x)` reference as its own `value`, so
  // this can't reuse CHART_PALETTE's CSS-var-based colors the way most of this library's
  // categorical color-cycling does). Slot 0 (pastel blue, nowhere near the plain "average" line's
  // own accent) is reserved for the lone current-year overlay so the two can never coincide;
  // `fallbackIndex` is otherwise the caller's choice of which slot — a year's own position among
  // every included year, for independentYears.
  function colorForYear(year: number, fallbackIndex: number): string {
    return yearColors[year] ?? YEAR_PASTEL_COLORS[((fallbackIndex % YEAR_PASTEL_COLORS.length) + YEAR_PASTEL_COLORS.length) % YEAR_PASTEL_COLORS.length];
  }

  // The single source of truth for "which color does this year's line actually render in right
  // now" — independentYears cycles every included year through the palette by its own position,
  // otherwise there's only ever the lone current-year overlay, pinned to slot 0. Used both to
  // build `series` below and to color the "Années affichées" list's own swatches, so the two can
  // never drift apart the way two separately-inlined copies of this same branch just did.
  function displayColorForYear(year: number): string {
    return independentYears ? colorForYear(year, result.years.indexOf(year)) : colorForYear(year, 0);
  }

  // Whichever years currently render as their own individual line — exactly the set the "Années
  // affichées" list below manages — regardless of `hiddenYears` (a hidden year stays listed, with
  // its own eye toggled off, so it can be brought back).
  const managedYears: number[] = independentYears ? result.years : showCurrentYear && hasCurrentYear ? [currentYear] : [];

  const series: ChartSeries[] = independentYears
    ? result.years
        .filter((year) => !hiddenYears.has(year))
        .map((year) => ({
          id: `year-${year}`,
          label: String(year),
          color: displayColorForYear(year),
          data: occurrencesForYear(result.buckets, year),
          strokeWidth: year === currentYear ? 3 : 1.5,
          endDot: year === currentYear,
        }))
    : [
        {
          id: "seasonality",
          label: `Moyenne (${result.years.length} année${result.years.length > 1 ? "s" : ""})`,
          data: result.buckets.map((b) => ({ x: b.index, y: b.average })),
        },
        ...(showCurrentYear && hasCurrentYear && !hiddenYears.has(currentYear)
          ? [
              {
                id: `year-${currentYear}`,
                label: `${currentYear} (en cours)`,
                color: displayColorForYear(currentYear),
                data: occurrencesForYear(result.buckets, currentYear),
                strokeWidth: 3,
                endDot: true,
              },
            ]
          : []),
      ];

  function toggleHiddenYear(year: number) {
    setHiddenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  function toggleYear(year: number) {
    setExcludedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  // The years panel's own trash action — unlike toggleHiddenYear (a soft, reversible show/hide),
  // this drops the year from `excludedYears` itself, the same set "Années incluses" own checkbox
  // list manages — so it stops contributing to the average too, not just its own individual line,
  // and its row here simply stops existing on the next render (managedYears is derived from
  // result.years, which this shrinks) rather than needing its own "removed" state to track.
  function removeYear(year: number) {
    setExcludedYears((prev) => new Set(prev).add(year));
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
          {/* Gated on the chart branch too, not just `isZoomed` — switching to "Année" granularity
              (the single-bucket summary below, no LineAreaChart at all) unmounts the chart without
              a chance to report itself back to `isZoomed=false`, which would otherwise leave a
              dead button in the header with nothing left for it to reset. */}
          {isZoomed && result.buckets.length > 1 && (
            <button type="button" className="lq-chart__reset-button" onClick={() => lineChartRef.current?.resetZoom()}>
              Réinitialiser le zoom
            </button>
          )}
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
              <LetterIcon letter={GRANULARITY_LETTERS[granularity]} size={14} />
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
              <CalendarIcon size={14} />
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

            <button
              type="button"
              className={["lq-chart__icon-button", independentYears && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
              onClick={toggleIndependentYears}
              aria-pressed={independentYears}
              aria-label={independentYears ? "Revenir à la courbe moyenne" : "Afficher chaque année indépendamment"}
              title="Afficher chaque année incluse comme sa propre courbe, plutôt qu'une seule moyenne"
            >
              <DisjointChannelIcon size={14} />
            </button>
            {/* Stays visible regardless of `independentYears` (unlike before) — the two are
                mutually exclusive view modes now (see toggleIndependentYears/
                toggleShowCurrentYear), so this button switching the chart *out* of independent-
                years mode when clicked is itself the point, not something to hide behind. */}
            {hasCurrentYear && (
              <button
                type="button"
                className={["lq-chart__icon-button", showCurrentYear && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
                onClick={toggleShowCurrentYear}
                aria-pressed={showCurrentYear}
                aria-label={showCurrentYear ? "Masquer l'année en cours" : "Afficher l'année en cours"}
                title={`Superposer la performance de ${currentYear} (en cours) à la moyenne`}
              >
                <ActivityIcon size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Inline, always-on overlay (not a modal behind a rail button — that left it
            undiscoverable, see this file's own git history) for whichever years currently render
            as their own line. Floats over the plot's own top-left corner, right next to the
            rail, only while there's actually something to show. */}
        {/* Same look and interaction pattern as CandlestickChart's own price-overlay indicator
            legend (see ChartLegend.tsx / .lq-chart__indicator-legend in charts-shared.css) —
            plain colored text, no swatch/box/border, actions revealed on hover, double-click the
            label as a shortcut into the same settings modal the gear opens. Positioned inline
            (top/left) the same way ChartLegend's own wrapper is, since this file has no
            `dims.margin` of its own to read a position from. */}
        {managedYears.length > 0 && (
          <div className="lq-chart__indicator-legend" style={{ position: "absolute", top: 8, left: TOOLS_RAIL_WIDTH + 8, zIndex: 6 }}>
            {managedYears.map((year) => {
              const hidden = hiddenYears.has(year);
              const label = `${year}${year === currentYear ? " (en cours)" : ""}`;
              return (
                <div
                  key={year}
                  className="lq-chart__indicator-legend-item"
                  style={{ color: displayColorForYear(year) }}
                  onDoubleClick={() => setColorModalYear(year)}
                >
                  <span className={["lq-chart__indicator-legend-label", hidden && "lq-chart__indicator-legend-label--hidden"].filter(Boolean).join(" ")}>
                    {label}
                  </span>
                  <div className="lq-chart__indicator-legend-actions">
                    <button
                      type="button"
                      className="lq-chart__indicator-legend-action"
                      onClick={() => toggleHiddenYear(year)}
                      aria-label={hidden ? `Afficher ${label}` : `Masquer ${label}`}
                    >
                      {hidden ? <EyeOffIcon size={11} /> : <EyeIcon size={11} />}
                    </button>
                    <button
                      type="button"
                      className="lq-chart__indicator-legend-action"
                      onClick={() => removeYear(year)}
                      aria-label={`Supprimer ${label}`}
                    >
                      <TrashIcon size={11} />
                    </button>
                    <button
                      type="button"
                      className="lq-chart__indicator-legend-action"
                      onClick={() => setColorModalYear(year)}
                      aria-label={`Paramètres ${label}`}
                    >
                      <SettingsIcon size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
            ref={lineChartRef}
            series={series}
            xType="linear"
            formatX={(x) => result.buckets.find((b) => b.index === x)?.label ?? String(x)}
            formatY={(y) => `${Number(y) >= 0 ? "+" : ""}${Number(y).toFixed(1)}%`}
            axisHoverLabels
            // The floating years panel (see managedYears, above the chart in this file's own
            // JSX) already covers "which color is which year" (plus hide/recolor/remove, which
            // the plain legend can't do) — showing both would be two separately-stateful ways to
            // hide the same line (LineAreaChart's own click-to-fade legend item vs. this file's
            // own `hiddenYears`), so the built-in legend stays off.
            showLegend={false}
            fullscreenToggle={false}
            yAxisOrientation="right"
            embedded
            referenceLineY={0}
            showZoomReset={false}
            onZoomChange={setIsZoomed}
            margin={{ ...DEFAULT_MARGIN, left: TOOLS_RAIL_WIDTH }}
            height={height}
          />
        )}
      </div>

      {colorModalYear !== null && (
        <Modal open onClose={() => setColorModalYear(null)} title={`Paramètres — ${colorModalYear}`} footer={null}>
          <div className="lq-field">
            <label className="lq-field__label">Couleur</label>
            <input
              type="color"
              className="lq-chart__color-input"
              value={displayColorForYear(colorModalYear)}
              onChange={(e) => setYearColors((prev) => ({ ...prev, [colorModalYear]: e.target.value }))}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
