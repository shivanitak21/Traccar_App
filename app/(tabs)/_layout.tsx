import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
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
import { radius } from '../../src/theme/radius';

const TAB_BAR_HEIGHT = 62;
const TAB_BAR_FLOAT_GAP = 12;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const hasHydrated = useAuthStore(state => state.hasHydrated);
  const { colors, isDark } = useTheme();

  const tabBarBottom = insets.bottom + TAB_BAR_FLOAT_GAP;
  const tabBarPaddingBottom = Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 10;

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
            left: 16,
            right: 16,
            height: TAB_BAR_HEIGHT,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 28,
            paddingTop: 8,
            paddingBottom: tabBarPaddingBottom,
            borderRadius: radius['2xl'],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0.75 : 0.20,
            shadowRadius: 28,
          },
          tabBarActiveTintColor: colors.tabBar.active,
          tabBarInactiveTintColor: colors.tabBar.inactive,
          tabBarLabelStyle: {
            ...typography.tabLabel,
            marginTop: 4,
          },
          tabBarItemStyle: {
            gap: 2,
          },
          tabBarBackground: () => (
            <View style={[StyleSheet.absoluteFill, { borderRadius: radius['2xl'], overflow: 'hidden', borderWidth: 1, borderColor: colors.border.strong }]}>
              {Platform.OS === 'ios' ? (
                <BlurView
                  intensity={96}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(18, 18, 20, 0.97)' : 'rgba(255,255,255,0.97)' }]} />
              )}
              <View style={[styles.tabBarTopAccent, { backgroundColor: colors.border.focus }]} />
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ size, color, focused }) => (
              <View style={focused ? styles.iconActive : undefined}>
                <LayoutDashboard size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.8} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="devices"
          options={{
            title: 'Vehicles',
            tabBarIcon: ({ size, color, focused }) => (
              <View style={focused ? styles.iconActive : undefined}>
                <Navigation size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.8} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ size, color, focused }) => (
              <View style={[focused && { backgroundColor: colors.accentMuted, borderRadius: 12, padding: 5 }]}>
                <Map size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.8} />
              </View>
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
              <View style={focused ? styles.iconActive : undefined}>
                <BarChart3 size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.8} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ size, color, focused }) => (
              <View style={focused ? styles.iconActive : undefined}>
                <Settings size={size - 2} color={color} strokeWidth={focused ? 2.2 : 1.8} />
              </View>
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
  tabBarTopAccent: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    borderRadius: 1,
  },
  iconActive: {
    transform: [{ scale: 1.05 }],
  },
});
