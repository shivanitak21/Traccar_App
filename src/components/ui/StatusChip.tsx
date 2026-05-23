import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type ChipVariant = 'online' | 'offline' | 'moving' | 'idle' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  style?: ViewStyle;
}

const variantConfig: Record<ChipVariant, { bg: string; text: string; dot: string }> = {
  online: {
    bg: colors.successMuted,
    text: colors.success,
    dot: colors.success,
  },
  offline: {
    bg: 'rgba(100,116,139,0.12)',
    text: '#94a3b8',
    dot: '#64748b',
  },
  moving: {
    bg: colors.blueMuted,
    text: colors.blue,
    dot: colors.blue,
  },
  idle: {
    bg: colors.warningMuted,
    text: colors.warning,
    dot: colors.warning,
  },
  warning: {
    bg: colors.warningMuted,
    text: colors.warning,
    dot: colors.warning,
  },
  error: {
    bg: colors.errorMuted,
    text: colors.error,
    dot: colors.error,
  },
  info: {
    bg: colors.blueMuted,
    text: colors.blue,
    dot: colors.blue,
  },
  neutral: {
    bg: colors.border.default,
    text: colors.text.secondary,
    dot: colors.text.tertiary,
  },
};

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  dot = true,
  style,
}) => {
  const config = variantConfig[variant];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg },
        isSmall && styles.small,
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: config.dot },
            isSmall && styles.dotSmall,
          ]}
        />
      )}
      <Text
        style={[
          styles.label,
          { color: config.text },
          isSmall && styles.labelSmall,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  label: {
    ...typography.smallMd,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 11,
  },
});
