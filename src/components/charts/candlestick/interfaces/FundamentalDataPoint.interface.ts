/** One reported period's worth of fundamentals — see `CandlestickChartProps.fundamentals`. Every
 *  metric is optional since not every caller has every figure for every period (a data source
 *  might report revenue quarterly but P/E only where it has trailing EPS, for instance); a metric
 *  missing at a given `date` just leaves that stretch of its own indicator pane unrendered (same
 *  "null until ready" convention as an indicator's own warm-up period) until the next report that
 *  does have it. Values persist (step function, not interpolated) from one `date` to the next
 *  since that's how a reported-quarterly-or-annually figure actually reads on a daily chart — flat
 *  until the next report changes it, not a smooth curve between two points that were never
 *  actually measured in between. */
export interface FundamentalDataPoint {
  date: Date;
  /** Free cash flow, in the instrument's own currency (not shares/percent). */
  freeCashFlow?: number;
  netIncome?: number;
  totalRevenue?: number;
  /** Net income ÷ revenue, as a percentage (e.g. 21.5 for 21.5%), not a 0-1 fraction. */
  netMargin?: number;
  /** Gross profit ÷ revenue, same percentage convention as `netMargin`. */
  grossMargin?: number;
  /** Price/earnings ratio — a plain number (e.g. 24.3), not a percentage. */
  peRatio?: number;
  /** Earnings per share, in the instrument's own currency. */
  eps?: number;
  /** Total debt ÷ total equity — a plain ratio (e.g. 0.8), not a percentage. */
  debtToEquity?: number;
}
