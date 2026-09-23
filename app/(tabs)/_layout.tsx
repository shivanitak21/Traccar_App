import React from 'react';
import { View, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';
import { BlurView } from 'expo-blur';
import {
  LayoutDashboard,
  Navigation,
  Map,
  BarChart3,
  Settings,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { TAB_BAR_HEIGHT, TAB_BAR_FLOAT_GAP } from '../../src/utils/tabBarInset';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const hasHydrated = useAuthStore(state => state.hasHydrated);
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const sideInset = windowWidth < 360 ? 8 : 16;
  const labelSize = windowWidth < 360 ? 9 : 10;

  const tabBarBottom = insets.bottom + TAB_BAR_FLOAT_GAP;

  if (!hasHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: tabBarBottom,
            left: sideInset,
            right: sideInset,
            height: TAB_BAR_HEIGHT,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 28,
            paddingTop: 6,
            paddingBottom: 8,
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0.75 : 0.20,
            shadowRadius: 28,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabBar.inactive,
          safeAreaInsets: { bottom: 0 },
          tabBarLabelStyle: {
            ...typography.tabLabel,
            fontSize: labelSize,
            marginTop: 2,
          },
          tabBarItemStyle: {
            gap: 2,
            paddingHorizontal: 0,
          },
          tabBarBackground: () => (
            <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.strong }]}>
              {Platform.OS === 'ios' ? (
                <BlurView
                  intensity={96}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(18, 18, 20, 0.97)' : 'rgba(255,255,255,0.97)' }]} />
              )}
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ size, color, focused }) => (
              <LayoutDashboard size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            ),
          }}
        />
        <Tabs.Screen
          name="devices"
          options={{
            title: 'Vehicles',
            tabBarIcon: ({ size, color, focused }) => (
              <Navigation size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ size, color, focused }) => (
              <Map size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            ),
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ size, color, focused }) => (
              <BarChart3 size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ size, color, focused }) => (
              <Settings size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
