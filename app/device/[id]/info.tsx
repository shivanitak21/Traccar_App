import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DeviceInfoScreen } from '../../../src/screens/DeviceInfoScreen';
import { useTheme } from '../../../src/theme/ThemeContext';

export default function DeviceInfoModal() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const deviceId = parseInt(id as string);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DeviceInfoScreen deviceId={deviceId} onClose={() => router.back()} />
    </View>
  );
}
