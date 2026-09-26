import React, { useMemo } from 'react';
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
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'brand';
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
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
          shadows.button,
          style,
        ]}
      >
        <LinearGradient
          colors={colors.gradient.cta}
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

  if (variant === 'brand') {
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
          shadows.brand,
          style,
        ]}
      >
        <LinearGradient
          colors={colors.gradient.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, styles.gradientFill]}
        />
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              {icon && <View style={styles.iconLeft}>{icon}</View>}
              <Text style={[styles.text, styles.textBrand, sizeText, textStyle]}>
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

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  base: {
    borderRadius: radius.button,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  sm: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  md: {
    height: spacing.buttonHeight,
    paddingHorizontal: spacing.lg,
  },
  lg: {
    height: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },
  gradientFill: {
    borderRadius: radius.button,
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
    letterSpacing: -0.2,
  },
  textPrimary: {
    color: colors.text.inverse,
    fontSize: 15,
  },
  textBrand: {
    color: '#FFFFFF',
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
    color: colors.text.primary,
    fontSize: 15,
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 15,
  },
  textLg: {
    fontSize: 17,
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
    borderColor: colors.border.alert,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
