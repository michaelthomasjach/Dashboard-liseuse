import { useEffect, useRef, useState } from "react";

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

/** Marks an element as a valid drop target for a dragged watchlist row — a section's own header/
 *  row-list, or the root (no-section) zone (pass `null`). Spread onto that element's own props. */
export function watchlistDropZoneProps(sectionId: string | null) {
  return { "data-watchlist-drop-zone": sectionId ?? ROOT_DROP_ZONE };
}

/**
 * Drag a watchlist row (from its own grip handle) onto a different section — or the root,
 * no-section zone — to move it there. Pointer-based with window-level listeners, same convention
 * `usePaneDragReorder`/`useSidePanel` already use in this library rather than native HTML5
 * drag-and-drop (no ghost-image/dragover-effect quirks to fight, one drag pattern throughout).
 * Section-*level* only (append to wherever the pointer is released, not a precise index within
 * it) — matches what was actually asked ("les déplacer d'une sous-liste à une autre"), without
 * needing a full drop-indicator-line UI on top of it.
 */
export function useWatchlistRowDrag({ onMove }: UseWatchlistRowDragArgs) {
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [dropTargetSectionId, setDropTargetSectionId] = useState<string | null | undefined>(undefined);
  // Mirrors the two state values above into refs so `onPointerUp` (defined once per drag, not
  // re-created on every hover change) always reads the *current* drag/target instead of whatever
  // was true when the drag started.
  const dragRef = useRef<{ rowId: string; fromSectionId: string | null } | null>(null);
  const dropTargetRef = useRef<string | null | undefined>(undefined);

  function startDrag(rowId: string, fromSectionId: string | null) {
    dragRef.current = { rowId, fromSectionId };
    dropTargetRef.current = undefined;
    setDraggingRowId(rowId);
    setDropTargetSectionId(undefined);
  }

  useEffect(() => {
    if (!draggingRowId) return;
    function onPointerMove(ev: PointerEvent) {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const zoneEl = el?.closest<HTMLElement>("[data-watchlist-drop-zone]");
      const raw = zoneEl?.dataset.watchlistDropZone;
      const next = raw === undefined ? undefined : raw === ROOT_DROP_ZONE ? null : raw;
      if (next !== dropTargetRef.current) {
        dropTargetRef.current = next;
        setDropTargetSectionId(next);
      }
    }
    function onPointerUp() {
      const drag = dragRef.current;
      const target = dropTargetRef.current;
      if (drag && target !== undefined && target !== drag.fromSectionId) {
        onMove?.({ rowId: drag.rowId, fromSectionId: drag.fromSectionId, toSectionId: target });
      }
      dragRef.current = null;
      setDraggingRowId(null);
      setDropTargetSectionId(undefined);
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [draggingRowId, onMove]);

  return { draggingRowId, dropTargetSectionId, startDrag };
}
