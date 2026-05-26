// Tesla × Apple Design System — Dark & Light themes
// Same token shape, different values

export const darkColors = {
  secondary: '#F5F5F7',
  secondaryGlow: 'rgba(245,245,247,0.12)',

  background: '#000000',
  backgroundSecondary: '#0A0A0A',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  surfaceHover: '#3A3A3C',

  primary: '#E8A84A',
  primaryLight: '#F0BC6A',
  primaryMuted: 'rgba(232, 168, 74, 0.14)',
  primaryGlow: 'rgba(232, 168, 74, 0.22)',

  accent: '#FFFFFF',
  accentLight: '#F5F5F7',
  accentMuted: 'rgba(255, 255, 255, 0.10)',

  blue: '#0A84FF',
  blueMuted: 'rgba(10, 132, 255, 0.14)',

  success: '#30D158',
  successMuted: 'rgba(48, 209, 88, 0.14)',
  warning: '#FF9F0A',
  warningMuted: 'rgba(255, 159, 10, 0.14)',
  error: '#D4956E',
  errorMuted: 'rgba(212, 149, 110, 0.14)',
  info: '#0A84FF',
  infoMuted: 'rgba(10, 132, 255, 0.14)',

  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.62)',
    tertiary: 'rgba(255, 255, 255, 0.38)',
    disabled: 'rgba(255, 255, 255, 0.22)',
    inverse: '#000000',
    accent: '#E8A84A',
    warning: '#FF9F0A',
    error: '#D4956E',
  },

  border: {
    default: 'rgba(255, 255, 255, 0.10)',
    subtle: 'rgba(255, 255, 255, 0.06)',
    strong: 'rgba(255, 255, 255, 0.16)',
    focus: 'rgba(255, 255, 255, 0.40)',
    accent: 'rgba(232, 168, 74, 0.35)',
    alert: 'rgba(212, 149, 110, 0.22)',
  },

  glass: {
    background: 'rgba(28, 28, 30, 0.72)',
    backgroundLight: 'rgba(44, 44, 46, 0.65)',
    border: 'rgba(255, 255, 255, 0.10)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
  },

  status: {
    online: '#30D158',
    offline: '#636366',
    idle: '#FF9F0A',
    moving: '#0A84FF',
    unknown: '#8E8E93',
  },

  gradient: {
    dark: ['#000000', '#0A0A0A'] as const,
    darkDeep: ['#000000', '#000000'] as const,
    emerald: ['#30D158', '#248A3D'] as const,
    amber: ['#FF9F0A', '#D4845C'] as const,
    blue: ['#0A84FF', '#0066CC'] as const,
    card: ['rgba(28, 28, 30, 0.95)', 'rgba(10, 10, 10, 0.98)'] as const,
    surface: ['rgba(0, 0, 0, 0.0)', 'rgba(0, 0, 0, 0.85)'] as const,
    header: ['rgba(0, 0, 0, 0.92)', 'rgba(0, 0, 0, 0.0)'] as const,
    hero: ['rgba(0, 0, 0, 0.0)', 'rgba(0, 0, 0, 0.75)', '#000000'] as const,
    cta: ['#FFFFFF', '#F5F5F7'] as const,
    brand: ['#E8A84A', '#C88520'] as const,
  },

  chart: ['#30D158', '#0A84FF', '#FF9F0A', '#BF5AF2', '#D4956E', '#64D2FF'],

  tabBar: {
    background: 'rgba(28, 28, 30, 0.88)',
    active: '#FFFFFF',
    inactive: 'rgba(255, 255, 255, 0.38)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

export const lightColors = {
  secondary: '#1C1C1E',
  secondaryGlow: 'rgba(28,28,30,0.08)',

  // Apple iOS systemGroupedBackground family
  background: '#F2F2F7',
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#F2F2F7',
  surfaceHover: '#E5E5EA',

  primary: '#D4882A',
  primaryLight: '#E89A3A',
  primaryMuted: 'rgba(212, 136, 42, 0.12)',
  primaryGlow: 'rgba(212, 136, 42, 0.18)',

  accent: '#1C1C1E',
  accentLight: '#3A3A3C',
  accentMuted: 'rgba(28, 28, 30, 0.08)',

  blue: '#007AFF',
  blueMuted: 'rgba(0, 122, 255, 0.12)',

  success: '#28A745',
  successMuted: 'rgba(40, 167, 69, 0.12)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.12)',
  error: '#C0522A',
  errorMuted: 'rgba(192, 82, 42, 0.12)',
  info: '#007AFF',
  infoMuted: 'rgba(0, 122, 255, 0.12)',

  text: {
    primary: '#000000',
    secondary: 'rgba(0, 0, 0, 0.55)',
    tertiary: 'rgba(0, 0, 0, 0.35)',
    disabled: 'rgba(0, 0, 0, 0.22)',
    inverse: '#FFFFFF',
    accent: '#D4882A',
    warning: '#F59E0B',
    error: '#C0522A',
  },

  border: {
    default: 'rgba(0, 0, 0, 0.12)',
    subtle: 'rgba(0, 0, 0, 0.07)',
    strong: 'rgba(0, 0, 0, 0.20)',
    focus: 'rgba(0, 0, 0, 0.36)',
    accent: 'rgba(212, 136, 42, 0.30)',
    alert: 'rgba(192, 82, 42, 0.20)',
  },

  glass: {
    background: 'rgba(255, 255, 255, 0.78)',
    backgroundLight: 'rgba(242, 242, 247, 0.85)',
    border: 'rgba(0, 0, 0, 0.08)',
    borderStrong: 'rgba(0, 0, 0, 0.14)',
  },

  status: {
    online: '#28A745',
    offline: '#8E8E93',
    idle: '#F59E0B',
    moving: '#007AFF',
    unknown: '#8E8E93',
  },

  gradient: {
    dark: ['#F2F2F7', '#FFFFFF'] as const,
    darkDeep: ['#F2F2F7', '#F2F2F7'] as const,
    emerald: ['#28A745', '#1E7E34'] as const,
    amber: ['#F59E0B', '#D97706'] as const,
    blue: ['#007AFF', '#0056CC'] as const,
    card: ['rgba(255, 255, 255, 0.95)', 'rgba(242, 242, 247, 0.98)'] as const,
    surface: ['rgba(242, 242, 247, 0.0)', 'rgba(242, 242, 247, 0.85)'] as const,
    header: ['rgba(242, 242, 247, 0.92)', 'rgba(242, 242, 247, 0.0)'] as const,
    hero: ['rgba(242, 242, 247, 0.0)', 'rgba(242, 242, 247, 0.75)', '#F2F2F7'] as const,
    cta: ['#1C1C1E', '#3A3A3C'] as const,
    brand: ['#D4882A', '#B8721E'] as const,
  },

  chart: ['#28A745', '#007AFF', '#F59E0B', '#8B5CF6', '#C0522A', '#0EA5E9'],

  tabBar: {
    background: 'rgba(255, 255, 255, 0.92)',
    active: '#1C1C1E',
    inactive: 'rgba(28, 28, 30, 0.38)',
    border: 'rgba(0, 0, 0, 0.10)',
  },
} as const;

export type ThemeColors = typeof darkColors;
export type ThemeMode = 'dark' | 'light' | 'system';
