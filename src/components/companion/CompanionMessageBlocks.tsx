import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { CompanionContentBlock } from '../../api/aiCompanion';
import { CompanionChart } from './CompanionChart';
import { CompanionTable } from './CompanionTable';

interface CompanionMessageBlocksProps {
  blocks?: CompanionContentBlock[];
  fallbackText?: string;
  streaming?: boolean;
}

export const CompanionMessageBlocks: React.FC<CompanionMessageBlocksProps> = ({
  blocks,
  fallbackText,
  streaming,
}) => {
  const contentBlocks = blocks && blocks.length > 0
    ? blocks
    : fallbackText
      ? [{ type: 'text' as const, content: fallbackText }]
      : [];

  if (contentBlocks.length === 0) {
    return streaming ? (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Thinking...</Text>
      </View>
    ) : null;
  }

  return (
    <View style={styles.wrap}>
      {contentBlocks.map((block, index) => {
        if (block.type === 'text') {
          if (!block.content.trim()) {
            return streaming ? (
              <View key={`stream-${index}`} style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            ) : null;
          }
          return (
            <Text key={`text-${index}`} style={styles.text}>
              {block.content}
            </Text>
          );
        }

        if (block.type === 'chart') {
          return (
            <View key={`chart-${index}`} style={styles.blockCard}>
              <CompanionChart chart={block} />
            </View>
          );
        }

        if (block.type === 'table') {
          return (
            <View key={`table-${index}`} style={styles.blockCard}>
              <CompanionTable table={block} />
            </View>
          );
        }

        return null;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  text: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 21,
  },
  blockCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 10,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    ...typography.small,
    color: colors.text.tertiary,
  },
});
