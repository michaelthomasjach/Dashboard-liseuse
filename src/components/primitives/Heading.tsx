import type { ReactNode } from "react";
import "./Heading.css";

export interface HeadingProps {
  /** Which semantic heading tag to render (h1-h6). Default 2. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  className?: string;
}

const TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/** Semantic heading using the library's type scale (`--lq-text-h1`…`h6`). */
export function Heading({ level = 2, children, className }: HeadingProps) {
  const Tag = TAGS[level - 1];
  return <Tag className={["lq-heading", `lq-heading--h${level}`, className].filter(Boolean).join(" ")}>{children}</Tag>;
}
