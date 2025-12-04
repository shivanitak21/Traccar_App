import React from 'react';
import { MapScreen } from '../../src/screens/MapScreen';
import { SafeAreaView, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../src/theme/colors';

export default function MapTab() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <MapScreen />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
  },
});
