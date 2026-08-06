import "./Spinner.css";

export interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

/** Indeterminate loading ring. */
export function Spinner({ size = 20, className, label = "Chargement…" }: SpinnerProps) {
  return (
    <svg
      className={["lq-spinner", className].filter(Boolean).join(" ")}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="status"
      aria-label={label}
    >
      <circle className="lq-spinner__track" cx="12" cy="12" r="9.5" fill="none" strokeWidth="2.5" />
      <circle className="lq-spinner__arc" cx="12" cy="12" r="9.5" fill="none" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
