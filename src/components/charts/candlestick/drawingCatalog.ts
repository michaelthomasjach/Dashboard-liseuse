import {
  TrendLineIcon,
  ExtendedLineIcon,
  ChannelIcon,
  DisjointChannelIcon,
  HorizontalLineIcon,
  HorizontalRayIcon,
  VerticalLineIcon,
  FibonacciIcon,
  FibonacciExtensionIcon,
  ElliottImpulseIcon,
  ElliottCorrectionIcon,
  RectangleShapeIcon,
  ZonesIcon,
  ElbowArrowIcon,
  BrushIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLineIcon,
  MeasureIcon,
  OverlayBadgeIcon,
  HeadShouldersIcon,
  ForecastIcon,
} from "../../icons";
import type { DrawingToolType } from "./interfaces/DrawingToolType.interface";
import type { TrendLineDrawing } from "./interfaces/TrendLineDrawing.interface";

/** Standard Fibonacci retracement ratios, 0 (y1) to 1 (y2) — the same default set most trading
 *  platforms show (TradingView included). Not configurable per drawing: there was no request for
 *  that, and hand-rolling a "which levels" UI for one tool would be a lot of surface area for a
 *  set virtually everyone leaves at the defaults anyway. */
export const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/** Standard Fibonacci extension ratios — projected from the 3rd point (C) by this fraction of
 *  the 1st-to-2nd (A-to-B) leg's own price span, the conventional "trend-based Fib extension"
 *  formula most trading platforms use. */
export const FIBONACCI_EXTENSION_LEVELS = [0, 0.382, 0.618, 1, 1.382, 1.618, 2, 2.618];

/** How many points *beyond* x1/y1 and x2/y2 each multi-point tool collects before committing,
 *  and what each of those extra points (plus the first two) is labeled in the edit modal.
 *  Governs two different things depending on the tool: for fibonacciExtension/elliottCorrection/
 *  elliottImpulse, `handleOverlayClick` uses `extraPoints` to drive the actual generic
 *  click-collection loop (each click becomes one more raw point, verbatim). "disjointChannel" is
 *  here *only* for its edit-modal labels — its own placement flow is entirely custom (see
 *  handleOverlayClick's dedicated branch, checked before the generic one below it ever runs) since
 *  its 4th point is computed, not clicked. Tools not listed here (trendline/extended/fibonacci: 2
 *  points total; channel: 3, but its 3rd click sets `channelOffset` instead of a raw point,
 *  handled separately) don't use this at all. */
export const MULTI_POINT_TOOLS: Partial<Record<DrawingToolType, { extraPoints: number; labels: string[] }>> = {
  fibonacciExtension: { extraPoints: 1, labels: ["Point A", "Point B", "Point C"] },
  elliottCorrection: { extraPoints: 2, labels: ["Point 0", "Point A", "Point B", "Point C"] },
  elliottImpulse: { extraPoints: 4, labels: ["Point 0", "Point 1", "Point 2", "Point 3", "Point 4", "Point 5"] },
  disjointChannel: { extraPoints: 2, labels: ["Point 1", "Point 2", "Point 3", "Point 4"] },
  headShoulders: { extraPoints: 3, labels: ["Épaule gauche", "Tête", "Épaule droite", "Ligne de cou (début)", "Ligne de cou (fin)"] },
};

// Short vertex labels drawn directly on the chart next to each point — distinct from
// MULTI_POINT_TOOLS' longer "Point X" labels, which are for the edit modal's field list instead.
export const ELLIOTT_IMPULSE_VERTEX_LABELS = ["0", "1", "2", "3", "4", "5"];
export const ELLIOTT_CORRECTION_VERTEX_LABELS = ["0", "A", "B", "C"];
// Only the three peaks get a label — the neckline's own two points (indices 3-4) aren't
// individually identified the way a peak is, same "not every vertex needs a name" idea a
// disjointChannel's own 4 points already accept.
export const HEAD_SHOULDERS_VERTEX_LABELS = ["ÉG", "T", "ÉD", "", ""];

export interface DrawingToolDef {
  type: DrawingToolType;
  label: string;
  icon: typeof TrendLineIcon;
}

export interface DrawingToolCategory {
  /** Stable key — also what tracks each category's own "last picked tool" and open/closed
   *  dropdown state, so it has to stay unique and never change once shipped. */
  id: string;
  tools: DrawingToolDef[];
}

