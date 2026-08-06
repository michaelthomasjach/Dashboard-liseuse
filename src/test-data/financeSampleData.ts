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
