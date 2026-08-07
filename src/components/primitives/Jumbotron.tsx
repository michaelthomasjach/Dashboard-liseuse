import type { ReactNode } from "react";
import "./Jumbotron.css";

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
  /** Renders `backgroundImage` in black & white instead of color. Default "none". */
  imageFilter?: "none" | "grayscale";
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
  tone = "default",
  className,
}: JumbotronProps) {
  return (
    <div className={["lq-jumbotron", `lq-jumbotron--${tone}`, backgroundImage && "lq-jumbotron--has-image", className].filter(Boolean).join(" ")}>
      {backgroundImage && (
        <>
          <div
            className={["lq-jumbotron__bg", imageFilter === "grayscale" && "lq-jumbotron__bg--grayscale"].filter(Boolean).join(" ")}
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
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
