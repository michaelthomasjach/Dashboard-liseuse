import { useRef, useState } from "react";
import { Popover } from "./Popover";
import { ChevronDownIcon, CheckIcon, ErrorIcon } from "../icons";
import "./field.css";
import "./Select.css";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  placement?: "bottom" | "top";
  disabled?: boolean;
  error?: string;
  helperText?: string;
  ariaLabel?: string;
  className?: string;
  /** Control height/padding/font-size. Default "normal" (40px). */
  size?: "small" | "normal";
}

/** Adapted dropdown select: opens below the trigger by default, flips above
 *  and shifts horizontally when the viewport doesn't have room (see `Popover`). */
export function Select<T extends string = string>({
  options,
  value,
  onChange,
  label,
  placeholder = "Sélectionner…",
  placement = "bottom",
  disabled,
  error,
  helperText,
  ariaLabel,
  className,
  size = "normal",
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.value === value);

  return (
    <div className={["lq-field", "lq-select", className].filter(Boolean).join(" ")}>
      {label && <span className="lq-field__label">{label}</span>}
      <button
        ref={anchorRef}
        type="button"
        className={[
          "lq-field__control",
          "lq-select__trigger",
          size === "small" && "lq-field__control--small",
          error && "lq-field__control--error",
          disabled && "lq-field__control--disabled",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? label}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? "lq-select__value" : "lq-select__placeholder"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon size={16} className={open ? "lq-select__chevron lq-select__chevron--open" : "lq-select__chevron"} />
      </button>
      {error ? (
        <span className="lq-field__error">
          <ErrorIcon size={14} />
          {error}
        </span>
      ) : helperText ? (
        <span className="lq-field__helper">{helperText}</span>
      ) : null}

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} placement={placement} matchAnchorWidth>
        <ul className="lq-select__list" role="listbox">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                disabled={opt.disabled}
                className="lq-select__option"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {opt.value === value && <CheckIcon size={16} />}
              </button>
            </li>
          ))}
        </ul>
      </Popover>
    </div>
  );
}
