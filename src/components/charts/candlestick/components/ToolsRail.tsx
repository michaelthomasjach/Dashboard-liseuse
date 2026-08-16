import { Fragment, useRef, useState } from "react";
import type { RefObject, Dispatch, SetStateAction } from "react";
import { Popover } from "../../../forms/Popover";
import { Checkbox } from "../../../forms/Checkbox";
import { ChevronDownIcon, MagnetIcon, EyeIcon, EyeOffIcon, LockIcon, BellIcon, LayersIcon } from "../../../icons";
import type { DrawingToolType } from "../interfaces/DrawingToolType.interface";
import { DRAWING_TOOL_CATEGORIES } from "../drawingCatalog";
import { capitalize } from "../formatting";

export interface ToolsRailProps {
  drawingTools: boolean;
  dims: { margin: { left: number } };
  plotHeight: number;
  selectedToolByCategory: Record<string, DrawingToolType>;
  openToolMenu: string | null;
  setOpenToolMenu: Dispatch<SetStateAction<string | null>>;
  activeTool: DrawingToolType | null;
  handleToolClick: (tool: DrawingToolType) => void;
  handleSelectToolType: (type: DrawingToolType) => void;
  menuAnchorRefFor: (categoryId: string) => RefObject<HTMLButtonElement>;
  magnetActive: boolean;
  setMagnetActive: Dispatch<SetStateAction<boolean>>;
  drawingsHidden: boolean;
  setDrawingsHidden: Dispatch<SetStateAction<boolean>>;
  drawingsLocked: boolean;
  setDrawingsLocked: Dispatch<SetStateAction<boolean>>;
  eventKinds: string[];
  hiddenEventKinds: Set<string>;
  setHiddenEventKinds: Dispatch<SetStateAction<Set<string>>>;
  indicatorsManagerOpen: boolean;
  setIndicatorsManagerOpen: Dispatch<SetStateAction<boolean>>;
}

/** The left-docked drawing-tools rail (`drawingTools` prop): one button + chevron + flyout menu
 *  per tool category (Lignes/Fibonacci/Vagues d'Elliott/Formes/Mesure), then the persistent
 *  aimant/hide-drawings/lock-drawings/event-visibility toggles, then the "Dessins et indicateurs"
 *  manager button pinned to the rail's own bottom edge. Purely presentational — every interaction
 *  is a callback prop from `useDrawingState`/`useChartEvents`. */
