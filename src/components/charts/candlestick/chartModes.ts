import { ATR } from "technicalindicators";
import {
  CandleModeIcon,
  LineCloseModeIcon,
  HeikinAshiModeIcon,
  RenkoModeIcon,
  LineBreakModeIcon,
  TpoModeIcon,
} from "../../icons";
import type { Candle } from "./interfaces/Candle.interface";
import type { ChartDisplayMode } from "./interfaces/ChartDisplayMode.interface";

/** Heikin Ashi keeps a 1:1 index/date correspondence with `data` (unlike Renko/Line Break
 *  below) — each output candle just replaces the OHLC values the regular candle-drawing loop
 *  reads at the same index, so it needs no changes to the index-based scale/zoom/crosshair
 *  machinery that everything else in this file assumes `data` provides. */
export function computeHeikinAshiCandles(data: Candle[]): Candle[] {
  const out: Candle[] = [];
  let prevOpen = 0;
  let prevClose = 0;
  data.forEach((d, i) => {
    const haClose = (d.open + d.high + d.low + d.close) / 4;
    const haOpen = i === 0 ? (d.open + d.close) / 2 : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(d.high, haOpen, haClose);
    const haLow = Math.min(d.low, haOpen, haClose);
    out.push({ ...d, open: haOpen, high: haHigh, low: haLow, close: haClose });
    prevOpen = haOpen;
    prevClose = haClose;
  });
  return out;
}

/** A Renko/Line Break "brick": unlike a candle, it doesn't own a single index — it forms over a
 *  run of source candles, from the one right after the previous brick closed (`startIndex`) to
 *  the one whose close confirmed it (`endIndex`). Rendered as a rectangle spanning exactly that
 *  index range on the existing index-based X scale, so bricks stay perfectly in sync with
 *  zoom/pan/volume/indicators/drawings instead of needing a separate scale of their own — the
 *  tradeoff is that brick width varies with how many source candles it took to form, rather than
 *  the uniform width Renko/Line Break charts have on a dedicated (non-time) axis. */
export interface PriceBrick {
  open: number;
  close: number;
  direction: 1 | -1;
  startIndex: number;
  endIndex: number;
}

/** Brick size = ATR(period) over the whole dataset — the standard, volatility-adaptive way to
 *  size Renko bricks (vs. a fixed price or a % of price, neither of which adapts to how much the
 *  instrument actually moves). Falls back to the plain average true range over however much data
 *  exists when there's not enough of it for the ATR library to warm up (period + 1 candles),
 *  rather than leaving Renko with zero bricks on a short dataset. */
export function computeRenkoBrickSize(data: Candle[], period: number): number {
  if (data.length < 2) return 0;
  const values = ATR.calculate({ period, high: data.map((d) => d.high), low: data.map((d) => d.low), close: data.map((d) => d.close) });
  const last = values.length > 0 ? values[values.length - 1] : undefined;
  if (last && last > 0) return last;
  const trueRanges = data.map((d, i) => {
    const prevClose = i > 0 ? data[i - 1].close : d.close;
    return Math.max(d.high - d.low, Math.abs(d.high - prevClose), Math.abs(d.low - prevClose));
  });
  const avg = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  return avg > 0 ? avg : 1;
}

/** Traditional close-based Renko: a new brick forms every time the close moves `brickSize` past
 *  the last brick's own close, one brick per `brickSize` of movement (a single big move can spawn
 *  several bricks between two candles) — reverses direction on a single opposite brick, the same
 *  simplification most retail platforms use instead of the stricter "2 bricks to reverse" rule.
 *
 *  BUG FIXED: an earlier version gated each direction's check on the *current* `direction` itself
 *  (`while (direction >= 0 && price >= basePrice + brickSize)`, and the mirror image below it) —
 *  meant to stop the very first candle from qualifying for both directions at once, but it also
 *  permanently locked out reversals: once direction settled to -1 after the first down-brick,
 *  `direction >= 0` could never be true again for the rest of the dataset, so no up-brick could
 *  ever form again either (and symmetrically for 1). On real (non-monotonic) data this collapsed
 *  the whole series to just its first brick — exactly the "Renko doesn't work" symptom. Checking
 *  the *price* against both thresholds unconditionally (whichever qualifies first) instead of
 *  gating on the brick's own last direction fixes this — direction is now purely a label on each
 *  brick, not a one-way gate on what can happen next. */
