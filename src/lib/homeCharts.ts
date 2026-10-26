import { dailySpending, spendingPace, type DailyPoint } from './analysis';
import type { MonthSummary } from './budget';
import { addMonths, daysInMonth } from './dates';
import type { BudgetData, Month } from './types';

// The charts people can pick for the display at the top of Home.
export type HomeChart = 'pace' | 'allowance' | 'categories' | 'last-month' | 'income';

export const HOME_CHART_OPTIONS: { value: HomeChart; label: string; detail: string }[] = [
  { value: 'pace', label: 'Spending pace', detail: 'Your spending so far against an even line to the budget.' },
  {
    value: 'allowance',
    label: 'Daily allowance',
    detail: "What's left divided by the days left, with your last 14 days as bars.",
  },
  { value: 'categories', label: 'Categories', detail: 'A bar for each category against its limit, with a line at today.' },
  { value: 'last-month', label: 'Vs last month', detail: "This month's running total against last month's on the same days." },
  { value: 'income', label: 'Income split', detail: 'Your income split into bills, spent, left to spend and savings.' },
];

export interface Allowance {
  left: number;
  daysLeft: number;
  // What can be spent each remaining day, today included. Never below zero.
  perDay: number;
  // Up to the last 14 days of this month, oldest first.
  recent: DailyPoint[];
}

export function dailyAllowance(data: BudgetData, month: Month, todayDay: number): Allowance {
  const pace = spendingPace(data, month, todayDay);
  const left = pace.budget - pace.spent;
  const daysLeft = daysInMonth(month) - todayDay + 1;
  const points = dailySpending(data.expenses, month, todayDay);
  return { left, daysLeft, perDay: Math.max(0, Math.floor(left / daysLeft)), recent: points.slice(-14) };
}

export interface CategoryBurn {
  id: string;
  name: string;
  spent: number;
  // The limit left for everyday spending after bills set aside from it.
  limit: number;
  status: 'over' | 'ahead' | 'ok';
}

// Categories with an everyday-spending limit or any spending, hottest first.
export function categoryBurn(summary: MonthSummary, todayDay: number): CategoryBurn[] {
  const elapsed = todayDay / daysInMonth(summary.month);
  return summary.envelopes
    .filter((e) => !e.envelope.isSavings)
    .map((e) => {
      const limit = Math.max(0, e.limit - e.billsSetAside);
      const status: CategoryBurn['status'] = e.spent > limit ? 'over' : limit > 0 && e.spent / limit > elapsed ? 'ahead' : 'ok';
      return { id: e.envelope.id, name: e.envelope.name, spent: e.spent, limit, status };
    })
    .filter((c) => c.limit > 0 || c.spent > 0)
    .sort((a, b) => ratio(b) - ratio(a));
}

const ratio = (c: CategoryBurn) => (c.limit > 0 ? c.spent / c.limit : c.spent > 0 ? Infinity : 0);

export interface MonthCompare {
  now: DailyPoint[];
  last: DailyPoint[];
  lastMonth: Month;
  // Last month's total by the same day of the month.
  lastBySameDay: number;
}

export function compareWithLastMonth(data: BudgetData, month: Month, todayDay: number): MonthCompare {
  const lastMonth = addMonths(month, -1);
  const last = dailySpending(data.expenses, lastMonth);
  const sameDay = Math.min(todayDay, last.length);
  return {
    now: dailySpending(data.expenses, month, todayDay),
    last,
    lastMonth,
    lastBySameDay: last[sameDay - 1]?.cumulative ?? 0,
  };
}

export interface IncomeSplit {
  income: number;
  bills: number;
  spent: number;
  left: number;
  savings: number;
}

// Where the month's income goes. Overspending shows as nothing left, not a negative slice.
export function incomeSplit(data: BudgetData, summary: MonthSummary, todayDay: number, bills: number): IncomeSplit {
  const pace = spendingPace(data, summary.month, todayDay);
  const savings = summary.envelopes.find((e) => e.envelope.isSavings)?.limit ?? 0;
  return {
    income: summary.income,
    bills,
    spent: pace.spent,
    left: Math.max(0, pace.budget - pace.spent),
    savings: Math.max(0, savings),
  };
}
