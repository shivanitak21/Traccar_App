import React, { useEffect } from 'react';
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
import { colors } from '../../theme/colors';

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

  return (
    <View
      style={[
        styles.container,
        { width: width as any, height, borderRadius },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(240,244,248,0.05)',
            'rgba(240,244,248,0.08)',
            'rgba(240,244,248,0.05)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// Preset skeleton layouts
export const DeviceCardSkeleton: React.FC = () => (
  <View style={skeletonStyles.card}>
    <View style={skeletonStyles.row}>
      <Skeleton width={44} height={44} borderRadius={12} />
      <View style={skeletonStyles.flex}>
        <Skeleton height={16} width="60%" borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton height={12} width="40%" borderRadius={4} />
      </View>
      <Skeleton width={60} height={24} borderRadius={12} />
    </View>
    <View style={skeletonStyles.statsRow}>
      <Skeleton height={48} style={{ flex: 1 }} borderRadius={10} />
      <Skeleton height={48} style={{ flex: 1 }} borderRadius={10} />
      <Skeleton height={48} style={{ flex: 1 }} borderRadius={10} />
    </View>
  </View>
);

export const StatCardSkeleton: React.FC = () => (
  <View style={skeletonStyles.statCard}>
    <Skeleton width={28} height={28} borderRadius={8} style={{ marginBottom: 12 }} />
    <Skeleton height={28} width="70%" borderRadius={6} style={{ marginBottom: 6 }} />
    <Skeleton height={12} width="50%" borderRadius={4} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
});

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
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
