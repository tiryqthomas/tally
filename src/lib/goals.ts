import { addMonths, monthOf, monthsBetween } from './dates';
import type { Goal, Month } from './types';

export function allocationFor(goal: Goal, month: Month): number {
  let found: Goal['allocations'][number] | undefined;
  for (const change of goal.allocations) {
    if (change.fromMonth <= month && (!found || change.fromMonth >= found.fromMonth)) found = change;
  }
  return found?.amount ?? 0;
}

// The month after which nothing more is set aside, if the goal was bought or removed.
function lastMonth(goal: Goal): Month | undefined {
  return goal.boughtMonth ?? goal.removedMonth;
}

export interface GoalMonth {
  month: Month;
  // Moved from Savings / Discretionary into the goal on the 1st.
  setAside: number;
  // Handed back to Savings / Discretionary because the goal was removed.
  returned: number;
  // Saved toward the goal by the end of the month.
  saved: number;
}

// Every month from the goal's creation through `end`, oldest first. Set-asides
// stop once the price is reached, so the last one may be smaller than the allocation.
export function goalMonths(goal: Goal, end: Month): GoalMonth[] {
  const out: GoalMonth[] = [];
  const stop = lastMonth(goal);
  let saved = 0;
  for (const month of monthsBetween(goal.createdMonth, end)) {
    if (stop !== undefined && month > stop) {
      out.push({ month, setAside: 0, returned: 0, saved: goal.removedMonth && !goal.boughtMonth ? 0 : saved });
      continue;
    }
    const setAside = Math.max(0, Math.min(allocationFor(goal, month), goal.price - saved));
    saved += setAside;
    // A bought goal's money was spent on it, so removing it later hands nothing back.
    const returned = goal.removedMonth === month && !goal.boughtMonth ? saved : 0;
    out.push({ month, setAside, returned, saved: saved - returned });
  }
  return out;
}

// Net amount all goals take out of Savings / Discretionary in a month.
export function goalsSetAsideIn(goals: Goal[], month: Month): number {
  let total = 0;
  for (const goal of goals) {
    const m = goalMonths(goal, month).pop();
    if (m?.month === month) total += m.setAside - m.returned;
  }
  return total;
}

export type GoalStatus = 'saved' | 'on-track' | 'behind' | 'bought';

export interface GoalProgress {
  goal: Goal;
  saved: number;
  allocation: number;
  // Months with a set-aside still to come, from this month through the target month.
  monthsLeft: number;
  // What each of those months needs to reach the price by the target date.
  suggested: number;
  // When the current allocation reaches the price, or undefined if it never does.
  doneMonth?: Month;
  status: GoalStatus;
}

// Where a goal stands in `month` (normally the current month).
export function goalProgress(goal: Goal, month: Month): GoalProgress {
  const months = goalMonths(goal, month);
  const now = months[months.length - 1];
  const saved = now?.saved ?? 0;
  const allocation = allocationFor(goal, month);
  const targetMonth = monthOf(goal.targetDate);
  // This month's set-aside already happened on the 1st, so plan from what was saved before it.
  const savedBefore = saved - (now?.setAside ?? 0);
  const monthsLeft = Math.max(1, monthsBetween(month, targetMonth).length);
  const suggested = Math.ceil(Math.max(0, goal.price - savedBefore) / monthsLeft);

  let doneMonth: Month | undefined;
  if (saved >= goal.price) {
    doneMonth = months.find((m) => m.saved >= goal.price)?.month ?? month;
  } else if (allocation > 0) {
    doneMonth = addMonths(month, Math.ceil((goal.price - saved) / allocation));
  }

  const status: GoalStatus = goal.boughtMonth
    ? 'bought'
    : saved >= goal.price
      ? 'saved'
      : doneMonth !== undefined && doneMonth <= targetMonth
        ? 'on-track'
        : 'behind';
  return { goal, saved, allocation, monthsLeft, suggested, doneMonth, status };
}
