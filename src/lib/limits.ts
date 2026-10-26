import { summarizeMonths } from "./budget";
import type { BudgetData, Month } from "./types";

export interface MonthUse {
  month: Month;
  spent: number;
  bills: number;
}

export interface LimitHistory {
  // Up to the last few full months the category existed, oldest first.
  past: MonthUse[];
  // This month so far. Not part of the average.
  current: MonthUse;
  // What the category used in an average past month, spending and bills together. Zero with no past months.
  average: number;
}

// What a category has used in recent months, for picking its limit.
export function limitHistory(
  data: BudgetData,
  envelopeId: string,
  month: Month,
  count = 3,
): LimitHistory {
  const uses = summarizeMonths(data, month).flatMap((m) => {
    const e = m.envelopes.find((x) => x.envelope.id === envelopeId);
    return e
      ? [{ month: m.month, spent: e.spent, bills: e.billsSetAside }]
      : [];
  });
  const current =
    uses.at(-1)?.month === month ? uses.pop()! : { month, spent: 0, bills: 0 };
  const past = uses.slice(-count);
  const total = past.reduce((t, u) => t + u.spent + u.bills, 0);
  return {
    past,
    current,
    average: past.length ? Math.round(total / past.length) : 0,
  };
}

// Rounds a dragged amount to the nearest step, never below zero.
export function snapLimit(cents: number, step = 500): number {
  return Math.max(0, Math.round(cents / step) * step);
}

// A round top for the chart's scale with room above the biggest value.
export function scaleTop(...values: number[]): number {
  const top = Math.max(10000, ...values) * 1.4;
  const step = top > 200000 ? 50000 : top > 50000 ? 10000 : 5000;
  return Math.ceil(top / step) * step;
}
