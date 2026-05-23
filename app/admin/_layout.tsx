import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !user?.administrator) {
      router.replace('/(tabs)/settings');
    }
  }, [hasHydrated, user?.administrator, router]);

  if (!hasHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user?.administrator) {
    return null;
  }

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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
