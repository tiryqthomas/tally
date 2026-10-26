import { Directory, File, Paths } from 'expo-file-system';

import { isReceiptName } from './backup';

// Receipt photos live in the app's own documents folder on the phone. They are
// never uploaded anywhere, and deleting the app deletes them.
const folder = () => new Directory(Paths.document, 'receipts');

const fileFor = (name: string) => new File(folder(), name);

const newName = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.jpg`;

// Copies a photo the picker or camera returned into the receipts folder.
// Returns the receipt's file name, which is what an expense stores.
export async function saveReceipt(pickedUri: string): Promise<string> {
  const dir = folder();
  if (!dir.exists) dir.create({ intermediates: true });
  const name = newName();
  await new File(pickedUri).copy(fileFor(name));
  return name;
}

// Something an <Image> can show, or null if the photo isn't on this phone.
export function receiptUri(name: string): string | null {
  const file = fileFor(name);
  return file.exists ? file.uri : null;
}

export function deleteReceipt(name: string | undefined) {
  if (!name) return;
  const file = fileFor(name);
  if (file.exists) file.delete();
}

// Deletes photos no expense points to any more, e.g. one picked and then
// discarded when the app was closed mid-edit.
export function pruneReceipts(keep: string[]) {
  const dir = folder();
  if (!dir.exists) return;
  const wanted = new Set(keep);
  for (const entry of dir.list()) {
    if (entry instanceof File && !wanted.has(entry.name)) entry.delete();
  }
}

// The photos to put in a backup file, as base64 by name.
export async function readReceipts(names: string[]): Promise<Record<string, string>> {
  const data: Record<string, string> = {};
  for (const name of names) {
    const file = fileFor(name);
    if (file.exists) data[name] = await file.base64();
  }
  return data;
}

// Total size in bytes of the photos the expenses point to, for the backup size note.
export function receiptsSize(names: string[]): number {
  return names.reduce((total, name) => {
    const file = fileFor(name);
    return total + (file.exists ? (file.size ?? 0) : 0);
  }, 0);
}

// Writes the photos from a restored backup into the receipts folder.
export async function writeReceipts(receipts: Record<string, string>) {
  const dir = folder();
  if (!dir.exists) dir.create({ intermediates: true });
  for (const [name, base64] of Object.entries(receipts)) {
    if (!isReceiptName(name)) continue;
    const file = fileFor(name);
    if (file.exists) file.delete();
    file.create();
    await file.write(base64, { encoding: 'base64' });
  }
}
