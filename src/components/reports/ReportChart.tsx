import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import Svg, { Polyline, Polygon, Rect, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { GlassCard } from '../GlassCard';

const CHART_HEIGHT = 180;
const Y_AXIS_WIDTH = 42;
const PLOT_PADDING = { top: 18, right: 16, bottom: 32, left: 12 };
const BAR_SPACING = 44;
const LINE_SPACING = 36;

function formatTick(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

export interface ReportChartProps {
  title?: string;
  subtitle?: string;
  labels: string[];
  values: number[];
  color?: string;
  type?: 'bar' | 'line';
  valueFormatter?: (v: number) => string;
  height?: number;
}

export const ReportChart: React.FC<ReportChartProps> = ({
  title,
  subtitle,
  labels,
  values,
  color,
  type = 'bar',
  valueFormatter = formatTick,
  height = CHART_HEIGHT,
}) => {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const viewportWidth = Math.max(160, screenWidth - 88);
  const accent = color ?? colors.chart[0];
  const pointSpacing = type === 'bar' ? BAR_SPACING : LINE_SPACING;

  const plot = useMemo(() => {
    if (labels.length === 0 || values.length === 0) return null;

    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = Math.max(maxValue - minValue, 1);
    const count = Math.max(labels.length, values.length);
    const innerHeight = height - PLOT_PADDING.top - PLOT_PADDING.bottom;
    const contentWidth = Math.max(
      viewportWidth,
      count * pointSpacing + PLOT_PADDING.left + PLOT_PADDING.right,
    );
    const innerWidth = contentWidth - PLOT_PADDING.left - PLOT_PADDING.right;
    const stepX = count > 1 ? innerWidth / (count - 1) : innerWidth / 2;

    const points = values.map((value, index) => {
      const x = PLOT_PADDING.left + index * stepX;
      const normalized = (value - minValue) / range;
      const y = PLOT_PADDING.top + innerHeight - normalized * innerHeight;
      return { x, y, value };
    });

    return { points, maxValue, minValue, innerWidth, innerHeight, stepX, contentWidth };
  }, [labels.length, values, viewportWidth, height, pointSpacing]);

  const styles = useMemo(() => StyleSheet.create({
    card: { padding: 16, marginBottom: 16, gap: 4, borderRadius: 16 },
    title: { ...typography.h4, color: colors.text.primary },
    subtitle: { ...typography.caption, color: colors.text.tertiary, marginBottom: 4 },
    chartRow: { flexDirection: 'row', marginTop: 4 },
    yAxis: {
      width: Y_AXIS_WIDTH,
      justifyContent: 'space-between',
      paddingTop: PLOT_PADDING.top - 6,
      paddingBottom: PLOT_PADDING.bottom - 2,
    },
    scrollArea: { flex: 1 },
    yTick: {
      ...typography.tiny,
      color: colors.text.tertiary,
      fontSize: 9,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    scrollHint: {
      ...typography.tiny,
      color: colors.text.tertiary,
      marginTop: 6,
      textAlign: 'right',
    },
  }), [colors]);

  if (!plot) return null;

  const baseY = PLOT_PADDING.top + plot.innerHeight;
  const barWidth = Math.max(12, Math.min(30, plot.stepX * 0.6));
  const linePoints = plot.points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = [
    `${plot.points[0].x},${baseY}`,
    ...plot.points.map(p => `${p.x},${p.y}`),
    `${plot.points[plot.points.length - 1].x},${baseY}`,
  ].join(' ');

  const yTicks = [1, 0.5, 0].map(ratio => ({
    label: valueFormatter(plot.minValue + ratio * (plot.maxValue - plot.minValue)),
  }));

  const isScrollable = plot.contentWidth > viewportWidth;
  const labelStep = isScrollable ? 1 : Math.max(1, Math.ceil(labels.length / 6));

  return (
    <GlassCard style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.chartRow}>
        <View style={[styles.yAxis, { height }]}>
          {yTicks.map((tick, i) => (
            <Text key={`ylabel-${i}`} style={styles.yTick} numberOfLines={1}>
              {tick.label}
            </Text>
          ))}
        </View>

        <ScrollView
          horizontal
          style={styles.scrollArea}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          nestedScrollEnabled
          contentContainerStyle={{ minWidth: viewportWidth }}
        >
          <Svg width={plot.contentWidth} height={height}>
            {yTicks.map((_, i) => {
              const y = PLOT_PADDING.top + plot.innerHeight - (i / 2) * plot.innerHeight;
              return (
                <Line
                  key={`grid-${i}`}
                  x1={0}
                  y1={y}
                  x2={plot.contentWidth - PLOT_PADDING.right}
                  y2={y}
                  stroke={colors.border.subtle}
                  strokeWidth={1}
                  strokeDasharray={i === 2 ? undefined : '3,4'}
                />
              );
            })}

            {type === 'bar' ? (
              plot.points.map((point, index) => (
                <Rect
                  key={`bar-${index}`}
                  x={point.x - barWidth / 2}
                  y={point.y}
                  width={barWidth}
                  height={baseY - point.y}
                  fill={accent}
                  rx={4}
                  opacity={0.9}
                />
              ))
            ) : (
              <>
                <Polygon points={areaPoints} fill={accent} opacity={0.1} />
                <Polyline
                  points={linePoints}
                  fill="none"
                  stroke={accent}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {plot.points.map((point, index) => (
                  <Circle
                    key={`dot-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={3}
                    fill={accent}
                    stroke={colors.surface}
                    strokeWidth={1.5}
                  />
                ))}
              </>
            )}

            {plot.points.map((point, index) => {
              const isLast = index === labels.length - 1;
              if (index % labelStep !== 0 && !isLast) return null;
              return (
                <SvgText
                  key={`xlabel-${index}`}
                  x={point.x}
                  y={height - 8}
                  fill={colors.text.tertiary}
                  fontSize={9}
                  textAnchor="middle"
                >
                  {String(labels[index] ?? '').slice(0, 10)}
                </SvgText>
              );
            })}
          </Svg>
        </ScrollView>
      </View>

      {isScrollable ? (
        <Text style={styles.scrollHint}>Swipe to explore chart →</Text>
      ) : null}
    </GlassCard>
  );
};

interface MetricBarProps {
  label: string;
  value: number;
  max: number;
  display: string;
  color?: string;
}

export const MetricBar: React.FC<MetricBarProps> = ({ label, value, max, display, color }) => {
  const { colors } = useTheme();
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColor = color ?? colors.primary;

  const styles = useMemo(() => StyleSheet.create({
    row: { gap: 6, marginBottom: 10 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { ...typography.small, color: colors.text.secondary },
    value: { ...typography.smallMd, color: colors.text.primary, fontVariant: ['tabular-nums'] },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.backgroundSecondary,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: 4 },
  }), [colors]);

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{display}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
};
