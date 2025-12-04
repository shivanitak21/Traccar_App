export const colors = {
  background: '#0a0a0f',
  surface: '#141419',

  primary: '#00f3ff',
  primaryGlow: 'rgba(0, 243, 255, 0.3)',

  secondary: '#ff00ff',
  secondaryGlow: 'rgba(255, 0, 255, 0.3)',

  accent: '#7700ff',

  success: '#00ff88',
  warning: '#ffaa00',
  error: '#ff0055',

  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
  },

  glass: {
    background: 'rgba(20, 20, 25, 0.6)',
    border: 'rgba(255, 255, 255, 0.1)',
  },

  gradient: {
    primary: ['#00f3ff', '#0088ff'] as const,
    secondary: ['#ff00ff', '#aa00ff'] as const,
    accent: ['#00f3ff', '#ff00ff'] as const,
    dark: ['#0a0a0f', '#141419'] as const,
  },
};
