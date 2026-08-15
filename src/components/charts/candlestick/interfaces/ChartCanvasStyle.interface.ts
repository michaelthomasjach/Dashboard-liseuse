/** Theme colors + font, read once from the DOM at the top of `renderCandlestickChart` (canvas
 *  has no live binding to CSS custom properties) and threaded into every phase function instead
 *  of each re-reading `getComputedStyle` itself. */
export interface ChartCanvasStyle {
  colorUp: string;
  colorDown: string;
  colorBg: string;
  colorText: string;
  colorMuted: string;
  colorAccent: string;
  colorGrid: string;
  fontFamily: string;
  isEink: boolean;
}
