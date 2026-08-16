import { useRef, useState } from "react";
import { Popover } from "./Popover";
import { CalendarIcon } from "../icons";
import { addMonths, addYears, buildMonthGrid, isAfterDay, isBeforeDay, isSameDay, setMonth, setYear } from "./internal/dateUtils";
import { CalendarHeader, MonthsView, YearsView, WEEKDAY_LABELS, YEARS_PER_PAGE } from "./internal/CalendarNavViews";
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
  /** Control height/padding/font-size. Default "normal" (40px). */
  size?: "small" | "normal";
}

type ViewMode = "days" | "months" | "years";

const defaultFormat = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

/** Calendar popup date field, positioned via the same adaptive `Popover` engine as `Select`. Click the
 *  "month year" header to drill up to a month grid, then a year grid — much faster than paging
 *  month-by-month to change years. */
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
  size = "normal",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value ?? new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const anchorRef = useRef<HTMLButtonElement>(null);

  const today = new Date();
  const isDisabled = (d: Date) => (minDate && isBeforeDay(d, minDate)) || (maxDate && isAfterDay(d, maxDate));

  function openPicker() {
    setViewMonth(value ?? new Date());
    setViewMode("days");
    setOpen((o) => !o);
  }

  return (
    <div className={["lq-field", className].filter(Boolean).join(" ")}>
      {label && <label className="lq-field__label">{label}</label>}
      <button
        ref={anchorRef}
        type="button"
        className={[
          "lq-field__control",
          "lq-date-picker__trigger",
          size === "small" && "lq-field__control--small",
          error && "lq-field__control--error",
          disabled && "lq-field__control--disabled",
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        onClick={openPicker}
      >
        <CalendarIcon size={16} />
        <span className={value ? undefined : "lq-select__placeholder"}>{value ? formatDate(value) : placeholder}</span>
      </button>
      {error && <span className="lq-field__error">{error}</span>}

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} placement={placement}>
        <div className="lq-date-picker">
          {viewMode === "days" && (
            <DaysView
              viewMonth={viewMonth}
              value={value}
              today={today}
              isDisabled={isDisabled}
              onPrev={() => setViewMonth((m) => addMonths(m, -1))}
              onNext={() => setViewMonth((m) => addMonths(m, 1))}
              onHeaderClick={() => setViewMode("months")}
              onPick={(d) => {
                onChange(d);
                setOpen(false);
              }}
            />
          )}

          {viewMode === "months" && (
            <MonthsView
              viewMonth={viewMonth}
              onPrev={() => setViewMonth((m) => addYears(m, -1))}
              onNext={() => setViewMonth((m) => addYears(m, 1))}
              onHeaderClick={() => setViewMode("years")}
              onPick={(month) => {
                setViewMonth((m) => setMonth(m, month));
                setViewMode("days");
              }}
            />
          )}

          {viewMode === "years" && (
            <YearsView
              viewMonth={viewMonth}
              onPrev={() => setViewMonth((m) => addYears(m, -YEARS_PER_PAGE))}
              onNext={() => setViewMonth((m) => addYears(m, YEARS_PER_PAGE))}
              onPick={(year) => {
                setViewMonth((m) => setYear(m, year));
                setViewMode("months");
              }}
            />
          )}
        </div>
      </Popover>
    </div>
  );
}

interface DaysViewProps {
  viewMonth: Date;
  value: Date | null;
  today: Date;
  isDisabled: (d: Date) => boolean | undefined;
  onPrev: () => void;
  onNext: () => void;
  onHeaderClick: () => void;
  onPick: (d: Date) => void;
}

function DaysView({ viewMonth, value, today, isDisabled, onPrev, onNext, onHeaderClick, onPick }: DaysViewProps) {
  const grid = buildMonthGrid(viewMonth);
  return (
    <>
      <CalendarHeader
        label={viewMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        onPrev={onPrev}
        onNext={onNext}
        onHeaderClick={onHeaderClick}
        prevLabel="Mois précédent"
        nextLabel="Mois suivant"
      />

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
              onClick={() => onPick(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </>
  );
}
