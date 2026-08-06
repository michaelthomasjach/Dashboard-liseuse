import { forwardRef } from "react";
import { TextField, type TextFieldProps } from "./TextField";
import "./NumberField.css";

export interface NumberFieldProps extends Omit<TextFieldProps, "type" | "onChange" | "value"> {
  value: number | "";
  onChange: (value: number | "") => void;
  min?: number;
  max?: number;
  step?: number;
  /** Prefix/suffix shown inline, e.g. "€" or "%". */
  prefix?: string;
  suffix?: string;
}

/** Numeric input with optional +/- steppers and a prefix/suffix (currency, percent…). */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { value, onChange, min, max, step = 1, prefix, suffix, leadingIcon, trailingIcon, ...rest },
  ref
) {
  const clamp = (n: number) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };

  return (
    <TextField
      ref={ref}
      type="number"
      inputMode="decimal"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? "" : Number(raw));
      }}
      leadingIcon={prefix ? <span className="lq-number-field__affix">{prefix}</span> : leadingIcon}
      trailingIcon={
        suffix ? (
          <span className="lq-number-field__affix">{suffix}</span>
        ) : (
          trailingIcon ?? (
            <span className="lq-number-field__steppers">
              <button
                type="button"
                tabIndex={-1}
                className="lq-number-field__stepper"
                onClick={() => onChange(clamp((typeof value === "number" ? value : 0) + step))}
                aria-label="Augmenter"
              >
                +
              </button>
              <button
                type="button"
                tabIndex={-1}
                className="lq-number-field__stepper"
                onClick={() => onChange(clamp((typeof value === "number" ? value : 0) - step))}
                aria-label="Diminuer"
              >
                −
              </button>
            </span>
          )
        )
      }
      {...rest}
    />
  );
});
