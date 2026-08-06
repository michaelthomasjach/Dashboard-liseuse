import { useRef, useState } from "react";
import { Popover } from "./Popover";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "../icons";
import { addMonths, buildMonthGrid, isAfterDay, isBeforeDay, isSameDay } from "./internal/dateUtils";
import "./field.css";
import "./DatePicker.css";

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  formatDate?: (d: Date) => string;
  minDate?: Date;
  maxDate?: Date;
  placement?: "bottom" | "top";
  disabled?: boolean;
  className?: string;
}

const WEEKDAY_LABELS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const defaultFormat = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

/** Calendar popup date field, positioned via the same adaptive `Popover` engine as `Select`. */
export function DatePicker({
  value,
  onChange,
  label,
  error,
  placeholder = "jj/mm/aaaa",
  formatDate = defaultFormat,
  minDate,
  maxDate,
  placement = "bottom",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value ?? new Date());
  const anchorRef = useRef<HTMLButtonElement>(null);

  const grid = buildMonthGrid(viewMonth);
  const today = new Date();

  const isDisabled = (d: Date) => (minDate && isBeforeDay(d, minDate)) || (maxDate && isAfterDay(d, maxDate));

  return (
    <div className={["lq-field", className].filter(Boolean).join(" ")}>
      {label && <label className="lq-field__label">{label}</label>}
      <button
        ref={anchorRef}
        type="button"
        className={["lq-field__control", "lq-date-picker__trigger", error && "lq-field__control--error", disabled && "lq-field__control--disabled"]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        onClick={() => {
          setViewMonth(value ?? new Date());
          setOpen((o) => !o);
        }}
      >
        <CalendarIcon size={16} />
        <span className={value ? undefined : "lq-select__placeholder"}>{value ? formatDate(value) : placeholder}</span>
      </button>
      {error && (
        <span className="lq-field__error">
          {error}
        </span>
      )}

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} placement={placement}>
        <div className="lq-date-picker">
          <div className="lq-date-picker__header">
            <button type="button" className="lq-date-picker__nav" onClick={() => setViewMonth((m) => addMonths(m, -1))} aria-label="Mois précédent">
              <ChevronLeftIcon size={16} />
            </button>
            <span className="lq-date-picker__month">
              {viewMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </span>
            <button type="button" className="lq-date-picker__nav" onClick={() => setViewMonth((m) => addMonths(m, 1))} aria-label="Mois suivant">
              <ChevronRightIcon size={16} />
            </button>
          </div>

          <div className="lq-date-picker__weekdays">
            {WEEKDAY_LABELS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div className="lq-date-picker__grid">
            {grid.map((d) => {
              const outsideMonth = d.getMonth() !== viewMonth.getMonth();
              const selected = value ? isSameDay(d, value) : false;
              const isToday = isSameDay(d, today);
              const disabledDay = isDisabled(d);
              return (
                <button
                  type="button"
                  key={d.toISOString()}
                  disabled={disabledDay}
                  className={[
                    "lq-date-picker__day",
                    outsideMonth && "lq-date-picker__day--outside",
                    selected && "lq-date-picker__day--selected",
                    isToday && !selected && "lq-date-picker__day--today",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    onChange(d);
                    setOpen(false);
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </Popover>
    </div>
  );
}
