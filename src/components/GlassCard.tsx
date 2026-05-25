import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';
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
  if (gradient) {
    return (
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
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
    <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
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
        android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
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
  colors: gradientColors = ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.06)'],
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
