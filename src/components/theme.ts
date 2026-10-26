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

export const fonts = {
  display: 'IBMPlexMono_500Medium',
  mono: 'IBMPlexMono_400Regular',
  monoBold: 'IBMPlexMono_500Medium',
  body: 'IBMPlexSans_400Regular',
  label: 'IBMPlexSans_500Medium',
  bold: 'IBMPlexSans_600SemiBold',
  brand: 'IBMPlexSans_700Bold',
};

export const spacing = { xs: 4, sm: 8, md: 16, gutter: 20, lg: 24, xl: 32, xxl: 48 };

// Three corner sizes: sheets and inputs, keys and chips, larger panels.
export const radius = { paper: 6, key: 10, display: 14 };

// Seven text sizes, about 1.25x apart. Everything is sentence case.
export const type = {
  hero: { fontSize: 48, lineHeight: 52 },
  display: { fontSize: 28, lineHeight: 32 },
  title: { fontSize: 28, lineHeight: 34 },
  headline: { fontSize: 17, lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 20 },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
};

// Animation lengths in ms. All motion is skipped when Reduce Motion is on.
export const motion = { press: 60, release: 120, print: 220, roll: 400, tick: 15 };
