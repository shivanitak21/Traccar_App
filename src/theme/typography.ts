import { TextStyle } from 'react-native';

// Premium typography — sophisticated minimal luxury SaaS feel
export const fontFamily = {
  regular: undefined,   // System default (San Francisco / Roboto)
  medium: undefined,
  semiBold: undefined,
  bold: undefined,
  mono: undefined,
};

export const typography = {
  // Display
  display: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
  },

  // Headings
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.1,
  },
  h4: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },

  // Body
  bodyLg: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  bodyMd: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },

  // Small / Caption
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
  },
  captionMd: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
  },
  small: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.2,
  },
  smallMd: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.2,
  },
  tiny: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.4,
  },

  // Special
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.8,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
  mono: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.3,
  },

  // Numeric / metric display
  metric: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -1,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
  metricSm: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
  speed: {
    fontSize: 42,
    lineHeight: 50,
    fontWeight: '800' as TextStyle['fontWeight'],
    letterSpacing: -2,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
};

export type Typography = typeof typography;