// Each category gets its own button + chevron + dropdown in the rail (see the JSX below) —
// the button represents whichever of its own tools was picked last (defaulting to the first),
// same as the single button used to for the whole flat list before categories existed.
export const DRAWING_TOOL_CATEGORIES: DrawingToolCategory[] = [
  {
    id: "lines",
    tools: [
      { type: "trendline", label: "Ligne de tendance", icon: TrendLineIcon },
      { type: "extended", label: "Ligne étendue", icon: ExtendedLineIcon },
      { type: "channel", label: "Canal", icon: ChannelIcon },
      { type: "disjointChannel", label: "Canal disjoint", icon: DisjointChannelIcon },
      { type: "horizontal", label: "Ligne horizontale", icon: HorizontalLineIcon },
      { type: "ray", label: "Ligne horizontale (à partir d'une date)", icon: HorizontalRayIcon },
      { type: "vertical", label: "Ligne verticale", icon: VerticalLineIcon },
    ],
  },
  {
    id: "fibonacci",
    tools: [
      { type: "fibonacci", label: "Retracement de Fibonacci", icon: FibonacciIcon },
      { type: "fibonacciExtension", label: "Extension de Fibonacci", icon: FibonacciExtensionIcon },
    ],
  },
  {
    id: "elliott",
    tools: [
      { type: "elliottImpulse", label: "Vague d'Elliott (impulsive)", icon: ElliottImpulseIcon },
      { type: "elliottCorrection", label: "Vague d'Elliott (correctrice)", icon: ElliottCorrectionIcon },
    ],
  },
  {
    id: "shapes",
    tools: [
      { type: "rectangle", label: "Rectangle", icon: RectangleShapeIcon },
      { type: "zones", label: "Zones (positif/neutre/négatif)", icon: ZonesIcon },
      { type: "elbowArrow", label: "Flèche coudée", icon: ElbowArrowIcon },
      { type: "brush", label: "Pinceau", icon: BrushIcon },
      { type: "arrowUp", label: "Flèche haut", icon: ArrowUpIcon },
      { type: "arrowDown", label: "Flèche bas", icon: ArrowDownIcon },
      { type: "arrowLine", label: "Ligne fléchée", icon: ArrowLineIcon },
    ],
  },
  {
    id: "measure",
    tools: [{ type: "measure", label: "Mesure", icon: MeasureIcon }],
  },
  {
    id: "patterns",
    tools: [
      { type: "headShoulders", label: "ETE (Épaule-Tête-Épaule)", icon: HeadShouldersIcon },
      { type: "forecast", label: "Projection de prix", icon: ForecastIcon },
    ],
  },
];

export function categoryOfTool(type: DrawingToolType): DrawingToolCategory {
  return DRAWING_TOOL_CATEGORIES.find((c) => c.tools.some((t) => t.type === type)) ?? DRAWING_TOOL_CATEGORIES[0];
}

// Which tool would have created a drawing shaped like this one — `lineType` covers most of them
// directly, but a plain two-point line (undefined `lineType`) is either "Ligne de tendance" or
// "Ligne fléchée" depending on arrowLeft/arrowRight, since neither of those two tools sets a
// `lineType` of its own to disambiguate by. Used for both its label and its icon, e.g. in the
// "Dessins et indicateurs" modal's per-row badge.
export function drawingToolMeta(dr: TrendLineDrawing): { label: string; icon: typeof TrendLineIcon } {
  // Not a click-to-place tool (added from the symbol-search modal instead — see
  // onAddSymbolOverlay), so it has no entry in DRAWING_TOOL_CATEGORIES to find below. Reuses
  // OverlayBadgeIcon (already means "drawn directly over the price candles" elsewhere) rather
  // than a new icon just for this.
  if (dr.lineType === "symbolOverlay") {
    return { label: [dr.overlaySymbol, dr.overlaySymbolName].filter(Boolean).join(" · ") || "Symbole", icon: OverlayBadgeIcon };
  }
  const toolId: DrawingToolType = dr.lineType ?? (dr.arrowLeft || dr.arrowRight ? "arrowLine" : "trendline");
  for (const category of DRAWING_TOOL_CATEGORIES) {
    const tool = category.tools.find((t) => t.type === toolId);
    if (tool) return tool;
  }
  return DRAWING_TOOL_CATEGORIES[0].tools[0];
}

// A drawing's own `text` (set from its edit modal's Texte tab) if it has one, otherwise falls
// back to its tool's own name (see drawingToolMeta).
export function drawingLabel(dr: TrendLineDrawing): string {
  return dr.text || drawingToolMeta(dr).label;
}
