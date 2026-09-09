import React, { useMemo } from 'react';
import { Pressable, StyleSheet, ViewStyle, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/radius';

type IconButtonVariant = 'default' | 'filled' | 'ghost' | 'danger';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  haptic?: boolean;
  accessibilityLabel: string;
  style?: ViewStyle;
  badge?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  haptic = true,
  accessibilityLabel,
  style,
  badge,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const sizeStyle = size === 'sm' ? styles.sm : size === 'lg' ? styles.lg : styles.md;

  const handlePress = () => {
    if (disabled || !onPress) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        variant === 'filled' && styles.filled,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {children}
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      borderRadius: radius.full,
    },
    sm: { width: 36, height: 36 },
    md: { width: 44, height: 44 },
    lg: { width: 52, height: 52 },
    filled: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border.default,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    danger: {
      backgroundColor: colors.errorMuted,
      borderColor: colors.border.alert,
    },
    disabled: {
      opacity: 0.4,
    },
    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.96 }],
    },
    badge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.error,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
  });
