// The look of a vintage printing calculator: grey plastic body, paper tape,
// a glowing blue digit display and chunky colored keys.
export const colors = {
  background: '#E3E0D8', // calculator body
  card: '#FBFAF6', // paper tape
  text: '#2A2C30',
  muted: '#5C5952', // 5.3:1 on the body, so small labels pass WCAG AA
  border: '#D3CEC4',
  accent: '#4A63AE',
  accentSoft: '#DCE2F3',
  danger: '#C42F25', // red ink, like a two-color printer
  dangerSoft: '#F6DDD9',
  warning: '#8F6410',
};

// Keys and the display panel.
export const machine = {
  key: '#50545A',
  keyEdge: '#34373B',
  keyLight: '#D3CFC6',
  keyLightEdge: '#B4AFA4',
  blue: '#5A70B8', // white key text stays above 4.5:1
  blueEdge: '#455A9C',
  red: '#C93A2E',
  redEdge: '#9A2A20',
  yellow: '#E7B23C',
  yellowEdge: '#BB8C23',
  display: '#121418',
  digit: '#6FE6F2',
  digitDim: '#4FAFBA',
  digitFaint: '#2C5258',
  label: '#7C8590',
  // Extra inks for charts on the display.
  digitRed: '#FF7A6E',
  digitBlue: '#8EA3E0',
  digitWhite: '#F2F3F5',
  // Inactive tab labels on the light key strip.
  tabInactive: '#4F4C46',
};

// Chart series colors on paper, checked for color-blind separation and 3:1 contrast on the tape.
export const chart = {
  variable: '#2A2C30',
  fixed: '#4A63AE',
  pace: '#857F73',
  grid: '#ECE8DF',
};

export const fonts = {
  display: 'ShareTechMono_400Regular',
  mono: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_600SemiBold',
  body: 'BarlowSemiCondensed_500Medium',
  label: 'BarlowSemiCondensed_600SemiBold',
  bold: 'BarlowSemiCondensed_700Bold',
  brand: 'BarlowSemiCondensed_800ExtraBold_Italic',
};

export const spacing = { xs: 4, sm: 8, md: 16, gutter: 20, lg: 24, xl: 32, xxl: 48 };

// Three corner sizes: paper and inputs, keys and chips, the display.
export const radius = { paper: 4, key: 10, display: 16 };

// Seven text sizes, about 1.25x apart. Caps are for labels and names only.
export const type = {
  hero: { fontSize: 48, lineHeight: 52 },
  display: { fontSize: 28, lineHeight: 32 },
  title: { fontSize: 28, lineHeight: 34 },
  headline: { fontSize: 17, lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 20 },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 11, lineHeight: 14, letterSpacing: 1.4 },
};

// Animation lengths in ms. All motion is skipped when Reduce Motion is on.
export const motion = { press: 60, release: 120, print: 220, roll: 400, tick: 15 };
