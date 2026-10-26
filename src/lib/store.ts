import Storage from './storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { migrateState, STATE_VERSION, type SavedState } from './backup';
import { billKey } from './budget';
import { currentMonth, today } from './dates';
import type { HomeChart } from './homeCharts';
import type { ReminderSetting } from './reminderPlan';
import type { Account, Bill, BudgetData, DateString, Envelope, Expense, Goal, Income, Transfer } from './types';

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

interface BudgetState extends SavedState {
  // Changes income from the current month onward.
  setIncome: (income: Income) => void;
  // The Savings / Discretionary envelope is created automatically.
  finishOnboarding: (income: Income, envelopes: { name: string; limit: number }[]) => void;
  // Returns the new envelope's id.
  addEnvelope: (name: string, limit: number) => string;
  renameEnvelope: (id: string, name: string) => void;
  // Changes the limit from the current month onward.
  setEnvelopeLimit: (id: string, limit: number) => void;
  archiveEnvelope: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, changes: Partial<Omit<Expense, 'id'>>) => void;
  deleteExpense: (id: string) => void;
  moveMoney: (transfer: Omit<Transfer, 'id' | 'month'>) => void;
  saveBill: (bill: Omit<Bill, 'id'> & { id?: string }) => void;
  deleteBill: (id: string) => void;
  addAccount: (name: string) => void;
  deleteAccount: (id: string) => void;
  // Marks one due date of a bill paid, or unpaid if it already was.
  togglePaid: (billId: string, date: DateString) => void;
  // Returns the new goal's id.
  addGoal: (goal: { name: string; price: number; targetDate: DateString; allocation: number }) => string;
  updateGoal: (id: string, changes: Partial<Pick<Goal, 'name' | 'price' | 'targetDate'>>) => void;
  // Changes the monthly set-aside from the current month onward.
  setGoalAllocation: (id: string, amount: number) => void;
  // Marks the goal bought this month, or not bought if it already was.
  toggleGoalBought: (id: string) => void;
  // Hands everything saved back to Savings / Discretionary this month.
  removeGoal: (id: string) => void;
  setReminders: (setting: ReminderSetting) => void;
  setHomeChart: (chart: HomeChart) => void;
  // Replaces everything with a restored backup.
  restore: (state: SavedState) => void;
  resetAll: () => void;
}

const empty = (): SavedState => ({
  onboarded: false,
  paidBills: [],
  reminders: 'day-before',
  homeChart: 'pace',
  incomes: [],
  envelopes: [],
  expenses: [],
  bills: [],
  transfers: [],
  accounts: [],
  goals: [],
  startMonth: currentMonth(),
});

export const SAVINGS_NAME = 'Savings / Discretionary';

const makeEnvelope = (name: string, limit: number, isSavings = false): Envelope => ({
  id: newId(),
  name,
  limits: [{ fromMonth: currentMonth(), amount: limit }],
  isSavings,
  createdMonth: currentMonth(),
});

