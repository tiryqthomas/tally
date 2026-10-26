import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { summarizeMonth } from './budget';
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
