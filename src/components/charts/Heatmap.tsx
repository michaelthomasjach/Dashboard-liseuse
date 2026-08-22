import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as d3 from "d3";
import { useD3Zoom } from "./internal/useD3Zoom";
import { ChevronRightIcon } from "../icons";
import "./charts-shared.css";
import "./Heatmap.css";

export interface HeatmapTile {
  id: string;
  label: string;
  /** Sizing metric — a bigger value gets a bigger tile (e.g. market cap). */
  value: number;
  /** Drives the tile's own color via `colorScale`/`colorDomain` — often a *different* metric
   *  than `value` (e.g. % change vs. market cap, the classic stock-heatmap pairing), so kept
   *  separate rather than reusing `value` for both. */
  colorValue: number;
  logoUrl?: string;
  logoColor?: string;
  /** Shown inside the tile itself, under the label (e.g. "+1.24%") — purely display text, not
   *  read for sizing/coloring (see `value`/`colorValue` for those). Falls back to `colorValue`
   *  itself, fixed to 2 decimals, when omitted. */
  formattedValue?: string;
  /** Rendered as-is in the hover/press tooltip — full caller control (compose, don't configure),
   *  falling back to a plain label/value line when omitted. */
  tooltip?: ReactNode;
}

export interface HeatmapGroup {
  id: string;
  label: string;
  tiles: HeatmapTile[];
}

export interface HeatmapProps {
  groups: HeatmapGroup[];
  width?: number;
  height?: number;
  /** [min, max] `colorValue` mapped to the fullest down/up color — anything past either end
   *  clamps to it rather than extrapolating further. Default [-3, 3] (percent-change scale). */
  colorDomain?: [number, number];
  /** Fires when a *tile* (never a group — see this component's own doc for why) is clicked. */
  onTileClick?: (tile: HeatmapTile) => void;
  className?: string;
}

const GROUP_HEADER_HEIGHT = 22;
const OUTER_PADDING = 2;

// d3.hierarchy needs one uniform data type across every level of the tree — HeatmapGroup and
// HeatmapTile can't sit directly in the same hierarchy, so this wraps each as the same shape,
// discriminated by which of `tile`/`group` is set (leaves carry `tile`, depth-1 nodes carry
// `group`, matching d3's own `.depth`/`.leaves()` so no separate "is this a leaf" check is
// needed anywhere the hierarchy itself is read back out).
interface HTreeNode {
  id: string;
  children?: HTreeNode[];
  tile?: HeatmapTile;
  group?: HeatmapGroup;
}
function tileNode(tile: HeatmapTile): HTreeNode {
  return { id: tile.id, tile };
}
function groupTreeNode(group: HeatmapGroup): HTreeNode {
  return { id: group.id, group, children: group.tiles.map(tileNode) };
}

interface PositionedNode {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  isGroup: boolean;
  group?: HeatmapGroup;
  tile?: HeatmapTile;
}

// A node's own color as a CSS color-mix() string against the *live* theme's up/down colors —
// same technique WorldExposureMap already uses for its own intensity shading, and for the same
// reason: it needs no JS-side theme lookup (color-mix resolves the CSS custom properties itself,
// at paint time), and degrades gracefully under the E-ink palette, where colorUp/colorDown are
// the same color — magnitude still reads as intensity there even with no hue to distinguish
// gains from losses by.
function tileColor(colorValue: number, domain: [number, number]): string {
  const [lo, hi] = domain;
  const clamped = Math.max(lo, Math.min(hi, colorValue));
  const span = Math.max(Math.abs(lo), Math.abs(hi), 1e-6);
  const magnitude = Math.abs(clamped) / span;
  const hueVar = clamped >= 0 ? "--lq-color-up" : "--lq-color-down";
  const percent = Math.round(15 + magnitude * 70);
  return `color-mix(in srgb, var(${hueVar}) ${percent}%, var(--lq-color-panel))`;
}

