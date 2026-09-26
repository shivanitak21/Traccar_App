import React from 'react';
import { View } from 'react-native';
import { DashboardScreen } from '../../src/screens/DashboardScreen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function DashboardTab() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DashboardScreen />
    </View>
  );
}
