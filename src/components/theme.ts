// The look of a vintage printing calculator: grey plastic body, paper tape,
// a glowing blue digit display and chunky colored keys.
export const colors = {
  background: '#E3E0D8', // calculator body
  card: '#FBFAF6', // paper tape
  text: '#2A2C30',
  muted: '#6E6B64',
  border: '#D3CEC4',
  accent: '#4A63AE',
  accentSoft: '#DCE2F3',
  danger: '#C42F25', // red ink, like a two-color printer
  dangerSoft: '#F6DDD9',
  warning: '#B57E14',
};

// Keys and the display panel.
export const machine = {
  key: '#50545A',
  keyEdge: '#34373B',
  keyLight: '#D3CFC6',
  keyLightEdge: '#B4AFA4',
  blue: '#6E85C8',
  blueEdge: '#5067A8',
  red: '#C93A2E',
  redEdge: '#9A2A20',
  yellow: '#E7B23C',
  yellowEdge: '#BB8C23',
  display: '#121418',
  digit: '#6FE6F2',
  digitDim: '#4FAFBA',
  digitFaint: '#2C5258',
  label: '#7C8590',
};

// Chart series colors on paper, checked for color-blind separation and 3:1 contrast on the tape.
export const chart = {
  variable: '#2A2C30',
  fixed: '#4A63AE',
  pace: '#9A9488',
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

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 6, md: 8, lg: 12 };