export function ToolsRail({
  drawingTools,
  dims,
  plotHeight,
  selectedToolByCategory,
  openToolMenu,
  setOpenToolMenu,
  activeTool,
  handleToolClick,
  handleSelectToolType,
  menuAnchorRefFor,
  magnetActive,
  setMagnetActive,
  drawingsHidden,
  setDrawingsHidden,
  drawingsLocked,
  setDrawingsLocked,
  eventKinds,
  hiddenEventKinds,
  setHiddenEventKinds,
  indicatorsManagerOpen,
  setIndicatorsManagerOpen,
}: ToolsRailProps) {
  const [eventsMenuOpen, setEventsMenuOpen] = useState(false);
  const eventsMenuAnchorRef = useRef<HTMLButtonElement>(null);

  if (!drawingTools) return null;
  return (
    <div className="lq-chart__tools-rail" style={{ width: dims.margin.left, height: plotHeight }}>
      <div className="lq-chart__tools-rail-items">
        {/* One group per category (Lignes/Fibonacci/Vagues d'Elliott) — each button
            represents whichever of its own tools was picked last (defaulting to the
            first). The chevron is invisible until its own group (button or chevron) is
            hovered — see .lq-chart__tool-chevron in charts-shared.css. Picking a tool from
            a category's menu both changes what its button represents *and* activates it
            immediately (see handleSelectToolType) — clicking the button itself afterward
            just toggles that same tool on/off, same as any other tool selection. */}
        {DRAWING_TOOL_CATEGORIES.map((category) => {
          const selectedType = selectedToolByCategory[category.id] ?? category.tools[0].type;
          const selectedInCategory = category.tools.find((t) => t.type === selectedType) ?? category.tools[0];
          const CategoryIcon = selectedInCategory.icon;
          const menuOpen = openToolMenu === category.id;
          return (
            <Fragment key={category.id}>
              {/* A thin rule ahead of "Mesure" only — visually separates the shape/marker
                  tools above from the standalone measuring tool, which doesn't add a
                  drawing to the chart the way every category above it does. */}
              {category.id === "measure" && <div className="lq-chart__tool-separator" aria-hidden="true" />}
              <div className="lq-chart__tool-group">
              <button
                type="button"
                className={["lq-chart__icon-button", activeTool === selectedInCategory.type && "lq-chart__icon-button--active"]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleToolClick(selectedInCategory.type)}
                aria-label={selectedInCategory.label}
                aria-pressed={activeTool === selectedInCategory.type}
              >
                <CategoryIcon size={14} />
              </button>
              {/* Only worth a dropdown once there's actually something to pick between —
                  a single-tool category (e.g. "Mesure" today) has nowhere else for the
                  chevron to lead, so it stays off entirely instead of opening an empty-ish
                  one-item menu. Adding a 2nd tool to that category later makes this
                  reappear on its own, no extra wiring needed. */}
              {category.tools.length > 1 && (
                <>
                  <button
                    ref={menuAnchorRefFor(category.id)}
                    type="button"
                    className={["lq-chart__tool-chevron", menuOpen && "lq-chart__tool-chevron--visible"].filter(Boolean).join(" ")}
                    onClick={() => setOpenToolMenu((o) => (o === category.id ? null : category.id))}
                    aria-label={`Autres outils — ${category.id}`}
                  >
                    <ChevronDownIcon size={8} />
                  </button>
                  <Popover
                    open={menuOpen}
                    onClose={() => setOpenToolMenu(null)}
                    anchorRef={menuAnchorRefFor(category.id)}
                    placement="bottom"
                  >
                    <div className="lq-chart__tool-menu">
                      {category.tools.map((opt) => {
                        const OptionIcon = opt.icon;
                        return (
                          <button
                            key={opt.type}
                            type="button"
                            className={["lq-chart__tool-menu-option", opt.type === selectedType && "lq-chart__tool-menu-option--selected"]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => handleSelectToolType(opt.type)}
                          >
                            <OptionIcon size={14} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </Popover>
                </>
              )}
              </div>
            </Fragment>
          );
        })}
        {/* A persistent modifier, not a tool of its own — stays on across tool switches
            (see toDataPoint/magnetSnapPrice) until toggled off again, so it lives outside
            DRAWING_TOOL_CATEGORIES' button+chevron+menu pattern as a plain toggle. */}
        <button
          type="button"
          className={["lq-chart__icon-button", magnetActive && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
          onClick={() => setMagnetActive((a) => !a)}
          aria-label="Aimant"
          aria-pressed={magnetActive}
          title="Aimant : accroche les nouveaux points au prix (O/H/L/C) le plus proche"
        >
          <MagnetIcon size={14} />
        </button>
        {/* Hides every drawing without deleting any of them — same eye/eye-off convention
            the indicator legend already uses for a single indicator, applied here to all
            of `drawings` at once. */}
        <button
          type="button"
          className={["lq-chart__icon-button", drawingsHidden && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
          onClick={() => setDrawingsHidden((h) => !h)}
          aria-label={drawingsHidden ? "Afficher les dessins" : "Masquer les dessins"}
          aria-pressed={drawingsHidden}
          title="Masquer/afficher tous les dessins"
        >
          {drawingsHidden ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
        </button>
        {/* Blocks dragging (body, endpoints, and axis handles all check this before
            starting) without touching selectability — hover, Delete, and double-click to
            edit all keep working on a locked drawing, only click-and-drag is refused. */}
        <button
          type="button"
          className={["lq-chart__icon-button", drawingsLocked && "lq-chart__icon-button--active"].filter(Boolean).join(" ")}
          onClick={() => setDrawingsLocked((l) => !l)}
          aria-label={drawingsLocked ? "Déverrouiller les dessins" : "Verrouiller les dessins"}
          aria-pressed={drawingsLocked}
          title="Verrouiller/déverrouiller le déplacement des dessins"
        >
          <LockIcon size={14} />
        </button>
        {/* Per-kind event-marker visibility (Earnings/News/Dividend/Update/…, whatever kinds are
            actually present in `events` — see eventKinds) — a quick toolbar dropdown for the same
            toggles the "Paramètres du graphique" modal also exposes, all shown by default. A
            distinct icon from the hide-drawings eye above, so the two aren't confused for the
            same toggle. Pinned to the rail's own bottom edge (see
            .lq-chart__tools-rail-bottom-button), alongside "Dessins et indicateurs" right below
            it, rather than living inline with the magnet/hide/lock toggles above. */}
        {eventKinds.length > 0 && (
          <>
            <button
              ref={eventsMenuAnchorRef}
              type="button"
              className={["lq-chart__icon-button", "lq-chart__tools-rail-bottom-button", eventsMenuOpen && "lq-chart__icon-button--active"]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setEventsMenuOpen((o) => !o)}
              aria-label="Visibilité des évènements"
              aria-pressed={eventsMenuOpen}
              title="Afficher/masquer les évènements par type"
            >
              <BellIcon size={14} />
            </button>
            <Popover open={eventsMenuOpen} onClose={() => setEventsMenuOpen(false)} anchorRef={eventsMenuAnchorRef} placement="bottom">
              <div className="lq-chart__events-menu">
                {eventKinds.map((kind) => (
                  <Checkbox
                    key={kind}
                    checked={!hiddenEventKinds.has(kind)}
                    onChange={() =>
                      setHiddenEventKinds((prev) => {
                        const next = new Set(prev);
                        if (next.has(kind)) next.delete(kind);
                        else next.add(kind);
                        return next;
                      })
                    }
                    label={capitalize(kind)}
                  />
                ))}
              </div>
            </Popover>
          </>
        )}
        {/* Opens a flat, grouped list of every drawing and indicator currently on the chart
            (overlay and own-pane alike) with a settings/delete action per row, instead of having
            to hunt each one down on the chart itself (hovering a legend entry, or a collapsed
            pane that hides its own actions). Shown whenever the rail itself is (drawingTools)
            regardless of showIndicators — even drawings-only usage benefits from a single place
            to see and clear everything drawn. Only needs the bottom-pin class itself when the
            events button right above it isn't rendered (no event kinds present) — otherwise
            that button's own auto margin already pushes both of them down together. */}
        <button
          type="button"
          className={[
            "lq-chart__icon-button",
            eventKinds.length === 0 && "lq-chart__tools-rail-bottom-button",
            indicatorsManagerOpen && "lq-chart__icon-button--active",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setIndicatorsManagerOpen((o) => !o)}
          aria-label="Dessins et indicateurs"
          aria-pressed={indicatorsManagerOpen}
          title="Voir et gérer tous les dessins et indicateurs actifs"
        >
          <LayersIcon size={14} />
        </button>
      </div>
    </div>
  );
}
