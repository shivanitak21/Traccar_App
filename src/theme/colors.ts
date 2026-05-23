// Premium Enterprise Design System — Graphite/Charcoal/Slate/Emerald/Amber palette
export const colors = {
  // Legacy backward compat aliases
  secondary: '#f0f4f8',
  secondaryGlow: 'rgba(240,244,248,0.15)',

  // Base backgrounds
  background: '#0d0f14',
  backgroundSecondary: '#10131a',
  surface: '#141820',
  surfaceElevated: '#1a1f2e',
  surfaceHover: '#1e2436',

  // Brand colors
  primary: '#10b981',      // Muted emerald — sophisticated, not neon
  primaryLight: '#34d399',
  primaryMuted: 'rgba(16, 185, 129, 0.12)',
  primaryGlow: 'rgba(16, 185, 129, 0.2)',

  accent: '#f59e0b',       // Warm amber — premium highlight
  accentLight: '#fbbf24',
  accentMuted: 'rgba(245, 158, 11, 0.12)',

  blue: '#3b82f6',         // Subtle blue for data/links
  blueMuted: 'rgba(59, 130, 246, 0.12)',

  // Status
  success: '#10b981',
  successMuted: 'rgba(16, 185, 129, 0.12)',
  warning: '#f59e0b',
  warningMuted: 'rgba(245, 158, 11, 0.12)',
  error: '#ef4444',
  errorMuted: 'rgba(239, 68, 68, 0.12)',
  info: '#3b82f6',
  infoMuted: 'rgba(59, 130, 246, 0.12)',

  // Typography
  text: {
    primary: '#f0f4f8',           // Warm off-white
    secondary: 'rgba(240, 244, 248, 0.65)',
    tertiary: 'rgba(240, 244, 248, 0.38)',
    disabled: 'rgba(240, 244, 248, 0.22)',
    inverse: '#0d0f14',
    accent: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },

  // Borders & dividers
  border: {
    default: 'rgba(240, 244, 248, 0.08)',
    subtle: 'rgba(240, 244, 248, 0.05)',
    strong: 'rgba(240, 244, 248, 0.14)',
    focus: 'rgba(16, 185, 129, 0.5)',
    accent: 'rgba(245, 158, 11, 0.3)',
  },

  // Glass morphism
  glass: {
    background: 'rgba(20, 24, 32, 0.7)',
    backgroundLight: 'rgba(26, 31, 46, 0.6)',
    border: 'rgba(240, 244, 248, 0.08)',
    borderStrong: 'rgba(240, 244, 248, 0.14)',
  },

  // Semantic vehicle statuses
  status: {
    online: '#10b981',
    offline: '#64748b',
    idle: '#f59e0b',
    moving: '#3b82f6',
    unknown: '#94a3b8',
  },

  // Gradients
  gradient: {
    dark: ['#0d0f14', '#10131a'] as const,
    darkDeep: ['#0a0c12', '#0d0f14'] as const,
    emerald: ['#10b981', '#059669'] as const,
    amber: ['#f59e0b', '#d97706'] as const,
    blue: ['#3b82f6', '#2563eb'] as const,
    card: ['rgba(26, 31, 46, 0.8)', 'rgba(20, 24, 32, 0.95)'] as const,
    surface: ['rgba(20, 24, 32, 0.0)', 'rgba(13, 15, 20, 0.8)'] as const,
    header: ['rgba(13, 15, 20, 0.95)', 'rgba(13, 15, 20, 0.0)'] as const,
  },

  // Chart colors
  chart: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'],

  // Tab bar
  tabBar: {
    background: 'rgba(13, 15, 20, 0.96)',
    active: '#10b981',
    inactive: 'rgba(240, 244, 248, 0.35)',
    border: 'rgba(240, 244, 248, 0.06)',
  },
} as const;

export type Colors = typeof colors;
