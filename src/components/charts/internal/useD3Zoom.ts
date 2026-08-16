import { useEffect, useRef, useState, type RefObject } from "react";
import * as d3 from "d3";

export interface UseD3ZoomOptions {
  width: number;
  height: number;
  /** [min, max] scale factor. Default [1, 8]. */
  scaleExtent?: [number, number];
  enabled?: boolean;
  onZoom: (transform: d3.ZoomTransform) => void;
  /** Extra predicate (on top of d3-zoom's own default filter) to reject a gesture — e.g.
   *  rejecting a drag that starts on top of a draggable annotation so it doesn't also pan the
   *  chart underneath it. Read fresh on every event (not memoized — always pass the live value,
   *  a ref-backed callback works well here). */
  filter?: (event: Event) => boolean;
  /** Overrides d3-zoom's own default translateExtent-based clamping of the resulting transform
   *  — e.g. allowing panning past the data's own edges by an amount that scales with the current
   *  zoom level, which a fixed translateExtent can't express (it clamps in constant world units,
   *  not as a fraction of the current viewport). Read fresh on every event, same as `filter`. */
  constrain?: (transform: d3.ZoomTransform, extent: [[number, number], [number, number]], translateExtent: [[number, number], [number, number]]) => d3.ZoomTransform;
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
  filter,
  constrain,
}: UseD3ZoomOptions): UseD3ZoomResult<T> {
  const behaviorRef = useRef<d3.ZoomBehavior<T, unknown> | null>(null);
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const constrainRef = useRef(constrain);
  constrainRef.current = constrain;
  const [scaleMin, scaleMax] = scaleExtent;

  // A plain `useRef` never tells this hook when its *element* gets swapped for a new one — e.g.
  // the plot area unmounting/remounting when toggling SeasonalityView on and off leaves the
  // attach effect below none the wiser, since `ref.current` isn't itself a dependency (refs never
  // trigger re-renders) and nothing else in the effect's own deps necessarily changes across that
  // remount. The result: the fresh element never gets d3-zoom's event listeners, and pan/zoom
  // silently stops working the moment the user comes back. `current` is instead a getter/setter
  // pair over a plain variable — functionally identical to a normal ref for every existing reader
  // (`ref.current`, `ref={ref}` in JSX), but the setter (which React calls on mount *and* unmount)
  // bumps `mountTick`, so the effect's dependency array below can see the swap and re-attach.
  const [mountTick, setMountTick] = useState(0);
  const nodeRef = useRef<{ current: T | null }>();
  if (!nodeRef.current) {
    let node: T | null = null;
    nodeRef.current = Object.defineProperty({} as { current: T | null }, "current", {
      get: () => node,
      set: (v: T | null) => {
        node = v;
        setMountTick((t) => t + 1);
      },
      enumerable: true,
    });
  }
  const ref = nodeRef.current;

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
      .filter((event: Event & { ctrlKey?: boolean; button?: number }) => {
        // Mirrors d3-zoom's own default filter exactly (ctrl+wheel is a trackpad pinch gesture,
        // not a modifier click, so it stays allowed; only ctrl+drag/click is rejected).
        const defaultOk = (!event.ctrlKey || event.type === "wheel") && !event.button;
        return defaultOk && (filterRef.current ? filterRef.current(event) : true);
      })
      .on("zoom", (event: d3.D3ZoomEvent<T, unknown>) => onZoomRef.current(event.transform));

    // Captures d3-zoom's own default translateExtent-based constrain function before
    // (optionally) overriding it below, so a caller-supplied `constrain` can still be swapped in
    // and out (e.g. re-enabled/disabled) via the ref without losing the fallback.
    const defaultConstrain = behavior.constrain();
    behavior.constrain((transform, extent, translateExtent) =>
      constrainRef.current ? constrainRef.current(transform, extent, translateExtent) : defaultConstrain(transform, extent, translateExtent)
    );

    behaviorRef.current = behavior;
    const selection = d3.select(el);
    selection.call(behavior);

    return () => {
      selection.on(".zoom", null);
      behaviorRef.current = null;
    };
  }, [enabled, width, height, scaleMin, scaleMax, mountTick, ref]);

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
