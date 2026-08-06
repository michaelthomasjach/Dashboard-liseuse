import { useEffect, useRef, type RefObject } from "react";
import * as d3 from "d3";

export interface UseD3ZoomOptions {
  width: number;
  height: number;
  /** [min, max] scale factor. Default [1, 8]. */
  scaleExtent?: [number, number];
  enabled?: boolean;
  onZoom: (transform: d3.ZoomTransform) => void;
}

export interface UseD3ZoomResult<T extends Element> {
  ref: RefObject<T>;
  reset: () => void;
  /** Imperatively apply a transform (e.g. from a drag on the axis strip) — goes through the
   *  d3-zoom behavior itself so its internally-tracked state stays in sync with wheel/drag input. */
  setTransform: (transform: d3.ZoomTransform) => void;
}

/**
 * Wires a d3-zoom behavior (wheel/pinch to zoom, drag to pan) onto the
 * returned ref's element — typically a transparent overlay `<rect>` on
 * top of the plot area. Call `reset()` to animate back to identity.
 */
export function useD3Zoom<T extends Element>({
  width,
  height,
  scaleExtent = [1, 8],
  enabled = true,
  onZoom,
}: UseD3ZoomOptions): UseD3ZoomResult<T> {
  const ref = useRef<T>(null);
  const behaviorRef = useRef<d3.ZoomBehavior<T, unknown> | null>(null);
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;
  const [scaleMin, scaleMax] = scaleExtent;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || width <= 0 || height <= 0) return;

    const behavior = d3
      .zoom<T, unknown>()
      .scaleExtent([scaleMin, scaleMax])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .extent([
        [0, 0],
        [width, height],
      ])
      .on("zoom", (event: d3.D3ZoomEvent<T, unknown>) => onZoomRef.current(event.transform));

    behaviorRef.current = behavior;
    const selection = d3.select(el);
    selection.call(behavior);

    return () => {
      selection.on(".zoom", null);
      behaviorRef.current = null;
    };
  }, [enabled, width, height, scaleMin, scaleMax]);

  return {
    ref,
    reset: () => {
      const el = ref.current;
      const behavior = behaviorRef.current;
      if (!el || !behavior) return;
      d3.select(el).transition().duration(250).call(behavior.transform, d3.zoomIdentity);
    },
    setTransform: (t: d3.ZoomTransform) => {
      const el = ref.current;
      const behavior = behaviorRef.current;
      if (!el || !behavior) return;
      d3.select(el).call(behavior.transform, t);
    },
  };
}
