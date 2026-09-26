import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { CompanionTableBlock } from '../../api/aiCompanion';

const COL_MIN = 90;
const COL_MAX = 180;

function estimateColWidth(col: { label: string }, rows: Array<Record<string, string | number | null | undefined>>): number {
  const headerLen = col.label.length;
  const maxCellLen = rows.reduce((max, row) => {
    const val = String(row[col.key as keyof typeof row] ?? '');
    return Math.max(max, val.length);
  }, 0);
  const chars = Math.max(headerLen, maxCellLen);
  return Math.min(COL_MAX, Math.max(COL_MIN, chars * 8 + 20));
}

interface ColWithKey { key: string; label: string }

export const CompanionTable: React.FC<{ table: CompanionTableBlock }> = ({ table }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const colWidths = table.columns.map(col => estimateColWidth(col as ColWithKey, table.rows));
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);

  return (
    <View style={styles.wrap}>
      {table.title ? <Text style={styles.title}>{table.title}</Text> : null}

      <View style={styles.tableContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
          <View style={{ width: totalWidth }}>
            <View style={styles.headerRow}>
              {table.columns.map((col, i) => (
                <View key={col.key} style={[styles.headerCell, { width: colWidths[i] }]}>
                  <Text style={styles.headerText} numberOfLines={1}>{col.label}</Text>
                </View>
              ))}
            </View>

            {table.rows.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No data</Text>
              </View>
            ) : (
              table.rows.map((row, rowIdx) => (
                <View key={`row-${rowIdx}`} style={[styles.dataRow, rowIdx % 2 === 1 && styles.dataRowAlt, rowIdx === table.rows.length - 1 && styles.lastRow]}>
                  {table.columns.map((col, i) => (
                    <View key={col.key} style={[styles.dataCell, { width: colWidths[i] }]}>
                      <Text style={styles.cellText} numberOfLines={2}>{String(row[col.key] ?? '—')}</Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {totalWidth > 300 && <Text style={styles.scrollHint}>← scroll to see more →</Text>}
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  wrap: { gap: 8 },
  title: { ...typography.smallMd, color: colors.text.primary, fontWeight: '600' },
  tableContainer: { borderRadius: 10, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', backgroundColor: colors.surfaceElevated, borderBottomWidth: 1, borderBottomColor: colors.border.strong },
  headerCell: { paddingHorizontal: 10, paddingVertical: 9, justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border.default },
  headerText: { ...typography.captionMd, color: colors.text.secondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dataRow: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  dataRowAlt: { backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)' },
  lastRow: { borderBottomWidth: 0 },
  dataCell: { paddingHorizontal: 10, paddingVertical: 9, justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border.subtle },
  cellText: { ...typography.small, color: colors.text.primary, lineHeight: 18 },
  emptyRow: { padding: 16, alignItems: 'center', backgroundColor: colors.surface },
  emptyText: { ...typography.small, color: colors.text.tertiary },
  scrollHint: { ...typography.tiny, color: colors.text.tertiary, textAlign: 'center', letterSpacing: 0.2 },
});
