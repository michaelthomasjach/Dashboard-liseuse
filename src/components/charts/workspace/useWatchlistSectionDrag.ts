import { useEffect, useState } from "react";

export interface UseWatchlistSectionDragArgs {
  /** The active list's own current section order (ids) — read fresh on every reorder step (not
   *  captured once at drag start) so a single continuous drag can hop across more than one
   *  neighbor correctly, same reasoning `usePaneDragReorder`'s own `allPanesOrder` re-subscribes
   *  on every change instead of freezing the layout from before the drag began. */
  sectionOrder: string[];
  onReorder: ((newOrder: string[]) => void) | undefined;
}

/** Drag a watchlist section (via its own grip handle) to reorder it among the list's other
 *  sections — live, splicing on every neighbor crossed rather than only committing on drop (same
 *  feel as `usePaneDragReorder`'s pane reordering, which this mirrors: closest section by its own
 *  header's vertical *midpoint*, not "pointer inside its full range," so a drag past a much
 *  taller neighbor still swaps as soon as it crosses halfway). A different shape than
 *  `useWatchlistRowDrag` on purpose — that one moves a row *between* containers (coarse "which
 *  zone did you drop it on" is enough), this reorders entries *within* one already-flat list
 *  (needs a precise position, not just a zone). Each section header carries
 *  `data-watchlist-section-id` for this to query directly (see WatchlistPanel.tsx). */
export function useWatchlistSectionDrag({ sectionOrder, onReorder }: UseWatchlistSectionDragArgs) {
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);

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

  return { draggingSectionId, startDrag: setDraggingSectionId };
}
