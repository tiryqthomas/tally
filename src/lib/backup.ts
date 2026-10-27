import type { HomeChart } from './homeCharts';
import { toReminderSetting, type ReminderSetting } from './reminderPlan';
import type { BudgetData, Income, Month } from './types';

// Everything a backup file holds. Matches the saved app state.
export interface SavedState extends BudgetData {
  onboarded: boolean;
  paidBills: string[];
  reminders: ReminderSetting;
  // Which chart the display at the top of Home shows.
  homeChart: HomeChart;
}

export const STATE_VERSION = 4;

// Receipt photos are saved under names the app makes up. Anything else in a
// backup is ignored, so a file can never be written outside the receipts folder.
const RECEIPT_NAME = /^[a-z0-9]{1,40}\.jpg$/;

export function isReceiptName(name: unknown): name is string {
  return typeof name === 'string' && RECEIPT_NAME.test(name);
}

// Every receipt photo the saved state points to.
export function receiptNames(state: Pick<SavedState, 'expenses'>): string[] {
  return state.expenses.flatMap((x) => (x.receipt ? [x.receipt] : []));
}

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
  // v3 allows several reminders per bill, so the one saved timing becomes a list.
  s.reminders = toReminderSetting(s.reminders);
  s.homeChart ??= 'pace';
  s.goals ??= [];
  // v4 lets an expense point to a receipt photo. Drop anything that isn't a receipt name.
  if (Array.isArray(s.expenses)) {
    s.expenses = (s.expenses as Record<string, unknown>[]).map(({ receipt, ...x }) =>
      isReceiptName(receipt) ? { ...x, receipt } : x,
    );
  }
  return s as unknown as SavedState;
}

interface BackupFile {
  // The app was first called Tally. The id stays so older backups still restore.
  app: 'tally';
  version: number;
  exportedAt: string;
  state: SavedState;
  // Receipt photos as base64 JPEG, by file name. Kept out of `state` so the
  // budget stays readable at the top of the file.
  receipts?: Record<string, string>;
}

export function serializeBackup(state: SavedState, now: Date, receipts: Record<string, string> = {}): string {
  const file: BackupFile = { app: 'tally', version: STATE_VERSION, exportedAt: now.toISOString(), state, receipts };
  return JSON.stringify(file, null, 2);
}

export type ParsedBackup =
  | { ok: true; state: SavedState; exportedAt: string; receipts: Record<string, string> }
  | { ok: false; error: string };

export function parseBackup(text: string): ParsedBackup {
  let file: Partial<BackupFile>;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't an Abacus backup." };
  }
  if (file?.app !== 'tally' || typeof file.version !== 'number' || !file.state) {
    return { ok: false, error: "This file isn't an Abacus backup." };
  }
  if (file.version > STATE_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of Abacus. Update the app and try again.' };
  }
  const state = migrateState(file.state as unknown as Record<string, unknown>, file.version);
  const lists = [state.envelopes, state.expenses, state.bills, state.transfers, state.accounts, state.incomes, state.goals];
  if (!lists.every(Array.isArray) || typeof state.startMonth !== 'string') {
    return { ok: false, error: 'This backup is damaged and could not be read.' };
  }
  // Only photos an expense points to, under names the app could have made.
  const wanted = new Set(receiptNames(state));
  const receipts: Record<string, string> = {};
  for (const [name, data] of Object.entries(file.receipts ?? {})) {
    if (wanted.has(name) && isReceiptName(name) && typeof data === 'string') receipts[name] = data;
  }
  return { ok: true, state, exportedAt: file.exportedAt ?? '', receipts };
}
