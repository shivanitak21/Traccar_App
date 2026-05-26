import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  active?: boolean;
  accent?: string;
  size?: 'md' | 'sm';
  style?: ViewStyle;
}

export const ControlButton: React.FC<ControlButtonProps> = ({
  icon,
  label,
  onPress,
  active = false,
  accent,
  size = 'md',
  style,
}) => {
  const { colors } = useTheme();
  const resolvedAccent = accent ?? colors.text.primary;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      style={({ pressed }) => [
        styles.wrapper,
        size === 'sm' && styles.wrapperSm,
        style,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.circle,
          size === 'sm' && styles.circleSm,
          active && { backgroundColor: `${resolvedAccent}20`, borderColor: `${resolvedAccent}40` },
        ]}
      >
        {icon}
      </View>
      <Text
        style={[styles.label, size === 'sm' && styles.labelSm, active && { color: resolvedAccent }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

interface ControlButtonRowProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ControlButtonRow: React.FC<ControlButtonRowProps> = ({
  children,
  style,
}) => (
  <View style={[staticStyles.row, style]}>{children}</View>
);

const staticStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
});

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 64,
  },
  wrapperSm: {
    gap: 5,
    minWidth: 0,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  circleSm: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  label: {
    ...typography.tiny,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  labelSm: {
    fontSize: 10,
    lineHeight: 12,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
});
