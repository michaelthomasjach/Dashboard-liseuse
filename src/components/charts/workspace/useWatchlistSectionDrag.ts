import { useEffect, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface UseWatchlistSectionDragArgs {
  /** The active list's own current section order (ids) — read fresh on every reorder step (not
   *  captured once at drag start) so a single continuous drag can hop across more than one
   *  neighbor correctly, same reasoning `usePaneDragReorder`'s own `allPanesOrder` re-subscribes
   *  on every change instead of freezing the layout from before the drag began. */
  sectionOrder: string[];
  onReorder: ((newOrder: string[]) => void) | undefined;
}

// Same threshold, same reasoning as useWatchlistRowDrag's own — not shared directly since
// nothing else already couples these two modules.
const DRAG_THRESHOLD = 4;

/** Drag a watchlist section (from anywhere on its header, not just its own grip handle — a plain
 *  click still toggles collapse as usual, only actually starting a visible drag once the pointer
 *  travels past `DRAG_THRESHOLD`) to reorder it among the list's other sections — live, splicing
 *  on every neighbor crossed rather than only committing on drop (same feel as
 *  `usePaneDragReorder`'s pane reordering, which this mirrors: closest section by its own
 *  header's vertical *midpoint*, not "pointer inside its full range," so a drag past a much
 *  taller neighbor still swaps as soon as it crosses halfway). A different shape than
 *  `useWatchlistRowDrag` on purpose — that one moves a row *between* containers (coarse "which
 *  zone did you drop it on" is enough), this reorders entries *within* one already-flat list
 *  (needs a precise position, not just a zone). Each section header carries
 *  `data-watchlist-section-id` for this to query directly (see WatchlistPanel.tsx). Split into a
 *  small "arming" listener (below, promotes to `draggingSectionId` past the threshold) plus the
 *  main effect (unchanged from before) rather than one continuous handler, since the main effect
 *  needs to keep re-subscribing to the *current* `sectionOrder` as it changes mid-drag — a plain
 *  closure captured once at pointerdown, like the arming listener uses, would go stale the moment
 *  the first live reorder happened. */
export function useWatchlistSectionDrag({ sectionOrder, onReorder }: UseWatchlistSectionDragArgs) {
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);

  function startDrag(sectionId: string, e: ReactPointerEvent) {
    const startX = e.clientX;
    const startY = e.clientY;
    function onPointerMove(ev: PointerEvent) {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      setDraggingSectionId(sectionId);
    }
    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  useEffect(() => {
    if (!draggingSectionId) return;
    const draggedId = draggingSectionId;
    function onMove(ev: PointerEvent) {
      const headers = document.querySelectorAll<HTMLElement>("[data-watchlist-section-id]");
      let targetId: string | null = null;
      let bestDist = Infinity;
      headers.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(ev.clientY - (rect.top + rect.height / 2));
        if (dist < bestDist) {
          bestDist = dist;
          targetId = el.dataset.watchlistSectionId ?? null;
        }
      });
      if (!targetId) return;
      const fromIdx = sectionOrder.indexOf(draggedId);
      const targetIdx = sectionOrder.indexOf(targetId);
      if (fromIdx === -1 || targetIdx === -1 || fromIdx === targetIdx) return;
      const next = [...sectionOrder];
      next.splice(fromIdx, 1);
      next.splice(targetIdx, 0, draggedId);
      onReorder?.(next);
    }
    function onUp() {
      setDraggingSectionId(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingSectionId, sectionOrder, onReorder]);

  return { draggingSectionId, startDrag };
}
