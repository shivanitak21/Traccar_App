import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import {
  LayoutDashboard,
  Navigation,
  Map,
  Bell,
  BarChart3,
  Settings,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { useAuthStore } from '../../src/stores/authStore';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 80 : 64;

export default function TabLayout() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.wrapper}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar.background,
          borderTopColor: colors.tabBar.border,
          borderTopWidth: 0.5,
          height: TAB_BAR_HEIGHT,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          // backdrop blur on iOS
          ...Platform.select({
            ios: {
              position: 'absolute',
            },
          }),
        },
        tabBarActiveTintColor: colors.tabBar.active,
        tabBarInactiveTintColor: colors.tabBar.inactive,
        tabBarLabelStyle: {
          ...typography.tabLabel,
          marginTop: 2,
        },
        tabBarItemStyle: {
          gap: 2,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.tabBarBg]} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => (
            <LayoutDashboard size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Fleet',
          tabBarIcon: ({ size, color }) => (
            <Navigation size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={focused ? styles.mapIconActive : undefined}>
              <Map size={size} color={color} strokeWidth={1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ size, color }) => (
            <Bell size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ size, color }) => (
            <BarChart3 size={size} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} strokeWidth={1.8} />
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
  tabBarBg: {
    backgroundColor: colors.tabBar.background,
    borderTopWidth: 0.5,
    borderTopColor: colors.tabBar.border,
  },
  mapIconActive: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 10,
    padding: 4,
  },
});
