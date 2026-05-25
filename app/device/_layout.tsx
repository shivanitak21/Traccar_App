import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';

export default function DeviceLayout() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const hasHydrated = useAuthStore(state => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
