import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface LoadingStateProps {
  label?: string;
  style?: ViewStyle;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading…',
  style,
  fullScreen,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View
      style={[styles.container, fullScreen && styles.fullScreen, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator color={colors.primary} size="small" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xl,
    },
    fullScreen: {
      flex: 1,
    },
    label: {
      ...typography.caption,
      color: colors.text.tertiary,
    },
  });
