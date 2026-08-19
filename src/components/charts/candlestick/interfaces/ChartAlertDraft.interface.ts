/** The condition an alert fires on — "crossing"/"crossingUp"/"crossingDown"/"greaterThan"/
 *  "lessThan" apply to every line-like drawing/tool; "fibLevel" only applies to a Fibonacci
 *  (retracement or extension) drawing/tool, targeting one specific ratio level instead of the
 *  drawing's own line. */
export type ChartAlertCrossing = { kind: "crossing" | "crossingUp" | "crossingDown" | "greaterThan" | "lessThan" } | { kind: "fibLevel"; level: number };

/** What `AlertCreateModal`'s own "Create" button hands back — a plain data bag, not something
 *  this library stores, evaluates, or ever triggers itself (same "caller owns the data" shape as
 *  `drawings`/`indicators`/everything else here). `CandlestickChartProps.onCreateAlert` is the
 *  only thing that ever produces one of these. */
export interface ChartAlertDraft {
  /** Which drawing this alert is attached to — `null` when a tool was merely active (no drawing
   *  placed yet) at the moment the alert modal was opened. */
  drawingId: string | null;
  /** Which series the condition compares the target line/level against — a specific indicator's
   *  own id, or the literal `"price"` for the plain candle series. */
  conditionIndicatorId: string;
  crossing: ChartAlertCrossing;
  trigger: "onlyOnce" | "oncePerBar" | "oncePerBarClose" | "oncePerMinute";
  sound: string;
  message: string;
  expiresAt: Date | null;
}
