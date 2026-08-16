import { useEffect, useMemo, useRef, useState } from "react";
import { Popover } from "./Popover";
import { CalendarIcon } from "../icons";
import { addMonths, addYears, buildMonthGrid, isAfterDay, isBeforeDay, isSameDay, setMonth, setYear } from "./internal/dateUtils";
import { CalendarHeader, MonthsView, YearsView, WEEKDAY_LABELS, YEARS_PER_PAGE } from "./internal/CalendarNavViews";
import "./field.css";
import "./DatePicker.css";

export interface DateTimePickerProps {
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
  /** Increment (minutes) between entries in the scrollable time list. Default 15. An exact
   *  time off this grid can still be typed directly into the time input. */
  minuteStep?: number;
  className?: string;
  /** Control height/padding/font-size. Default "normal" (40px). */
  size?: "small" | "normal";
}

type ViewMode = "days" | "months" | "years";

const defaultFormat = (d: Date) =>
  `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} à ${d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

function formatHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function withDatePortion(time: Date, day: Date): Date {
  const next = new Date(day);
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return next;
}

function withTime(d: Date, hours: number, minutes: number): Date {
  const next = new Date(d);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

interface TimeOption {
  hours: number;
  minutes: number;
  label: string;
}

function buildTimeOptions(step: number): TimeOption[] {
  const safeStep = Math.max(1, Math.min(60, Math.round(step)));
  const count = Math.ceil((24 * 60) / safeStep);
  return Array.from({ length: count }, (_, i) => {
    const total = i * safeStep;
    const hours = Math.floor(total / 60) % 24;
    const minutes = total % 60;
    return { hours, minutes, label: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}` };
  });
}

/** Parses "H:mm", "HH:mm" or "HHmm" into hours/minutes, clamped to a valid time. Returns null
 *  if the text doesn't look like a time at all. */
function parseTimeText(text: string): { hours: number; minutes: number } | null {
  const trimmed = text.trim();
  const withColon = trimmed.match(/^(\d{1,2})[:h](\d{1,2})$/);
  const digitsOnly = trimmed.match(/^(\d{1,2})(\d{2})$/);
  const match = withColon ?? digitsOnly;
  if (!match) return null;
  const hours = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return { hours, minutes };
}

/** `DatePicker` plus a time-of-day panel next to the calendar — an opt-in separate component
 *  so the plain date-only `DatePicker` stays untouched. Picking a day doesn't close the popover
 *  (the time still needs setting); "Valider" commits the combined date+time and closes. */
export function DateTimePicker({
  value,
  onChange,
  label,
  error,
  placeholder = "jj/mm/aaaa --:--",
  formatDate = defaultFormat,
  minDate,
  maxDate,
  placement = "bottom",
  disabled,
  minuteStep = 15,
  className,
  size = "normal",
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value ?? new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const [pending, setPending] = useState<Date>(() => value ?? new Date());
  // null = not currently being typed into, so the input just mirrors `pending`'s time.
  const [timeInput, setTimeInput] = useState<string | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const selectedOptionRef = useRef<HTMLButtonElement>(null);

  const today = new Date();
  const isDisabled = (d: Date) => (minDate && isBeforeDay(d, minDate)) || (maxDate && isAfterDay(d, maxDate));
  const timeOptions = useMemo(() => buildTimeOptions(minuteStep), [minuteStep]);

  function openPicker() {
    const base = value ?? new Date();
    setPending(base);
    setViewMonth(base);
    setViewMode("days");
    setTimeInput(null);
    setOpen((o) => !o);
  }

  function confirm() {
    onChange(pending);
    setOpen(false);
  }

  function selectTimeOption(opt: TimeOption) {
    setPending((p) => withTime(p, opt.hours, opt.minutes));
    setTimeInput(null);
  }

  function commitTypedTime() {
    if (timeInput === null) return;
    const parsed = parseTimeText(timeInput);
    if (parsed) setPending((p) => withTime(p, parsed.hours, parsed.minutes));
    setTimeInput(null);
  }

  // Keep the currently-selected option in view whenever the popover opens or the selection
  // changes (list click, or a typed time committed) — not on every keystroke while typing.
  useEffect(() => {
    if (open) selectedOptionRef.current?.scrollIntoView({ block: "center" });
  }, [open, pending]);

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
        <div className="lq-date-picker lq-date-picker--with-time">
          <div className="lq-date-picker__calendar">
            {viewMode === "days" && (
              <DaysView
                viewMonth={viewMonth}
                value={pending}
                today={today}
                isDisabled={isDisabled}
                onPrev={() => setViewMonth((m) => addMonths(m, -1))}
                onNext={() => setViewMonth((m) => addMonths(m, 1))}
                onHeaderClick={() => setViewMode("months")}
                onPick={(d) => setPending((p) => withDatePortion(p, d))}
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

          <div className="lq-date-picker__time">
            <span className="lq-field__label">Heure</span>
            <input
              type="text"
              inputMode="numeric"
              className="lq-date-picker__time-input"
              placeholder="--:--"
              value={timeInput ?? formatHM(pending)}
              onChange={(e) => setTimeInput(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={commitTypedTime}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitTypedTime();
                }
              }}
            />
            <div className="lq-date-picker__time-list">
              {timeOptions.map((opt) => {
                const selected = opt.hours === pending.getHours() && opt.minutes === pending.getMinutes();
                return (
                  <button
                    key={opt.label}
                    ref={selected ? selectedOptionRef : undefined}
                    type="button"
                    className={["lq-date-picker__time-option", selected && "lq-date-picker__time-option--selected"].filter(Boolean).join(" ")}
                    onClick={() => selectTimeOption(opt)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <button type="button" className="lq-date-picker__time-confirm" onClick={confirm}>
              Valider
            </button>
          </div>
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
