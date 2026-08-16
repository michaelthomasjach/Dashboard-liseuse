import { useEffect, useRef, type ReactNode } from "react";
import "./Jumbotron.css";

// Reached after this many px of window scroll — both plain constants (not props) since this is
// meant as one subtle, consistent depth effect rather than a per-instance tunable.
const MAX_SCROLL_BLUR_PX = 16;
const MAX_SCROLL_BLUR_DISTANCE = 400;

export interface JumbotronProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons/links row. */
  actions?: ReactNode;
  /** Illustration/graphic shown beside the text on wide screens, above it on narrow ones. */
  media?: ReactNode;
  /** Full-bleed background image URL; text gets a scrim for legibility. */
  backgroundImage?: string;
  /** Fades `backgroundImage` from full color into black & white over the same area the scrim
   *  already darkens for text legibility (a gradient, not a flat filter across the whole photo).
   *  Default "none". */
  imageFilter?: "none" | "grayscale";
  /** Progressively blurs `backgroundImage` as the page scrolls — meant for a Jumbotron sitting
   *  near the top of a scrollable page, for a subtle depth effect as it scrolls out of view.
   *  Tracks `window` scroll, so it's opt-in rather than automatic whenever `backgroundImage` is
   *  set (a Jumbotron embedded in its own scroll container, e.g. inside a modal, shouldn't get a
   *  listener it can't actually use). Default false. */
  blurOnScroll?: boolean;
  /** "accent" fills the panel with the theme's accent color instead of the default panel background. */
  tone?: "default" | "accent";
  className?: string;
}

/** Large promotional/hero banner — a welcome message, a feature callout, a CTA block. */
export function Jumbotron({
  eyebrow,
  title,
  description,
  actions,
  media,
  backgroundImage,
  imageFilter = "none",
  blurOnScroll = false,
  tone = "default",
  className,
}: JumbotronProps) {
  const bgWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!blurOnScroll || !backgroundImage) return;
    const el = bgWrapRef.current;
    if (!el) return;
    // Written straight to the DOM via a CSS variable (not React state) and rAF-throttled — this
    // fires on every scroll tick, and a page can have several Jumbotrons, so routing that through
    // React re-renders would be needless work for a purely visual effect.
    let frame = 0;
    function applyBlur() {
      frame = 0;
      const progress = Math.min(window.scrollY / MAX_SCROLL_BLUR_DISTANCE, 1);
      el!.style.setProperty("--lq-jumbotron-blur", `${progress * MAX_SCROLL_BLUR_PX}px`);
    }
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(applyBlur);
    }
    applyBlur();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [blurOnScroll, backgroundImage]);

  return (
    <div className={["lq-jumbotron", `lq-jumbotron--${tone}`, backgroundImage && "lq-jumbotron--has-image", className].filter(Boolean).join(" ")}>
      {backgroundImage && (
        <>
          <div ref={bgWrapRef} className="lq-jumbotron__bg-wrap">
            <div className="lq-jumbotron__bg" style={{ backgroundImage: `url(${backgroundImage})` }} />
            {imageFilter === "grayscale" && (
              <div className="lq-jumbotron__bg-grayscale" style={{ backgroundImage: `url(${backgroundImage})` }} />
            )}
          </div>
          <div className="lq-jumbotron__scrim" />
        </>
      )}
      <div className="lq-jumbotron__content">
        {eyebrow && <span className="lq-jumbotron__eyebrow">{eyebrow}</span>}
        <h2 className="lq-jumbotron__title">{title}</h2>
        {description && <p className="lq-jumbotron__description">{description}</p>}
        {actions && <div className="lq-jumbotron__actions">{actions}</div>}
      </div>
      {media && <div className="lq-jumbotron__media">{media}</div>}
    </div>
  );
}
