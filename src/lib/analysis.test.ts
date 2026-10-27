import { describe, expect, test } from '@jest/globals';

import { billsBetween, dailySpending, monthlyTotals, nextSevenDays, paceName, spendingByEnvelope, spendingPace, variableBudget } from './analysis';
import type { Bill, BudgetData } from './types';

const rent: Bill = { id: 'r', name: 'Rent', amount: 120000, envelopeId: 'home', frequency: 'monthly', startDate: '2026-10-01' };
const gym: Bill = { id: 'g', name: 'Gym', amount: 4000, envelopeId: 'fun', frequency: 'monthly', startDate: '2026-10-28' };

const data = (): BudgetData => ({
  incomes: [{ fromMonth: '2026-10', income: { mode: 'salary', monthly: 300000 } }],
  envelopes: [
    { id: 'home', name: 'Rent', limits: [{ fromMonth: '2026-10', amount: 120000 }], isSavings: false, createdMonth: '2026-10' },
    { id: 'food', name: 'Groceries', limits: [{ fromMonth: '2026-10', amount: 60000 }], isSavings: false, createdMonth: '2026-10' },
    { id: 'fun', name: 'Fun', limits: [{ fromMonth: '2026-10', amount: 20000 }], isSavings: false, createdMonth: '2026-10' },
    { id: 's', name: 'Savings', limits: [], isSavings: true, createdMonth: '2026-10' },
  ],
  expenses: [
    { id: '1', envelopeId: 'food', amount: 5000, date: '2026-10-02' },
    { id: '2', envelopeId: 'food', amount: 2500, date: '2026-10-02' },
    { id: '3', envelopeId: 'fun', amount: 3000, date: '2026-10-05' },
    { id: '4', envelopeId: 'food', amount: 1000, date: '2026-09-30' },
  ],
  bills: [rent, gym],
  transfers: [],
  accounts: [],
  goals: [],
  startMonth: '2026-10',
});

describe('analysis', () => {
  test('daily spending adds up through the month', () => {
    const days = dailySpending(data().expenses, '2026-10', 5);
    expect(days.map((d) => d.spent)).toEqual([0, 7500, 0, 0, 3000]);
    expect(days[4].cumulative).toBe(10500);
  });

  test('variable budget is limits minus bills, without savings', () => {
    // Rent 1200 - 1200 bill + Groceries 600 + Fun 200 - 40 gym = 760
    expect(variableBudget(data(), '2026-10')).toBe(76000);
  });

  test('pace falls back to an even pace when there is no history', () => {
    const d = data();
    d.expenses = d.expenses.filter((x) => x.date.startsWith('2026-10'));
    const pace = spendingPace(d, '2026-10', 10);
    expect(pace.basis).toBe('even');
    expect(pace.spent).toBe(10500);
    expect(pace.expected).toBe(Math.round((76000 * 10) / 31));
    expect(pace.ahead).toBe(10500 - pace.expected);
    expect(paceName(pace).label).toBe('Even pace');
  });

  test('pace follows the average of the last three months that had spending', () => {
    const d = data();
    d.expenses = [
      ...d.expenses.filter((x) => x.date.startsWith('2026-10')),
      // September (30 days): 3000 on the 1st, 3000 on the 30th.
      { id: 's1', envelopeId: 'food', amount: 3000, date: '2026-09-01' },
      { id: 's2', envelopeId: 'food', amount: 3000, date: '2026-09-30' },
      // August (31 days): 9000 on the 1st.
      { id: 'a1', envelopeId: 'food', amount: 9000, date: '2026-08-01' },
      // June is four months back and left out.
      { id: 'j1', envelopeId: 'food', amount: 99000, date: '2026-06-01' },
    ];
    const pace = spendingPace(d, '2026-10', 10);
    expect(pace.basis).toBe('average');
    expect(pace.months).toBe(2);
    expect(pace.curve).toHaveLength(31);
    // By day 10 both months are past their 1st only: (3000 + 9000) / 2.
    expect(pace.expected).toBe(6000);
    // By the end, the average of the two months' totals.
    expect(pace.curve.at(-1)).toBe(7500);
    expect(pace.ahead).toBe(10500 - 6000);
    expect(paceName(pace).label).toBe('2-month average');
  });

  test('spending by envelope, biggest first', () => {
    expect(spendingByEnvelope(data(), '2026-10').map((e) => [e.name, e.spent, e.limit])).toEqual([
      ['Groceries', 7500, 60000],
      ['Fun', 3000, 20000],
    ]);
  });

  test('monthly totals split fixed and variable', () => {
    expect(monthlyTotals(data(), '2026-10', 2)).toEqual([
      { month: '2026-09', variable: 1000, fixed: 0 },
      { month: '2026-10', variable: 10500, fixed: 124000 },
    ]);
  });

  test('bills in the next seven days cross into next month', () => {
    const days = nextSevenDays('2026-10-27');
    expect(days[0]).toBe('2026-10-27');
    expect(days[6]).toBe('2026-11-02');
    expect(billsBetween(data().bills, days[0], days[6]).map((o) => `${o.bill.name} ${o.date}`)).toEqual([
      'Gym 2026-10-28',
      'Rent 2026-11-01',
    ]);
  });
});
