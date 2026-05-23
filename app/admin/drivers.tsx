import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DriversScreen } from '../../src/screens/DriversScreen';

export default function AdminDriversRoute() {
  return (
    <SafeAreaProvider>
      <DriversScreen />
    </SafeAreaProvider>
  );
}
