import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface ScreenBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'hero';
}

export const ScreenBackground: React.FC<ScreenBackgroundProps> = ({
  children,
  style,
  variant = 'default',
}) => {
  const { colors } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      <LinearGradient
        colors={variant === 'hero' ? colors.gradient.darkDeep : colors.gradient.dark}
        style={StyleSheet.absoluteFill}
      />
      {variant === 'hero' && (
        <View style={styles.heroGlow} pointerEvents="none" />
      )}
      {children}
    </View>
  );
};

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
  const { colors, isDark } = useTheme();

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={[{ overflow: 'hidden', borderWidth: 1, borderColor: colors.glass.border }, style]}
      >
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[
      { overflow: 'hidden', borderWidth: 1, borderColor: colors.glass.border },
      { backgroundColor: colors.glass.background },
      style,
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
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
});
