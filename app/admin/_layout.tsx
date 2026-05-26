import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { useTheme } from '../../src/theme/ThemeContext';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, hasHydrated, isAuthenticated } = useAuthStore();
  const { colors } = useTheme();

  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/login" />;
  if (!user?.administrator) return <Redirect href="/(tabs)/settings" />;

  return <>{children}</>;
}

export default function AdminLayout() {
  return (
    <AdminGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="drivers" />
        <Stack.Screen name="vehicles" />
        <Stack.Screen name="users" />
      </Stack>
    </AdminGuard>
  );
}
