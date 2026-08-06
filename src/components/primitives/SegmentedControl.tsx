import "./SegmentedControl.css";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  label?: string;
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Row of exclusive options, e.g. the PALETTE / SURFACE / TYPO switches in the reference design. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={["lq-segmented", className].filter(Boolean).join(" ")}>
      {label && <span className="lq-segmented__label">{label}</span>}
      <div className="lq-segmented__options" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={opt.value === value}
            className={
              opt.value === value ? "lq-segmented__option lq-segmented__option--active" : "lq-segmented__option"
            }
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
