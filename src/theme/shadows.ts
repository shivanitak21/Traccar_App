import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';

// Layered shadow system — creates depth without being heavy
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

  // Subtle lift — cards resting on background
  sm: {
    ...shadow('#000', { width: 0, height: 1 }, 0.2, 3, 2),
  } as ViewStyle,

  // Default card elevation
  md: {
    ...shadow('#000', { width: 0, height: 2 }, 0.25, 6, 4),
  } as ViewStyle,

  // Elevated cards / modals
  lg: {
    ...shadow('#000', { width: 0, height: 4 }, 0.3, 12, 8),
  } as ViewStyle,

  // Floating panels / bottom sheets
  xl: {
    ...shadow('#000', { width: 0, height: 8 }, 0.35, 20, 16),
  } as ViewStyle,

  // Emerald glow — active/online vehicles
  emerald: {
    ...shadow(colors.primary, { width: 0, height: 0 }, 0.3, 12, 6),
  } as ViewStyle,

  // Amber glow — warnings / idle
  amber: {
    ...shadow(colors.accent, { width: 0, height: 0 }, 0.3, 12, 6),
  } as ViewStyle,

  // Red glow — alerts / errors
  red: {
    ...shadow(colors.error, { width: 0, height: 0 }, 0.3, 12, 6),
  } as ViewStyle,

  // Tab bar top shadow
  tabBar: {
    ...shadow('#000', { width: 0, height: -2 }, 0.3, 8, 8),
  } as ViewStyle,

  // Button press state
  button: {
    ...shadow(colors.primary, { width: 0, height: 4 }, 0.25, 8, 4),
  } as ViewStyle,
};
