import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { dailySpending, spendingPace } from './analysis';
import { billKey, billsInMonth, summarizeMonth } from './budget';
import { currentMonth, today } from './dates';
import { syncReminders } from './reminders';
import { selectData, useBudget } from './store';
import type { Month } from './types';

export function useBudgetData() {
  return useBudget(useShallow(selectData));
}

export function useMonthSummary(month: Month) {
  const data = useBudgetData();
  return useMemo(() => summarizeMonth(data, month), [data, month]);
}

// The numbers behind Home's display and keys: this month, up to today.
// Shared with the Home chart preview in Settings so both show the same thing.
export function useHomeNumbers() {
  const month = currentMonth();
  const data = useBudgetData();
  const summary = useMonthSummary(month);
  const paidBills = useBudget((s) => s.paidBills);
  const todayDay = Number(today().slice(8, 10));
  return useMemo(() => {
    const paid = new Set(paidBills);
    const due = billsInMonth(data.bills, month);
    return {
      month,
      summary,
      todayDay,
      totalAvailable: summary.envelopes.reduce((t, e) => t + e.available, 0),
      pace: spendingPace(data, month, todayDay),
      points: dailySpending(data.expenses, month, todayDay),
      // This month's fixed bills, and how much of that isn't marked paid yet.
      fixed: {
        total: due.reduce((t, o) => t + o.bill.amount, 0),
        unpaid: due.filter((o) => !paid.has(billKey(o.bill.id, o.date))).reduce((t, o) => t + o.bill.amount, 0),
      },
    };
  }, [data, summary, paidBills, month, todayDay]);
}

// True once saved data has been loaded from the phone.
export function useHydrated() {
  const [hydrated, setHydrated] = useState(useBudget.persist.hasHydrated());
  useEffect(() => {
    const unsub = useBudget.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useBudget.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

// Keeps scheduled bill reminders in step with the bills, whenever they change
// and whenever the app comes back to the foreground.
export function useReminderSync(enabled: boolean) {
  const { bills, accounts, paidBills, reminders } = useBudget(
    useShallow((s) => ({ bills: s.bills, accounts: s.accounts, paidBills: s.paidBills, reminders: s.reminders })),
  );
  const [foregrounds, setForegrounds] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setForegrounds((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // Wait briefly so a burst of edits only reschedules once.
    const timer = setTimeout(() => {
      syncReminders(bills, accounts, paidBills, reminders).catch((e) => console.warn('Could not schedule reminders', e));
    }, 500);
    return () => clearTimeout(timer);
  }, [enabled, bills, accounts, paidBills, reminders, foregrounds]);
}
