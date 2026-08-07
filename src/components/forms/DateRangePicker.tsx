import { useRef, useState } from "react";
import { Popover } from "./Popover";
import { CalendarIcon } from "../icons";
import { addMonths, addYears, buildMonthGrid, isAfterDay, isBeforeDay, isSameDay, setMonth, setYear } from "./internal/dateUtils";
import { CalendarHeader, MonthsView, YearsView, WEEKDAY_LABELS, YEARS_PER_PAGE } from "./internal/CalendarNavViews";
import "./field.css";
import "./DatePicker.css";

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
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

type ViewMode = "days" | "months" | "years";

const defaultFormat = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

/** Same calendar popup as `DatePicker`, but for picking a start/end pair — like booking a
 *  stay from date A to date B. First click sets the start; hovering afterwards previews the
 *  span up to the cursor; second click sets the end (swapped automatically if it lands before
 *  the start) and closes. Clicking again after a complete range starts a fresh selection. */
export function DateRangePicker({
  value,
  onChange,
  label,
  error,
  placeholder = "jj/mm/aaaa – jj/mm/aaaa",
  formatDate = defaultFormat,
  minDate,
  maxDate,
  placement = "bottom",
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value.start ?? new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const [hoverDay, setHoverDay] = useState<Date | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const today = new Date();
  const isDisabled = (d: Date) => (minDate && isBeforeDay(d, minDate)) || (maxDate && isAfterDay(d, maxDate));

  function openPicker() {
    setViewMonth(value.start ?? new Date());
    setViewMode("days");
    setOpen((o) => !o);
  }

  function handlePick(d: Date) {
    if (!value.start || value.end) {
      onChange({ start: d, end: null });
      return;
    }
    if (isBeforeDay(d, value.start)) {
      onChange({ start: d, end: value.start });
    } else {
      onChange({ start: value.start, end: d });
    }
    setOpen(false);
  }

  const triggerLabel =
    value.start && value.end
      ? `${formatDate(value.start)} – ${formatDate(value.end)}`
      : value.start
        ? `${formatDate(value.start)} – …`
        : null;

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
        onClick={openPicker}
      >
        <CalendarIcon size={16} />
        <span className={triggerLabel ? undefined : "lq-select__placeholder"}>{triggerLabel ?? placeholder}</span>
      </button>
      {error && <span className="lq-field__error">{error}</span>}

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} placement={placement}>
        <div className="lq-date-picker" onPointerLeave={() => setHoverDay(null)}>
          {viewMode === "days" && (
            <RangeDaysView
              viewMonth={viewMonth}
              value={value}
              hoverDay={hoverDay}
              today={today}
              isDisabled={isDisabled}
              onHoverDay={setHoverDay}
              onPrev={() => setViewMonth((m) => addMonths(m, -1))}
              onNext={() => setViewMonth((m) => addMonths(m, 1))}
              onHeaderClick={() => setViewMode("months")}
              onPick={handlePick}
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

interface RangeDaysViewProps {
  viewMonth: Date;
  value: DateRange;
  hoverDay: Date | null;
  today: Date;
  isDisabled: (d: Date) => boolean | undefined;
  onHoverDay: (d: Date | null) => void;
  onPrev: () => void;
  onNext: () => void;
  onHeaderClick: () => void;
  onPick: (d: Date) => void;
}

function RangeDaysView({
  viewMonth,
  value,
  hoverDay,
  today,
  isDisabled,
  onHoverDay,
  onPrev,
  onNext,
  onHeaderClick,
  onPick,
}: RangeDaysViewProps) {
  const grid = buildMonthGrid(viewMonth);

  // While only the start is picked, preview the range up to whatever day is hovered.
  const previewEnd = value.start && !value.end ? hoverDay : value.end;
  const [lo, hi] =
    value.start && previewEnd
      ? isBeforeDay(previewEnd, value.start)
        ? [previewEnd, value.start]
        : [value.start, previewEnd]
      : [value.start, null];

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
          const isToday = isSameDay(d, today);
          const disabledDay = isDisabled(d);
          const isStart = lo ? isSameDay(d, lo) : false;
          const isEnd = hi ? isSameDay(d, hi) : false;
          const inRange = lo && hi ? isAfterDay(d, lo) && isBeforeDay(d, hi) : false;
          return (
            <button
              type="button"
              key={d.toISOString()}
              disabled={disabledDay}
              className={[
                "lq-date-picker__day",
                outsideMonth && "lq-date-picker__day--outside",
                (isStart || isEnd) && "lq-date-picker__day--selected",
                inRange && "lq-date-picker__day--range-middle",
                isToday && !isStart && !isEnd && "lq-date-picker__day--today",
              ]
                .filter(Boolean)
                .join(" ")}
              onPointerEnter={() => onHoverDay(d)}
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
