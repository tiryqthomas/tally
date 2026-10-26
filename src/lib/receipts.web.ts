import { isReceiptName } from './backup';

// The web preview keeps receipt photos in the browser as data URLs.
const KEY = 'tally-receipt:';

const newName = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.jpg`;

async function toDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function saveReceipt(pickedUri: string): Promise<string> {
  const name = newName();
  localStorage.setItem(KEY + name, await toDataUrl(pickedUri));
  return name;
}

export function receiptUri(name: string): string | null {
  return localStorage.getItem(KEY + name);
}

export function deleteReceipt(name: string | undefined) {
  if (name) localStorage.removeItem(KEY + name);
}

export function pruneReceipts(keep: string[]) {
  const wanted = new Set(keep);
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(KEY) && !wanted.has(key.slice(KEY.length))) localStorage.removeItem(key);
  }
}

const base64Of = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1);

export async function readReceipts(names: string[]): Promise<Record<string, string>> {
  const data: Record<string, string> = {};
  for (const name of names) {
    const url = receiptUri(name);
    if (url) data[name] = base64Of(url);
  }
  return data;
}

export function receiptsSize(names: string[]): number {
  return names.reduce((total, name) => total + Math.floor((base64Of(receiptUri(name) ?? ',').length * 3) / 4), 0);
}

export async function writeReceipts(receipts: Record<string, string>) {
  for (const [name, base64] of Object.entries(receipts)) {
    if (isReceiptName(name)) localStorage.setItem(KEY + name, `data:image/jpeg;base64,${base64}`);
  }
}
