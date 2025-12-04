import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CommandsScreen } from '../../../src/screens/CommandsScreen';
import { colors } from '../../../src/theme/colors';

export default function CommandsModal() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const deviceId = parseInt(id as string);

  return (
    <View style={styles.container}>
      <CommandsScreen deviceId={deviceId} onClose={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
