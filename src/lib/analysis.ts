import { billsInMonth, isActive, limitFor, summarizeMonths, type BillOccurrence } from './budget';
import { addMonths, daysInMonth, monthOf, monthsBetween, toDateString } from './dates';
import { colorOf } from './categoryColors';
import type { Bill, BudgetData, CategoryColor, DateString, Expense, Month } from './types';

// Variable spending only: what was logged by hand. Bills are fixed expenses.
export function expensesIn(expenses: Expense[], month: Month): Expense[] {
  return expenses.filter((x) => monthOf(x.date) === month);
}

export interface DailyPoint {
  day: number;
  spent: number;
  cumulative: number;
}

// One point per day of the month, through `lastDay`.
export function dailySpending(expenses: Expense[], month: Month, lastDay = daysInMonth(month)): DailyPoint[] {
  const byDay = new Map<number, number>();
  for (const x of expensesIn(expenses, month)) {
    const day = Number(x.date.slice(8, 10));
    byDay.set(day, (byDay.get(day) ?? 0) + x.amount);
  }
  const out: DailyPoint[] = [];
  let cumulative = 0;
  for (let day = 1; day <= lastDay; day++) {
    const spent = byDay.get(day) ?? 0;
    cumulative += spent;
    out.push({ day, spent, cumulative });
  }
  return out;
}

// The variable-spending budget for a month: every envelope's limit minus the
// bills set aside from it, leaving what's meant for everyday spending.
// Savings / Discretionary is left out, since it holds what's left over.
export function variableBudget(data: BudgetData, month: Month): number {
  const bills = billsInMonth(data.bills, month);
  return data.envelopes
    .filter((e) => isActive(e, month) && !e.isSavings)
    .reduce((t, e) => {
      const set = bills.filter((b) => b.bill.envelopeId === e.id).reduce((s, b) => s + b.bill.amount, 0);
      return t + Math.max(0, limitFor(e, month) - set);
    }, 0);
}

export interface Pace {
  spent: number;
  budget: number;
  // How the pace line is drawn: the average of recent months, or an even line to the budget
  // when there's no history yet.
  basis: 'average' | 'even';
  // How many past months the average is taken over (0 for an even pace).
  months: number;
  // What the pace says should be spent by the end of each day of the month, day 1 first.
  curve: number[];
  // What the pace says should be spent by today.
  expected: number;
  // Positive when spending is ahead of the pace (spending fast).
  ahead: number;
}

const PACE_MONTHS = 3;

// Spent by a point partway through a month. `at` runs from 0 (start) to the month's length
// in days, and can fall between days, so months of different lengths line up.
function spentBy(points: DailyPoint[], at: number): number {
  const lo = Math.floor(at);
  const before = lo > 0 ? points[lo - 1].cumulative : 0;
  if (lo >= points.length) return before;
  return before + (points[lo].cumulative - before) * (at - lo);
}

// The usual shape of a month's spending: for each day, the average spent by that point across
// the last three months that had any spending. Months are lined up by how far through they are.
// Null when there's no spending history yet.
export function averagePace(expenses: Expense[], month: Month): { curve: number[]; months: number } | null {
  const days = daysInMonth(month);
  const past = Array.from({ length: PACE_MONTHS }, (_, i) => dailySpending(expenses, addMonths(month, -1 - i))).filter(
    (points) => (points.at(-1)?.cumulative ?? 0) > 0,
  );
  if (past.length === 0) return null;
  const curve = Array.from({ length: days }, (_, i) => {
    const through = (i + 1) / days;
    const total = past.reduce((t, points) => t + spentBy(points, through * points.length), 0);
    return Math.round(total / past.length);
  });
  return { curve, months: past.length };
}

// What the pace line is called: in the chart legend, and in "ahead of …" notes.
export function paceName(pace: Pace): { label: string; short: string } {
  return pace.basis === 'average'
    ? { label: `${pace.months}-month average`, short: 'your average' }
    : { label: 'Even pace', short: 'pace' };
}

export function spendingPace(data: BudgetData, month: Month, todayDay: number): Pace {
  const spent = expensesIn(data.expenses, month).reduce((t, x) => t + x.amount, 0);
  const budget = variableBudget(data, month);
  const days = daysInMonth(month);
  const average = averagePace(data.expenses, month);
  const curve = average?.curve ?? Array.from({ length: days }, (_, i) => Math.round((budget * (i + 1)) / days));
  const expected = curve[Math.max(0, Math.min(days, todayDay) - 1)] ?? 0;
  return { spent, budget, basis: average ? 'average' : 'even', months: average?.months ?? 0, curve, expected, ahead: spent - expected };
}

export interface EnvelopeSpend {
  envelopeId: string;
  name: string;
  color: CategoryColor | 'savings';
  spent: number;
  limit: number;
}

// Variable spending per envelope, biggest first. Envelopes with no spending are left out.
export function spendingByEnvelope(data: BudgetData, month: Month): EnvelopeSpend[] {
  const spent = new Map<string, number>();
  for (const x of expensesIn(data.expenses, month)) spent.set(x.envelopeId, (spent.get(x.envelopeId) ?? 0) + x.amount);
  return data.envelopes
    .filter((e) => spent.has(e.id))
    .map((e) => ({
      envelopeId: e.id,
      name: e.name,
      color: colorOf(e),
      spent: spent.get(e.id)!,
      limit: e.isSavings ? 0 : limitFor(e, month),
    }))
    .sort((a, b) => b.spent - a.spent);
}

export interface MonthTotal {
  month: Month;
  variable: number;
  fixed: number;
}

// Fixed (bills) and variable (logged) spending for the `count` months ending at `end`.
export function monthlyTotals(data: BudgetData, end: Month, count: number): MonthTotal[] {
  return monthsBetween(addMonths(end, -(count - 1)), end).map((month) => ({
    month,
    variable: expensesIn(data.expenses, month).reduce((t, x) => t + x.amount, 0),
    fixed: billsInMonth(data.bills, month).reduce((t, b) => t + b.bill.amount, 0),
  }));
}

// Bill due dates from `start` to `end`, inclusive, across month boundaries.
export function billsBetween(bills: Bill[], start: DateString, end: DateString): BillOccurrence[] {
  return monthsBetween(monthOf(start), monthOf(end))
    .flatMap((m) => billsInMonth(bills, m))
    .filter((o) => o.date >= start && o.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// The seven days starting today.
export function nextSevenDays(from: DateString): DateString[] {
  const [y, m, d] = from.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) => toDateString(new Date(y, m - 1, d + i)));
}

export interface CategoryMonth {
  month: Month;
  spent: number;
  limit: number;
}

// One category's spending month by month, oldest first, ending with `month`: up to `count`
// months, never before the budget started. Also what it spent this calendar year, and its
// average over the finished months of the year.
export function categoryHistory(data: BudgetData, envelopeId: string, month: Month, count = 6) {
  const all = summarizeMonths(data, month).flatMap((m) => {
    const e = m.envelopes.find((x) => x.envelope.id === envelopeId);
    return e ? [{ month: m.month, spent: e.spent, limit: e.limit }] : [];
  });
  const year = all.filter((m) => m.month.slice(0, 4) === month.slice(0, 4));
  const finished = year.filter((m) => m.month < month);
  return {
    months: all.slice(-count) as CategoryMonth[],
    yearTotal: year.reduce((t, m) => t + m.spent, 0),
    monthlyAverage: finished.length ? Math.round(finished.reduce((t, m) => t + m.spent, 0) / finished.length) : null,
  };
}
