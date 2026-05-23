import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { LoginScreen } from '../src/screens/LoginScreen';
import { colors } from '../src/theme/colors';
import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const { isAuthenticated, isLoading, hasHydrated, initialize } = useAuthStore();

  // Splash pulse animation
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
    if (!hasHydrated) {
      initialize();
    }
  }, [hasHydrated, initialize]);

  if (!hasHydrated || isLoading) {
    return (
      <View style={styles.splash}>
        <LinearGradient
          colors={['#0a0c12', '#0d0f14']}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.splashLogo, pulseStyle]}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.splashGradient}
          >
            <Animated.Text style={styles.splashLetter}>E</Animated.Text>
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <LoginScreen onLoginSuccess={() => {}} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: '#0d0f14',
  },
});
