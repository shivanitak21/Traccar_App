import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  width?: number;
  flex?: number;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  emptyMessage?: string;
  onRowPress?: (row: T, index: number) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data',
  onRowPress,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const tableMinWidth = columns.reduce((sum, col) => sum + (col.width || 120), 0);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.table, { minWidth: tableMinWidth }]}>
        <View style={styles.headerRow}>
          {columns.map(col => (
            <View
              key={col.key}
              style={[styles.headerCell, col.width ? { width: col.width } : { flex: col.flex || 1 }]}
            >
              <Text style={styles.headerText} numberOfLines={1}>{col.label}</Text>
            </View>
          ))}
        </View>

        {data.map((row, index) => {
          const RowWrapper = onRowPress ? Pressable : View;
          return (
            <RowWrapper
              key={keyExtractor(row, index)}
              style={[styles.dataRow, index % 2 === 1 && styles.dataRowAlt]}
              {...(onRowPress ? { onPress: () => onRowPress(row, index) } : {})}
            >
              {columns.map(col => (
                <View
                  key={col.key}
                  style={[styles.dataCell, col.width ? { width: col.width } : { flex: col.flex || 1 }]}
                >
                  <Text style={styles.cellText} numberOfLines={2}>
                    {col.render
                      ? col.render(row, index)
                      : String((row as any)[col.key] ?? '—')}
                  </Text>
                </View>
              ))}
            </RowWrapper>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  headerText: {
    ...typography.captionMd,
    color: colors.text.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  dataRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  dataCell: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  cellText: {
    ...typography.small,
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
});
