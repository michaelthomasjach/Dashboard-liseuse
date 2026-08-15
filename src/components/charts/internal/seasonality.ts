import type { Candle } from "../CandlestickChart";

/** How the reference year is sliced into buckets — never finer than a week (no "day" option):
 *  daily-resolution seasonality is mostly noise (weekday effects, holiday drift between years)
 *  without a lot of extra smoothing machinery this doesn't try to provide. */
export type SeasonalityGranularity = "week" | "month" | "quarter" | "year";

/** One year's own contribution to a bucket — kept around (not collapsed into just the average)
 *  so future features can be built as pure consumption of this same shape, without touching the
 *  engine's own traversal logic: dispersion bands and individual-occurrence overlays both just
 *  read this array directly, a weighted average re-weights it instead of `average`'s plain mean,
 *  and an automatic filter (e.g. dropping outlier years) can prune it before averaging. */
export interface SeasonalityOccurrence {
  year: number;
  /** % change from that year's own reference (its first available close, at or after Jan 1) to
   *  this bucket's own representative close (its last available one, at or before the bucket's
   *  end) — a cumulative "how far is the typical year at this point" reading, not a
   *  bucket-over-bucket delta. */
  value: number;
}

export interface SeasonalityBucket {
  /** 0-based position within the reference year — 0-51 for "week", 0-11 for "month", 0-3 for
   *  "quarter", always 0 for "year" (a single bucket covering the whole thing). */
  index: number;
  /** Display label, e.g. "Semaine 12", "Mars", "T2", "Année". */
  label: string;
  /** Plain arithmetic mean of `occurrences[].value` — deliberately not configurable (weighting is
   *  a listed future extension, see `SeasonalityOccurrence`'s own doc comment) so this stays a
   *  pure, obvious "average of what's there" today. */
  average: number;
  occurrences: SeasonalityOccurrence[];
}

export interface SeasonalityResult {
  granularity: SeasonalityGranularity;
  /** Only buckets at least one included year actually has data for — a bucket past the end of
   *  the current (incomplete) year, say, is simply absent rather than showing as a false zero. */
  buckets: SeasonalityBucket[];
  /** Years that contributed at least one occurrence, ascending — not necessarily every year
   *  present in `data`, since `excludedYears` can drop some and a year with no candles at all
   *  (shouldn't happen, but isn't assumed) contributes none either. */
  years: number[];
}

const WEEK_BUCKET_COUNT = 52;
const MONTH_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function bucketCountFor(granularity: SeasonalityGranularity): number {
  switch (granularity) {
    case "week":
      return WEEK_BUCKET_COUNT;
    case "month":
      return 12;
    case "quarter":
      return 4;
    case "year":
      return 1;
  }
}

function bucketIndexFor(date: Date, granularity: SeasonalityGranularity): number {
  switch (granularity) {
    case "week": {
      const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
      const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      const dayOfYear = Math.round((today - yearStart) / 86_400_000);
      // A leap-ish 53rd week's worth of overflow days folds into the last bucket instead of
      // getting a sparse bucket of its own that only a handful of years could ever contribute to.
      return Math.min(Math.floor(dayOfYear / 7), WEEK_BUCKET_COUNT - 1);
    }
    case "month":
      return date.getUTCMonth();
    case "quarter":
      return Math.floor(date.getUTCMonth() / 3);
    case "year":
      return 0;
  }
}

function bucketLabel(index: number, granularity: SeasonalityGranularity): string {
  switch (granularity) {
    case "week":
      return `Semaine ${index + 1}`;
    case "month":
      return MONTH_LABELS[index];
    case "quarter":
      return `T${index + 1}`;
    case "year":
      return "Année";
  }
}

/**
 * Aggregates `data` into an average seasonal path across its own historical years — pure,
 * independent of any rendering: takes candles and a config, returns numbers. Each included year
 * is one "occurrence": rebased to a % change from its own first available close (so years at very
 * different price levels still compare on equal footing, same rebasing idea `CandlestickChart`'s
 * own symbol-overlay comparison uses), then read off at each bucket's own last available close
 * within it. `average` is the plain mean of every year's own value at that bucket — see
 * `SeasonalityOccurrence`'s doc comment for how future features (dispersion bands, individual
 * occurrences, weighted averages, automatic filters) are meant to build on the same `occurrences`
 * array instead of changing this traversal.
 */
export function computeSeasonality(
  data: Candle[],
  granularity: SeasonalityGranularity,
  excludedYears?: ReadonlySet<number> | number[]
): SeasonalityResult {
  const excluded = excludedYears instanceof Set ? excludedYears : new Set(excludedYears ?? []);

  // Grouped by year first (not bucketed directly) since each year needs its own reference (its
  // own first close) before any of its candles can be turned into a bucket value.
  const byYear = new Map<number, Candle[]>();
  for (const candle of data) {
    const year = candle.date.getUTCFullYear();
    if (excluded.has(year)) continue;
    const forYear = byYear.get(year);
    if (forYear) forYear.push(candle);
    else byYear.set(year, [candle]);
  }

  const bucketCount = bucketCountFor(granularity);
  const occurrencesByBucket: SeasonalityOccurrence[][] = Array.from({ length: bucketCount }, () => []);
  const contributingYears = new Set<number>();

  for (const [year, candles] of byYear) {
    if (candles.length === 0) continue;
    const reference = candles[0].close;
    if (reference === 0) continue;
    // Last candle seen (candles are date-ordered, same assumption every date-indexed feature in
    // this library already makes) within each bucket is that bucket's own representative close.
    const lastCloseByBucket = new Map<number, number>();
    for (const candle of candles) {
      lastCloseByBucket.set(bucketIndexFor(candle.date, granularity), candle.close);
    }
    for (const [idx, close] of lastCloseByBucket) {
      occurrencesByBucket[idx].push({ year, value: ((close / reference) - 1) * 100 });
      contributingYears.add(year);
    }
  }

  const buckets: SeasonalityBucket[] = [];
  for (let idx = 0; idx < bucketCount; idx++) {
    const occurrences = occurrencesByBucket[idx];
    if (occurrences.length === 0) continue;
    const average = occurrences.reduce((sum, o) => sum + o.value, 0) / occurrences.length;
    buckets.push({ index: idx, label: bucketLabel(idx, granularity), average, occurrences });
  }

  return { granularity, buckets, years: Array.from(contributingYears).sort((a, b) => a - b) };
}
