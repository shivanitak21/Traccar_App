import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Polyline, Rect, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { CompanionChartBlock } from '../../api/aiCompanion';

const CHART_HEIGHT = 180;
const CHART_WIDTH = 320;
const PADDING = { top: 16, right: 12, bottom: 28, left: 36 };

const palette = colors.chart ?? ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

export const CompanionChart: React.FC<{ chart: CompanionChartBlock }> = ({ chart }) => {
  const plot = useMemo(() => {
    const dataset = chart.datasets[0];
    if (!dataset || chart.labels.length === 0) return null;

    const values = dataset.data.length > 0 ? dataset.data : chart.labels.map(() => 0);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = Math.max(maxValue - minValue, 1);

    const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const stepX = chart.labels.length > 1 ? innerWidth / (chart.labels.length - 1) : innerWidth;

    const points = values.map((value, index) => {
      const x = PADDING.left + index * stepX;
      const normalized = (value - minValue) / range;
      const y = PADDING.top + innerHeight - normalized * innerHeight;
      return { x, y, value };
    });

    return { points, maxValue, innerWidth, innerHeight, stepX, values };
  }, [chart]);

  if (!plot) return null;

  const linePoints = plot.points.map(p => `${p.x},${p.y}`).join(' ');
  const barWidth = Math.max(12, Math.min(28, plot.stepX * 0.6));

  return (
    <View style={styles.wrap}>
      {chart.title ? <Text style={styles.title}>{chart.title}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Line
            x1={PADDING.left}
            y1={PADDING.top + plot.innerHeight}
            x2={PADDING.left + plot.innerWidth}
            y2={PADDING.top + plot.innerHeight}
            stroke={colors.border.default}
            strokeWidth={1}
          />
          <Line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left}
            y2={PADDING.top + plot.innerHeight}
            stroke={colors.border.default}
            strokeWidth={1}
          />

          {chart.chartType === 'bar'
            ? plot.points.map((point, index) => (
                <Rect
                  key={`bar-${index}`}
                  x={point.x - barWidth / 2}
                  y={point.y}
                  width={barWidth}
                  height={PADDING.top + plot.innerHeight - point.y}
                  fill={chart.datasets[0]?.color ?? palette[0]}
                  rx={4}
                />
              ))
            : (
              <Polyline
                points={linePoints}
                fill="none"
                stroke={chart.datasets[0]?.color ?? palette[0]}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

          {plot.points.map((point, index) => {
            if (index % Math.ceil(chart.labels.length / 4) !== 0 && index !== chart.labels.length - 1) {
              return null;
            }
            return (
              <SvgText
                key={`label-${index}`}
                x={point.x}
                y={CHART_HEIGHT - 8}
                fill={colors.text.tertiary}
                fontSize={10}
                textAnchor="middle"
              >
                {chart.labels[index]?.slice(0, 8)}
              </SvgText>
            );
          })}
        </Svg>
      </ScrollView>

      <View style={styles.legendRow}>
        {chart.datasets.map((dataset, index) => (
          <View key={`${dataset.label}-${index}`} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: dataset.color ?? palette[index % palette.length] }]} />
            <Text style={styles.legendText}>{dataset.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  title: {
    ...typography.smallMd,
    color: colors.text.primary,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.tiny,
    color: colors.text.secondary,
  },
});
