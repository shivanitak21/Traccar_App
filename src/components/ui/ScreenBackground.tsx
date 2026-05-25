import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';
import { colors } from '../../theme/colors';

interface ScreenBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'hero';
}

export const ScreenBackground: React.FC<ScreenBackgroundProps> = ({
  children,
  style,
  variant = 'default',
}) => (
  <View style={[styles.container, style]}>
    <LinearGradient
      colors={
        variant === 'hero'
          ? colors.gradient.darkDeep
          : colors.gradient.dark
      }
      style={StyleSheet.absoluteFill}
    />
    {variant === 'hero' && (
      <View style={styles.heroGlow} pointerEvents="none" />
    )}
    {children}
  </View>
);

interface GlassPanelProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  style,
  intensity = 60,
}) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint="dark" style={[styles.glass, style]}>
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[styles.glass, styles.glassAndroid, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroGlow: {
    position: 'absolute',
    top: -120,
    left: '50%',
    marginLeft: -180,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  glass: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  glassAndroid: {
    backgroundColor: colors.glass.background,
  },
});
