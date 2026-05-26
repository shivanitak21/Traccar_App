import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';

interface SegmentedOption<T extends string> {
  key: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  scrollable = true,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const content = options.map(option => {
    const active = option.key === value;
    return (
      <Pressable
        key={option.key}
        onPress={() => {
          Haptics.selectionAsync();
          onChange(option.key);
        }}
        style={[styles.segment, active && styles.segmentActive]}
      >
        <Text style={[styles.label, active && styles.labelActive]}>
          {option.label}
          {active && option.count !== undefined ? ` · ${option.count}` : ''}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  scrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  segmentActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  label: {
    ...typography.smallMd,
    color: colors.text.secondary,
  },
  labelActive: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
});
