import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RouteHistoryScreen } from '../../../src/screens/RouteHistoryScreen';
import { colors } from '../../../src/theme/colors';

export default function RouteHistoryModal() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const deviceId = parseInt(id as string);

  return (
    <View style={styles.container}>
      <RouteHistoryScreen deviceId={deviceId} onClose={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
