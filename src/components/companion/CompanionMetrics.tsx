import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { CompanionMetricsBlock } from '../../api/aiCompanion';

export const CompanionMetrics: React.FC<{ metrics: CompanionMetricsBlock }> = ({ metrics }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      {metrics.title ? <Text style={styles.title}>{metrics.title}</Text> : null}
      <View style={styles.grid}>
        {metrics.items.map((item, index) => (
          <View key={`${item.label}-${index}`} style={styles.cell}>
            <View style={styles.card}>
              <Text style={styles.value} numberOfLines={2}>{item.value}</Text>
              <Text style={styles.label} numberOfLines={2}>{item.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: { gap: 8 },
  title: { ...typography.smallMd, color: colors.text.primary, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  cell: {
    width: '50%',
    padding: 4,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 56,
    justifyContent: 'center',
  },
  value: {
    ...typography.captionMd,
    color: colors.text.primary,
    fontWeight: '700',
  },
  label: {
    ...typography.tiny,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});
