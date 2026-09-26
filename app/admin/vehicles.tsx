import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VehicleAdminScreen } from '../../src/screens/VehicleAdminScreen';

export default function AdminVehiclesRoute() {
  return (
    <SafeAreaProvider>
      <VehicleAdminScreen />
    </SafeAreaProvider>
  );
}
