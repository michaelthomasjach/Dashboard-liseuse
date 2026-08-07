import { useEffect, useRef, type RefObject } from "react";
import * as d3 from "d3";

export interface UseAxisWheelZoomOptions {
  /** Which axis this strip zooms. */
  axis: "x" | "y";
  /** Current transform, read fresh on every wheel tick (not memoized — always pass the live value). */
  transform: d3.ZoomTransform;
  onChange: (transform: d3.ZoomTransform) => void;
  scaleExtent?: [number, number];
  enabled?: boolean;
  /** boundedWidth/boundedHeight (or similar) of the strip — not used for math, only kept in the
   *  effect's dependency array so the listener re-attaches once the ref's element actually mounts
   *  (it's 0/absent on the first render, before the ResizeObserver reports real dimensions). */
  size?: number;
}

/**
 * Native (non-passive) wheel listener for an axis strip: scrolling while
 * hovering the price axis zooms Y, scrolling while hovering the time axis
 * zooms X — independent of the main plot's wheel-to-zoom-X gesture. Zooms
 * around the cursor position along that axis, like the plot's own zoom.
 * Needs a real DOM listener (not React's onWheel) so preventDefault actually
 * stops the page from scrolling — React attaches wheel handlers as passive.
 */
export function useAxisWheelZoom<T extends Element>({
  axis,
  transform,
  onChange,
  scaleExtent = [1, 20],
  enabled = true,
  size = 0,
}: UseAxisWheelZoomOptions): RefObject<T> {
  const ref = useRef<T>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [scaleMin, scaleMax] = scaleExtent;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const pos = axis === "y" ? e.clientY - rect.top : e.clientX - rect.left;
      const factor = Math.exp(-e.deltaY * 0.0022);
      const current = transformRef.current;
      const k0 = current.k;
      const k1 = Math.min(scaleMax, Math.max(scaleMin, k0 * factor));
      const t0 = axis === "y" ? current.y : current.x;
      const t1 = pos - (pos - t0) * (k1 / k0);
      const next = axis === "y" ? d3.zoomIdentity.scale(k1).translate(0, t1 / k1) : d3.zoomIdentity.scale(k1).translate(t1 / k1, 0);
      onChangeRef.current(next);
    };

    el.addEventListener("wheel", handleWheel as EventListener, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel as EventListener);
  }, [axis, enabled, scaleMin, scaleMax, size]);

  return ref;
}