export function computeRenkoBricks(data: Candle[], brickSize: number): PriceBrick[] {
  if (brickSize <= 0 || data.length === 0) return [];
  const bricks: PriceBrick[] = [];
  let basePrice = data[0].close;
  let startIndex = 0;
  for (let i = 1; i < data.length; i++) {
    const price = data[i].close;
    // A single candle can confirm more than one brick if it moves far enough — keep peeling
    // bricks off the same candle until it's no longer past the next threshold in either
    // direction. Checked as if/else-if (not two independent whiles) since after moving basePrice
    // one way, the opposite threshold is now further away, never closer — so at most one of the
    // two conditions can ever be true on a given pass.
    let moved = true;
    while (moved) {
      moved = false;
      if (price >= basePrice + brickSize) {
        bricks.push({ open: basePrice, close: basePrice + brickSize, direction: 1, startIndex, endIndex: i });
        basePrice += brickSize;
        startIndex = i;
        moved = true;
      } else if (price <= basePrice - brickSize) {
        bricks.push({ open: basePrice, close: basePrice - brickSize, direction: -1, startIndex, endIndex: i });
        basePrice -= brickSize;
        startIndex = i;
        moved = true;
      }
    }
  }
  return bricks;
}

/** N-line break (classic "Three Line Break" at lineCount = 3): a new line extends the run
 *  whenever the close makes a new high (uptrend) / low (downtrend) past the last line's own
 *  close; it only reverses once the close breaks past the extreme of the last `lineCount` lines
 *  in the opposite direction — closes that do neither (inside the last line's range) produce no
 *  new line at all, unlike Renko where every candle is at least checked against a fixed step. */
export function computeLineBreakBricks(data: Candle[], lineCount: number): PriceBrick[] {
  if (data.length < 2) return [];
  const closes = data.map((d) => d.close);
  const lines: PriceBrick[] = [];
  let startIndex = 0;
  for (let i = 1; i < closes.length; i++) {
    const price = closes[i];
    if (lines.length === 0) {
      const direction: 1 | -1 = price >= closes[0] ? 1 : -1;
      lines.push({ open: closes[0], close: price, direction, startIndex: 0, endIndex: i });
      startIndex = i;
      continue;
    }
    const last = lines[lines.length - 1];
    const extendsRun = last.direction === 1 ? price > last.close : price < last.close;
    if (extendsRun) {
      lines.push({ open: last.close, close: price, direction: last.direction, startIndex, endIndex: i });
      startIndex = i;
      continue;
    }
    const window = lines.slice(-lineCount);
    const extreme =
      last.direction === 1
        ? Math.min(...window.map((l) => Math.min(l.open, l.close)))
        : Math.max(...window.map((l) => Math.max(l.open, l.close)));
    const reverses = last.direction === 1 ? price < extreme : price > extreme;
    if (reverses) {
      lines.push({ open: last.close, close: price, direction: last.direction === 1 ? -1 : 1, startIndex, endIndex: i });
      startIndex = i;
    }
  }
  return lines;
}

export interface TpoRow {
  priceLow: number;
  priceHigh: number;
}

/** One time block within a session — real TPO letters/numbers, each shown at every price `Row`
 *  (by index into the session's own `rows`) any candle inside this block's own time window
 *  touched. `label` wraps letters back to "A" after "Z" (there's no data-driven upper bound on
 *  how many blocks a long session at a fine `blockMinutes` can produce) — good enough for typical
 *  session/block combinations without needing a second letter tier, and numbers never need to. */
export interface TpoBlock {
  label: string;
  rows: number[];
}

export interface TpoSessionProfile {
  /** Both relative to the `candles` array `computeTPOSessionProfiles` was given, same index space
   *  its own caller's `visibleRange` slice already uses — not absolute indices into the chart's
   *  full `data`. */
  startIndex: number;
  endIndex: number;
  rows: TpoRow[];
  blocks: TpoBlock[];
  pocRow: number;
  vahRow: number;
  valRow: number;
}

function tpoBlockLabel(index: number, style: "letters" | "numbers"): string {
  if (style === "numbers") return String(index + 1);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[index % letters.length];
}

/** "Time Price Opportunities": real Market Profile charts slice each session into fixed-length
 *  time blocks (`blockMinutes` — 30 minutes on a real exchange floor, historically), stamping
 *  that block's own letter/number at every price level a candle inside it touched — this needs
 *  candles *finer* than `blockMinutes` to produce more than a single block per session (on a
 *  daily-or-coarser timeframe there's no intrabar data left to slice, so no session below
 *  qualifies at all — see the "tpo" mode's own empty-state message for that case, not a bug).
 *  Rows are a fixed count across each session's own [low, high] (independent of `blockMinutes` —
 *  finer blocks just mean more distinct letters landing in the same rows, not more rows), same
 *  price-binning idea a volume profile already uses. POC is the row the most blocks touched; the
 *  value area expands outward from it, always toward whichever neighboring row more blocks
 *  touched, until it encloses ≥70% of all (block, row) touches — the standard Market Profile
 *  definition, just counted in blocks-per-row instead of volume-per-row. */
