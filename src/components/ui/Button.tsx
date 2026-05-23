import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  style,
  textStyle,
  haptic = true,
  fullWidth = false,
}) => {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const sizeStyle = size === 'sm' ? styles.sm : size === 'lg' ? styles.lg : styles.md;
  const sizeText = size === 'sm' ? styles.textSm : size === 'lg' ? styles.textLg : styles.textMd;

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          sizeStyle,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          pressed && styles.pressed,
          style,
        ]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, styles.gradientFill]}
        />
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} size="small" />
          ) : (
            <>
              {icon && <View style={styles.iconLeft}>{icon}</View>}
              <Text style={[styles.text, styles.textPrimary, sizeText, textStyle]}>
                {title}
              </Text>
              {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
            </>
          )}
        </View>
      </Pressable>
    );
  }

  const variantStyle = {
    secondary: styles.secondary,
    ghost: styles.ghost,
    danger: styles.danger,
    outline: styles.outline,
  }[variant];

  const variantTextStyle = {
    secondary: styles.textSecondary,
    ghost: styles.textGhost,
    danger: styles.textDanger,
    outline: styles.textOutline,
  }[variant];

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        sizeStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={variant === 'danger' ? colors.error : colors.text.primary}
            size="small"
          />
        ) : (
          <>
            {icon && <View style={styles.iconLeft}>{icon}</View>}
            <Text style={[styles.text, variantTextStyle, sizeText, textStyle]}>
              {title}
            </Text>
            {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  sm: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
  },
  md: {
    height: spacing.buttonHeight,
    paddingHorizontal: spacing.lg,
  },
  lg: {
    height: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: 14,
  },
  gradientFill: {
    borderRadius: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconLeft: {},
  iconRight: {},
  text: {
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  textPrimary: {
    color: colors.text.inverse,
    fontSize: 15,
  },
  textSecondary: {
    color: colors.text.primary,
    fontSize: 15,
  },
  textGhost: {
    color: colors.text.secondary,
    fontSize: 15,
  },
  textDanger: {
    color: colors.error,
    fontSize: 15,
  },
  textOutline: {
    color: colors.primary,
    fontSize: 15,
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 15,
  },
  textLg: {
    fontSize: 16,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.errorMuted,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
});
