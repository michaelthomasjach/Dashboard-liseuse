import type { ElementType, ReactNode } from "react";
import "./Text.css";

export interface TextProps {
  as?: "p" | "span" | "div";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  weight?: "regular" | "medium" | "bold";
  /** Uses the muted text color instead of the primary one. */
  muted?: boolean;
  children: ReactNode;
  className?: string;
}

/** Body text using the library's type scale — paragraphs, captions, helper copy. */
export function Text({ as = "p", size = "md", weight = "regular", muted, children, className }: TextProps) {
  const Tag = as as ElementType;
  return (
    <Tag
      className={["lq-text", `lq-text--${size}`, `lq-text--${weight}`, muted && "lq-text--muted", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
