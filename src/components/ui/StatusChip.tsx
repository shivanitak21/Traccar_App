import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';

type ChipVariant = 'online' | 'offline' | 'moving' | 'idle' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  style?: ViewStyle;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  dot = true,
  style,
}) => {
  const { colors } = useTheme();
  const isSmall = size === 'sm';

  const variantConfig = useMemo(() => ({
    online:  { bg: colors.successMuted, text: colors.success,       dot: colors.success },
    offline: { bg: 'rgba(142,142,147,0.14)', text: colors.status.offline, dot: colors.status.offline },
    moving:  { bg: colors.blueMuted,    text: colors.blue,          dot: colors.blue },
    idle:    { bg: colors.warningMuted, text: colors.warning,       dot: colors.warning },
    warning: { bg: colors.warningMuted, text: colors.warning,       dot: colors.warning },
    error:   { bg: colors.errorMuted,   text: colors.error,         dot: colors.error },
    info:    { bg: colors.infoMuted,    text: colors.info,          dot: colors.info },
    neutral: { bg: colors.accentMuted,  text: colors.text.secondary, dot: colors.text.tertiary },
  }), [colors]);

  const config = variantConfig[variant];

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
    borderRadius: radius.pill,
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
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontSize: 11,
  },
});
