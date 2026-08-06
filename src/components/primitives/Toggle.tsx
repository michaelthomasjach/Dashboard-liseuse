import "./Toggle.css";

export interface ToggleProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Accessible label; required since the switch itself carries no visible text. */
  ariaLabel: string;
  className?: string;
}

/** On/off switch used for shutters, lights, and any other binary control row. */
export function Toggle({ checked, onChange, disabled, ariaLabel, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={["lq-toggle", checked && "lq-toggle--on", className].filter(Boolean).join(" ")}
      onClick={() => onChange?.(!checked)}
    >
      <span className="lq-toggle__knob" />
    </button>
  );
}
