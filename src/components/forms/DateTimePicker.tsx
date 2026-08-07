import { useRef, useState } from "react";
import { Popover } from "./Popover";
import { CalendarIcon, ChevronDownIcon, ChevronUpIcon } from "../icons";
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
  /** Minute increment for the stepper. Default 1. */
  minuteStep?: number;
  className?: string;
}

type ViewMode = "days" | "months" | "years";

const defaultFormat = (d: Date) =>
  `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} à ${d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

function withDatePortion(time: Date, day: Date): Date {
  const next = new Date(day);
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return next;
}

function withHours(d: Date, hours: number): Date {
  const next = new Date(d);
  next.setHours(hours);
  return next;
}

function withMinutes(d: Date, minutes: number): Date {
  const next = new Date(d);
  next.setMinutes(minutes);
  return next;
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
  minuteStep = 1,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value ?? new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const [pending, setPending] = useState<Date>(() => value ?? new Date());
  const anchorRef = useRef<HTMLButtonElement>(null);

  const today = new Date();
  const isDisabled = (d: Date) => (minDate && isBeforeDay(d, minDate)) || (maxDate && isAfterDay(d, maxDate));

  function openPicker() {
    const base = value ?? new Date();
    setPending(base);
    setViewMonth(base);
    setViewMode("days");
    setOpen((o) => !o);
  }

  function confirm() {
    onChange(pending);
    setOpen(false);
  }

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
            <div className="lq-date-picker__time-display">
              <TimeStepper value={pending.getHours()} max={23} label="Heures" onChange={(h) => setPending((p) => withHours(p, h))} />
              <span className="lq-date-picker__time-colon">:</span>
              <TimeStepper
                value={pending.getMinutes()}
                max={59}
                step={minuteStep}
                label="Minutes"
                onChange={(m) => setPending((p) => withMinutes(p, m))}
              />
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

interface TimeStepperProps {
  value: number;
  max: number;
  step?: number;
  label: string;
  onChange: (v: number) => void;
}

function TimeStepper({ value, max, step = 1, label, onChange }: TimeStepperProps) {
  const modulus = max + 1;
  const cycle = (n: number) => ((n % modulus) + modulus) % modulus;
  return (
    <div className="lq-date-picker__time-stepper">
      <button type="button" onClick={() => onChange(cycle(value + step))} aria-label={`${label} +${step}`}>
        <ChevronUpIcon size={14} />
      </button>
      <span className="lq-date-picker__time-value">{String(value).padStart(2, "0")}</span>
      <button type="button" onClick={() => onChange(cycle(value - step))} aria-label={`${label} -${step}`}>
        <ChevronDownIcon size={14} />
      </button>
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
