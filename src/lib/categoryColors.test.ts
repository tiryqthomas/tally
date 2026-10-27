import { describe, expect, it } from '@jest/globals';
import { assignCategoryColors, colorOf, nextCategoryColor } from './categoryColors';

const cat = (color?: string, extra = {}) => ({ isSavings: false, color, ...extra }) as never;

describe('category colors', () => {
  it('gives a new category the first unused color', () => {
    expect(nextCategoryColor([])).toBe('slate');
    expect(nextCategoryColor([cat('slate'), cat('clay')])).toBe('fern');
  });

  it('ignores savings and removed categories when picking', () => {
    expect(nextCategoryColor([cat('slate', { archivedMonth: '2026-09' }), { isSavings: true } as never])).toBe('slate');
  });

  it('reuses the least-used color once all eight are taken', () => {
    const all = ['slate', 'fern', 'clay', 'mustard', 'violet', 'lagoon', 'rose', 'olive'].map((c) => cat(c));
    expect(nextCategoryColor([...all, cat('slate')])).toBe('fern');
  });

  it('colors existing categories in order without changing ones that have a color', () => {
    const out = assignCategoryColors([cat(), cat('slate'), cat(), { isSavings: true } as never]);
    expect(out.map((e: { color?: string }) => e.color)).toEqual(['fern', 'slate', 'clay', undefined]);
  });

  it('draws savings in the accent', () => {
    expect(colorOf({ isSavings: true })).toBe('savings');
    expect(colorOf({ isSavings: false, color: 'rose' })).toBe('rose');
  });
});
