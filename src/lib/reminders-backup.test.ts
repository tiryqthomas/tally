import { describe, expect, test } from '@jest/globals';

import { migrateState, parseBackup, receiptNames, serializeBackup, type SavedState } from './backup';
import { billKey, billStatus } from './budget';
import { MAX_REMINDERS, planReminders } from './reminderPlan';
import type { Bill } from './types';

const rent: Bill = {
  id: 'rent',
  name: 'Rent',
  amount: 120000,
  envelopeId: 'e',
  accountId: 'chase',
  frequency: 'monthly',
  startDate: '2026-11-01',
};
const accounts = [{ id: 'chase', name: 'Chase checking' }];

describe('billStatus', () => {
  const paid = new Set([billKey('rent', '2026-11-01')]);
  test('paid, overdue, due today and upcoming', () => {
    expect(billStatus('rent', '2026-11-01', paid, '2026-11-10')).toBe('paid');
    expect(billStatus('rent', '2026-12-01', new Set(), '2026-12-05')).toBe('overdue');
    expect(billStatus('rent', '2026-12-01', new Set(), '2026-12-01')).toBe('due-today');
    expect(billStatus('rent', '2026-12-01', new Set(), '2026-11-20')).toBe('upcoming');
  });
});

describe('planReminders', () => {
  const now = new Date(2026, 10, 15, 12, 0); // Nov 15, noon

  test('reminds the day before at 9am, skipping past dates', () => {
    const plan = planReminders([rent], accounts, new Set(), ['day-before'], now);
    expect(plan.map((r) => r.key)).toEqual(['rent:2026-12-01:day-before', 'rent:2027-01-01:day-before']);
    expect(plan[0].at).toEqual(new Date(2026, 10, 30, 9, 0));
    expect(plan[0].title).toBe('Rent is due tomorrow');
    expect(plan[0].body).toBe('$1,200.00 from Chase checking. Open Abacus to mark it paid.');
  });

  test('skips bills already marked paid', () => {
    const plan = planReminders([rent], accounts, new Set([billKey('rent', '2026-12-01')]), ['same-day'], now);
    expect(plan.map((r) => r.key)).toEqual(['rent:2027-01-01:same-day']);
  });

  test('several reminders for each due date', () => {
    const plan = planReminders([rent], accounts, new Set(), ['three-days', 'same-day'], now);
    expect(plan.slice(0, 2).map((r) => [r.at, r.title])).toEqual([
      [new Date(2026, 10, 28, 9, 0), 'Rent is due in 3 days'],
      [new Date(2026, 11, 1, 9, 0), 'Rent is due today'],
    ]);
    expect(new Set(plan.map((r) => r.key)).size).toBe(plan.length);
  });

  test('a week before', () => {
    const plan = planReminders([rent], accounts, new Set(), ['week-before'], now);
    expect(plan[0].at).toEqual(new Date(2026, 10, 24, 9, 0));
    expect(plan[0].title).toBe('Rent is due in 7 days');
  });

  test('none picked schedules nothing', () => {
    expect(planReminders([rent], accounts, new Set(), [], now)).toEqual([]);
  });

  test('stays under the iOS limit', () => {
    const weekly = Array.from({ length: 10 }, (_, i) => ({ ...rent, id: `w${i}`, frequency: 'weekly' as const }));
    expect(planReminders(weekly, accounts, new Set(), ['same-day', 'day-before'], now)).toHaveLength(MAX_REMINDERS);
  });
});

describe('backups', () => {
  const state: SavedState = {
    onboarded: true,
    incomes: [{ fromMonth: '2026-11', income: { mode: 'salary', monthly: 300000 } }],
    envelopes: [],
    expenses: [],
    bills: [rent],
    transfers: [],
    accounts,
    goals: [],
    startMonth: '2026-11',
    paidBills: ['rent:2026-11-01'],
    reminders: ['three-days', 'same-day'],
    homeChart: 'allowance',
  };

  test('round trips', () => {
    const parsed = parseBackup(serializeBackup(state, new Date('2026-11-15T12:00:00Z')));
    expect(parsed).toEqual({ ok: true, state, exportedAt: '2026-11-15T12:00:00.000Z', receipts: {} });
  });

  test('carries receipt photos the expenses point to', () => {
    const withReceipt: SavedState = {
      ...state,
      expenses: [
        { id: 'a', envelopeId: 'e', amount: 1250, date: '2026-11-03', receipt: 'abc123.jpg' },
        { id: 'b', envelopeId: 'e', amount: 800, date: '2026-11-04' },
      ],
    };
    expect(receiptNames(withReceipt)).toEqual(['abc123.jpg']);
    const file = serializeBackup(withReceipt, new Date('2026-11-15T12:00:00Z'), { 'abc123.jpg': 'AAAA' });
    expect(parseBackup(file)).toMatchObject({ ok: true, state: withReceipt, receipts: { 'abc123.jpg': 'AAAA' } });
  });

  test('ignores receipt files nothing points to or with unsafe names', () => {
    const file = JSON.stringify({
      app: 'tally',
      version: 4,
      state: { ...state, expenses: [{ id: 'a', envelopeId: 'e', amount: 1, date: '2026-11-03', receipt: '../../x.jpg' }] },
      receipts: { '../../x.jpg': 'AAAA', 'stray.jpg': 'BBBB' },
    });
    const parsed = parseBackup(file);
    expect(parsed).toMatchObject({ ok: true, receipts: {} });
    expect(parsed.ok && parsed.state.expenses[0].receipt).toBeUndefined();
  });

  test('backups from before receipts still restore', () => {
    const file = JSON.stringify({ app: 'tally', version: 3, state: { ...state, expenses: [{ id: 'a', envelopeId: 'e', amount: 1, date: '2026-11-03' }] } });
    expect(parseBackup(file)).toMatchObject({ ok: true, receipts: {}, state: { expenses: [{ id: 'a' }] } });
  });

  test('rejects files that are not Abacus backups', () => {
    expect(parseBackup('hello').ok).toBe(false);
    expect(parseBackup('{"app":"other"}').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'tally', version: 99, state })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'tally', version: 2, state: { envelopes: 'x' } })).ok).toBe(false);
  });

  test('upgrades data from the first version', () => {
    const v1 = { income: { mode: 'salary', monthly: 1000 }, startMonth: '2026-10', envelopes: [] };
    const migrated = migrateState(v1, 1);
    expect(migrated.incomes).toEqual([{ fromMonth: '2026-10', income: { mode: 'salary', monthly: 1000 } }]);
    expect(migrated.paidBills).toEqual([]);
    expect(migrated.reminders).toEqual(['day-before']);
    expect(migrated.homeChart).toBe('pace');
    expect(migrated.goals).toEqual([]);
  });

  test('turns the single reminder setting into a list', () => {
    const v2 = (reminders: string) => migrateState({ startMonth: '2026-10', reminders }, 2).reminders;
    expect(v2('three-days')).toEqual(['three-days']);
    expect(v2('same-day')).toEqual(['same-day']);
    expect(v2('off')).toEqual([]);
    const file = JSON.stringify({ app: 'tally', version: 2, state: { ...state, reminders: 'off' } });
    expect(parseBackup(file)).toMatchObject({ ok: true, state: { reminders: [] } });
  });
});
