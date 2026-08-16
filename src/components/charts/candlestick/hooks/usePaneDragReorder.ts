import { useEffect } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { Indicator } from "../interfaces/Indicator.interface";

export interface UsePaneDragReorderArgs {
  draggingPaneId: string | null;
  setDraggingPaneId: Dispatch<SetStateAction<string | null>>;
  allPanesOrder: string[];
  ownPaneIndicators: Indicator[];
  indicatorPaneTops: number[];
  indicatorPaneHeights: number[];
  volumeTop: number;
  volumeHeight: number;
  priceHeight: number;
  zoomRef: RefObject<SVGRectElement>;
  reorderPanesRef: MutableRefObject<(newOrder: string[]) => void>;
}

/** Drag-to-reorder via a dedicated grip handle (not the whole header — that already carries
 *  resize/double-click/other buttons). Deliberately *not* the usual setPointerCapture-on-the-
 *  handle pattern every other drag in this file uses: a reorder mid-drag causes React to
 *  physically move this very handle's DOM node to its new sibling position, and that move can
 *  drop the browser's own pointer capture on it — losing the pointerup this handle was supposed
 *  to receive, which left the drag "stuck" (dragging visual pinned on, further mouse movement
 *  still reordering things with no button held). A window-level effect isn't tied to any one
 *  element's identity, so it survives the handle moving under it — and re-subscribing whenever
 *  the pane order actually changes (not just once at drag start) keeps its own targetIdx maths
 *  reading the *current* layout instead of a stale one frozen from before this drag's first
 *  reorder, so a single continuous drag can hop across more than one neighbor correctly. */
export function usePaneDragReorder({
  draggingPaneId,
  setDraggingPaneId,
  allPanesOrder,
  ownPaneIndicators,
  indicatorPaneTops,
  indicatorPaneHeights,
  volumeTop,
  volumeHeight,
  priceHeight,
  zoomRef,
  reorderPanesRef,
}: UsePaneDragReorderArgs) {
  useEffect(() => {
    if (!draggingPaneId) return;
    const draggedId = draggingPaneId;
    function paneTopOf(id: string): number {
      if (id === "volume") return volumeTop;
      const idx = ownPaneIndicators.findIndex((ind) => ind.id === id);
      return idx !== -1 ? indicatorPaneTops[idx] : 0;
    }
    function paneHeightOf(id: string): number {
      if (id === "volume") return volumeHeight;
      const idx = ownPaneIndicators.findIndex((ind) => ind.id === id);
      return idx !== -1 ? indicatorPaneHeights[idx] : 0;
    }
    function onMove(ev: PointerEvent) {
      const rect = zoomRef.current!.getBoundingClientRect();
      const relY = ev.clientY - rect.top - priceHeight;
      // Closest pane by its own vertical *midpoint*, not "whichever pane's full range contains
      // the cursor" — the latter needed the drag to travel almost the whole height of a taller
      // neighbor before triggering at all, which read as unresponsive (effectively broken for an
      // ordinary drag distance) once panes had any real height difference between them. Comparing
      // midpoints swaps as soon as the cursor crosses halfway into a neighboring pane instead,
      // matching the usual list-reorder feel regardless of how tall that neighbor is — and always
      // resolves to *some* index (clamped to the nearest pane), so dragging above the topmost or
      // below the bottommost pane's own strip still works instead of doing nothing. Works over
      // `allPanesOrder` (volume included) rather than indicators alone, so volume is just as
      // draggable — and just as much a target to drop an indicator onto — as any of them.
      let targetIdx = 0;
      let bestDist = Infinity;
      allPanesOrder.forEach((id, i) => {
        const dist = Math.abs(relY - (paneTopOf(id) + paneHeightOf(id) / 2));
        if (dist < bestDist) {
          bestDist = dist;
          targetIdx = i;
        }
      });
      const currentIds = [...allPanesOrder];
      const fromIdx = currentIds.indexOf(draggedId);
      if (fromIdx === -1 || fromIdx === targetIdx) return;
      currentIds.splice(fromIdx, 1);
      currentIds.splice(targetIdx, 0, draggedId);
      reorderPanesRef.current(currentIds);
    }
    function onUp() {
      setDraggingPaneId(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [
    draggingPaneId,
    allPanesOrder,
    ownPaneIndicators,
    indicatorPaneTops,
    indicatorPaneHeights,
    volumeTop,
    volumeHeight,
    priceHeight,
    zoomRef,
    reorderPanesRef,
    setDraggingPaneId,
  ]);
}
