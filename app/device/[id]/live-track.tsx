import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LiveTrackingScreen } from '../../../src/screens/LiveTrackingScreen';
import { useTheme } from '../../../src/theme/ThemeContext';

export default function LiveTrackModal() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const deviceId = parseInt(id as string);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LiveTrackingScreen deviceId={deviceId} onClose={() => router.back()} />
    </View>
  );
}
