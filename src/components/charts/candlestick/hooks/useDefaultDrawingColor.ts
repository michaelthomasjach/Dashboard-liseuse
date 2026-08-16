import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { DEFAULT_DRAWING_COLOR } from "../constants";

/** The same theme-accent color a drawing with no explicit `color` actually renders in on canvas
 *  (see `dr.color ?? colorAccent` throughout drawPriceDrawings.ts) — resolved live from the DOM
 *  since canvas has no binding to CSS custom properties, same reasoning as
 *  `useThemePaletteTick`. Used to seed the edit modal's own color picker so it shows the color a
 *  freshly-double-clicked, never-recolored drawing is *actually* drawn in instead of a hardcoded
 *  constant that only happens to match the default "color"/"light" theme (every other
 *  palette/surface combination render a visibly different color there than this once showed).
 *  Falls back to DEFAULT_DRAWING_COLOR only for the one frame before the effect below first runs
 *  — not reachable in practice, since nothing reads this before a drawing's own edit modal opens,
 *  well after mount. */
export function useDefaultDrawingColor(ref: RefObject<HTMLDivElement>, themeTick: number): string {
  const [color, setColor] = useState(DEFAULT_DRAWING_COLOR);

  useEffect(() => {
    if (!ref.current) return;
    setColor(getComputedStyle(ref.current).getPropertyValue("--lq-color-accent").trim() || DEFAULT_DRAWING_COLOR);
  }, [ref, themeTick]);

  return color;
}
