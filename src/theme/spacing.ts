// Premium spacing scale — consistent 4px base grid
export const spacing = {
  // Base units
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,

  // Named tokens
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,

  // Component-specific
  screenPadding: 20,
  cardPadding: 16,
  cardPaddingLg: 20,
  sectionGap: 24,
  itemGap: 12,
  inputHeight: 52,
  buttonHeight: 52,
  tabBarHeight: 64,
  headerHeight: 56,
  avatarSm: 32,
  avatarMd: 44,
  avatarLg: 64,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,
} as const;

export type Spacing = typeof spacing;
