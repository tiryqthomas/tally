import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { planReminders, type ReminderSetting } from './reminderPlan';
import type { Account, Bill } from './types';

const CHANNEL_ID = 'bill-reminders';

// Show reminders even when Abacus is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function reminderPermission(): Promise<ReminderPermission> {
  if (Platform.OS === 'web') return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Bill reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}

// Replaces every scheduled reminder with a fresh set built from the current bills.
// Asks for permission the first time there is something to remind about.
export async function syncReminders(
  bills: Bill[],
  accounts: Account[],
  paidBills: string[],
  setting: ReminderSetting,
): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const plan = planReminders(bills, accounts, new Set(paidBills), setting, new Date());
  if (plan.length === 0 || !(await ensurePermission())) return;

  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.key,
      content: { title: reminder.title, body: reminder.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.at,
        channelId: CHANNEL_ID,
      },
    });
  }
}

// Sends a sample reminder a few seconds from now, so people can check notifications work.
export async function sendTestReminder(): Promise<boolean> {
  if (Platform.OS === 'web' || !(await ensurePermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Rent is due tomorrow', body: 'This is a test reminder from Tally.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
  });
  return true;
}
