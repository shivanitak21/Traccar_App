import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { LoginScreen } from '../src/screens/LoginScreen';
import { useAuthStore } from '../src/stores/authStore';

export default function LoginRoute() {
  const { isAuthenticated, isLoading, hasHydrated, initialize } = useAuthStore();
  const didInitRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current || hasHydrated) return;
    didInitRef.current = true;
    initialize();
  }, [hasHydrated, initialize]);

  if (!hasHydrated || isLoading) {
    return <View style={styles.placeholder} />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <LoginScreen onLoginSuccess={() => {}} />;
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: '#0a0c12',
  },
});
