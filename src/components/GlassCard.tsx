import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { shadows } from '../theme/shadows';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Subtle emerald/amber tinted border variant */
  variant?: 'default' | 'elevated' | 'inset' | 'accent' | 'success' | 'warning' | 'error';
  /** @deprecated use GradientBorderCard instead */
  gradient?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  padding?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = 'default',
  gradient = false,
  onPress,
  onLongPress,
  padding,
}) => {
  // Legacy gradient support
  if (gradient) {
    return (
      <LinearGradient
        colors={['rgba(16,185,129,0.08)', 'rgba(59,130,246,0.06)']}
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

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          ...cardStyle,
          pressed && styles.pressed,
        ]}
        android_ripple={{ color: 'rgba(240,244,248,0.04)' }}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

// Gradient border card — premium highlight effect
interface GradientCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  colors?: readonly [string, string, ...string[]];
}

export const GradientBorderCard: React.FC<GradientCardProps> = ({
  children,
  style,
  colors: gradientColors = ['rgba(16,185,129,0.3)', 'rgba(59,130,246,0.2)'],
}) => (
  <LinearGradient
    colors={gradientColors}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.gradientOuter, style]}
  >
    <View style={styles.gradientInner}>{children}</View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    ...shadows.md,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border.strong,
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
    borderColor: 'rgba(16,185,129,0.25)',
    backgroundColor: colors.surface,
  },
  warning: {
    borderColor: 'rgba(245,158,11,0.25)',
    backgroundColor: colors.surface,
  },
  error: {
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  gradientOuter: {
    borderRadius: 17,
    padding: 1,
  },
  gradientInner: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
