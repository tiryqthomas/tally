import { describe, expect, test } from '@jest/globals';

import { summarizeMonth } from './budget';
import { categoryBurn, compareWithLastMonth, dailyAllowance, incomeSplit } from './homeCharts';
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

describe('home charts', () => {
  test('daily allowance splits what is left over the days left, today included', () => {
    // Budget 760 - 105 spent = 655 left over Oct 26-31 (6 days).
    const a = dailyAllowance(data(), '2026-10', 26);
    expect(a.left).toBe(65500);
    expect(a.daysLeft).toBe(6);
    expect(a.perDay).toBe(10916);
    expect(a.recent).toHaveLength(14);
    expect(a.recent[0].day).toBe(13);
  });

  test('daily allowance never goes below zero', () => {
    const d = data();
    d.expenses.push({ id: '5', envelopeId: 'food', amount: 90000, date: '2026-10-20' });
    expect(dailyAllowance(d, '2026-10', 26).perDay).toBe(0);
  });

  test('categories leave out ones fully used by bills and put the hottest first', () => {
    const d = data();
    d.expenses.push({ id: '5', envelopeId: 'fun', amount: 14000, date: '2026-10-10' });
    const rows = categoryBurn(summarizeMonth(d, '2026-10'), 26);
    // Rent's limit all goes to the rent bill, so it has nothing to show.
    expect(rows.map((r) => r.name)).toEqual(['Fun', 'Groceries']);
    // Fun: 200 limit - 40 gym = 160, with 170 spent.
    expect(rows[0]).toMatchObject({ limit: 16000, spent: 17000, status: 'over' });
    expect(rows[1].status).toBe('ok');
  });

  test('a category spending faster than the month is ahead', () => {
    const d = data();
    d.expenses.push({ id: '5', envelopeId: 'food', amount: 40000, date: '2026-10-08' });
    // Groceries 475 of 600 by Oct 10 (32% of the month).
    const rows = categoryBurn(summarizeMonth(d, '2026-10'), 10);
    expect(rows.find((r) => r.name === 'Groceries')?.status).toBe('ahead');
  });

  test('compares with last month on the same day', () => {
    const c = compareWithLastMonth(data(), '2026-10', 5);
    expect(c.lastMonth).toBe('2026-09');
    expect(c.now.at(-1)?.cumulative).toBe(10500);
    expect(c.lastBySameDay).toBe(0);
    expect(c.last.at(-1)?.cumulative).toBe(1000);
  });

  test('income split covers bills, spending, what is left and savings', () => {
    const d = data();
    const split = incomeSplit(d, summarizeMonth(d, '2026-10'), 26, 124000);
    expect(split).toEqual({ income: 300000, bills: 124000, spent: 10500, left: 65500, savings: 100000 });
  });
});
