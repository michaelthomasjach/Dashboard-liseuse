export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function addYears(d: Date, n: number): Date {
  return new Date(d.getFullYear() + n, d.getMonth(), 1);
}

export function setMonth(d: Date, month: number): Date {
  return new Date(d.getFullYear(), month, 1);
}

export function setYear(d: Date, year: number): Date {
  return new Date(year, d.getMonth(), 1);
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Monday-first start-of-week for the week containing `d`. */
export function startOfWeekMonday(d: Date): Date {
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

/** 42 cells (6 weeks) covering the month of `month`, Monday-first. */
export function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const gridStart = startOfWeekMonday(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function isBeforeDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() < b.getFullYear() ||
    (a.getFullYear() === b.getFullYear() &&
      (a.getMonth() < b.getMonth() || (a.getMonth() === b.getMonth() && a.getDate() < b.getDate())))
  );
}

export function isAfterDay(a: Date, b: Date): boolean {
  return isBeforeDay(b, a);
}
