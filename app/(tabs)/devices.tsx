import React from 'react';
import { DevicesScreen } from '../../src/screens/DevicesScreen';
import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../src/theme/colors';

export default function DevicesTab() {
  return (
    <SafeAreaView style={styles.container}>
      <DevicesScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
