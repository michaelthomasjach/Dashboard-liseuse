import { useEffect, useState } from "react";

/**
 * CSS-driven "fullscreen" (a fixed, viewport-covering overlay) rather than the
 * native Fullscreen API — the native API silently fails inside sandboxed
 * iframes (e.g. Storybook's preview frame) unless `allow="fullscreen"` is set
 * on the iframe, which a component library can't guarantee for its consumers.
 * This works everywhere and needs no permissions.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFullscreen(false);
    }
    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  return { isFullscreen, toggle: () => setIsFullscreen((f) => !f) };
}
