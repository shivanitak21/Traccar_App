import React from 'react';
import { View } from 'react-native';
import { SettingsScreen } from '../../src/screens/SettingsScreen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function SettingsTab() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SettingsScreen onLogout={() => {}} />
    </View>
  );
}
