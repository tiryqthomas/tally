import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { parseBackup, serializeBackup, type ParsedBackup, type SavedState } from './backup';
import { today } from './dates';

// Writes a backup file and opens the share sheet so it can be saved to Files,
// iCloud Drive, Google Drive, email, and so on.
export async function exportBackup(state: SavedState): Promise<void> {
  const file = new File(Paths.cache, `tally-backup-${today()}.json`);
  if (file.exists) file.delete();
  file.create();
  await file.write(serializeBackup(state, new Date()));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save your Tally backup',
  });
}

// Lets the person pick a backup file. Returns null if they cancel.
export async function pickBackup(): Promise<ParsedBackup | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (picked.canceled) return null;
  return parseBackup(await picked.result.text());
}
