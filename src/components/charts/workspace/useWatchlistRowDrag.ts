import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface MoveWatchlistRowArgs {
  rowId: string;
  fromSectionId: string | null;
  toSectionId: string | null;
}

export interface UseWatchlistRowDragArgs {
  onMove: ((args: MoveWatchlistRowArgs) => void) | undefined;
}

/** The root (no-section) drop zone's own sentinel id — `element.dataset` values are always
 *  strings, so `null` (root) needs a stand-in that can round-trip through a `data-*` attribute;
 *  translated back to `null` the moment it's read in `onPointerMove` below. */
const ROOT_DROP_ZONE = "__root__";

// How far the pointer has to travel from its own pointerdown before this counts as an actual
// drag rather than a plain click — same distinction (and same threshold) chart drawings already
// use for their own whole-body drag vs. click-to-select (see CLICK_DRAG_THRESHOLD in the
// candlestick module) — this module doesn't share that one directly since it's a different part
// of the library with no existing dependency between them, not worth introducing just for one
// constant.
const DRAG_THRESHOLD = 4;

/** Marks an element as a valid drop target for a dragged watchlist row — a section's own header/
 *  row-list, or the root (no-section) zone (pass `null`). Spread onto that element's own props. */
export function watchlistDropZoneProps(sectionId: string | null) {
  return { "data-watchlist-drop-zone": sectionId ?? ROOT_DROP_ZONE };
}

/**
 * Drag a watchlist row (from anywhere on the row, not just its own grip handle — a plain click
 * still loads the row's symbol as usual, only actually starting a visible drag once the pointer
 * travels past `DRAG_THRESHOLD`) onto a different section — or the root, no-section zone — to
 * move it there. Pointer-based with window-level listeners attached directly from `startDrag`
 * itself (not a `useEffect` keyed on drag state — nothing here needs re-subscribing mid-drag the
 * way `usePaneDragReorder`'s own geometry inputs do, so each call just owns its own gesture via
 * closure instead). Section-*level* only (append to wherever the pointer is released, not a
 * precise index within it) — matches what was actually asked ("les déplacer d'une sous-liste à
 * une autre"), without needing a full drop-indicator-line UI on top of it.
 */
export function useWatchlistRowDrag({ onMove }: UseWatchlistRowDragArgs) {
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [dropTargetSectionId, setDropTargetSectionId] = useState<string | null | undefined>(undefined);

  function startDrag(rowId: string, fromSectionId: string | null, e: ReactPointerEvent) {
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let dropTarget: string | null | undefined = undefined;

    function onPointerMove(ev: PointerEvent) {
      if (!dragging) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
        dragging = true;
        setDraggingRowId(rowId);
      }
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const zoneEl = el?.closest<HTMLElement>("[data-watchlist-drop-zone]");
      const raw = zoneEl?.dataset.watchlistDropZone;
      const next = raw === undefined ? undefined : raw === ROOT_DROP_ZONE ? null : raw;
      if (next !== dropTarget) {
        dropTarget = next;
        setDropTargetSectionId(next);
      }
    }
    function onPointerUp() {
      if (dragging && dropTarget !== undefined && dropTarget !== fromSectionId) {
        onMove?.({ rowId, fromSectionId, toSectionId: dropTarget });
      }
      setDraggingRowId(null);
      setDropTargetSectionId(undefined);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  return { draggingRowId, dropTargetSectionId, startDrag };
}
