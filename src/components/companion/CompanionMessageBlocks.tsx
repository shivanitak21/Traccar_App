import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { CompanionContentBlock } from '../../api/aiCompanion';
import { useCompanionStore } from '../../stores/companionStore';
import { useFleetStore } from '../../stores/fleetStore';
import { CompanionChart } from './CompanionChart';
import { CompanionTable } from './CompanionTable';
import { CompanionMarkdown } from './CompanionMarkdown';
import { CompanionMap } from './CompanionMap';
import { CompanionMetrics } from './CompanionMetrics';
import { presentCompanionContent } from './presentCompanionContent';

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
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const deviceId = useCompanionStore(state => state.deviceId);
  const deviceName = useCompanionStore(state => state.deviceName);
  const position = useFleetStore(state =>
    deviceId == null ? undefined : state.devices.find(device => device.id === deviceId)?.position
  );

  const contentBlocks = useMemo(() => presentCompanionContent(blocks, fallbackText, {
    streaming,
    location: position
      ? {
          latitude: position.latitude,
          longitude: position.longitude,
          title: deviceName ?? 'Current location',
        }
      : undefined,
  }), [blocks, fallbackText, streaming, position, deviceName]);

  if (streaming) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Preparing response...</Text>
      </View>
    );
  }

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
        if (block.kind === 'plain') {
          return (
            <Text key={`plain-${index}`} style={styles.plain}>
              {block.content}
            </Text>
          );
        }

        if (block.kind === 'markdown') {
          return <CompanionMarkdown key={`md-${index}`}>{block.content}</CompanionMarkdown>;
        }

        if (block.kind === 'chart') {
          return (
            <View key={`chart-${index}`} style={styles.blockCard}>
              <CompanionChart chart={block.chart} />
            </View>
          );
        }

        if (block.kind === 'table') {
          return (
            <View key={`table-${index}`} style={styles.blockCard}>
              <CompanionTable table={block.table} />
            </View>
          );
        }

        if (block.kind === 'metrics') {
          return (
            <View key={`metrics-${index}`} style={styles.blockCard}>
              <CompanionMetrics metrics={block.metrics} />
            </View>
          );
        }

        if (block.kind === 'map') {
          return (
            <View key={`map-${index}`} style={styles.blockCard}>
              <CompanionMap map={block.map} />
            </View>
          );
        }

        return null;
      })}
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: { gap: 10 },
  plain: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 22,
  },
  blockCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 10,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { ...typography.small, color: colors.text.tertiary },
});
