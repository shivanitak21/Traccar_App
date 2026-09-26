import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../src/theme/ThemeContext';
import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const { isAuthenticated, isLoading, hasHydrated, initialize } = useAuthStore();
  const { colors } = useTheme();
  const didInitRef = useRef(false);

  const pulse = useSharedValue(0.8);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: pulse.value,
  }));

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.8, { duration: 700 })
      ),
      -1
    );
  }, []);

  useEffect(() => {
    if (didInitRef.current || hasHydrated) return;
    didInitRef.current = true;
    initialize();
  }, [hasHydrated, initialize]);

  if (!hasHydrated || isLoading) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={colors.gradient.dark}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.splashLogo, pulseStyle]}>
          <LinearGradient
            colors={colors.gradient.brand}
            style={styles.splashGradient}
          >
            <Animated.Text style={[styles.splashLetter, { color: colors.text.inverse }]}>
              E
            </Animated.Text>
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    overflow: 'hidden',
  },
  splashGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLetter: {
    fontSize: 32,
    fontWeight: '800',
  },
});
