import { describe, expect, test } from '@jest/globals';

import { migrateState, parseBackup, serializeBackup, type SavedState } from './backup';
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
    const plan = planReminders([rent], accounts, new Set(), 'day-before', now);
    expect(plan.map((r) => r.key)).toEqual(['rent:2026-12-01', 'rent:2027-01-01']);
    expect(plan[0].at).toEqual(new Date(2026, 10, 30, 9, 0));
    expect(plan[0].title).toBe('Rent is due tomorrow');
    expect(plan[0].body).toBe('$1,200.00 from Chase checking. Open Tally to mark it paid.');
  });

  test('skips bills already marked paid', () => {
    const plan = planReminders([rent], accounts, new Set([billKey('rent', '2026-12-01')]), 'same-day', now);
    expect(plan.map((r) => r.key)).toEqual(['rent:2027-01-01']);
  });

  test('off schedules nothing', () => {
    expect(planReminders([rent], accounts, new Set(), 'off', now)).toEqual([]);
  });

  test('stays under the iOS limit', () => {
    const weekly = Array.from({ length: 10 }, (_, i) => ({ ...rent, id: `w${i}`, frequency: 'weekly' as const }));
    expect(planReminders(weekly, accounts, new Set(), 'same-day', now)).toHaveLength(MAX_REMINDERS);
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
    startMonth: '2026-11',
    paidBills: ['rent:2026-11-01'],
    reminders: 'three-days',
  };

  test('round trips', () => {
    const parsed = parseBackup(serializeBackup(state, new Date('2026-11-15T12:00:00Z')));
    expect(parsed).toEqual({ ok: true, state, exportedAt: '2026-11-15T12:00:00.000Z' });
  });

  test('rejects files that are not Tally backups', () => {
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
    expect(migrated.reminders).toBe('day-before');
  });
});
