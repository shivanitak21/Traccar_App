import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Polyline, Polygon, Rect, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { CompanionChartBlock } from '../../api/aiCompanion';

const CHART_HEIGHT = 190;
const CHART_WIDTH = 320;
const PADDING = { top: 20, right: 14, bottom: 34, left: 42 };

function formatValue(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

export const CompanionChart: React.FC<{ chart: CompanionChartBlock }> = ({ chart }) => {
  const { colors } = useTheme();
  const palette = colors.chart;

  const plot = useMemo(() => {
    const dataset = chart.datasets[0];
    if (!dataset || chart.labels.length === 0) return null;

    const values = dataset.data.length > 0 ? dataset.data : chart.labels.map(() => 0);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = Math.max(maxValue - minValue, 1);

    const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const stepX = chart.labels.length > 1 ? innerWidth / (chart.labels.length - 1) : innerWidth / 2;

    const points = values.map((value, index) => {
      const x = PADDING.left + index * stepX;
      const normalized = (value - minValue) / range;
      const y = PADDING.top + innerHeight - normalized * innerHeight;
      return { x, y, value };
    });

    return { points, maxValue, minValue, innerWidth, innerHeight, stepX, values };
  }, [chart]);

  const styles = useMemo(() => StyleSheet.create({
    wrap: {
      gap: 6,
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
      marginTop: 2,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
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
  }), [colors]);

  if (!plot) return null;

  const accentColor = chart.datasets[0]?.color ?? palette[0];
  const linePoints = plot.points.map(p => `${p.x},${p.y}`).join(' ');
  const barWidth = Math.max(12, Math.min(32, plot.stepX * 0.55));
  const baseY = PADDING.top + plot.innerHeight;

  const areaPoints = [
    `${plot.points[0].x},${baseY}`,
    ...plot.points.map(p => `${p.x},${p.y}`),
    `${plot.points[plot.points.length - 1].x},${baseY}`,
  ].join(' ');

  const yTicks = [0, 0.5, 1].map(ratio => ({
    y: PADDING.top + plot.innerHeight - ratio * plot.innerHeight,
    label: formatValue(plot.minValue + ratio * (plot.maxValue - plot.minValue)),
  }));

  return (
    <View style={styles.wrap}>
      {chart.title ? <Text style={styles.title}>{chart.title}</Text> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>

          {yTicks.map((tick, i) => (
            <Line
              key={`grid-${i}`}
              x1={PADDING.left}
              y1={tick.y}
              x2={PADDING.left + plot.innerWidth}
              y2={tick.y}
              stroke={colors.border.subtle}
              strokeWidth={1}
              strokeDasharray={i === 0 ? undefined : '3,4'}
            />
          ))}

          {yTicks.map((tick, i) => (
            <SvgText
              key={`ylabel-${i}`}
              x={PADDING.left - 5}
              y={tick.y + 4}
              fill={colors.text.tertiary}
              fontSize={9}
              textAnchor="end"
            >
              {tick.label}
            </SvgText>
          ))}

          <Line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left}
            y2={PADDING.top + plot.innerHeight}
            stroke={colors.border.default}
            strokeWidth={1}
          />

          {chart.chartType === 'bar' ? (
            plot.points.map((point, index) => (
              <Rect
                key={`bar-${index}`}
                x={point.x - barWidth / 2}
                y={point.y}
                width={barWidth}
                height={baseY - point.y}
                fill={accentColor}
                rx={4}
                opacity={0.88}
              />
            ))
          ) : (
            <>
              <Polygon
                points={areaPoints}
                fill={accentColor}
                opacity={0.08}
              />
              <Polyline
                points={linePoints}
                fill="none"
                stroke={accentColor}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {plot.points.map((point, index) => (
                <Circle
                  key={`dot-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={3.5}
                  fill={accentColor}
                  stroke={colors.surface}
                  strokeWidth={1.5}
                />
              ))}
            </>
          )}

          {plot.points.map((point, index) => {
            const step = Math.ceil(chart.labels.length / 5);
            const isLast = index === chart.labels.length - 1;
            if (index % step !== 0 && !isLast) return null;
            return (
              <SvgText
                key={`xlabel-${index}`}
                x={point.x}
                y={CHART_HEIGHT - 8}
                fill={colors.text.tertiary}
                fontSize={10}
                textAnchor="middle"
              >
                {String(chart.labels[index] ?? '').slice(0, 9)}
              </SvgText>
            );
          })}
        </Svg>
      </ScrollView>

      {chart.datasets.length > 0 && (
        <View style={styles.legendRow}>
          {chart.datasets.map((dataset, index) => (
            <View key={`${dataset.label}-${index}`} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: dataset.color ?? palette[index % palette.length] }]} />
              <Text style={styles.legendText}>{dataset.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
