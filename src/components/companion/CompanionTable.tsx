import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DataTable } from '../ui/DataTable';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { CompanionTableBlock } from '../../api/aiCompanion';

export const CompanionTable: React.FC<{ table: CompanionTableBlock }> = ({ table }) => (
  <View style={styles.wrap}>
    {table.title ? <Text style={styles.title}>{table.title}</Text> : null}
    <DataTable
      columns={table.columns.map(col => ({
        key: col.key,
        label: col.label,
        width: 120,
        render: row => String(row[col.key] ?? '—'),
      }))}
      data={table.rows}
      keyExtractor={(row, index) => `${index}-${String(row[table.columns[0]?.key ?? 'row'])}`}
      emptyMessage="No rows"
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  title: {
    ...typography.smallMd,
    color: colors.text.primary,
    fontWeight: '600',
  },
});
