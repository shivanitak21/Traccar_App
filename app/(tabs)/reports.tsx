import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReportsScreen } from '../../src/screens/ReportsScreen';

export default function ReportsTab() {
  return (
    <SafeAreaProvider>
      <ReportsScreen />
    </SafeAreaProvider>
  );
}
