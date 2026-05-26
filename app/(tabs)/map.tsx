import React from 'react';
import { View } from 'react-native';
import { MapScreen } from '../../src/screens/MapScreen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function MapTab() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MapScreen />
    </View>
  );
}
