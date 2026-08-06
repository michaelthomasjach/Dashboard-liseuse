import "./ColorSwatchButton.css";

export interface ColorSwatchButtonProps {
  label: string;
  /** Any valid CSS color; ignored visually (but not semantically) under the e-ink palette. */
  color: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Labelled color checkbox used for scene/color pickers (e.g. light color selection). */
export function ColorSwatchButton({ label, color, selected, onClick, className }: ColorSwatchButtonProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      className={["lq-swatch", selected && "lq-swatch--selected", className].filter(Boolean).join(" ")}
      onClick={onClick}
    >
      <span className="lq-swatch__box" style={{ backgroundColor: color }} />
      <span className="lq-swatch__label">{label}</span>
    </button>
  );
}
