import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  index: number;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, index }) => {
  return (
    <View style={styles.container}>
      <GlassCard gradient style={styles.card}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: '45%',
  },
  card: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 12,
  },
  value: {
    ...typography.h1,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
