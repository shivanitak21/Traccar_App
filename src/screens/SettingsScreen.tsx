import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  User,
  Server,
  LogOut,
  ChevronRight,
  Bell,
  Map,
  Moon,
  Shield,
  HelpCircle,
  RefreshCw,
  Wifi,
  Database,
  Info,
  Users,
  Navigation,
  Gauge,
  Ruler,
  Fuel,
} from 'lucide-react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { GlassCard } from '../components/GlassCard';
import { useAuthStore } from '../stores/authStore';
import { usePrefsStore } from '../stores/prefsStore';
import { traccarWS } from '../api/websocket';
import { storage } from '../utils/storage';

interface SettingsScreenProps {
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout }) => {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { user, serverUrl, logout } = useAuthStore();
  const { prefs, initialize: initPrefs, setPref, savePrefs } = usePrefsStore();
  const [wsConnected, setWsConnected] = useState(traccarWS.isConnected);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    initPrefs();
  }, [initPrefs]);

  useEffect(() => {
    const handleConnect = (connected: boolean) => setWsConnected(connected);
    traccarWS.on('connected', handleConnect);
    return () => traccarWS.off('connected', handleConnect);
  }, []);

  const navigateToLogin = () => {
    const go = () => {
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/');
    };

    if (rootNavigationState?.key) {
      go();
      return;
    }

    setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated) return;
      go();
    }, 0);
  };

  const performLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      navigateToLogin();
      onLogout();
    }
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm('Sign out? You will be redirected to the login screen.')
        : true;
      if (confirmed) {
        performLogout();
      }
      return;
    }

    Alert.alert(
      'Sign out',
      'You will be redirected to the login screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const handleSavePrefs = async () => {
    try {
      setSavingPrefs(true);
      await savePrefs();
      Alert.alert('Saved', 'Preferences updated');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const cyclePref = <T extends string>(key: 'distanceUnit' | 'speedUnit' | 'fuelUnit', options: T[]) => {
    const current = prefs[key] as T;
    const idx = options.indexOf(current);
    setPref(key, options[(idx + 1) % options.length] as any);
  };

  const handleReconnectWS = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    traccarWS.disconnect();
    setTimeout(() => traccarWS.connect(), 500);
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0c12', '#0d0f14']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(0).duration(500)}>
            <Text style={styles.screenTitle}>Settings</Text>
          </Animated.View>

          {/* Profile card */}
          <Animated.View entering={FadeInDown.delay(60).duration(500)}>
            <GlassCard variant="elevated" style={styles.profileCard}>
              <LinearGradient
                colors={['rgba(16,185,129,0.08)', 'rgba(59,130,246,0.04)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryLight]}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>{initials}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user?.name || 'Administrator'}</Text>
                  <Text style={styles.profileEmail}>{user?.email || ''}</Text>
                  {user?.administrator && (
                    <View style={styles.adminBadge}>
                      <Shield size={10} color={colors.primary} strokeWidth={2} />
                      <Text style={styles.adminText}>Administrator</Text>
                    </View>
                  )}
                </View>
                <Pressable style={styles.editBtn}>
                  <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={1.8} />
                </Pressable>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Connection section */}
          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <SectionHeader title="Connection" />
            <View style={styles.settingsGroup}>
              <SettingsRow
                icon={<Server size={18} color={colors.blue} strokeWidth={1.8} />}
                label="Server URL"
                value={serverUrl}
                accent={colors.blue}
                onPress={() => {}}
                chevron={false}
              />
              <Separator />
              <SettingsRow
                icon={<Wifi size={18} color={wsConnected ? colors.success : colors.text.tertiary} strokeWidth={1.8} />}
                label="Live connection"
                value={wsConnected ? 'Connected' : 'Disconnected'}
                valueColor={wsConnected ? colors.success : colors.error}
                accent={wsConnected ? colors.success : colors.error}
                onPress={handleReconnectWS}
                chevron
                actionIcon={<RefreshCw size={14} color={colors.text.tertiary} strokeWidth={2} />}
              />
            </View>
          </Animated.View>

          {/* Preferences section */}
          <Animated.View entering={FadeInDown.delay(180).duration(500)}>
            <SectionHeader title="Preferences" />
            <View style={styles.settingsGroup}>
              <SettingsRow
                icon={<Ruler size={18} color={colors.primary} strokeWidth={1.8} />}
                label="Distance unit"
                value={prefs.distanceUnit.toUpperCase()}
                onPress={() => cyclePref('distanceUnit', ['km', 'mi', 'nm'])}
                chevron
              />
              <Separator />
              <SettingsRow
                icon={<Gauge size={18} color={colors.blue} strokeWidth={1.8} />}
                label="Speed unit"
                value={prefs.speedUnit === 'kmh' ? 'KM/H' : prefs.speedUnit === 'mph' ? 'MPH' : 'KN'}
                onPress={() => cyclePref('speedUnit', ['kmh', 'mph', 'kn'])}
                chevron
              />
              <Separator />
              <SettingsRow
                icon={<Fuel size={18} color={colors.accent} strokeWidth={1.8} />}
                label="Fuel unit"
                value={prefs.fuelUnit === 'liters' ? 'Liters' : prefs.fuelUnit === 'us_gallons' ? 'US Gal' : 'Imp Gal'}
                onPress={() => cyclePref('fuelUnit', ['liters', 'us_gallons', 'imp_gallons'])}
                chevron
              />
              <Separator />
              <SettingsToggleRow
                icon={<Moon size={18} color={colors.blue} strokeWidth={1.8} />}
                label="Dark map style"
                value={prefs.darkMap}
                onToggle={v => setPref('darkMap', v)}
              />
              <Separator />
              <SettingsToggleRow
                icon={<Bell size={18} color={colors.accent} strokeWidth={1.8} />}
                label="Push notifications"
                value={notificationsEnabled}
                onToggle={setNotificationsEnabled}
              />
              <Separator />
              <SettingsRow
                icon={<Map size={18} color={colors.primary} strokeWidth={1.8} />}
                label="Save preferences"
                value={savingPrefs ? 'Saving...' : 'Sync to server'}
                onPress={handleSavePrefs}
                chevron
              />
            </View>
          </Animated.View>

          {user?.administrator && (
            <Animated.View entering={FadeInDown.delay(210).duration(500)}>
              <SectionHeader title="Administration" />
              <View style={styles.settingsGroup}>
                <SettingsRow
                  icon={<Navigation size={18} color={colors.primary} strokeWidth={1.8} />}
                  label="Manage vehicles"
                  onPress={() => router.push('/admin/vehicles')}
                  chevron
                />
                <Separator />
                <SettingsRow
                  icon={<User size={18} color={colors.blue} strokeWidth={1.8} />}
                  label="Manage drivers"
                  onPress={() => router.push('/admin/drivers')}
                  chevron
                />
                <Separator />
                <SettingsRow
                  icon={<Users size={18} color={colors.accent} strokeWidth={1.8} />}
                  label="User access"
                  onPress={() => router.push('/admin/users')}
                  chevron
                />
              </View>
            </Animated.View>
          )}

          {/* App section */}
          <Animated.View entering={FadeInDown.delay(240).duration(500)}>
            <SectionHeader title="App" />
            <View style={styles.settingsGroup}>
              <SettingsRow
                icon={<Database size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                label="Clear cache"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert('Cache cleared', 'Local data has been cleared.');
                }}
                chevron
              />
              <Separator />
              <SettingsRow
                icon={<Info size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                label="App version"
                value="1.0.0"
                chevron={false}
              />
              <Separator />
              <SettingsRow
                icon={<HelpCircle size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                label="Help & Support"
                onPress={() => {}}
                chevron
              />
            </View>
          </Animated.View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{ marginBottom: 40 }}>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
            >
              <LogOut size={18} color={colors.error} strokeWidth={1.8} />
              <Text style={styles.logoutText}>Sign out</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text style={sectionStyles.header}>{title}</Text>
);

const sectionStyles = StyleSheet.create({
  header: {
    ...typography.label,
    color: colors.text.tertiary,
    marginBottom: 8,
    marginTop: 24,
    paddingHorizontal: 4,
  },
});

const Separator: React.FC = () => (
  <View style={{ height: 1, backgroundColor: colors.border.subtle, marginHorizontal: 14 }} />
);

const SettingsRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  valueColor?: string;
  accent?: string;
  onPress?: () => void;
  chevron?: boolean;
  actionIcon?: React.ReactNode;
}> = ({ icon, label, value, valueColor, accent, onPress, chevron = true, actionIcon }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [srStyles.row, pressed && onPress && srStyles.pressed]}
    disabled={!onPress}
  >
    <View style={[srStyles.iconWrap, { backgroundColor: accent ? `${accent}14` : colors.backgroundSecondary }]}>
      {icon}
    </View>
    <Text style={srStyles.label}>{label}</Text>
    <View style={srStyles.right}>
      {value && (
        <Text style={[srStyles.value, valueColor ? { color: valueColor } : {}]} numberOfLines={1}>
          {value}
        </Text>
      )}
      {actionIcon}
      {chevron && <ChevronRight size={16} color={colors.text.tertiary} strokeWidth={1.8} />}
    </View>
  </Pressable>
);

const SettingsToggleRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}> = ({ icon, label, value, onToggle }) => (
  <View style={srStyles.row}>
    <View style={[srStyles.iconWrap, { backgroundColor: colors.backgroundSecondary }]}>
      {icon}
    </View>
    <Text style={srStyles.label}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: colors.border.default, true: `${colors.primary}60` }}
      thumbColor={value ? colors.primary : colors.text.tertiary}
    />
  </View>
);

const srStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  pressed: {
    backgroundColor: colors.backgroundSecondary,
    opacity: 0.85,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 160,
  },
  value: {
    ...typography.caption,
    color: colors.text.tertiary,
    flexShrink: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
  },
  screenTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: 20,
  },

  // Profile
  profileCard: {
    padding: 18,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0d0f14',
    letterSpacing: -0.5,
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    ...typography.h4,
    color: colors.text.primary,
  },
  profileEmail: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  adminText: {
    ...typography.tiny,
    color: colors.primary,
    fontWeight: '600',
  },
  editBtn: {
    padding: 4,
  },

  // Settings groups
  settingsGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.errorMuted,
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
  },
  logoutText: {
    ...typography.bodyMd,
    color: colors.error,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
