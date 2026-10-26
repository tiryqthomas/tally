import { billsInMonth, isActive, limitFor, type BillOccurrence } from './budget';
import { addMonths, daysInMonth, monthOf, monthsBetween, toDateString } from './dates';
import type { Bill, BudgetData, DateString, Expense, Month } from './types';

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
  // What would have been spent by today at an even pace through the month.
  expected: number;
  // Positive when spending is ahead of an even pace (spending fast).
  ahead: number;
}

export function spendingPace(data: BudgetData, month: Month, todayDay: number): Pace {
  const spent = expensesIn(data.expenses, month).reduce((t, x) => t + x.amount, 0);
  const budget = variableBudget(data, month);
  const expected = Math.round((budget * todayDay) / daysInMonth(month));
  return { spent, budget, expected, ahead: spent - expected };
}

export interface EnvelopeSpend {
  envelopeId: string;
  name: string;
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
