import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapScreen } from '../../src/screens/MapScreen';
import { colors } from '../../src/theme/colors';

export default function MapTab() {
  return (
    <View style={styles.container}>
      <MapScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
