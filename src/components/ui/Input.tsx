import React, { useMemo, useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Pressable,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  isPassword?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  isPassword,
  secureTextEntry,
  ...rest
}, ref) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const secure = isPassword ? !showPassword : secureTextEntry;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          {...rest}
          secureTextEntry={secure}
          placeholderTextColor={colors.text.disabled}
          style={[styles.input, inputStyle]}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          accessibilityLabel={rest.accessibilityLabel ?? label}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            style={styles.icon}
          >
            {showPassword ? (
              <EyeOff size={18} color={colors.text.tertiary} strokeWidth={2} />
            ) : (
              <Eye size={18} color={colors.text.tertiary} strokeWidth={2} />
            )}
          </Pressable>
        ) : rightIcon ? (
          <View style={styles.icon}>{rightIcon}</View>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

Input.displayName = 'Input';

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    wrapper: {
      gap: spacing.xs,
    },
    label: {
      ...typography.captionMd,
      color: colors.text.secondary,
      marginBottom: 2,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: spacing.inputHeight,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.default,
      gap: spacing.sm,
    },
    fieldFocused: {
      borderColor: colors.border.focus,
    },
    fieldError: {
      borderColor: colors.border.alert,
    },
    input: {
      flex: 1,
      ...typography.body,
      color: colors.text.primary,
      paddingVertical: spacing.sm,
    },
    icon: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    error: {
      ...typography.small,
      color: colors.error,
    },
    hint: {
      ...typography.small,
      color: colors.text.tertiary,
    },
  });
