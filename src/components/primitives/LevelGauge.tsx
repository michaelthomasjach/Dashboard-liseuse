import "./LevelGauge.css";

export interface LevelGaugeProps {
  /** 0-100. */
  value: number;
  /** Number of discrete bars drawn. Default 10. */
  segments?: number;
  size?: "sm" | "md";
  /** Text shown after the bar, e.g. "60 %", "ouvert", "75 %". Omit or pass null to hide. */
  label?: string | null;
  className?: string;
  ariaLabel?: string;
}

/** The segmented bar-graph level indicator used for shutters, lights, volume and battery. */
export function LevelGauge({
  value,
  segments = 10,
  size = "md",
  label,
  className,
  ariaLabel,
}: LevelGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const filled = Math.round((clamped / 100) * segments);

  return (
    <span
      className={["lq-gauge", `lq-gauge--${size}`, className].filter(Boolean).join(" ")}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <span className="lq-gauge__bars">
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={i < filled ? "lq-gauge__bar lq-gauge__bar--filled" : "lq-gauge__bar"} />
        ))}
      </span>
      {label !== undefined && label !== null && <span className="lq-gauge__label">{label}</span>}
    </span>
  );
}
