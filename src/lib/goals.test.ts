import { describe, expect, test } from '@jest/globals';
import { summarizeMonth } from './budget';
import { goalMonths, goalProgress, goalsSetAsideIn } from './goals';
import type { BudgetData, Envelope, Goal } from './types';

// A $1,200 laptop for next March, saving $300 a month from November.
const laptop = (changes: Partial<Goal> = {}): Goal => ({
  id: 'laptop',
  name: 'Laptop',
  price: 120000,
  targetDate: '2027-03-15',
  allocations: [{ fromMonth: '2026-11', amount: 30000 }],
  createdMonth: '2026-11',
  ...changes,
});

const env = (id: string, limit: number, isSavings = false): Envelope => ({
  id,
  name: id,
  limits: [{ fromMonth: '2026-11', amount: limit }],
  isSavings,
  createdMonth: '2026-11',
});

// Savings gets $3,000 - $1,600 = $1,400 a month.
const data = (goals: Goal[]): BudgetData => ({
  incomes: [{ fromMonth: '2026-11', income: { mode: 'salary', monthly: 300000 } }],
  envelopes: [env('rent', 120000), env('groceries', 40000), env('savings', 0, true)],
  expenses: [],
  bills: [],
  transfers: [],
  accounts: [],
  goals,
  startMonth: '2026-11',
});

const savingsIn = (d: BudgetData, month: string) =>
  summarizeMonth(d, month).envelopes.find((e) => e.envelope.isSavings)!;

describe('goal set-asides', () => {
  test('the allocation is set aside every month until the price is reached', () => {
    const saved = goalMonths(laptop(), '2027-04').map((m) => m.saved);
    expect(saved).toEqual([30000, 60000, 90000, 120000, 120000, 120000]);
  });

  test('the last set-aside only tops up to the price', () => {
    const months = goalMonths(laptop({ price: 100000 }), '2027-03');
    expect(months.map((m) => m.setAside)).toEqual([30000, 30000, 30000, 10000, 0]);
  });

  test('a new allocation applies from its month on', () => {
    const goal = laptop({ allocations: [{ fromMonth: '2026-11', amount: 30000 }, { fromMonth: '2027-01', amount: 10000 }] });
    expect(goalMonths(goal, '2027-02').map((m) => m.setAside)).toEqual([30000, 30000, 10000, 10000]);
  });

  test('a bought goal stops taking money and keeps what it saved', () => {
    const months = goalMonths(laptop({ boughtMonth: '2026-12' }), '2027-02');
    expect(months.map((m) => m.setAside)).toEqual([30000, 30000, 0, 0]);
    expect(months.map((m) => m.returned)).toEqual([0, 0, 0, 0]);
    expect(goalsSetAsideIn([laptop({ boughtMonth: '2026-12', removedMonth: '2026-12' })], '2026-12')).toBe(30000);
  });

  test('a removed goal hands everything back that month', () => {
    const goal = laptop({ removedMonth: '2027-01' });
    // Set aside $300 on Jan 1, then $900 goes back when it's removed.
    expect(goalsSetAsideIn([goal], '2027-01')).toBe(-60000);
    expect(goalsSetAsideIn([goal], '2027-02')).toBe(0);
  });

  test('nothing is set aside before the goal exists', () => {
    expect(goalsSetAsideIn([laptop({ createdMonth: '2026-12' })], '2026-11')).toBe(0);
  });
});

describe('goals and Savings / Discretionary', () => {
  test('set-asides come out of savings, not out of other categories', () => {
    const summary = summarizeMonth(data([laptop()]), '2026-11');
    const savings = savingsIn(data([laptop()]), '2026-11');
    expect(savings.limit).toBe(140000);
    expect(savings.goalsSetAside).toBe(30000);
    expect(savings.available).toBe(110000);
    // Left to spend across all categories drops by the set-aside.
    expect(summary.envelopes.reduce((t, e) => t + e.available, 0)).toBe(270000);
  });

  test('savings carries the smaller balance into next month', () => {
    expect(savingsIn(data([laptop()]), '2026-12').available).toBe(220000);
  });

  test('removing a goal puts the money back into savings', () => {
    const d = data([laptop({ removedMonth: '2026-12' })]);
    // Nov: 1,400 - 300. Dec: 1,100 + 1,400 - 300 + 600 returned.
    expect(savingsIn(d, '2026-12').available).toBe(280000);
  });

  test('set-asides can take savings below zero', () => {
    const big = laptop({ allocations: [{ fromMonth: '2026-11', amount: 150000 }], price: 300000 });
    expect(savingsIn(data([big]), '2026-11').available).toBe(-10000);
  });
});

describe('goal progress', () => {
  test('suggests what each month needs to hit the target date', () => {
    // Nov through Mar is 5 months, so $1,200 / 5 = $240.
    const p = goalProgress(laptop({ allocations: [{ fromMonth: '2026-11', amount: 0 }] }), '2026-11');
    expect(p.monthsLeft).toBe(5);
    expect(p.suggested).toBe(24000);
    expect(p.status).toBe('behind');
    expect(p.doneMonth).toBeUndefined();
  });

  test('plans from what was saved before this month', () => {
    // $600 saved before January leaves $600 over Jan, Feb, Mar.
    expect(goalProgress(laptop(), '2027-01').suggested).toBe(20000);
  });

  test('on track when the allocation finishes by the target month', () => {
    const p = goalProgress(laptop(), '2026-11');
    expect(p.saved).toBe(30000);
    expect(p.doneMonth).toBe('2027-02');
    expect(p.status).toBe('on-track');
  });

  test('behind when the allocation finishes after the target month', () => {
    const p = goalProgress(laptop({ allocations: [{ fromMonth: '2026-11', amount: 10000 }] }), '2026-11');
    expect(p.doneMonth).toBe('2027-10');
    expect(p.status).toBe('behind');
  });

  test('a past target date asks for the rest right away', () => {
    const p = goalProgress(laptop({ targetDate: '2026-12-01' }), '2027-01');
    expect(p.monthsLeft).toBe(1);
    expect(p.suggested).toBe(120000 - 60000);
  });

  test('saved and bought goals', () => {
    expect(goalProgress(laptop(), '2027-03').status).toBe('saved');
    expect(goalProgress(laptop(), '2027-03').doneMonth).toBe('2027-02');
    expect(goalProgress(laptop({ boughtMonth: '2027-02' }), '2027-03').status).toBe('bought');
  });
});
