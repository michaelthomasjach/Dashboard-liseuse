import { useEffect, useRef, useState, type RefObject } from "react";

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
 * number of pixels, or omitted to derive it from `aspectRatio` (height = width / ratio).
 *
 * While the wrapper is the active Fullscreen API element (see `useFullscreen`),
 * the fixed `height` is ignored in favor of the element's real (viewport-filling)
 * height, so a chart's fullscreen mode actually fills the screen.
 */
export function useChartDimensions(
  margin: Partial<ChartMargin> = {},
  options: { height?: number; aspectRatio?: number } = {}
): [RefObject<HTMLDivElement>, ChartDimensions] {
  const ref = useRef<HTMLDivElement>(null);
  const resolvedMargin: ChartMargin = { ...DEFAULT_MARGIN, ...margin };
  const [size, setSize] = useState({ width: 0, height: options.height ?? 320 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const computeHeight = (observedHeight: number, width: number) => {
      if (document.fullscreenElement === node) return observedHeight || options.height || 320;
      return options.height ?? (options.aspectRatio ? width / options.aspectRatio : observedHeight || 320);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      setSize({ width, height: computeHeight(entry.contentRect.height, width) });
    });
    observer.observe(node);

    // The ResizeObserver callback can lag a frame behind the fullscreen
    // transition; force one more read once it actually completes.
    const onFullscreenChange = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: computeHeight(rect.height, rect.width) });
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [options.height, options.aspectRatio]);

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
