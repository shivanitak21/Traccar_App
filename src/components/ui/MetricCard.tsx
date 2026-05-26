import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: { value: number; positive?: boolean };
  accent?: string;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  icon,
  trend,
  accent,
  style,
  size = 'md',
}) => {
  const { colors } = useTheme();
  const resolvedAccent = accent ?? colors.text.primary;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isLg = size === 'lg';
  const isSm = size === 'sm';

  return (
    <View style={[styles.container, isLg && styles.lg, isSm && styles.sm, style]}>
      {icon && (
        <View style={[styles.iconWrapper, { backgroundColor: `${resolvedAccent}14` }]}>
          {icon}
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, isLg && styles.valueLg, isSm && styles.valueSm]}>
            {value}
          </Text>
          {unit && (
            <Text style={styles.unit}>{unit}</Text>
          )}
        </View>

        {trend && (
          <View style={styles.trendRow}>
            <Text style={[
              styles.trendText,
              { color: trend.positive ? colors.success : colors.error },
            ]}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

interface FleetStatsProps {
  total: number;
  online: number;
  moving: number;
  idle: number;
}

export const FleetStatsStrip: React.FC<FleetStatsProps> = ({
  total,
  online,
  moving,
  idle,
}) => {
  const { colors } = useTheme();
  const stripStyles = useMemo(() => makeStripStyles(colors), [colors]);

  const stats = [
    { label: 'Fleet', value: total, color: colors.text.primary },
    { label: 'Online', value: online, color: colors.success },
    { label: 'Moving', value: moving, color: colors.blue },
    { label: 'Idle', value: idle, color: colors.warning },
  ];

  return (
    <View style={stripStyles.container}>
      {stats.map((stat, i) => (
        <View key={stat.label} style={stripStyles.item}>
          <Text style={[stripStyles.value, { color: stat.color }]}>{stat.value}</Text>
          <Text style={stripStyles.label}>{stat.label}</Text>
          {i < stats.length - 1 && <View style={stripStyles.divider} />}
        </View>
      ))}
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    position: 'relative',
    flex: 1,
  },
  sm: {
    padding: 12,
    borderRadius: radius.md,
  },
  lg: {
    padding: 20,
    borderRadius: radius.xl,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  content: {
    gap: 4,
  },
  label: {
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 0.2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    ...typography.metricSm,
    color: colors.text.primary,
  },
  valueLg: {
    fontSize: 36,
    lineHeight: 42,
  },
  valueSm: {
    fontSize: 20,
    lineHeight: 26,
  },
  unit: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  trendRow: {
    marginTop: 4,
  },
  trendText: {
    ...typography.small,
    fontWeight: '600',
  },
});

const makeStripStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    position: 'relative',
  },
  value: {
    ...typography.metricSm,
    marginBottom: 4,
  },
  label: {
    ...typography.tiny,
    color: colors.text.tertiary,
    letterSpacing: 0.4,
  },
  divider: {
    position: 'absolute',
    right: 0,
    top: '22%',
    bottom: '22%',
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
});
