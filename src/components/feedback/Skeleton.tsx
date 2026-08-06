import "./Skeleton.css";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  className?: string;
}

/** Pulsing placeholder block for content that hasn't loaded yet. */
export function Skeleton({ width = "100%", height = 16, circle, className }: SkeletonProps) {
  return (
    <span
      className={["lq-skeleton", circle && "lq-skeleton--circle", className].filter(Boolean).join(" ")}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
