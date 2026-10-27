// "Ledger": quiet off-white paper, black ink and one spruce green accent. The calculator
// lives on in the details: typewriter-style numbers, a receipt-style list and a ruled keypad.
export const colors = {
  background: '#F4F4F1', // paper
  card: '#FFFFFF', // a clean sheet on the paper
  text: '#17191C', // ink
  muted: '#61646A', // 5.6:1 on the paper, so small labels pass WCAG AA
  border: '#DEDED8',
  accent: '#2F5D50', // spruce
  accentSoft: '#E3ECE8',
  danger: '#B3392B', // red ink
  dangerSoft: '#F6DDD9',
  warning: '#8F6410',
};

// Keys, the amount readout and the inks used on Home's chart.
export const machine = {
  key: '#17191C', // primary keys are solid ink
  keyEdge: '#17191C',
  keyLight: '#FFFFFF', // secondary keys are white with a hairline
  keyLightEdge: '#D6D6CF',
  blue: '#2F5D50', // "picked" and positive actions use the spruce accent
  blueEdge: '#2F5D50',
  red: '#B3392B',
  redEdge: '#B3392B',
  yellow: '#F3E8CC', // bill days: a soft ledger amber
  yellowEdge: '#8F6410',
  display: '#17191C', // dark backdrop, e.g. behind receipt photos
  digit: '#2F5D50', // chart lines
  digitDim: '#61646A',
  digitFaint: '#E4E4DE', // gridlines
  label: '#61646A',
  // Extra inks for charts.
  digitRed: '#B3392B',
  digitBlue: '#7FA699',
  digitWhite: '#17191C',
  // Inactive tab labels.
  tabInactive: '#8A8C91',
};

// Chart series colors on paper, checked for color-blind separation and 3:1 contrast on white.
export const chart = {
  variable: '#17191C',
  fixed: '#2F5D50',
  pace: '#8A8C91',
  grid: '#ECECE7',
};

// Geist for everything, including amounts, set with tabular figures so columns of money line up.
// Geist Mono is kept for the keypad digits and the "−=" sign: the one place the calculator shows.
export const fonts = {
  display: 'Geist_600SemiBold', // the big readout amount
  number: 'Geist_400Regular',
  numberBold: 'Geist_500Medium',
  keys: 'GeistMono_400Regular',
  body: 'Geist_400Regular',
  label: 'Geist_500Medium',
  bold: 'Geist_600SemiBold',
  brand: 'Geist_700Bold',
};

// Letter spacing in points for a font size. Geist has no optical sizes, so big text is tightened and
// small text opened slightly; body sizes keep the font's own spacing and kerning.
export function tracking(size: number): number {
  const em = size >= 28 ? -0.02 : size >= 20 ? -0.01 : size >= 13 ? 0 : 0.01;
  return Math.round(em * size * 100) / 100;
}

export const spacing = { xs: 4, sm: 8, md: 16, gutter: 20, lg: 24, xl: 32, xxl: 48 };

// Three corner sizes: sheets and inputs, keys and chips, larger panels.
export const radius = { paper: 6, key: 10, display: 14 };

// Seven text sizes, about 1.25x apart. Everything is sentence case.
export const type = {
  hero: { fontSize: 48, lineHeight: 52, letterSpacing: tracking(48) },
  display: { fontSize: 28, lineHeight: 32, letterSpacing: tracking(28) },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: tracking(28) },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: tracking(17) },
  body: { fontSize: 15, lineHeight: 21, letterSpacing: tracking(15) },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: tracking(13) },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: tracking(12) },
};

// Animation lengths in ms. All motion is skipped when Reduce Motion is on.
export const motion = { press: 60, release: 120, print: 220, roll: 400, tick: 15 };
