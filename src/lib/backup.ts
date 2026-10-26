import type { HomeChart } from './homeCharts';
import type { ReminderSetting } from './reminderPlan';
import type { BudgetData, Income, Month } from './types';

// Everything a backup file holds. Matches the saved app state.
export interface SavedState extends BudgetData {
  onboarded: boolean;
  paidBills: string[];
  reminders: ReminderSetting;
  // Which chart the display at the top of Home shows.
  homeChart: HomeChart;
}

export const STATE_VERSION = 2;

// Brings state saved by an older version of the app up to date.
// Used both when loading from the phone and when restoring a backup.
export function migrateState(state: Record<string, unknown>, version: number): SavedState {
  const s = { ...state };
  // v1 kept a single income; v2 keeps a history of income changes.
  if (version < 2 && s.income) {
    s.incomes = [{ fromMonth: s.startMonth as Month, income: s.income as Income }];
    delete s.income;
  }
  s.paidBills ??= [];
  s.reminders ??= 'day-before';
  s.homeChart ??= 'pace';
  return s as unknown as SavedState;
}

interface BackupFile {
  app: 'tally';
  version: number;
  exportedAt: string;
  state: SavedState;
}

export function serializeBackup(state: SavedState, now: Date): string {
  const file: BackupFile = { app: 'tally', version: STATE_VERSION, exportedAt: now.toISOString(), state };
  return JSON.stringify(file, null, 2);
}

export type ParsedBackup = { ok: true; state: SavedState; exportedAt: string } | { ok: false; error: string };

export function parseBackup(text: string): ParsedBackup {
  let file: Partial<BackupFile>;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't a Tally backup." };
  }
  if (file?.app !== 'tally' || typeof file.version !== 'number' || !file.state) {
    return { ok: false, error: "This file isn't a Tally backup." };
  }
  if (file.version > STATE_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of Tally. Update the app and try again.' };
  }
  const state = migrateState(file.state as unknown as Record<string, unknown>, file.version);
  const lists = [state.envelopes, state.expenses, state.bills, state.transfers, state.accounts, state.incomes];
  if (!lists.every(Array.isArray) || typeof state.startMonth !== 'string') {
    return { ok: false, error: 'This backup is damaged and could not be read.' };
  }
  return { ok: true, state, exportedAt: file.exportedAt ?? '' };
}
