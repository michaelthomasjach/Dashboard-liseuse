import type { Candle } from "../components/charts/CandlestickChart";
import type { ChartPoint } from "../components/charts/LineAreaChart";

/** Deterministic pseudo-random generator so stories render the same data every time. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSeries(count: number, start: number, seed = 1): ChartPoint[] {
  const rand = mulberry32(seed);
  const points: ChartPoint[] = [];
  let value = start;
  const today = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    value = Math.max(1, value + (rand() - 0.48) * (start * 0.02));
    points.push({ x: date, y: Math.round(value * 100) / 100 });
  }
  return points;
}

export function generateCandles(count: number, start: number, seed = 2): Candle[] {
  const rand = mulberry32(seed);
  const candles: Candle[] = [];
  let close = start;
  const today = new Date();
  let day = new Date(today);
  day.setDate(day.getDate() - count * 1.4);

  while (candles.length < count) {
    day = new Date(day);
    day.setDate(day.getDate() + 1);
    if (day.getDay() === 0 || day.getDay() === 6) continue; // skip weekends, like a real market

    const open = close;
    const change = (rand() - 0.5) * (start * 0.03);
    close = Math.max(1, open + change);
    const high = Math.max(open, close) + rand() * (start * 0.01);
    const low = Math.min(open, close) - rand() * (start * 0.01);
    const volume = Math.round(50_000 + rand() * 200_000);

    candles.push({
      date: new Date(day),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
  }
  return candles;
}

export type MockTimeframeKey = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w" | "1M";

// US market hours (9:30–16:00) — the intraday generator below never places a candle outside
// this window, same as `generateCandles` above never places one on a weekend.
const TRADING_MINUTES_PER_DAY = 390;

/** Intraday candles spaced `intervalMinutes` apart within market hours, for the last `days`
 *  trading days — deliberately a much shorter lookback than the daily series below rather than
 *  the same decade of history at every resolution: no real trading platform offers years of
 *  1-minute candles either, and generating that many would be both slow and pointless (nobody
 *  scrolls a minute chart back a decade). Per-candle volatility scales with `intervalMinutes`
 *  itself (roughly `sqrt(interval)`, the usual "variance grows with elapsed time" assumption) so
 *  a 4h candle's typical range doesn't come out identical to a 1-minute one's. */
function generateIntradayCandles(days: number, intervalMinutes: number, start: number, seed: number): Candle[] {
  const rand = mulberry32(seed);
  const candles: Candle[] = [];
  let close = start;
  const today = new Date();
  let day = new Date(today);
  day.setDate(day.getDate() - Math.round(days * 1.4));
  const candlesPerDay = Math.max(1, Math.round(TRADING_MINUTES_PER_DAY / intervalMinutes));
  const volFactor = start * 0.0006 * Math.sqrt(intervalMinutes);
  let tradingDays = 0;

  while (tradingDays < days) {
    day = new Date(day);
    day.setDate(day.getDate() + 1);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    tradingDays++;

    for (let i = 0; i < candlesPerDay; i++) {
      // setHours' own minutes argument overflowing past 59 correctly rolls into the hour, so
      // this doesn't need its own hour/minute split math.
      const time = new Date(day);
      time.setHours(9, 30 + i * intervalMinutes, 0, 0);

      const open = close;
      close = Math.max(1, open + (rand() - 0.5) * volFactor);
      const high = Math.max(open, close) + rand() * volFactor * 0.4;
      const low = Math.min(open, close) - rand() * volFactor * 0.4;
      const volume = Math.round(1_000 + rand() * 12_000);

      candles.push({
        date: time,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume,
      });
    }
  }
  return candles;
}

/** Combines consecutive daily candles into one coarser candle per group (open/close from the
 *  group's own first/last candle, high/low its own extremes, volume summed) — how weekly/monthly
 *  are derived from the same daily series below, rather than separately generated: unlike the
 *  intraday timeframes (finer than daily, nothing to aggregate them *from*), a coarser bar is
 *  just its own days' worth of the existing daily path combined. */
function aggregateDailyCandles(daily: Candle[], keyFor: (date: Date) => string): Candle[] {
  const groups = new Map<string, Candle[]>();
  for (const candle of daily) {
    const key = keyFor(candle.date);
    const group = groups.get(key);
    if (group) group.push(candle);
    else groups.set(key, [candle]);
  }
  const result: Candle[] = [];
  for (const group of groups.values()) {
    const first = group[0];
    const last = group[group.length - 1];
    result.push({
      date: last.date,
      open: first.open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: last.close,
      volume: group.reduce((sum, c) => sum + (c.volume ?? 0), 0),
    });
  }
  return result;
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

/** One candle series per timeframe (see `CandlestickChartProps`' own `timeframes`/`timeframe`/
 *  `onTimeframeChange`, which only render the picker and report the choice — resampling `data`
 *  into the new interval is left to the caller, this is that resampling for the stories that
 *  want it). A 10-year daily series is the backbone (~2,500 trading days, also aggregated up into
 *  weekly/monthly); the finer intervals are separately generated over their own shorter,
 *  timeframe-appropriate lookback windows (see `generateIntradayCandles`'s own doc). Every
 *  generator gets its own seed offset so the different timeframes' price paths diverge instead
 *  of retracing each other. */
export function generateCandlesByTimeframe(start: number, seed: number): Record<MockTimeframeKey, Candle[]> {
  const daily = generateCandles(2_500, start, seed);
  return {
    "1m": generateIntradayCandles(5, 1, start, seed + 1),
    "5m": generateIntradayCandles(20, 5, start, seed + 2),
    "15m": generateIntradayCandles(60, 15, start, seed + 3),
    "1h": generateIntradayCandles(250, 60, start, seed + 4),
    "4h": generateIntradayCandles(800, 240, start, seed + 5),
    "1d": daily,
    "1w": aggregateDailyCandles(daily, isoWeekKey),
    "1M": aggregateDailyCandles(daily, monthKey),
  };
}

export const SAMPLE_ALLOCATION = [
  { id: "equities", label: "Actions", value: 48 },
  { id: "bonds", label: "Obligations", value: 22 },
  { id: "real-estate", label: "Immobilier", value: 14 },
  { id: "cash", label: "Liquidités", value: 10 },
  { id: "crypto", label: "Crypto", value: 6 },
];

export interface SampleHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  change: number;
  value: number;
}

export const SAMPLE_HOLDINGS: SampleHolding[] = [
  { id: "aapl", symbol: "AAPL", name: "Apple Inc.", quantity: 42, price: 226.34, change: 1.8, value: 9506.28 },
  { id: "msft", symbol: "MSFT", name: "Microsoft Corp.", quantity: 18, price: 441.2, change: -0.6, value: 7941.6 },
  { id: "tsla", symbol: "TSLA", name: "Tesla Inc.", quantity: 25, price: 248.5, change: -3.2, value: 6212.5 },
  { id: "amzn", symbol: "AMZN", name: "Amazon.com Inc.", quantity: 30, price: 186.1, change: 2.4, value: 5583.0 },
  { id: "nvda", symbol: "NVDA", name: "NVIDIA Corp.", quantity: 60, price: 132.7, change: 4.1, value: 7962.0 },
  { id: "vti", symbol: "VTI", name: "Vanguard Total Stock", quantity: 15, price: 289.4, change: 0.3, value: 4341.0 },
];