export function computeTPOSessionProfiles(candles: Candle[], rowCount: number, blockMinutes: number, labelStyle: "letters" | "numbers"): TpoSessionProfile[] {
  if (candles.length === 0) return [];
  const sessions: TpoSessionProfile[] = [];
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const blockMs = Math.max(1, blockMinutes) * 60_000;

  let sessionStart = 0;
  for (let i = 1; i <= candles.length; i++) {
    const sameDay = i < candles.length && dayKey(candles[i].date) === dayKey(candles[sessionStart].date);
    if (sameDay) continue;
    const endIndex = i - 1;
    const sessionCandles = candles.slice(sessionStart, endIndex + 1);

    if (sessionCandles.length >= 2) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const d of sessionCandles) {
        lo = Math.min(lo, d.low);
        hi = Math.max(hi, d.high);
      }
      if (hi > lo) {
        const rowSize = (hi - lo) / rowCount;
        const rowOf = (price: number) => Math.min(rowCount - 1, Math.max(0, Math.floor((price - lo) / rowSize)));

        // Groups candles by which block index (time-since-session-start / blockMinutes) they
        // fall in — only indices a real candle actually landed in become a block at all, so a
        // session much shorter than a full "day's worth" of blocks doesn't pad out empty ones.
        const sessionStartMs = sessionCandles[0].date.getTime();
        const rowsByBlockIndex = new Map<number, Set<number>>();
        for (const d of sessionCandles) {
          const blockIndex = Math.floor((d.date.getTime() - sessionStartMs) / blockMs);
          let rows = rowsByBlockIndex.get(blockIndex);
          if (!rows) {
            rows = new Set();
            rowsByBlockIndex.set(blockIndex, rows);
          }
          for (let r = rowOf(d.low); r <= rowOf(d.high); r++) rows.add(r);
        }

        if (rowsByBlockIndex.size >= 2) {
          const orderedBlockIndices = Array.from(rowsByBlockIndex.keys()).sort((a, b) => a - b);
          const blocks: TpoBlock[] = orderedBlockIndices.map((bi, i) => ({
            label: tpoBlockLabel(i, labelStyle),
            rows: Array.from(rowsByBlockIndex.get(bi)!).sort((a, b) => a - b),
          }));

          const touchCounts = new Array(rowCount).fill(0);
          for (const block of blocks) for (const r of block.rows) touchCounts[r]++;
          const total = touchCounts.reduce((a: number, b: number) => a + b, 0);
          let pocRow = 0;
          for (let r = 1; r < rowCount; r++) if (touchCounts[r] > touchCounts[pocRow]) pocRow = r;
          let areaLow = pocRow;
          let areaHigh = pocRow;
          let areaSum = touchCounts[pocRow];
          while (areaSum / total < 0.7 && (areaLow > 0 || areaHigh < rowCount - 1)) {
            const below = areaLow > 0 ? touchCounts[areaLow - 1] : -1;
            const above = areaHigh < rowCount - 1 ? touchCounts[areaHigh + 1] : -1;
            if (above >= below) areaSum += touchCounts[++areaHigh];
            else areaSum += touchCounts[--areaLow];
          }

          const rows: TpoRow[] = Array.from({ length: rowCount }, (_, r) => ({ priceLow: lo + r * rowSize, priceHigh: lo + (r + 1) * rowSize }));
          sessions.push({ startIndex: sessionStart, endIndex, rows, blocks, pocRow, vahRow: areaHigh, valRow: areaLow });
        }
      }
    }
    sessionStart = i;
  }
  return sessions;
}

export interface ChartDisplayModeDef {
  mode: ChartDisplayMode;
  label: string;
  icon: typeof CandleModeIcon;
}

export const CHART_DISPLAY_MODES: ChartDisplayModeDef[] = [
  { mode: "candle", label: "Bougies", icon: CandleModeIcon },
  { mode: "line", label: "Ligne de clôture", icon: LineCloseModeIcon },
  { mode: "heikinAshi", label: "Heikin Ashi", icon: HeikinAshiModeIcon },
  { mode: "renko", label: "Renko", icon: RenkoModeIcon },
  { mode: "lineBreak", label: "Line Break", icon: LineBreakModeIcon },
  { mode: "tpo", label: "Time Price Opportunities (par séance)", icon: TpoModeIcon },
];
