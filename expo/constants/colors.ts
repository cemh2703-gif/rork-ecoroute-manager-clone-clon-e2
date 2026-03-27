const Colors = {
  background: '#0F1114',
  card: '#1A1E24',
  cardElevated: '#232930',
  border: '#2A3038',
  borderLight: '#353D47',

  primary: '#34C759',
  primaryDim: '#2A9F48',
  primaryBg: 'rgba(52, 199, 89, 0.12)',

  accent: '#FF9F0A',
  accentBg: 'rgba(255, 159, 10, 0.12)',

  danger: '#FF453A',
  dangerBg: 'rgba(255, 69, 58, 0.12)',

  warning: '#FFD60A',
  info: '#0A84FF',

  text: '#F2F2F7',
  textSecondary: '#98A1AE',
  textTertiary: '#636B78',
  textInverse: '#0F1114',

  fillEmpty: '#2A3038',
  fillLow: '#4CAF50',
  fillMedium: '#FF9800',
  fillHigh: '#FF5722',
  fillFull: '#F44336',

  tabBar: '#141820',
  tabBarBorder: '#1E242C',
};

export const FILL_COLORS: Record<number, string> = {
  0: Colors.fillEmpty,
  1: Colors.fillLow,
  2: Colors.fillLow,
  3: Colors.fillMedium,
  4: Colors.fillHigh,
  5: Colors.fillFull,
};

export const FILL_LABELS: Record<number, string> = {
  0: 'Vacío',
  1: 'Casi vacío',
  2: 'Poco lleno',
  3: 'Medio',
  4: 'Casi lleno',
  5: 'Lleno',
};

export default Colors;
