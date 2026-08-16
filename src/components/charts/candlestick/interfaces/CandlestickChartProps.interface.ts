import type { ChartMargin } from "../../internal/useChartDimensions";
import type { Candle } from "./Candle.interface";
import type { TrendLineDrawing, OverlayDataPoint } from "./TrendLineDrawing.interface";
import type { Indicator } from "./Indicator.interface";
import type { ChartTemplate } from "./ChartTemplate.interface";
import type { TimeframeEntry } from "./TimeframeEntry.interface";
import type { ChartDisplayMode } from "./ChartDisplayMode.interface";
import type { ChartEvent } from "./ChartEvent.interface";
import type { FundamentalDataPoint } from "./FundamentalDataPoint.interface";
import type { SymbolSearchResult } from "./SymbolSearchResult.interface";
import type { SymbolSearchCategory } from "./SymbolSearchCategory.interface";

export interface CandlestickChartProps {
  data: Candle[];
  /** Fixed pixel width. Omitted (default): fills 100% of the parent container's width, like
   *  every other chart in this library — pass a number only to opt out of that. Ignored while
   *  in fullscreen (the toggle always fills the viewport). */
  width?: number;
  /** Fixed pixel height. Default 380. Ignored while in fullscreen (the toggle always fills the
   *  viewport). */
  height?: number;
  zoomable?: boolean;
  showVolume?: boolean;
  formatDate?: (d: Date) => string;
  formatPrice?: (v: number) => string;
  formatVolume?: (v: number) => string;
  /** Shows a fullscreen toggle button in the header. Default true. */
  fullscreenToggle?: boolean;
  /** Shows a header button that swaps the whole chart body for `SeasonalityView` — the average
   *  cumulative return through a reference year, aggregated across `data`'s own historical years
   *  (see `computeSeasonality` in `internal/seasonality.ts`, kept independent of this component on
   *  purpose). A dedicated small header (symbol name + a "back" button) replaces the normal one
   *  while active, for a clear, unambiguous way back to the regular chart — rather than trying to
   *  keep the regular header's own timeframe/display-mode/indicator controls both visible and
   *  meaningful over a view none of them actually apply to. Default false. */
  seasonality?: boolean;
  /** Shows a left-docked toolbar for drawing annotations directly on the chart (currently: trend line). Default false. */
  drawingTools?: boolean;
  /** Uncontrolled initial set of trend-line drawings. */
  defaultDrawings?: TrendLineDrawing[];
  /** Fires whenever a drawing is added, moved, or edited. */
  onDrawingsChange?: (drawings: TrendLineDrawing[]) => void;
  /** Shows a header button that opens the technical-indicator picker (SMA, EMA, WMA…) and the
   *  active-indicator legend in the plot's top-left corner. Default false. */
  showIndicators?: boolean;
  /** Uncontrolled initial set of technical indicators. */
  defaultIndicators?: Indicator[];
  /** Fires whenever an indicator is added, edited, or removed. */
  onIndicatorsChange?: (indicators: Indicator[]) => void;
  /** Shows a Save button plus a templates dropdown at the right edge of the header — captures
   *  the *indicator/pane* layout (which indicators, their own settings, pane order, pane
   *  height, the Volume pane's own position/collapse state), not drawings or display/timeframe
   *  settings, as a named, reloadable `ChartTemplate`. The Save button opens a "name this
   *  template" modal only the first time (no template active yet); every save after that
   *  overwrites the active one directly, no modal. Loading a different template while the
   *  current layout has unsaved changes (including never having saved at all) offers to save
   *  first rather than silently discarding it. Default false. */
  showTemplates?: boolean;
  /** Uncontrolled initial list of saved templates. */
  defaultTemplates?: ChartTemplate[];
  /** Fires whenever a template is saved (new or overwritten) or deleted. */
  onTemplatesChange?: (templates: ChartTemplate[]) => void;
  /** How many of the most recent candles are visible when the chart first mounts (applied once,
   *  as an initial zoom/pan — the user can still zoom/pan freely afterward). `undefined`/0/a
   *  value ≥ `data.length` shows the whole dataset, same as before this prop existed. Default 500. */
  initialVisibleCandles?: number;
  /** When true, the price axis continuously auto-fits to the min/max of whatever candles are
   *  currently visible on the X axis (recalculated on every pan/zoom), instead of a single
   *  static domain sized to the whole dataset — until the user manually zooms/pans the Y axis
   *  themselves (wheel or drag on the axis, or dragging the plot vertically), at which point
   *  auto-fit stops so their adjustment isn't immediately overwritten. Clicking "Réinitialiser
   *  le zoom" re-engages it. Default true. Also toggleable live from the chart-settings modal
   *  (double-click the symbol/chart-type label, top-left of the price plot) — that toggle owns
   *  an internal copy seeded from this prop, same uncontrolled pattern as `drawings`/
   *  `indicators`, reported back via `onYAutoScalingChange`. */
  YAutoScaling?: boolean;
  onYAutoScalingChange?: (value: boolean) => void;
  /** Timeframe/interval options shown as a dropdown in the header — flat, or grouped (e.g. one
   *  group per "Minutes"/"Heures"/"Jours"), matching a typical trading-platform interval menu.
   *  This only renders the picker and reports the choice via `onTimeframeChange`; resampling
   *  `data` into the new interval is left to the caller. */
  timeframes?: TimeframeEntry[];
  /** Currently selected timeframe's `value`, to highlight it in the menu. */
  timeframe?: string;
  onTimeframeChange?: (value: string) => void;
  /** How the price series itself is drawn — bougies japonaises (défaut), ligne de clôture,
   *  Heikin Ashi, Renko, Line Break, ou Time Price Opportunities (bougies + histogramme de
   *  distribution des prix avec VAH/POC/VAL). Shown as a header button (icône du mode courant)
   *  juste à côté du sélecteur de timeframe, ouvrant un menu des six modes. Uncontrolled, like
   *  `drawings`/`indicators` — see `defaultChartDisplayMode`/`onChartDisplayModeChange`. */
  defaultChartDisplayMode?: ChartDisplayMode;
  onChartDisplayModeChange?: (mode: ChartDisplayMode) => void;
  /** ATR period used to size Renko bricks (a new brick forms every time the close moves this
   *  many candles' worth of average true range past the last one) — recomputed from the whole
   *  dataset, not just what's visible. Default 14. */
  renkoAtrPeriod?: number;
  /** Instrument name shown top-left of the price plot, followed by the current chart-type label
   *  (e.g. "AAPL · Bougies") — double-clicking that label opens the chart-settings modal (up/down
   *  bar colors, auto-rescale, event visibility). Omit to show just the chart-type label on its
   *  own (the settings modal is still reachable by double-clicking it). */
  symbol?: string;
  /** Markers shown as small badges along the bottom of the price plot (earnings, dividends,
   *  product updates…) — each `kind` groups related events and can be shown/hidden independently
   *  from the chart-settings modal (double-click the symbol/chart-type label). Purely
   *  presentational: positions are derived from `date` via the same index-based X scale
   *  everything else uses, so they pan/zoom with the candles. */
  events?: ChartEvent[];
  /** Reported-period fundamentals (free cash flow, net income, margins, P/E…) — see
   *  `FundamentalDataPoint`. Each metric present here shows up as its own entry (category
   *  "Fondamentaux") in the "Ajouter un indicateur" picker, rendering in its own pane exactly
   *  like RSI/CHOP/MACD once added. The library doesn't fetch or compute any of this itself
   *  (same stance as `timeframes`/`symbolSearchResults`) — it's the app's own data, just plotted. */
  fundamentals?: FundamentalDataPoint[];
  /** Makes `symbol` its own hoverable/clickable zone (background on hover, separate from the
   *  chart-type label right next to it) — clicking it opens a "Symbol search" modal (search
   *  field + category filter pills + a results list you provide). Default false — with
   *  `symbol` set but this left off, the label still renders, just as inert text. Ignored
   *  entirely if `symbol` itself is omitted (nothing to click). */
  symbolSearch?: boolean;
  /** Results currently shown in the symbol-search modal. Searching/filtering — including for
   *  the "Favoris" pill, see `defaultFavoriteSymbolIds` — is entirely the caller's job: this is
   *  only what actually renders, driven by `onSymbolSearchChange`. */
  symbolSearchResults?: SymbolSearchResult[];
  /** Fires whenever the search modal's query text or category pill changes (including once,
   *  right when the modal opens, with the query/category at their defaults) so the caller can
   *  fetch/filter and update `symbolSearchResults` accordingly. `category: "favorites"` asks
   *  for whichever results the caller currently considers favorited — `query` is meaningless in
   *  that case and should be ignored. */
  onSymbolSearchChange?: (query: string, category: SymbolSearchCategory) => void;
  /** Fires when a result row is clicked — the modal closes automatically right after. */
  onSymbolSelect?: (result: SymbolSearchResult) => void;
  /** Fires when a result row's "+" is clicked (hover-revealed, next to its name — the modal stays
   *  open, unlike `onSymbolSelect`) to compare that instrument against the main one. Returns (or
   *  resolves to) the comparison series itself — the library has no data source of its own, same
   *  stance as `data`/`fundamentals`/`symbolSearchResults`. Once it resolves, the chart appends a
   *  `symbolOverlay` drawing itself (`drawings` stays uncontrolled, like everywhere else in this
   *  file — there's no way for the caller to inject one directly, since fetching is inherently
   *  async and `drawings` has no controlled counterpart to `defaultDrawings`) — reported back via
   *  `onDrawingsChange` same as any other new drawing. The "+" shows a small spinner while the
   *  promise is pending, and turns into a checkmark (click to remove) once that symbol is already
   *  an active overlay — a plain fire-and-forget callback couldn't support either without the
   *  library tracking pending/active state itself, which returning the data instead sidesteps.
   *  Each point's `value` (its close) is all a plain line comparison needs; include `open`/
   *  `high`/`low` too (see OverlayDataPoint) if the source data has them and the comparison
   *  should also be selectable as candles (`overlayDisplayMode` in the edit modal's Style tab). */
  onAddSymbolOverlay?: (result: SymbolSearchResult) => OverlayDataPoint[] | Promise<OverlayDataPoint[]>;
  /** Uncontrolled set of favorited result ids — the star toggle at the far right of each result
   *  row (visible on hover, or always once favorited). Persisted the same way as `drawings`/
   *  `indicators`: seeds initial state, changes reported back via `onFavoriteSymbolIdsChange`. */
  defaultFavoriteSymbolIds?: string[];
  onFavoriteSymbolIdsChange?: (ids: string[]) => void;
  /** A dashed line across the price plot at the last candle's close, its price on the Y axis
   *  (colored up/down against the previous close), and — right below that badge — a MM:SS
   *  countdown to the next candle, ticking down every second. The countdown's interval is
   *  inferred from the gap between the last two candles (so a 5-minute series counts down from
   *  05:00), not a separate prop — pass data with at least 2 candles for it to show at all.
   *  Meant for genuinely live-updating `data` (see the "Marché ouvert (simulation)" story); on
   *  static historical data the countdown will just sit at 00:00 once it reaches it, since
   *  nothing here fetches new candles on its own. Default false. */
  livePrice?: boolean;
  /** An externally-driven hover date — e.g. from `ChartWorkspace` syncing the crosshair across a
   *  group of linked charts. While set, this chart draws its own crosshair (vertical line, date
   *  badge, OHLC readout) at whichever of its own candles is nearest that date, exactly as if the
   *  cursor were there — *unless* the cursor is actually, physically over this chart right now,
   *  which always wins. The volume/indicator-pane value badges stay tied to the real cursor's own
   *  Y position regardless (see `syncedHoverPrice` below for the main price line's own Y-axis
   *  counterpart to this prop). Pass `null`/omit for a chart that isn't part of any sync group. */
  syncedHoverDate?: Date | null;
  /** Fires whenever *this* chart's own real (not synced-in) hover changes — the date of whichever
   *  candle the cursor is over, or `null` once it leaves. This is what a `ChartWorkspace` reads to
   *  compute `syncedHoverDate` for every other chart in the same link group. */
  onHoverDateChange?: (date: Date | null) => void;
  /** The horizontal-axis counterpart to `syncedHoverDate` — an externally-driven hover *price*
   *  (not a raw pixel: a pixel Y from another chart's own price scale would be meaningless here,
   *  given each panel can have a different symbol, zoom level, or Y-auto-scaling state). While
   *  set, this chart draws its own horizontal price line/badge at wherever that price falls on
   *  ITS OWN current scale — clamped to stay within the visible pane (same as the live-price/
   *  indicator-value badges already do for an off-scale value) rather than drawn off-canvas when
   *  a linked panel's price is out of this one's own visible range. Same real-cursor-always-wins
   *  rule as `syncedHoverDate`; independent of it, so a caller can sync one axis without the
   *  other. Pass `null`/omit for a chart that isn't part of any sync group, or is but shouldn't
   *  sync its Y axis. */
  syncedHoverPrice?: number | null;
  /** Fires whenever *this* chart's own real (not synced-in) price-pane hover changes — the price
   *  at the cursor's Y position, or `null` once it leaves. This is what a `ChartWorkspace` reads
   *  to compute `syncedHoverPrice` for every other chart in the same link group. */
  onHoverPriceChange?: (price: number | null) => void;
  /** Shows a chain-link button in the header (top right, alongside Save/templates if those are
   *  also on) — click reports back via `onLinkClick` rather than doing anything on its own, since
   *  linking charts together is inherently a multi-chart concept this component has no way to
   *  know about by itself (see `ChartWorkspace`, which sets this — a standalone chart has no
   *  reason to set it). Default false. */
  linkable?: boolean;
  /** Highlights the link button to show this chart is currently part of a link group. Purely
   *  cosmetic — `ChartWorkspace` is what actually knows the group membership. Default false. */
  isLinked?: boolean;
  onLinkClick?: () => void;
  /** Shows a grid/split-screen button in the header (top right) opening a menu of 1/2/4/6/8-panel
   *  layouts — same report-upward-only shape as `linkable`: picking one fires
   *  `onSplitScreenChange` rather than doing anything on its own, since laying out multiple
   *  panels at once is inherently a multi-chart concept this component has no way to act on by
   *  itself (see `ChartWorkspace`, which sets all three of these — a standalone chart has no
   *  reason to). Default false. */
  showSplitScreen?: boolean;
  /** Current panel count, to highlight the active choice in the menu. */
  splitScreenPanels?: 1 | 2 | 4 | 6 | 8;
  onSplitScreenChange?: (panels: 1 | 2 | 4 | 6 | 8) => void;
  margin?: Partial<ChartMargin>;
  className?: string;
}
