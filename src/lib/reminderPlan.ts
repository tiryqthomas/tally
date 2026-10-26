import { billKey, billsInMonth } from './budget';
import { addMonths, monthOf, toDateString } from './dates';
import { formatMoney } from './money';
import type { Account, Bill, DateString } from './types';

export type ReminderSetting = 'off' | 'same-day' | 'day-before' | 'three-days';

export const REMINDER_OPTIONS: { value: ReminderSetting; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'same-day', label: 'Morning of' },
  { value: 'day-before', label: '1 day before' },
  { value: 'three-days', label: '3 days before' },
];

const DAYS_BEFORE: Record<Exclude<ReminderSetting, 'off'>, number> = {
  'same-day': 0,
  'day-before': 1,
  'three-days': 3,
};

// Reminders go out at 9am local time.
const REMINDER_HOUR = 9;
// iOS keeps at most 64 pending notifications per app; stay under it.
export const MAX_REMINDERS = 60;
const MONTHS_AHEAD = 3;

export interface PlannedReminder {
  key: string;
  at: Date;
  title: string;
  body: string;
}

function whenLabel(daysBefore: number): string {
  if (daysBefore === 0) return 'is due today';
  if (daysBefore === 1) return 'is due tomorrow';
  return `is due in ${daysBefore} days`;
}

// Works out which bill reminders to schedule, soonest first. Pure, so it can be tested.
export function planReminders(
  bills: Bill[],
  accounts: Account[],
  paid: ReadonlySet<string>,
  setting: ReminderSetting,
  now: Date,
): PlannedReminder[] {
  if (setting === 'off') return [];
  const daysBefore = DAYS_BEFORE[setting];
  const start = monthOf(toDateString(now));
  const out: PlannedReminder[] = [];

  for (let i = 0; i < MONTHS_AHEAD; i++) {
    for (const { bill, date } of billsInMonth(bills, addMonths(start, i))) {
      if (paid.has(billKey(bill.id, date))) continue;
      const at = reminderTime(date, daysBefore);
      if (at <= now) continue;
      const account = accounts.find((a) => a.id === bill.accountId);
      out.push({
        key: billKey(bill.id, date),
        at,
        title: `${bill.name} ${whenLabel(daysBefore)}`,
        body: `${formatMoney(bill.amount)}${account ? ` from ${account.name}` : ''}. Open Tally to mark it paid.`,
      });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_REMINDERS);
}

function reminderTime(due: DateString, daysBefore: number): Date {
  const [y, m, d] = due.split('-').map(Number);
  return new Date(y, m - 1, d - daysBefore, REMINDER_HOUR, 0, 0);
}
