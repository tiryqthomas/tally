import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { summarizeMonth } from './budget';
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
