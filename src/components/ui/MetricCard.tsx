import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

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
  accent = colors.primary,
  style,
  size = 'md',
}) => {
  const isLg = size === 'lg';
  const isSm = size === 'sm';

  return (
    <View style={[styles.container, isLg && styles.lg, isSm && styles.sm, style]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      {icon && (
        <View style={[styles.iconWrapper, { backgroundColor: `${accent}18` }]}>
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

// Fleet summary strip — 2x2 grid of key stats
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
  const stats = [
    { label: 'Total', value: total, color: colors.text.secondary },
    { label: 'Online', value: online, color: colors.success },
    { label: 'Moving', value: moving, color: colors.blue },
    { label: 'Idle', value: idle, color: colors.accent },
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    position: 'relative',
    flex: 1,
  },
  sm: {
    padding: 12,
    borderRadius: 12,
  },
  lg: {
    padding: 20,
    borderRadius: 16,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  content: {
    paddingLeft: 4,
  },
  label: {
    ...typography.small,
    color: colors.text.tertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
    fontSize: 32,
    lineHeight: 40,
  },
  valueSm: {
    fontSize: 18,
    lineHeight: 24,
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

const stripStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    position: 'relative',
  },
  value: {
    ...typography.metricSm,
    marginBottom: 2,
  },
  label: {
    ...typography.tiny,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    position: 'absolute',
    right: 0,
    top: '20%',
    bottom: '20%',
    width: 1,
    backgroundColor: colors.border.subtle,
  },
});
