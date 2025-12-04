import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradient?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, gradient = false }) => {
  if (gradient) {
    return (
      <LinearGradient
        colors={['rgba(0, 243, 255, 0.1)', 'rgba(255, 0, 255, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, style]}
      >
        <View style={styles.border}>{children}</View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.card, styles.glass, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  glass: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  border: {
    flex: 1,
    padding: 16,
  },
});
