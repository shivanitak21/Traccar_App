import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DashboardScreen } from '../../src/screens/DashboardScreen';
import { colors } from '../../src/theme/colors';

export default function DashboardTab() {
  return (
    <View style={styles.container}>
      <DashboardScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
