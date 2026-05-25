import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { queryClient } from '../src/api/queryClient';
import { usePrefsStore } from '../src/stores/prefsStore';
import { useAuthStore } from '../src/stores/authStore';
import { VehicleCompanion } from '../src/components/VehicleCompanion';
import { colors } from '../src/theme/colors';

function AuthRedirector() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) return;

    const rootSegment = segments[0];
    const inProtectedArea =
      rootSegment === '(tabs)' ||
      rootSegment === 'admin' ||
      rootSegment === 'device';

    if (!isAuthenticated && inProtectedArea) {
      router.replace('/login');
    }
  }, [hasHydrated, isAuthenticated, segments, router]);

  return null;
}

function RootNavigator() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const hasHydrated = useAuthStore(state => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <AuthRedirector />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="device" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      {isAuthenticated ? <VehicleCompanion /> : null}
      <StatusBar style="light" />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    usePrefsStore.getState().initialize();
    const { hasHydrated, initialize } = useAuthStore.getState();
    if (!hasHydrated) {
      initialize();
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
