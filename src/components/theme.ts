import { createContext, useContext } from 'react';

import type { CategoryColor } from '@/lib/types';

// "Editorial": warm off-white pages, rounded white cards, one deep green for money, and a color
// for each category so people learn Groceries is green and Dining out is orange. Fraunces (soft)
// sets screen and section titles; Figtree sets everything else, numbers included. Dark mode is
// its own palette, not an inversion: near-black green-grey, cards one step lighter, colors lifted.
export type Scheme = 'light' | 'dark';

const palettes = {
  light: {
    colors: {
      background: '#F6F4EF', // the page
      card: '#FFFFFF', // a card on the page
      text: '#17191A',
      muted: '#62665F', // 5.4:1 on the page, so small labels pass WCAG AA
      border: '#E6E4DD',
      accent: '#1F5A43', // deep green: money totals and positive actions
      accentSoft: '#E3ECE7',
      danger: '#C0392B', // only ever means "over"
      dangerSoft: '#F8E4E0',
      warning: '#8F6410',
      onInk: '#FFFFFF', // text on a solid ink button
    },
    machine: {
      key: '#17191A', // primary buttons are solid ink
      keyEdge: '#17191A',
      keyLight: '#FFFFFF',
      keyLightEdge: '#E6E4DD',
      blue: '#1F5A43',
      blueEdge: '#1F5A43',
      red: '#C0392B',
      redEdge: '#C0392B',
      yellow: '#F3E8CC', // bill days: a soft amber
      yellowEdge: '#8F6410',
      display: '#17191A', // dark backdrop, e.g. behind receipt photos
      digit: '#1F5A43', // chart lines
      digitDim: '#62665F',
      digitFaint: '#E6E4DD', // gridlines
      label: '#62665F',
      digitRed: '#C0392B',
      digitBlue: '#8DB3A4',
      digitWhite: '#17191A',
      tabInactive: '#8A8D88',
    },
    chart: { variable: '#17191A', fixed: '#1F5A43', pace: '#8A8D88', grid: '#EEECE6' },
    category: {
      slate: '#5A6B9C',
      fern: '#3D8B5C',
      clay: '#D7743F',
      mustard: '#C99A2E',
      violet: '#8662B5',
      lagoon: '#2B8F9C',
      rose: '#B85C86',
      olive: '#7D8A3A',
    } as Record<CategoryColor, string>,
  },
  dark: {
    colors: {
      background: '#101211',
      card: '#1B1E1C',
      text: '#EEEFEC',
      muted: '#9AA09C',
      border: '#2C312E',
      accent: '#7FC4A2',
      accentSoft: '#20342A',
      danger: '#F07A68',
      dangerSoft: '#3A201C',
      warning: '#E0B458',
      onInk: '#101211',
    },
    machine: {
      key: '#EEEFEC',
      keyEdge: '#EEEFEC',
      keyLight: '#1B1E1C',
      keyLightEdge: '#2C312E',
      blue: '#7FC4A2',
      blueEdge: '#7FC4A2',
      red: '#F07A68',
      redEdge: '#F07A68',
      yellow: '#3B3220',
      yellowEdge: '#E0B458',
      display: '#000000',
      digit: '#7FC4A2',
      digitDim: '#9AA09C',
      digitFaint: '#2C312E',
      label: '#9AA09C',
      digitRed: '#F07A68',
      digitBlue: '#4F7D6D',
      digitWhite: '#EEEFEC',
      tabInactive: '#6E7470',
    },
    chart: { variable: '#EEEFEC', fixed: '#7FC4A2', pace: '#7C827E', grid: '#252927' },
    category: {
      slate: '#8D9DD0',
      fern: '#6CC08D',
      clay: '#F0975F',
      mustard: '#E6BE57',
      violet: '#B394E0',
      lagoon: '#5CC3CF',
      rose: '#E08BB1',
      olive: '#B0BE63',
    } as Record<CategoryColor, string>,
  },
};

