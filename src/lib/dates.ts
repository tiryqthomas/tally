import type { DateString, Month } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateString(d: Date): DateString {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): DateString {
  return toDateString(new Date());
}

export function monthOf(date: DateString): Month {
  return date.slice(0, 7);
}

export function currentMonth(): Month {
  return monthOf(today());
}

export function parseMonth(month: Month): { year: number; month: number } {
  const [y, m] = month.split('-').map(Number);
  return { year: y, month: m };
}

export function addMonths(month: Month, n: number): Month {
  const { year, month: m } = parseMonth(month);
  const total = year * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

// Inclusive list of months from start to end.
export function monthsBetween(start: Month, end: Month): Month[] {
  const out: Month[] = [];
  for (let m = start; m <= end; m = addMonths(m, 1)) out.push(m);
  return out;
}

export function daysInMonth(month: Month): number {
  const { year, month: m } = parseMonth(month);
  return new Date(year, m, 0).getDate();
}

export function dateInMonth(month: Month, day: number): DateString {
  return `${month}-${pad(Math.min(day, daysInMonth(month)))}`;
}

// 0 = Sunday
export function weekdayOf(date: DateString): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(month: Month): string {
  const { year, month: m } = parseMonth(month);
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

export function shortDateLabel(date: DateString): string {
  const [, m, d] = date.split('-').map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}`;
}
