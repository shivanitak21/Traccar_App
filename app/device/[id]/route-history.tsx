import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RouteHistoryScreen } from '../../../src/screens/RouteHistoryScreen';
import { useTheme } from '../../../src/theme/ThemeContext';

export default function RouteHistoryModal() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const deviceId = parseInt(id as string);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <RouteHistoryScreen deviceId={deviceId} onClose={() => router.back()} />
    </View>
  );
}
