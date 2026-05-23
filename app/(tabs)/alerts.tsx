import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertsScreen } from '../../src/screens/AlertsScreen';

export default function AlertsTab() {
  return (
    <SafeAreaProvider>
      <AlertsScreen />
    </SafeAreaProvider>
  );
}
