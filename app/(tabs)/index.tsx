import React from 'react';
import { DashboardScreen } from '../../src/screens/DashboardScreen';
import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../src/theme/colors';

export default function DashboardTab() {
  return (
    <SafeAreaView style={styles.container}>
      <DashboardScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
