import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { shadows } from '../theme/shadows';
import { radius } from '../theme/radius';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'inset' | 'accent' | 'success' | 'warning' | 'error';
  /** @deprecated use GradientBorderCard instead */
  gradient?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  padding?: number;
  blur?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = 'default',
  gradient = false,
  onPress,
  onLongPress,
  padding,
  blur = false,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (gradient) {
    return (
      <LinearGradient
        colors={isDark
          ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']
          : ['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.01)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  const cardStyle = [
    styles.base,
    variant === 'elevated' && styles.elevated,
    variant === 'inset' && styles.inset,
    variant === 'accent' && styles.accent,
    variant === 'success' && styles.success,
    variant === 'warning' && styles.warning,
    variant === 'error' && styles.error,
    padding !== undefined && { padding },
    style,
  ];

  const inner = blur && Platform.OS === 'ios' ? (
    <BlurView intensity={50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
  ) : null;

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          ...cardStyle,
          pressed && styles.pressed,
        ]}
        android_ripple={{ color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
      >
        {inner}
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle}>
      {inner}
      {children}
    </View>
  );
};

interface GradientCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  colors?: readonly [string, string, ...string[]];
}

export const GradientBorderCard: React.FC<GradientCardProps> = ({
  children,
  style,
  colors: gradientColors,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const defaultGradient = isDark
    ? (['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.06)'] as const)
    : (['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.04)'] as const);

  return (
    <LinearGradient
      colors={gradientColors ?? defaultGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientOuter, style]}
    >
      <View style={styles.gradientInner}>{children}</View>
    </LinearGradient>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    ...shadows.md,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border.default,
    ...shadows.lg,
  },
  inset: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border.subtle,
    ...shadows.sm,
  },
  accent: {
    borderColor: colors.border.accent,
  },
  success: {
    borderColor: 'rgba(48,209,88,0.28)',
  },
  warning: {
    borderColor: 'rgba(255,159,10,0.28)',
  },
  error: {
    borderColor: colors.border.alert,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  gradientOuter: {
    borderRadius: radius.card + 1,
    padding: 1,
  },
  gradientInner: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
});
