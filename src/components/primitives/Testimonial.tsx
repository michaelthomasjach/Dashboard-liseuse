import type { ReactNode } from "react";
import { StarIcon } from "../icons";
import "./Testimonial.css";

export interface TestimonialProps {
  quote: ReactNode;
  name: string;
  role?: string;
  avatarSrc?: string;
  /** 0-5, renders a row of filled/empty stars above the attribution. */
  rating?: number;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Quote card — customer/user testimonial with attribution and an optional star rating. */
export function Testimonial({ quote, name, role, avatarSrc, rating, className }: TestimonialProps) {
  return (
    <figure className={["lq-testimonial", className].filter(Boolean).join(" ")}>
      <span className="lq-testimonial__mark" aria-hidden="true">
        “
      </span>
      <blockquote className="lq-testimonial__quote">{quote}</blockquote>

      {rating !== undefined && (
        <div className="lq-testimonial__rating" aria-label={`${rating} sur 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <StarIcon key={i} size={15} fill={i < rating ? "currentColor" : "none"} className={i < rating ? "lq-testimonial__star lq-testimonial__star--filled" : "lq-testimonial__star"} />
          ))}
        </div>
      )}

      <figcaption className="lq-testimonial__attribution">
        <span className="lq-testimonial__avatar">
          {avatarSrc ? <img src={avatarSrc} alt="" /> : <span>{initials(name)}</span>}
        </span>
        <span className="lq-testimonial__identity">
          <span className="lq-testimonial__name">{name}</span>
          {role && <span className="lq-testimonial__role">{role}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
