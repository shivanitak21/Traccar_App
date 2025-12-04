import React from 'react';
import { SettingsScreen } from '../../src/screens/SettingsScreen';
import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../src/theme/colors';
import { useRouter } from 'expo-router';

export default function SettingsTab() {
  const router = useRouter();

  const handleLogout = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <SettingsScreen onLogout={handleLogout} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
