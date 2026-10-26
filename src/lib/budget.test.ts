import { describe, expect, test } from '@jest/globals';
import { billDueDates, limitFor, summarizeMonth } from './budget';
import { estimateMonthlyFromHourly, formatMoney, parseMoney } from './money';
import type { Bill, BudgetData, Envelope } from './types';

const env = (id: string, limit: number, isSavings = false): Envelope => ({
  id,
  name: id,
  limits: [{ fromMonth: '2026-11', amount: limit }],
  isSavings,
  createdMonth: '2026-11',
});

const base = (): BudgetData => ({
  income: { mode: 'salary', monthly: 300000 },
  envelopes: [env('rent', 120000), env('groceries', 40000), env('savings', 50000, true)],
  expenses: [],
  bills: [],
  transfers: [],
  accounts: [],
  startMonth: '2026-11',
});

const row = (data: BudgetData, month: string, id: string) =>
  summarizeMonth(data, month).envelopes.find((e) => e.envelope.id === id)!;

describe('money', () => {
  test('formats cents', () => {
    expect(formatMoney(123456)).toBe('$1,234.56');
    expect(formatMoney(-500)).toBe('-$5.00');
  });

  test('parses input', () => {
    expect(parseMoney('12')).toBe(1200);
    expect(parseMoney('$1,200.5')).toBe(120050);
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('1.234')).toBeNull();
  });

  test('estimates hourly pay as a month', () => {
    // $20/h x 40h x 52 / 12 = $3,466.67
    expect(estimateMonthlyFromHourly(2000, 40)).toBe(346667);
  });
});

describe('bills', () => {
  const bill = (frequency: Bill['frequency'], startDate: string): Bill => ({
    id: 'b',
    name: 'b',
    amount: 1000,
    envelopeId: 'rent',
    frequency,
    startDate,
  });

  test('monthly bills clamp to short months', () => {
    expect(billDueDates(bill('monthly', '2026-01-31'), '2027-02')).toEqual(['2027-02-28']);
  });

  test('bills never fall before their start date', () => {
    expect(billDueDates(bill('monthly', '2026-11-15'), '2026-10')).toEqual([]);
    expect(billDueDates(bill('weekly', '2026-11-12'), '2026-11')).toEqual([
      '2026-11-12',
      '2026-11-19',
      '2026-11-26',
    ]);
  });

  test('deleted bills stay in past months only', () => {
    const ended = { ...bill('monthly', '2026-09-10'), endDate: '2026-11-05' };
    expect(billDueDates(ended, '2026-10')).toEqual(['2026-10-10']);
    expect(billDueDates(ended, '2026-11')).toEqual([]);
  });

  test('yearly bills only fall in their month', () => {
    expect(billDueDates(bill('yearly', '2026-03-05'), '2027-03')).toEqual(['2027-03-05']);
    expect(billDueDates(bill('yearly', '2026-03-05'), '2027-04')).toEqual([]);
  });
});

describe('summarizeMonth', () => {
  test('bills are set aside for the whole month on day one', () => {
    const data = base();
    data.bills.push({
      id: 'r',
      name: 'Rent',
      amount: 120000,
      envelopeId: 'rent',
      frequency: 'monthly',
      startDate: '2026-11-28',
    });
    expect(row(data, '2026-11', 'rent').billsSetAside).toBe(120000);
    expect(row(data, '2026-11', 'rent').available).toBe(0);
  });

  test('overspending is pulled from savings', () => {
    const data = base();
    data.expenses.push({ id: 'e', envelopeId: 'groceries', amount: 45000, date: '2026-11-10' });
    const summary = summarizeMonth(data, '2026-11');
    expect(row(data, '2026-11', 'groceries').available).toBe(0);
    expect(row(data, '2026-11', 'groceries').coveredBySavings).toBe(5000);
    expect(row(data, '2026-11', 'savings').available).toBe(45000);
    expect(summary.totalCovered).toBe(5000);
  });

  test('leftover rolls over, including negative savings', () => {
    const data = base();
    data.expenses.push({ id: 'e1', envelopeId: 'groceries', amount: 10000, date: '2026-11-10' });
    data.expenses.push({ id: 'e2', envelopeId: 'savings', amount: 60000, date: '2026-11-11' });
    expect(row(data, '2026-12', 'groceries').rollover).toBe(30000);
    expect(row(data, '2026-12', 'groceries').available).toBe(70000);
    expect(row(data, '2026-12', 'savings').rollover).toBe(-10000);
    expect(row(data, '2026-12', 'savings').available).toBe(40000);
  });

  test('limit changes only apply from their month on', () => {
    const groceries = env('groceries', 40000);
    groceries.limits.push({ fromMonth: '2027-01', amount: 50000 });
    expect(limitFor(groceries, '2026-12')).toBe(40000);
    expect(limitFor(groceries, '2027-02')).toBe(50000);
  });

  test('transfers move money between envelopes', () => {
    const data = base();
    data.transfers.push({ id: 't', fromEnvelopeId: 'savings', toEnvelopeId: 'groceries', amount: 2500, month: '2026-11' });
    expect(row(data, '2026-11', 'groceries').available).toBe(42500);
    expect(row(data, '2026-11', 'savings').available).toBe(47500);
  });

  test('unassigned income is income minus limits', () => {
    expect(summarizeMonth(base(), '2026-11').unassigned).toBe(300000 - 210000);
  });
});
