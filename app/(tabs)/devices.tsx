import React from 'react';
import { SafeAreaView } from 'react-native';
import { DevicesScreen } from '../../src/screens/DevicesScreen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function DevicesTab() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <DevicesScreen />
    </SafeAreaView>
  );
}
