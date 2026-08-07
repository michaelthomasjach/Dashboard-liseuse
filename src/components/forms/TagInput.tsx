import { useRef, useState, type KeyboardEvent } from "react";
import { Tag } from "./Tag";
import { ErrorIcon } from "../icons";
import "./field.css";
import "./TagInput.css";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  /** Ignores a new tag if it's already present (case-sensitive). Default true. */
  preventDuplicates?: boolean;
  maxTags?: number;
  className?: string;
}

/** Free-form tag/chip input: type and press comma or Enter to add a tag, Backspace on an
 *  empty field to drop the last one, or click a tag's × to remove it directly. */
export function TagInput({
  value,
  onChange,
  label,
  placeholder,
  error,
  helperText,
  disabled,
  preventDuplicates = true,
  maxTags,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const atMax = maxTags !== undefined && value.length >= maxTags;

  function commitTag() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (preventDuplicates && value.includes(trimmed)) {
      setInputValue("");
      return;
    }
    if (maxTags !== undefined && value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setInputValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      commitTag();
      return;
    }
    if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className={["lq-field", className].filter(Boolean).join(" ")}>
      {label && <span className="lq-field__label">{label}</span>}
      <div
        className={[
          "lq-field__control",
          "lq-tag-input",
          error && "lq-field__control--error",
          disabled && "lq-field__control--disabled",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <Tag key={`${tag}-${i}`} onRemove={disabled ? undefined : () => onChange(value.filter((_, idx) => idx !== i))}>
            {tag}
          </Tag>
        ))}
        <input
          ref={inputRef}
          className="lq-tag-input__field"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitTag}
          placeholder={value.length === 0 ? placeholder : undefined}
          disabled={disabled || atMax}
        />
      </div>
      {error ? (
        <span className="lq-field__error">
          <ErrorIcon size={14} />
          {error}
        </span>
      ) : helperText ? (
        <span className="lq-field__helper">{helperText}</span>
      ) : null}
    </div>
  );
}
