// Tesla × Apple Design System — pure black, crisp white type, warm amber accents
export const colors = {
  // Legacy backward compat aliases
  secondary: '#F5F5F7',
  secondaryGlow: 'rgba(245,245,247,0.12)',

  // Base backgrounds — Tesla-grade deep black
  background: '#000000',
  backgroundSecondary: '#0A0A0A',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  surfaceHover: '#3A3A3C',

  // Brand — warm amber gold (easy on the eyes vs harsh red)
  primary: '#E8A84A',
  primaryLight: '#F0BC6A',
  primaryMuted: 'rgba(232, 168, 74, 0.14)',
  primaryGlow: 'rgba(232, 168, 74, 0.22)',

  accent: '#FFFFFF',
  accentLight: '#F5F5F7',
  accentMuted: 'rgba(255, 255, 255, 0.10)',

  blue: '#0A84FF',
  blueMuted: 'rgba(10, 132, 255, 0.14)',

  // Status — Apple system palette with warm alert tones
  success: '#30D158',
  successMuted: 'rgba(48, 209, 88, 0.14)',
  warning: '#FF9F0A',
  warningMuted: 'rgba(255, 159, 10, 0.14)',
  error: '#D4956E',
  errorMuted: 'rgba(212, 149, 110, 0.14)',
  info: '#0A84FF',
  infoMuted: 'rgba(10, 132, 255, 0.14)',

  // Typography
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

  // Borders & dividers — hairline Apple separators
  border: {
    default: 'rgba(255, 255, 255, 0.10)',
    subtle: 'rgba(255, 255, 255, 0.06)',
    strong: 'rgba(255, 255, 255, 0.16)',
    focus: 'rgba(255, 255, 255, 0.40)',
    accent: 'rgba(232, 168, 74, 0.35)',
    alert: 'rgba(212, 149, 110, 0.22)',
  },

  // Glass morphism — frosted dark material
  glass: {
    background: 'rgba(28, 28, 30, 0.72)',
    backgroundLight: 'rgba(44, 44, 46, 0.65)',
    border: 'rgba(255, 255, 255, 0.10)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
  },

  // Semantic vehicle statuses
  status: {
    online: '#30D158',
    offline: '#636366',
    idle: '#FF9F0A',
    moving: '#0A84FF',
    unknown: '#8E8E93',
  },

  // Gradients
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

  // Chart colors
  chart: ['#30D158', '#0A84FF', '#FF9F0A', '#BF5AF2', '#D4956E', '#64D2FF'],

  // Tab bar — floating glass dock
  tabBar: {
    background: 'rgba(28, 28, 30, 0.88)',
    active: '#FFFFFF',
    inactive: 'rgba(255, 255, 255, 0.38)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

export type Colors = typeof colors;
