// Distinct from INDICATOR_COLORS so an event badge never accidentally matches an indicator
// line's own color at a glance.
export const EVENT_COLORS = ["#d18b3d", "#4f8fd1", "#3ea377", "#c15d7a", "#8a6fd6", "#c9a13a"];

export function defaultEventColor(index: number): string {
  return EVENT_COLORS[((index % EVENT_COLORS.length) + EVENT_COLORS.length) % EVENT_COLORS.length];
}

// Event badges (see `ChartEvent`) sit in a fixed row this many px above the price/volume
// divider — always tied to the divider, never to whatever's currently the tallest/shortest
// visible candle, so the row doesn't jump around while panning/zooming.
export const EVENT_MARKER_OFFSET = 14;
export const EVENT_MARKER_RADIUS = 8;
/** Fixed width (px) of the event-stack popover — fixed, not measured, so its horizontal
 *  clamp-to-bounds position can be computed synchronously in the same render as the click that
 *  opens it, no post-mount measurement pass (and the flash-of-unpositioned-content that would
 *  come with one) needed. */
export const EVENT_TOOLTIP_WIDTH = 320;
/** Gap (px) between the popover's own bottom edge and the top of the event marker it's anchored
 *  to (see `EVENT_MARKER_RADIUS`). */
export const EVENT_TOOLTIP_GAP = 15;
