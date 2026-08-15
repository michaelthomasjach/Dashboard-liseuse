import type { ChartMargin } from "../internal/useChartDimensions";
import type { TrendLineDrawing } from "./interfaces/TrendLineDrawing.interface";

export const DEFAULT_MARGIN: Partial<ChartMargin> = { top: 0, right: 72, bottom: 24, left: 0 };
/** Screen-space distance (px) under which the pointer counts as "hovering" a drawn line. */
export const DRAWING_HIT_DISTANCE = 8;
/** Width of the drawing-tools rail. Added to the left margin so the plot/axes never draw
 *  under it — the rail gets its own reserved strip instead of overlaying the chart. */
export const TOOLS_RAIL_WIDTH = 40;
/** Height of the (non-floating) header row holding the timeframe picker and reset/fullscreen
 *  buttons — subtracted from the available height before laying out the plot itself. */
export const HEADER_HEIGHT = 40;
/** Distance (px) the date "+" button sits inset from the plot's own bottom edge — close to the
 *  date axis it mirrors (but clear of the date label's own badge just below the plot), and
 *  still inside the interactive rect so hovering it never counts as leaving the plot (see
 *  .lq-chart__plot's onPointerLeave). */
export const CROSSHAIR_ADD_INSET = 20;
/** Vertical gap between the live-price badge and the countdown badge sitting right below it. */
export const LIVE_COUNTDOWN_OFFSET = 20;
/** Half the rendered height of a `.lq-chart__axis-value--y` badge — see clampToPriceAxis. */
export const AXIS_BADGE_HALF_HEIGHT = 10;
/** Single drag-handle position for an axis-constrained line, as a fraction of the plot's own
 *  size along the axis it doesn't move on: a horizontal line's handle sits 1/4 of the width in
 *  from the right edge, a vertical line's handle 1/4 of the height down from the top. */
export const AXIS_HANDLE_FRACTION_X = 0.75;
export const AXIS_HANDLE_FRACTION_Y = 0.25;
/** Upper bound on how many date labels the bottom axis shows at once, regardless of how many
 *  candles are actually in view — matches BarChart/DeltaChart's own categorical-axis throttle. */
export const MAX_DATE_TICKS = 12;
export const DEFAULT_DRAWING_COLOR = "#6c87c9";
// Stable reference (not a fresh `[]` every render) for `visibleDrawings` to fall back to while
// drawings are hidden — avoids retriggering effects/memos keyed on it purely from array identity.
export const EMPTY_DRAWINGS: TrendLineDrawing[] = [];
/** How far past the data's own edges panning can reveal empty "future"/"past" space, as a
 *  fraction of the *current* viewport width — not a fixed candle count, which would feel
 *  enormous zoomed in (a handful of real candles next to a huge empty block) and negligible
 *  zoomed out. See the custom `constrain` passed to useD3Zoom below for the derivation: it
 *  caps how far each edge of the visible domain can sit past [0, data.length] to this fraction
 *  of the viewport, at every zoom level. */
export const MAX_EMPTY_FRACTION = 0.5;
/** Height (px) of a sub-pane's (volume, or an "own"-pane indicator — RSI/CHOP/MACD) header strip
 *  when collapsed — the full pane shrinks to exactly this, full width, showing just its name and
 *  an expand button. */
export const SUB_PANE_COLLAPSED_HEIGHT = 40;
/** Default height of an expanded sub-pane, as a fraction of the plot's own bounded height — the
 *  starting point before any manual resize (see paneHeightFractions/startPaneResize). */
export const DEFAULT_PANE_HEIGHT_FRACTION = 0.22;
/** Drag-to-resize bounds for a sub-pane, same fraction units as DEFAULT_PANE_HEIGHT_FRACTION. */
export const MIN_PANE_HEIGHT_FRACTION = 0.08;
export const MAX_PANE_HEIGHT_FRACTION = 0.6;
