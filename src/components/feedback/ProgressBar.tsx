import "./ProgressBar.css";

export interface ProgressBarProps {
  /** 0-100. Omit for an indeterminate bar. */
  value?: number;
  label?: string;
  className?: string;
}

/** Linear progress indicator — determinate (value set) or indeterminate (value omitted). */
export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const indeterminate = value === undefined;
  return (
    <div className={["lq-progress-bar", className].filter(Boolean).join(" ")}>
      {label && <span className="lq-progress-bar__label">{label}</span>}
      <div
        className="lq-progress-bar__track"
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={["lq-progress-bar__fill", indeterminate && "lq-progress-bar__fill--indeterminate"].filter(Boolean).join(" ")}
          style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
