import { useEffect } from "react";
import type { RefObject } from "react";
import { renderCandlestickChart } from "../render/renderChart";
import type { RenderCandlestickChartParams } from "../interfaces/RenderCandlestickChartParams.interface";

export interface UseRenderCandlestickChartArgs extends RenderCandlestickChartParams {
  canvasRef: RefObject<HTMLCanvasElement>;
  wrapperRef: RefObject<HTMLDivElement>;
  /** Forces a re-render on theme/palette change even though nothing here reads it directly —
   *  renderCandlestickChart pulls its own colors straight off the DOM's CSS custom properties at
   *  draw time (canvas has no live binding to them the way SVG/CSS elements do), so nothing in
   *  `RenderCandlestickChartParams` itself would otherwise change when only the palette does. */
  themeTick: number;
}

/** CandlestickChart's own single "draw everything" effect — split out purely to keep that file
 *  under its own 1000-line cap (the params list plus its own deps array was ~85 lines on its own),
 *  not because this has a life of its own beyond that one call. `RenderCandlestickChartParams` is
 *  already the single source of truth for what `renderCandlestickChart` itself needs, so this
 *  hook's own args just extend it rather than redeclaring a second, parallel field list. */
export function useRenderCandlestickChart({ canvasRef, wrapperRef, themeTick, ...params }: UseRenderCandlestickChartArgs) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    renderCandlestickChart(canvas, wrapper, params);
    // `params`' own keys are a fixed set (RenderCandlestickChartParams' own shape never changes
    // between renders), so Object.values(params) is a same-length array every call — a valid (if
    // eslint-illegible) dependency list covering every one of its fields at once; `themeTick` is
    // listed separately since it isn't one of `params`' own fields (see its own doc above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, wrapperRef, themeTick, ...Object.values(params)]);
}
