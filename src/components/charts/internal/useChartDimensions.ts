import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  boundedWidth: number;
  boundedHeight: number;
  margin: ChartMargin;
}

const DEFAULT_MARGIN: ChartMargin = { top: 16, right: 16, bottom: 32, left: 48 };

/**
 * Tracks a wrapper element's size via ResizeObserver and derives the plot
 * area (bounded box) once margins are subtracted. `height` can be a fixed
 * number of pixels, or omitted to derive it from `aspectRatio` (height = width / ratio)
 * or, failing that, the wrapper's own observed height — pass `height: undefined`
 * (e.g. while in fullscreen mode, see `useFullscreen`) to let the chart fill
 * whatever height its container actually has. `width` works the same way, fixed
 * instead of following the wrapper's own (usually 100%-of-parent) observed width —
 * the caller is responsible for also giving the wrapper an inline width matching it,
 * since this hook only measures, it doesn't itself size the element.
 */
export function useChartDimensions(
  margin: Partial<ChartMargin> = {},
  options: { width?: number; height?: number; aspectRatio?: number } = {}
): [RefObject<HTMLDivElement>, ChartDimensions] {
  const ref = useRef<HTMLDivElement>(null);
  const resolvedMargin: ChartMargin = { ...DEFAULT_MARGIN, ...margin };
  const [size, setSize] = useState({ width: options.width ?? 0, height: options.height ?? 320 });

  // Re-measures synchronously (before paint) whenever a fixed width/height/aspectRatio is added,
  // removed, or changed — most notably toggling fullscreen, which flips `height`/`width` between
  // a fixed number and `undefined` (see `useFullscreen`). ResizeObserver's own callback fires
  // asynchronously; relying on it alone left `size` stale for a render or two right after the
  // CSS class actually changed (the canvas redraws correctly every render off the same `dims`,
  // but ChartAxis's own persistent tick DOM was mutated in place using that stale, differently
  // sized scale — most visibly right after exiting fullscreen, where its ticks briefly kept the
  // fullscreen-sized layout and rendered past the now-smaller chart's edges).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = options.width ?? rect.width;
    const height = options.height ?? (options.aspectRatio ? width / options.aspectRatio : rect.height || 320);
    setSize({ width, height });
  }, [options.width, options.height, options.aspectRatio]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = options.width ?? entry.contentRect.width;
      const height = options.height ?? (options.aspectRatio ? width / options.aspectRatio : entry.contentRect.height || 320);
      setSize({ width, height });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [options.width, options.height, options.aspectRatio]);

  const boundedWidth = Math.max(0, size.width - resolvedMargin.left - resolvedMargin.right);
  const boundedHeight = Math.max(0, size.height - resolvedMargin.top - resolvedMargin.bottom);

  return [
    ref,
    {
      width: size.width,
      height: size.height,
      boundedWidth,
      boundedHeight,
      margin: resolvedMargin,
    },
  ];
}
