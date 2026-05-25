// Apple-style corner radii
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  full: 9999,
  card: 20,
  button: 14,
  pill: 9999,
  control: 50,
} as const;

export type Radius = typeof radius;
