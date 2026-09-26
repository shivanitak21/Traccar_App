import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, LayoutChangeEvent } from 'react-native';
import Svg, { Polyline, Polygon, Rect, Line, Circle, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { CompanionChartBlock } from '../../api/aiCompanion';

const CHART_HEIGHT = 190;
const PADDING = { top: 20, right: 14, bottom: 34, left: 42 };

function formatValue(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function slicePath(cx: number, cy: number, outer: number, inner: number, start: number, end: number): string {
  const span = end - start;
  if (span >= Math.PI * 2 - 0.001) {
    if (inner <= 0) {
      return `M ${cx} ${cy - outer} A ${outer} ${outer} 0 1 1 ${cx - 0.01} ${cy - outer} Z`;
    }
    return [
      `M ${cx} ${cy - outer}`,
      `A ${outer} ${outer} 0 1 1 ${cx - 0.01} ${cy - outer}`,
      `L ${cx} ${cy - inner}`,
      `A ${inner} ${inner} 0 1 0 ${cx + 0.01} ${cy - inner}`,
      'Z',
    ].join(' ');
  }
  const large = span > Math.PI ? 1 : 0;
  const startOuter = polar(cx, cy, outer, start);
  const endOuter = polar(cx, cy, outer, end);
  if (inner <= 0) {
    return `M ${cx} ${cy} L ${startOuter.x} ${startOuter.y} A ${outer} ${outer} 0 ${large} 1 ${endOuter.x} ${endOuter.y} Z`;
  }
  const endInner = polar(cx, cy, inner, end);
  const startInner = polar(cx, cy, inner, start);
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}

const RoundChart: React.FC<{ chart: CompanionChartBlock }> = ({ chart }) => {
  const { colors } = useTheme();
  const palette = colors.chart;
  const styles = useMemo(() => StyleSheet.create({
    wrap: { gap: 8 },
    title: { ...typography.smallMd, color: colors.text.primary, fontWeight: '600' },
    chartRow: { alignItems: 'center' },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '48%' },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { ...typography.tiny, color: colors.text.secondary, flexShrink: 1 },
  }), [colors]);

  const values = chart.datasets[0]?.data ?? [];
  const total = values.reduce((sum, value) => sum + Math.max(value, 0), 0);
  if (total <= 0) return null;

  const size = 168;
  const cx = size / 2;
  const cy = size / 2;
  const outer = 68;
  const inner = chart.chartType === 'pie' ? 0 : 40;
  let cursor = -Math.PI / 2;

  const slices = values.map((value, index) => {
    const sweep = (Math.max(value, 0) / total) * Math.PI * 2;
    const start = cursor;
    const end = cursor + sweep;
    cursor = end;
    return {
      key: `${chart.labels[index] ?? index}`,
      path: slicePath(cx, cy, outer, inner, start, end),
      color: chart.datasets[0]?.color && index === 0 ? undefined : palette[index % palette.length],
      label: String(chart.labels[index] ?? `Slice ${index + 1}`),
      value,
      pct: Math.round((Math.max(value, 0) / total) * 100),
    };
  });

  return (
    <View style={styles.wrap}>
      {chart.title ? <Text style={styles.title}>{chart.title}</Text> : null}
      <View style={styles.chartRow}>
        <Svg width={size} height={size}>
          {slices.map(slice => (
            <Path key={slice.key} d={slice.path} fill={slice.color ?? palette[0]} />
          ))}
        </Svg>
      </View>
      <View style={styles.legendRow}>
        {slices.map(slice => (
          <View key={`legend-${slice.key}`} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: slice.color ?? palette[0] }]} />
            <Text style={styles.legendText} numberOfLines={2}>
              {slice.label} · {slice.pct}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const CompanionChart: React.FC<{ chart: CompanionChartBlock }> = ({ chart }) => {
  const { colors } = useTheme();
  const palette = colors.chart;
  const [containerWidth, setContainerWidth] = useState(280);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - containerWidth) > 1) setContainerWidth(next);
  };

  const plot = useMemo(() => {
    if (chart.datasets.length === 0 || chart.labels.length === 0) return null;

    const allValues = chart.datasets.flatMap(dataset => dataset.data);
    if (allValues.length === 0) return null;

    const maxValue = Math.max(...allValues, 1);
    const minValue = Math.min(...allValues, 0);
    const range = Math.max(maxValue - minValue, 1);
    const slot = chart.chartType === 'bar' ? 36 : 28;
    const svgWidth = Math.max(containerWidth, chart.labels.length * slot + PADDING.left + PADDING.right);
    const innerWidth = svgWidth - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const stepX = chart.labels.length > 1 ? innerWidth / (chart.labels.length - 1) : innerWidth / 2;

    const count = chart.labels.length;
    const series = chart.datasets.map(dataset => {
      const values = dataset.data.length > 0 ? dataset.data : chart.labels.map(() => 0);
      const points = values.map((value, index) => {
        const x = chart.chartType === 'bar'
          ? PADDING.left + ((index + 0.5) * innerWidth) / Math.max(count, 1)
          : PADDING.left + (count > 1 ? index * stepX : innerWidth / 2);
        const normalized = (value - minValue) / range;
        const y = PADDING.top + innerHeight - normalized * innerHeight;
        return { x, y, value };
      });
      return { points, values };
    });

    return { series, maxValue, minValue, innerWidth, innerHeight, stepX, svgWidth };
  }, [chart, containerWidth]);

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

  if (chart.chartType === 'doughnut' || chart.chartType === 'pie') {
    return <RoundChart chart={chart} />;
  }

  if (!plot) return null;

  const seriesCount = Math.max(plot.series.length, 1);
  const groupWidth = plot.innerWidth / Math.max(chart.labels.length, 1);
  const barWidth = Math.max(4, Math.min(18, (groupWidth * 0.75) / seriesCount));
  const baseY = PADDING.top + plot.innerHeight;

  const yTicks = [0, 0.5, 1].map(ratio => ({
    y: PADDING.top + plot.innerHeight - ratio * plot.innerHeight,
    label: formatValue(plot.minValue + ratio * (plot.maxValue - plot.minValue)),
  }));

  return (
    <View style={styles.wrap}>
      {chart.title ? <Text style={styles.title}>{chart.title}</Text> : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onLayout={onLayout}
      >
        <Svg width={plot.svgWidth} height={CHART_HEIGHT}>

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

          {plot.series.map((series, seriesIndex) => {
            const color = chart.datasets[seriesIndex]?.color ?? palette[seriesIndex % palette.length];
            if (chart.chartType === 'bar') {
              const offset = (seriesIndex - (seriesCount - 1) / 2) * barWidth;
              return series.points.map((point, index) => (
                <Rect
                  key={`bar-${seriesIndex}-${index}`}
                  x={point.x + offset - barWidth / 2}
                  y={point.y}
                  width={barWidth - 1}
                  height={Math.max(0, baseY - point.y)}
                  fill={color}
                  rx={3}
                  opacity={0.9}
                />
              ));
            }

            const linePoints = series.points.map(point => `${point.x},${point.y}`).join(' ');
            const areaPoints = series.points.length > 0
              ? [
                  `${series.points[0].x},${baseY}`,
                  ...series.points.map(point => `${point.x},${point.y}`),
                  `${series.points[series.points.length - 1].x},${baseY}`,
                ].join(' ')
              : '';

            return (
              <React.Fragment key={`series-${seriesIndex}`}>
                {seriesIndex === 0 && areaPoints ? (
                  <Polygon points={areaPoints} fill={color} opacity={0.08} />
                ) : null}
                <Polyline
                  points={linePoints}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {series.points.length <= 16 && series.points.map((point, index) => (
                  <Circle
                    key={`dot-${seriesIndex}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={3}
                    fill={color}
                    stroke={colors.surface}
                    strokeWidth={1.5}
                  />
                ))}
              </React.Fragment>
            );
          })}

          {(plot.series[0]?.points ?? []).map((point, index) => {
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
