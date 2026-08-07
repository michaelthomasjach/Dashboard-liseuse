/**
 * Marks whatever element is being scrolled with `.lq-scrolling` for as long as it's actively
 * moving, so tokens.css can raise the scrollbar thumb's opacity while scrolling and fade it
 * back down when it settles. A single document-level listener (capture phase, so it catches
 * scroll on any descendant regardless of that element's own bubbling) — module-level rather
 * than tied to a component's lifecycle, since multiple `LqThemeProvider` instances can mount
 * (portals re-apply the theme for Popover/Notification) and this only needs to run once per
 * page, which ES modules already guarantee for a side-effecting import like this one.
 */
if (typeof document !== "undefined") {
  const timers = new WeakMap<EventTarget, ReturnType<typeof setTimeout>>();

  document.addEventListener(
    "scroll",
    (e) => {
      const target = e.target;
      if (!target) return;
      const el = target instanceof Document ? document.documentElement : target instanceof Element ? target : null;
      if (!el) return;

      el.classList.add("lq-scrolling");
      const prev = timers.get(target);
      if (prev !== undefined) window.clearTimeout(prev);
      timers.set(
        target,
        window.setTimeout(() => {
          el.classList.remove("lq-scrolling");
          timers.delete(target);
        }, 500)
      );
    },
    true
  );
}