export const useBudget = create<BudgetState>()(
  persist(
    (set) => ({
      ...empty(),

      setIncome: (income) =>
        set((s) => {
          const fromMonth = currentMonth();
          return { incomes: [...s.incomes.filter((i) => i.fromMonth !== fromMonth), { fromMonth, income }] };
        }),

      finishOnboarding: (income, envelopes) =>
        set({
          onboarded: true,
          incomes: [{ fromMonth: currentMonth(), income }],
          startMonth: currentMonth(),
          envelopes: [
            ...envelopes.map((e) => makeEnvelope(e.name, e.limit)),
            makeEnvelope(SAVINGS_NAME, 0, true),
          ],
        }),

      addEnvelope: (name, limit) => {
        const envelope = makeEnvelope(name, limit);
        set((s) => ({ envelopes: [...s.envelopes, envelope] }));
        return envelope.id;
      },

      renameEnvelope: (id, name) =>
        set((s) => ({ envelopes: s.envelopes.map((e) => (e.id === id ? { ...e, name } : e)) })),

      setEnvelopeLimit: (id, amount) =>
        set((s) => {
          const fromMonth = currentMonth();
          return {
            envelopes: s.envelopes.map((e) =>
              e.id === id
                ? { ...e, limits: [...e.limits.filter((l) => l.fromMonth !== fromMonth), { fromMonth, amount }] }
                : e,
            ),
          };
        }),

      archiveEnvelope: (id) =>
        set((s) => ({
          envelopes: s.envelopes.map((e) =>
            e.id === id && !e.isSavings ? { ...e, archivedMonth: currentMonth() } : e,
          ),
        })),

      addExpense: (expense) => set((s) => ({ expenses: [...s.expenses, { ...expense, id: newId() }] })),

      updateExpense: (id, changes) =>
        set((s) => ({ expenses: s.expenses.map((x) => (x.id === id ? { ...x, ...changes } : x)) })),

      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),

      moveMoney: (transfer) =>
        set((s) => ({ transfers: [...s.transfers, { ...transfer, id: newId(), month: currentMonth() }] })),

      saveBill: ({ id, ...bill }) =>
        set((s) =>
          id
            ? { bills: s.bills.map((b) => (b.id === id ? { ...b, ...bill, id } : b)) }
            : { bills: [...s.bills, { ...bill, id: newId() }] },
        ),

      deleteBill: (id) => set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, endDate: today() } : b)) })),

      addAccount: (name) => set((s) => ({ accounts: [...s.accounts, { id: newId(), name }] })),

      deleteAccount: (id) =>
        set((s) => ({
          accounts: s.accounts.filter((a: Account) => a.id !== id),
          bills: s.bills.map((b) => (b.accountId === id ? { ...b, accountId: undefined } : b)),
        })),

      togglePaid: (billId, date) =>
        set((s) => {
          const key = billKey(billId, date);
          return {
            paidBills: s.paidBills.includes(key) ? s.paidBills.filter((k) => k !== key) : [...s.paidBills, key],
          };
        }),

      addGoal: ({ allocation, ...goal }) => {
        const created: Goal = {
          ...goal,
          id: newId(),
          allocations: [{ fromMonth: currentMonth(), amount: allocation }],
          createdMonth: currentMonth(),
        };
        set((s) => ({ goals: [...s.goals, created] }));
        return created.id;
      },

      updateGoal: (id, changes) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...changes } : g)) })),

      setGoalAllocation: (id, amount) =>
        set((s) => {
          const fromMonth = currentMonth();
          return {
            goals: s.goals.map((g) =>
              g.id === id
                ? { ...g, allocations: [...g.allocations.filter((a) => a.fromMonth !== fromMonth), { fromMonth, amount }] }
                : g,
            ),
          };
        }),

      toggleGoalBought: (id) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, boughtMonth: g.boughtMonth ? undefined : currentMonth() } : g,
          ),
        })),

      removeGoal: (id) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, removedMonth: currentMonth() } : g)) })),

      setReminders: (reminders) => set({ reminders }),
      setHomeChart: (homeChart) => set({ homeChart }),

      restore: (state) => set({ ...empty(), ...state }),

      resetAll: () => set(empty()),
    }),
    {
      name: 'tally-budget',
      version: STATE_VERSION,
      storage: createJSONStorage(() => Storage),
      migrate: (persisted, version) => migrateState(persisted as Record<string, unknown>, version) as BudgetState,
    },
  ),
);

// Everything that gets saved, without the actions. Used for backups.
export function selectSaved(s: BudgetState): SavedState {
  return {
    ...selectData(s),
    onboarded: s.onboarded,
    paidBills: s.paidBills,
    reminders: s.reminders,
    homeChart: s.homeChart,
  };
}

// Everything the budget math needs, without the actions.
export function selectData(s: BudgetState): BudgetData {
  return {
    incomes: s.incomes,
    envelopes: s.envelopes,
    expenses: s.expenses,
    bills: s.bills,
    transfers: s.transfers,
    accounts: s.accounts,
    goals: s.goals,
    startMonth: s.startMonth,
  };
}
