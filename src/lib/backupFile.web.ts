import { parseBackup, receiptNames, serializeBackup, type ParsedBackup, type SavedState } from './backup';
import { today } from './dates';
import { readReceipts } from './receipts';

// The web preview downloads the backup instead of opening a share sheet.
export async function exportBackup(state: SavedState): Promise<void> {
  const receipts = await readReceipts(receiptNames(state));
  const blob = new Blob([serializeBackup(state, new Date(), receipts)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `tally-backup-${today()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function pickBackup(): Promise<ParsedBackup | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? parseBackup(await file.text()) : null);
    };
    input.click();
  });
}
