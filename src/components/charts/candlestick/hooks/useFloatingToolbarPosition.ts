import { useEffect, useRef, useState } from "react";

export interface UseFloatingToolbarPositionArgs {
  /** Whenever this changes (and isn't null), position resets to the default — a newly-picked
   *  tool or a newly-selected drawing reappears near its own default spot instead of inheriting
   *  wherever an earlier target happened to be dragged to. Pass a stable string identifying the
   *  toolbar's current target (e.g. `tool:${activeTool}` or `drawing:${selectedDrawingId}`), or
   *  `null` while the toolbar itself is hidden. */
  resetKey: string | null;
  plotWidth: number;
}

const DEFAULT_TOP = 12;

/** Drag position for `FloatingDrawingToolbar` — same window-pointermove-listener pattern
 *  `useSidePanel.startResize`/`usePaneLayout.startPaneResize` already use (not
 *  `setPointerCapture`, so the drag keeps tracking even once the pointer leaves the grip's own
 *  small hit area), generalized from one axis to two (x and y both move here, not just width). */
export function useFloatingToolbarPosition({ resetKey, plotWidth }: UseFloatingToolbarPositionArgs) {
  const [position, setPosition] = useState({ x: plotWidth / 2, y: DEFAULT_TOP });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resetKey === null) return;
    setPosition({ x: plotWidth / 2, y: DEFAULT_TOP });
    // Deliberately keyed only on identity (resetKey), not plotWidth — re-centering every time the
    // plot itself merely resizes would fight a drag the user just made on an unrelated width
    // change (e.g. opening the docked side panel while a drawing stays selected).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  function startDrag(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = position.x;
    const startY = position.y;
    // Only x is bounded on both sides (the plot has a finite width to stay within); y only has a
    // floor (0 — flush with the plot's own top) since there's no equivalently fixed bottom edge
    // meant to constrain it here (own-pane indicators/volume already extend the plot well past
    // just the price section).
    const toolbarWidth = toolbarRef.current?.getBoundingClientRect().width ?? 0;
    const onMove = (ev: PointerEvent) => {
      const maxX = Math.max(0, plotWidth - toolbarWidth);
      const nextX = Math.min(maxX, Math.max(0, startX + (ev.clientX - startClientX)));
      const nextY = Math.max(0, startY + (ev.clientY - startClientY));
      setPosition({ x: nextX, y: nextY });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return { position, toolbarRef, startDrag };
}
