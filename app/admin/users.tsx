import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserAccessScreen } from '../../src/screens/UserAccessScreen';

export default function AdminUsersRoute() {
  return (
    <SafeAreaProvider>
      <UserAccessScreen />
    </SafeAreaProvider>
  );
}
