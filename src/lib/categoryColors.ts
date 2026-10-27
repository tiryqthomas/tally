import { CATEGORY_COLORS, type CategoryColor, type Envelope } from './types';

// The color a new category gets: the first one no open category is using, or, once all eight
// are taken, the one used least.
export function nextCategoryColor(envelopes: Pick<Envelope, 'color' | 'isSavings' | 'archivedMonth'>[]): CategoryColor {
  const counts = new Map<CategoryColor, number>(CATEGORY_COLORS.map((c) => [c, 0]));
  for (const e of envelopes) {
    if (!e.isSavings && !e.archivedMonth && e.color) counts.set(e.color, (counts.get(e.color) ?? 0) + 1);
  }
  return CATEGORY_COLORS.reduce((best, c) => ((counts.get(c) ?? 0) < (counts.get(best) ?? 0) ? c : best));
}

// Gives every category without a color one, in list order. Savings keeps none.
export function assignCategoryColors<T extends Pick<Envelope, 'color' | 'isSavings' | 'archivedMonth'>>(envelopes: T[]): T[] {
  const out: T[] = [];
  envelopes.forEach((e, i) => {
    if (e.isSavings || (e.color && CATEGORY_COLORS.includes(e.color))) {
      out.push(e);
      return;
    }
    // Colors already on later categories count as taken too, so they keep theirs without a clash.
    const taken = [...out, ...envelopes.slice(i + 1).filter((x) => x.color)];
    out.push({ ...e, color: nextCategoryColor(taken) });
  });
  return out;
}

// The color to draw a category in. Savings uses the app's accent.
export function colorOf(envelope: Pick<Envelope, 'color' | 'isSavings'>): CategoryColor | 'savings' {
  return envelope.isSavings ? 'savings' : (envelope.color ?? 'slate');
}