// The live palette. These objects are updated in place when the scheme changes, so code can keep
// reading `colors.text` at render time. Screens call useScheme() so they re-render on a change.
export const colors = { ...palettes.light.colors };
export const machine = { ...palettes.light.machine };
export const chart = { ...palettes.light.chart };
const category = { ...palettes.light.category };

let current: Scheme = 'light';
let version = 0;

export function applyScheme(scheme: Scheme) {
  if (scheme === current) return;
  current = scheme;
  version += 1;
  Object.assign(colors, palettes[scheme].colors);
  Object.assign(machine, palettes[scheme].machine);
  Object.assign(chart, palettes[scheme].chart);
  Object.assign(category, palettes[scheme].category);
}

export const SchemeContext = createContext<Scheme>('light');

// Call at the top of a screen so it redraws in the new colors when Appearance changes.
export function useScheme(): Scheme {
  return useContext(SchemeContext);
}

// Styles built from the palette. Wrap StyleSheet.create in this so a style sheet is rebuilt the
// first time it's read after the scheme changes.
export function themed<T extends object>(make: () => T): T {
  let built = make();
  let builtFor = version;
  return new Proxy({} as T, {
    get(_, key) {
      if (builtFor !== version) {
        built = make();
        builtFor = version;
      }
      return built[key as keyof T];
    },
  });
}

// Blend two #RRGGBB colors; t = 0 gives a, t = 1 gives b.
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, shift: number) => (p >> shift) & 255;
  const out = [16, 8, 0].map((s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// A category's color and the shades drawn from it: `fill` for beads, bars and its slice of a
// chart; `tint` behind its icon; `ink` for its icon and any text in its color, darkened in
// light mode so it stays readable on white; `rod` for the abacus string.
export function categoryShades(key: CategoryColor | 'savings') {
  const fill = key === 'savings' ? colors.accent : category[key];
  return {
    fill,
    tint: mix(colors.card, fill, current === 'dark' ? 0.2 : 0.15),
    band: mix(colors.card, fill, current === 'dark' ? 0.22 : 0.18),
    ink: current === 'dark' ? fill : mix(fill, colors.text, 0.25),
    rod: mix(colors.border, fill, 0.45),
    faded: mix(colors.card, fill, 0.4),
  };
}

export const fonts = {
  serif: 'Fraunces_400Soft', // screen and section titles
  serifMedium: 'Fraunces_500Soft',
  display: 'Figtree_600SemiBold', // the big amount
  number: 'Figtree_400Regular',
  numberBold: 'Figtree_500Medium',
  keys: 'Figtree_500Medium', // keypad digits
  body: 'Figtree_400Regular',
  label: 'Figtree_500Medium',
  bold: 'Figtree_600SemiBold',
  brand: 'Figtree_700Bold',
};

// Letter spacing in points for a font size: big text is tightened a little, small text opened.
export function tracking(size: number): number {
  const em = size >= 28 ? -0.015 : size >= 20 ? -0.008 : size >= 13 ? 0 : 0.01;
  return Math.round(em * size * 100) / 100;
}

export const spacing = { xs: 4, sm: 8, md: 16, gutter: 20, lg: 24, xl: 32, xxl: 48 };

// Rounded throughout: inputs, chips and keys, cards, and pill buttons.
export const radius = { paper: 14, key: 16, display: 24, pill: 999 };

// Text sizes. Screen and section titles are serif; everything else is Figtree, sentence case.
export const type = {
  hero: { fontSize: 48, lineHeight: 54, letterSpacing: tracking(48) },
  display: { fontSize: 28, lineHeight: 32, letterSpacing: tracking(28) },
  screen: { fontSize: 38, lineHeight: 44, letterSpacing: -0.4 },
  section: { fontSize: 25, lineHeight: 30, letterSpacing: -0.2 },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: tracking(28) },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: tracking(17) },
  body: { fontSize: 15, lineHeight: 21, letterSpacing: tracking(15) },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: tracking(13) },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: tracking(12) },
};

// Animation lengths in ms. All motion is skipped when Reduce Motion is on.
export const motion = { press: 60, release: 120, print: 220, roll: 400, tick: 15 };
