import { TextStyle } from 'react-native';

export const fontFamily = {
  regular: undefined,
  medium: undefined,
  semiBold: undefined,
  bold: undefined,
  mono: undefined,
};

export const typography = {
  display: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -1.2,
  },

  h1: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.6,
  },
  h2: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.2,
  },

  bodyLg: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: -0.1,
  },
  bodyMd: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: -0.1,
  },

  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  captionMd: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  small: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  smallMd: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  tiny: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.3,
  },

  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: -0.08,
    textTransform: 'none' as TextStyle['textTransform'],
  },
  sectionLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: -0.08,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
  mono: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
  },

  metric: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
  metricSm: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
  speed: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -2.5,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
};

export type Typography = typeof typography;
