import { ViewStyle } from 'react-native';
import { darkColors, lightColors, ThemeColors } from './themes';

const shadow = (
  color: string,
  offset: { width: number; height: number },
  opacity: number,
  radius: number,
  elevation: number
): ViewStyle => ({
  shadowColor: color,
  shadowOffset: offset,
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation,
});

/** Static shadows tuned for dark mode (legacy). Prefer `createShadows(isDark)`. */
export const shadows = {
  none: {} as ViewStyle,

  sm: {
    ...shadow('#000', { width: 0, height: 1 }, 0.28, 3, 2),
  } as ViewStyle,

  md: {
    ...shadow('#000', { width: 0, height: 4 }, 0.32, 10, 5),
  } as ViewStyle,

  lg: {
    ...shadow('#000', { width: 0, height: 8 }, 0.38, 20, 10),
  } as ViewStyle,

  xl: {
    ...shadow('#000', { width: 0, height: 14 }, 0.45, 32, 16),
  } as ViewStyle,

  emerald: {
    ...shadow(darkColors.success, { width: 0, height: 0 }, 0.28, 14, 6),
  } as ViewStyle,

  amber: {
    ...shadow(darkColors.warning, { width: 0, height: 0 }, 0.28, 14, 6),
  } as ViewStyle,

  warm: {
    ...shadow(darkColors.error, { width: 0, height: 0 }, 0.28, 14, 6),
  } as ViewStyle,

  /** @deprecated use shadows.warm */
  red: {
    ...shadow(darkColors.error, { width: 0, height: 0 }, 0.28, 14, 6),
  } as ViewStyle,

  brand: {
    ...shadow(darkColors.primary, { width: 0, height: 4 }, 0.28, 14, 6),
  } as ViewStyle,

  tabBar: {
    ...shadow('#000', { width: 0, height: 8 }, 0.4, 20, 14),
  } as ViewStyle,

  button: {
    ...shadow('#000', { width: 0, height: 3 }, 0.28, 10, 4),
  } as ViewStyle,

  float: {
    ...shadow('#000', { width: 0, height: 10 }, 0.4, 24, 16),
  } as ViewStyle,

  card: {
    ...shadow('#000', { width: 0, height: 2 }, 0.22, 8, 3),
  } as ViewStyle,
};

/** Theme-aware soft elevation for cards, floats, and controls. */
export function createShadows(isDark: boolean, colors?: ThemeColors) {
  const palette = colors ?? (isDark ? darkColors : lightColors);
  const base = isDark ? '#000000' : '#1C1C1E';
  const soft = isDark ? 0.35 : 0.10;
  const mid = isDark ? 0.45 : 0.14;
  const strong = isDark ? 0.55 : 0.18;

  return {
    none: {} as ViewStyle,
    sm: shadow(base, { width: 0, height: 1 }, soft * 0.8, 3, 2) as ViewStyle,
    md: shadow(base, { width: 0, height: 4 }, soft, 10, 4) as ViewStyle,
    lg: shadow(base, { width: 0, height: 8 }, mid, 18, 8) as ViewStyle,
    xl: shadow(base, { width: 0, height: 14 }, strong, 28, 14) as ViewStyle,
    card: shadow(base, { width: 0, height: 2 }, soft * 0.7, 8, 2) as ViewStyle,
    button: shadow(base, { width: 0, height: 3 }, soft, 10, 3) as ViewStyle,
    float: shadow(base, { width: 0, height: 10 }, mid, 24, 12) as ViewStyle,
    tabBar: shadow(base, { width: 0, height: 8 }, mid, 20, 12) as ViewStyle,
    brand: shadow(palette.primary, { width: 0, height: 4 }, 0.28, 14, 6) as ViewStyle,
    emerald: shadow(palette.success, { width: 0, height: 0 }, 0.25, 14, 5) as ViewStyle,
    amber: shadow(palette.warning, { width: 0, height: 0 }, 0.25, 14, 5) as ViewStyle,
    warm: shadow(palette.error, { width: 0, height: 0 }, 0.25, 14, 5) as ViewStyle,
  };
}

export type ThemeShadows = ReturnType<typeof createShadows>;
