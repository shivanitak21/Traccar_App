import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { queryClient } from '../src/api/queryClient';
import { usePrefsStore } from '../src/stores/prefsStore';
import { useAuthStore } from '../src/stores/authStore';
import { VehicleCompanion } from '../src/components/VehicleCompanion';

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
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <VehicleCompanion />
        <StatusBar style="light" />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
