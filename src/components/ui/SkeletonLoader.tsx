import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-300, 300]),
      },
    ],
  }));

  const shimmerColors = isDark
    ? ['transparent', 'rgba(240,244,248,0.05)', 'rgba(240,244,248,0.08)', 'rgba(240,244,248,0.05)', 'transparent'] as const
    : ['transparent', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)', 'transparent'] as const;

  return (
    <View
      style={[
        { backgroundColor: colors.surfaceElevated, overflow: 'hidden' },
        { width: width as any, height, borderRadius },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

export const DeviceCardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeSkeletonStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={44} height={44} borderRadius={12} />
        <View style={styles.flex}>
          <Skeleton height={16} width="60%" borderRadius={6} style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="40%" borderRadius={4} />
        </View>
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
      <View style={styles.statsRow}>
        <Skeleton height={48} style={{ flex: 1 }} borderRadius={10} />
        <Skeleton height={48} style={{ flex: 1 }} borderRadius={10} />
        <Skeleton height={48} style={{ flex: 1 }} borderRadius={10} />
      </View>
    </View>
  );
};

export const StatCardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeSkeletonStyles(colors), [colors]);

  return (
    <View style={styles.statCard}>
      <Skeleton width={28} height={28} borderRadius={8} style={{ marginBottom: 12 }} />
      <Skeleton height={28} width="70%" borderRadius={6} style={{ marginBottom: 6 }} />
      <Skeleton height={12} width="50%" borderRadius={4} />
    </View>
  );
};

const makeSkeletonStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
});
