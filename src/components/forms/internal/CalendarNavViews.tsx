import { ChevronLeftIcon, ChevronRightIcon } from "../../icons";
import { YEARS_PER_PAGE } from "./dateUtils";

export { WEEKDAY_LABELS, YEARS_PER_PAGE } from "./dateUtils";

export interface CalendarHeaderProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onHeaderClick?: () => void;
  prevLabel: string;
  nextLabel: string;
}

/** Prev/next arrows around a label — the label is clickable when `onHeaderClick` is given
 *  (drilling up to a coarser view), otherwise it's static (already at the coarsest view). */
export function CalendarHeader({ label, onPrev, onNext, onHeaderClick, prevLabel, nextLabel }: CalendarHeaderProps) {
  return (
    <div className="lq-date-picker__header">
      <button type="button" className="lq-date-picker__nav" onClick={onPrev} aria-label={prevLabel}>
        <ChevronLeftIcon size={16} />
      </button>
      {onHeaderClick ? (
        <button type="button" className="lq-date-picker__header-label" onClick={onHeaderClick}>
          {label}
        </button>
      ) : (
        <span className="lq-date-picker__header-label lq-date-picker__header-label--static">{label}</span>
      )}
      <button type="button" className="lq-date-picker__nav" onClick={onNext} aria-label={nextLabel}>
        <ChevronRightIcon size={16} />
      </button>
    </div>
  );
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString("fr-FR", { month: "short" }));

export interface MonthsViewProps {
  viewMonth: Date;
  onPrev: () => void;
  onNext: () => void;
  onHeaderClick: () => void;
  onPick: (month: number) => void;
}

export function MonthsView({ viewMonth, onPrev, onNext, onHeaderClick, onPick }: MonthsViewProps) {
  return (
    <>
      <CalendarHeader
        label={String(viewMonth.getFullYear())}
        onPrev={onPrev}
        onNext={onNext}
        onHeaderClick={onHeaderClick}
        prevLabel="Année précédente"
        nextLabel="Année suivante"
      />
      <div className="lq-date-picker__grid lq-date-picker__grid--picker">
        {MONTH_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={["lq-date-picker__cell", i === viewMonth.getMonth() && "lq-date-picker__cell--selected"].filter(Boolean).join(" ")}
            onClick={() => onPick(i)}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

export interface YearsViewProps {
  viewMonth: Date;
  onPrev: () => void;
  onNext: () => void;
  onPick: (year: number) => void;
}

export function YearsView({ viewMonth, onPrev, onNext, onPick }: YearsViewProps) {
  const pageStart = Math.floor(viewMonth.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE;
  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => pageStart + i);
  return (
    <>
      <CalendarHeader
        label={`${years[0]} – ${years[years.length - 1]}`}
        onPrev={onPrev}
        onNext={onNext}
        prevLabel="Décennie précédente"
        nextLabel="Décennie suivante"
      />
      <div className="lq-date-picker__grid lq-date-picker__grid--picker">
        {years.map((year) => (
          <button
            key={year}
            type="button"
            className={["lq-date-picker__cell", year === viewMonth.getFullYear() && "lq-date-picker__cell--selected"].filter(Boolean).join(" ")}
            onClick={() => onPick(year)}
          >
            {year}
          </button>
        ))}
      </div>
    </>
  );
}
