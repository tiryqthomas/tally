import Storage from './storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { currentMonth, today } from './dates';
import type { Account, Bill, BudgetData, Envelope, Expense, Income, Month, Transfer } from './types';

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

interface BudgetState extends BudgetData {
  onboarded: boolean;
  // Changes income from the current month onward.
  setIncome: (income: Income) => void;
  // The Savings / Discretionary envelope is created automatically.
  finishOnboarding: (income: Income, envelopes: { name: string; limit: number }[]) => void;
  addEnvelope: (name: string, limit: number) => void;
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
  resetAll: () => void;
}

const empty = (): BudgetData & { onboarded: boolean } => ({
  onboarded: false,
  incomes: [],
  envelopes: [],
  expenses: [],
  bills: [],
  transfers: [],
  accounts: [],
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

      addEnvelope: (name, limit) =>
        set((s) => ({ envelopes: [...s.envelopes, makeEnvelope(name, limit)] })),

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
            ? { bills: s.bills.map((b) => (b.id === id ? { ...bill, id } : b)) }
            : { bills: [...s.bills, { ...bill, id: newId() }] },
        ),

      deleteBill: (id) => set((s) => ({ bills: s.bills.map((b) => (b.id === id ? { ...b, endDate: today() } : b)) })),

      addAccount: (name) => set((s) => ({ accounts: [...s.accounts, { id: newId(), name }] })),

      deleteAccount: (id) =>
        set((s) => ({
          accounts: s.accounts.filter((a: Account) => a.id !== id),
          bills: s.bills.map((b) => (b.accountId === id ? { ...b, accountId: undefined } : b)),
        })),

      resetAll: () => set(empty()),
    }),
    {
      name: 'tally-budget',
      version: 2,
      storage: createJSONStorage(() => Storage),
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        // v1 kept a single income; v2 keeps a history of income changes.
        if (version < 2 && state.income) {
          state.incomes = [{ fromMonth: state.startMonth as Month, income: state.income as Income }];
          delete state.income;
        }
        return state as unknown as BudgetState;
      },
    },
  ),
);

// Everything the budget math needs, without the actions.
export function selectData(s: BudgetState): BudgetData {
  return {
    incomes: s.incomes,
    envelopes: s.envelopes,
    expenses: s.expenses,
    bills: s.bills,
    transfers: s.transfers,
    accounts: s.accounts,
    startMonth: s.startMonth,
  };
}