/** Squarified-treemap "stock heatmap": stocks grouped by sector, each tile sized by one metric
 *  (`value`) and colored by another (`colorValue`) — the classic pairing being market cap for
 *  size, % change for color, though nothing here assumes that specifically. Click a group's own
 *  header to drill into just it (filling the whole plot, with a breadcrumb back to "Tout"); click
 *  a tile to report it via `onTileClick` instead — a tile has no children to drill into, so that
 *  gesture reports outward (compose, don't configure: what "clicking a stock" should actually do,
 *  loading it into a chart or anything else, is entirely up to the caller) rather than doing
 *  anything to this component's own view state. Built on `useD3Zoom`, the same internal hook
 *  every other zoomable chart in this library already shares — wheel-to-zoom already zooms
 *  toward the cursor by construction (d3-zoom's own default behavior), nothing extra needed here
 *  for that. */
export function Heatmap({ groups, width = 900, height = 560, colorDomain = [-3, 3], onTileClick, className }: HeatmapProps) {
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<{ node: PositionedNode; x: number; y: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  const focusedGroup = groups.find((g) => g.id === focusedGroupId) ?? null;

  const nodes = useMemo(() => {
    if (focusedGroup) {
      // A single flat level — no group header space reserved, every tile fills the whole plot
      // the same way a group's own tiles do within its own rect at the top level (see the
      // `else` branch below), just without a second nesting level above it.
      const root = d3.hierarchy<HTreeNode>({ id: "root", children: focusedGroup.tiles.map(tileNode) }).sum((d) => d.tile?.value ?? 0);
      const laidOut = d3.treemap<HTreeNode>().tile(d3.treemapSquarify).size([width, height]).paddingOuter(OUTER_PADDING).paddingInner(1).round(true)(root);
      return laidOut.leaves().map(
        (leaf): PositionedNode => ({ id: leaf.data.id, x0: leaf.x0, y0: leaf.y0, x1: leaf.x1, y1: leaf.y1, isGroup: false, tile: leaf.data.tile })
      );
    }

    // One hierarchy, one treemap call, covering *both* levels at once — d3.treemap lays out
    // every descendant node's own x0/y0/x1/y1, recursively tiling each node's children within
    // that node's own (padding-adjusted) rect, not just the leaves. `paddingTop` is a function of
    // the node rather than a constant specifically so the header gap applies only when laying out
    // a *group's* own children (depth 1) — applying it uniformly would also carve a dead 22px
    // strip out of the very top of the whole plot, above the groups themselves (depth 0 → 1).
    const root = d3
      .hierarchy<HTreeNode>({ id: "root", children: groups.map(groupTreeNode) })
      .sum((d) => d.tile?.value ?? 0);
    const laidOut = d3
      .treemap<HTreeNode>()
      .tile(d3.treemapSquarify)
      .size([width, height])
      .paddingOuter(OUTER_PADDING)
      .paddingTop((d) => (d.depth === 1 ? GROUP_HEADER_HEIGHT : 0))
      .paddingInner(1)
      .round(true)(root);

    const result: PositionedNode[] = [];
    for (const groupN of laidOut.children ?? []) {
      const group = groupN.data.group;
      if (!group) continue;
      result.push({ id: group.id, x0: groupN.x0, y0: groupN.y0, x1: groupN.x1, y1: groupN.y0 + GROUP_HEADER_HEIGHT, isGroup: true, group });
      for (const leaf of groupN.leaves()) {
        if (!leaf.data.tile) continue;
        result.push({ id: leaf.data.id, x0: leaf.x0, y0: leaf.y0, x1: leaf.x1, y1: leaf.y1, isGroup: false, tile: leaf.data.tile });
      }
    }
    return result;
  }, [groups, focusedGroup, width, height]);

  const { ref: zoomRef, reset: resetZoom } = useD3Zoom<SVGRectElement>({
    width,
    height,
    scaleExtent: [1, 12],
    onZoom: setTransform,
  });

  function openGroup(groupId: string) {
    setFocusedGroupId(groupId);
    resetZoom();
    setHovered(null);
  }
  function closeGroup() {
    setFocusedGroupId(null);
    resetZoom();
    setHovered(null);
  }

  function showTooltip(node: PositionedNode, e: React.PointerEvent) {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHovered({ node, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  const isZoomed = transform.k !== 1 || transform.x !== 0 || transform.y !== 0;

  return (
    <div className={["lq-heatmap", className].filter(Boolean).join(" ")} ref={wrapperRef} style={{ width, height }}>
      {focusedGroup && (
        <div className="lq-heatmap__breadcrumb">
          <button type="button" onClick={closeGroup}>
            Tout
          </button>
          <ChevronRightIcon size={12} />
          <span>{focusedGroup.label}</span>
        </div>
      )}
      {isZoomed && (
        <div className="lq-chart__toolbar">
          <button type="button" className="lq-chart__reset-button" onClick={resetZoom}>
            Réinitialiser le zoom
          </button>
        </div>
      )}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" onPointerLeave={() => setHovered(null)}>
        {/* Rendered *before* the tiles/groups below (not after) so it sits behind them in
            stacking order — matching every other zoomable SVG chart in this library (see
            BarChart's own `.lq-chart__overlay` placement): individual tiles/groups need their
            own hover/click handlers to actually receive pointer events, which a same-size
            overlay drawn on *top* of them would otherwise swallow entirely. */}
        <rect ref={zoomRef} className="lq-chart__overlay" width={width} height={height} onDoubleClick={resetZoom} />
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {nodes.map((node) =>
            node.isGroup && node.group ? (
              <g
                key={node.id}
                className="lq-heatmap__group-header"
                onClick={() => openGroup(node.group!.id)}
                onPointerEnter={(e) => showTooltip(node, e)}
                onPointerMove={(e) => showTooltip(node, e)}
              >
                <rect x={node.x0} y={node.y0} width={node.x1 - node.x0} height={node.y1 - node.y0} />
                <text x={node.x0 + 6} y={node.y0 + (node.y1 - node.y0) / 2}>
                  {node.group.label}
                </text>
              </g>
            ) : (
              node.tile && (
                <g
                  key={node.id}
                  className="lq-heatmap__tile"
                  onClick={() => onTileClick?.(node.tile!)}
                  onPointerEnter={(e) => showTooltip(node, e)}
                  onPointerMove={(e) => showTooltip(node, e)}
                >
                  <rect
                    x={node.x0}
                    y={node.y0}
                    width={Math.max(0, node.x1 - node.x0)}
                    height={Math.max(0, node.y1 - node.y0)}
                    fill={tileColor(node.tile.colorValue, colorDomain)}
                  />
                  <HeatmapTileContent node={node} />
                </g>
              )
            )
          )}
        </g>
      </svg>

      {hovered && (
        <div className="lq-heatmap__tooltip" style={{ left: hovered.x, top: hovered.y }}>
          {hovered.node.tile ? (
            (hovered.node.tile.tooltip ?? (
              <>
                <strong>{hovered.node.tile.label}</strong>
                <span>{hovered.node.tile.formattedValue ?? hovered.node.tile.colorValue.toFixed(2)}</span>
              </>
            ))
          ) : (
            <strong>{hovered.node.group?.label}</strong>
          )}
        </div>
      )}
    </div>
  );
}

// Split out purely so the label/value text sizing can bail out early on a tile too small to hold
// it (see MIN_LABEL_WIDTH/HEIGHT below) without cluttering the main render loop above with that
// same two-line check for every single tile.
const MIN_LABEL_WIDTH = 40;
const MIN_LABEL_HEIGHT = 28;
function HeatmapTileContent({ node }: { node: PositionedNode }) {
  const tile = node.tile;
  if (!tile) return null;
  const w = node.x1 - node.x0;
  const h = node.y1 - node.y0;
  if (w < MIN_LABEL_WIDTH || h < MIN_LABEL_HEIGHT) return null;
  const cx = node.x0 + w / 2;
  const cy = node.y0 + h / 2;
  const showLogo = h > MIN_LABEL_HEIGHT * 1.6;
  return (
    <g className="lq-heatmap__tile-content" pointerEvents="none">
      {showLogo &&
        (tile.logoUrl ? (
          <image href={tile.logoUrl} x={cx - 10} y={cy - h / 4 - 10} width={20} height={20} clipPath="circle(10px)" />
        ) : (
          <circle cx={cx} cy={cy - h / 4} r={10} fill={tile.logoColor ?? "var(--lq-color-text-muted)"} />
        ))}
      <text x={cx} y={showLogo ? cy + 2 : cy - 6} className="lq-heatmap__tile-label">
        {tile.label}
      </text>
      <text x={cx} y={showLogo ? cy + 16 : cy + 10} className="lq-heatmap__tile-value">
        {tile.formattedValue ?? tile.colorValue.toFixed(2)}
      </text>
    </g>
  );
}
