// The web preview has no notifications.
import type { ReminderSetting } from './reminderPlan';
import type { Account, Bill } from './types';

export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function reminderPermission(): Promise<ReminderPermission> {
  return 'unsupported';
}

export async function syncReminders(
  _bills: Bill[],
  _accounts: Account[],
  _paidBills: string[],
  _setting: ReminderSetting,
): Promise<void> {}

export async function sendTestReminder(): Promise<boolean> {
  return false;
}
