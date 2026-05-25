import { ViewStyle } from 'react-native';
import { colors } from './colors';

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

export const shadows = {
  none: {} as ViewStyle,

  sm: {
    ...shadow('#000', { width: 0, height: 1 }, 0.35, 4, 2),
  } as ViewStyle,

  md: {
    ...shadow('#000', { width: 0, height: 4 }, 0.45, 12, 6),
  } as ViewStyle,

  lg: {
    ...shadow('#000', { width: 0, height: 8 }, 0.55, 24, 12),
  } as ViewStyle,

  xl: {
    ...shadow('#000', { width: 0, height: 16 }, 0.65, 40, 20),
  } as ViewStyle,

  emerald: {
    ...shadow(colors.success, { width: 0, height: 0 }, 0.35, 16, 8),
  } as ViewStyle,

  amber: {
    ...shadow(colors.warning, { width: 0, height: 0 }, 0.35, 16, 8),
  } as ViewStyle,

  warm: {
    ...shadow(colors.error, { width: 0, height: 0 }, 0.35, 16, 8),
  } as ViewStyle,

  /** @deprecated use shadows.warm */
  red: {
    ...shadow(colors.error, { width: 0, height: 0 }, 0.35, 16, 8),
  } as ViewStyle,

  brand: {
    ...shadow(colors.primary, { width: 0, height: 4 }, 0.35, 16, 8),
  } as ViewStyle,

  tabBar: {
    ...shadow('#000', { width: 0, height: 8 }, 0.5, 24, 16),
  } as ViewStyle,

  button: {
    ...shadow('#000', { width: 0, height: 4 }, 0.4, 12, 6),
  } as ViewStyle,

  float: {
    ...shadow('#000', { width: 0, height: 12 }, 0.6, 32, 20),
  } as ViewStyle,
};
