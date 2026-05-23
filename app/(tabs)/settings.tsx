import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SettingsScreen } from '../../src/screens/SettingsScreen';
import { colors } from '../../src/theme/colors';

export default function SettingsTab() {
  return (
    <View style={styles.container}>
      <SettingsScreen onLogout={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
