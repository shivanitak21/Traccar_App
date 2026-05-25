import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { BlurView } from 'expo-blur';
import {
  LayoutDashboard,
  Navigation,
  Map,
  BarChart3,
  Settings,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { shadows } from '../../src/theme/shadows';
import { radius } from '../../src/theme/radius';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 68;
const TAB_BAR_MARGIN = Platform.OS === 'ios' ? 24 : 16;

export default function TabLayout() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const hasHydrated = useAuthStore(state => state.hasHydrated);

  if (!hasHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.wrapper}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: TAB_BAR_MARGIN,
            left: 16,
            right: 16,
            height: TAB_BAR_HEIGHT,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            paddingTop: 10,
            paddingBottom: Platform.OS === 'ios' ? 26 : 12,
            borderRadius: radius['2xl'],
            ...shadows.float,
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
            Platform.OS === 'ios' ? (
              <BlurView
                intensity={80}
                tint="dark"
                style={[StyleSheet.absoluteFill, styles.tabBarBg]}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.tabBarBg, styles.tabBarBgAndroid]} />
            )
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
              <View style={focused ? styles.mapIconActive : undefined}>
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
    backgroundColor: colors.background,
  },
  tabBarBg: {
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.tabBar.border,
  },
  tabBarBgAndroid: {
    backgroundColor: colors.tabBar.background,
  },
  iconActive: {
    transform: [{ scale: 1.05 }],
  },
  mapIconActive: {
    backgroundColor: colors.accentMuted,
    borderRadius: 12,
    padding: 5,
  },
});
