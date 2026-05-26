import React, { useEffect, useState, useMemo } from 'react';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  User,
  Server,
  LogOut,
  ChevronRight,
  Bell,
  Map,
  Moon,
  Sun,
  Smartphone,
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
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { GlassCard } from '../components/GlassCard';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useAuthStore } from '../stores/authStore';
import { usePrefsStore } from '../stores/prefsStore';
import { traccarWS } from '../api/websocket';
import type { ThemeMode } from '../theme/themes';

interface SettingsScreenProps {
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout }) => {
  const router = useRouter();
  const { user, serverUrl, logout } = useAuthStore();
  const { prefs, initialize: initPrefs, setPref, savePrefs } = usePrefsStore();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [wsConnected, setWsConnected] = useState(traccarWS.isConnected);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => { initPrefs(); }, [initPrefs]);

  useEffect(() => {
    const handleConnect = (connected: boolean) => setWsConnected(connected);
    traccarWS.on('connected', handleConnect);
    return () => traccarWS.off('connected', handleConnect);
  }, []);

  const performLogout = () => { void logout(); onLogout(); };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Sign out? You will be redirected to the login screen.') : true;
      if (confirmed) performLogout();
      return;
    }
    Alert.alert('Sign out', 'You will be redirected to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: performLogout },
    ]);
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

  const cycleTheme = () => {
    const options: ThemeMode[] = ['light', 'dark', 'system'];
    const idx = options.indexOf(themeMode);
    setThemeMode(options[(idx + 1) % options.length]);
  };

  const themeLabel = themeMode === 'light' ? 'Light' : themeMode === 'dark' ? 'Dark' : 'System';
  const ThemeIcon = themeMode === 'light' ? Sun : themeMode === 'dark' ? Moon : Smartphone;

  const handleReconnectWS = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    traccarWS.disconnect();
    setTimeout(() => traccarWS.connect(), 500);
  };

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(0).duration(500)}>
            <ScreenHeader title="Settings" />
          </Animated.View>

          {/* Profile card */}
          <Animated.View entering={FadeInDown.delay(60).duration(500)}>
            <GlassCard variant="elevated" style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
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
            <SectionLabel title="Connection" colors={colors} />
            <View style={styles.settingsGroup}>
              <SettingsRow colors={colors} icon={<Server size={18} color={colors.blue} strokeWidth={1.8} />} label="Server URL" value={serverUrl} accent={colors.blue} onPress={() => {}} chevron={false} />
              <Separator colors={colors} />
              <SettingsRow colors={colors} icon={<Wifi size={18} color={wsConnected ? colors.success : colors.text.tertiary} strokeWidth={1.8} />} label="Live connection" value={wsConnected ? 'Connected' : 'Disconnected'} valueColor={wsConnected ? colors.success : colors.error} accent={wsConnected ? colors.success : colors.error} onPress={handleReconnectWS} chevron actionIcon={<RefreshCw size={14} color={colors.text.tertiary} strokeWidth={2} />} />
            </View>
          </Animated.View>

          {/* Appearance section */}
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <SectionLabel title="Appearance" colors={colors} />
            <View style={styles.settingsGroup}>
              <SettingsRow colors={colors} icon={<ThemeIcon size={18} color={colors.blue} strokeWidth={1.8} />} label="Theme" value={themeLabel} onPress={cycleTheme} chevron />
            </View>
          </Animated.View>

          {/* Preferences section */}
          <Animated.View entering={FadeInDown.delay(180).duration(500)}>
            <SectionLabel title="Preferences" colors={colors} />
            <View style={styles.settingsGroup}>
              <SettingsRow colors={colors} icon={<Ruler size={18} color={colors.primary} strokeWidth={1.8} />} label="Distance unit" value={prefs.distanceUnit.toUpperCase()} onPress={() => cyclePref('distanceUnit', ['km', 'mi', 'nm'])} chevron />
              <Separator colors={colors} />
              <SettingsRow colors={colors} icon={<Gauge size={18} color={colors.blue} strokeWidth={1.8} />} label="Speed unit" value={prefs.speedUnit === 'kmh' ? 'KM/H' : prefs.speedUnit === 'mph' ? 'MPH' : 'KN'} onPress={() => cyclePref('speedUnit', ['kmh', 'mph', 'kn'])} chevron />
              <Separator colors={colors} />
              <SettingsRow colors={colors} icon={<Fuel size={18} color={colors.accent} strokeWidth={1.8} />} label="Fuel unit" value={prefs.fuelUnit === 'liters' ? 'Liters' : prefs.fuelUnit === 'us_gallons' ? 'US Gal' : 'Imp Gal'} onPress={() => cyclePref('fuelUnit', ['liters', 'us_gallons', 'imp_gallons'])} chevron />
              <Separator colors={colors} />
              <SettingsToggleRow colors={colors} icon={<Bell size={18} color={colors.accent} strokeWidth={1.8} />} label="Push notifications" value={notificationsEnabled} onToggle={setNotificationsEnabled} />
              <Separator colors={colors} />
              <SettingsRow colors={colors} icon={<Map size={18} color={colors.primary} strokeWidth={1.8} />} label="Save preferences" value={savingPrefs ? 'Saving...' : 'Sync to server'} onPress={handleSavePrefs} chevron />
            </View>
          </Animated.View>

          {user?.administrator && (
            <Animated.View entering={FadeInDown.delay(210).duration(500)}>
              <SectionLabel title="Administration" colors={colors} />
              <View style={styles.settingsGroup}>
                <SettingsRow colors={colors} icon={<Navigation size={18} color={colors.primary} strokeWidth={1.8} />} label="Manage vehicles" onPress={() => router.push('/admin/vehicles')} chevron />
                <Separator colors={colors} />
                <SettingsRow colors={colors} icon={<User size={18} color={colors.blue} strokeWidth={1.8} />} label="Manage drivers" onPress={() => router.push('/admin/drivers')} chevron />
                <Separator colors={colors} />
                <SettingsRow colors={colors} icon={<Users size={18} color={colors.accent} strokeWidth={1.8} />} label="User access" onPress={() => router.push('/admin/users')} chevron />
              </View>
            </Animated.View>
          )}

          {/* App section */}
          <Animated.View entering={FadeInDown.delay(240).duration(500)}>
            <SectionLabel title="App" colors={colors} />
            <View style={styles.settingsGroup}>
              <SettingsRow colors={colors} icon={<Database size={18} color={colors.text.secondary} strokeWidth={1.8} />} label="Clear cache" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); Alert.alert('Cache cleared', 'Local data has been cleared.'); }} chevron />
              <Separator colors={colors} />
              <SettingsRow colors={colors} icon={<Info size={18} color={colors.text.secondary} strokeWidth={1.8} />} label="App version" value="1.0.0" chevron={false} />
              <Separator colors={colors} />
              <SettingsRow colors={colors} icon={<HelpCircle size={18} color={colors.text.secondary} strokeWidth={1.8} />} label="Help & Support" onPress={() => {}} chevron />
            </View>
          </Animated.View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{ marginBottom: 120 }}>
            <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}>
              <LogOut size={18} color={colors.error} strokeWidth={1.8} />
              <Text style={styles.logoutText}>Sign out</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

type ThemeColors = ReturnType<typeof useTheme>['colors'];

const SectionLabel: React.FC<{ title: string; colors: ThemeColors }> = ({ title, colors }) => (
  <Text style={{ ...typography.sectionLabel, color: colors.text.tertiary, marginBottom: 8, marginTop: 28, paddingHorizontal: 4 }}>{title}</Text>
);

const Separator: React.FC<{ colors: ThemeColors }> = ({ colors }) => (
  <View style={{ height: 1, backgroundColor: colors.border.subtle, marginHorizontal: 14 }} />
);

const SettingsRow: React.FC<{
  colors: ThemeColors;
  icon: React.ReactNode;
  label: string;
  value?: string;
  valueColor?: string;
  accent?: string;
  onPress?: () => void;
  chevron?: boolean;
  actionIcon?: React.ReactNode;
}> = ({ colors, icon, label, value, valueColor, accent, onPress, chevron = true, actionIcon }) => {
  const styles = useMemo(() => makeRowStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]} disabled={!onPress}>
      <View style={[styles.iconWrap, { backgroundColor: accent ? `${accent}14` : colors.backgroundSecondary }]}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.right}>
        {value && <Text style={[styles.value, valueColor ? { color: valueColor } : {}]} numberOfLines={1}>{value}</Text>}
        {actionIcon}
        {chevron && <ChevronRight size={16} color={colors.text.tertiary} strokeWidth={1.8} />}
      </View>
    </Pressable>
  );
};

const SettingsToggleRow: React.FC<{
  colors: ThemeColors;
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}> = ({ colors, icon, label, value, onToggle }) => {
  const styles = useMemo(() => makeRowStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: colors.backgroundSecondary }]}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: colors.border.default, true: `${colors.primary}60` }} thumbColor={value ? colors.primary : colors.text.tertiary} />
    </View>
  );
};

const makeRowStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  pressed: { backgroundColor: colors.backgroundSecondary, opacity: 0.85 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.body, color: colors.text.primary, flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 160 },
  value: { ...typography.caption, color: colors.text.tertiary, flexShrink: 1 },
});

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.screenPadding },
  profileCard: { padding: 20, overflow: 'hidden' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: radius.control, overflow: 'hidden', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border.subtle, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5 },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { ...typography.h4, color: colors.text.primary },
  profileEmail: { ...typography.caption, color: colors.text.tertiary },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accentMuted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start', marginTop: 2 },
  adminText: { ...typography.tiny, color: colors.text.secondary, fontWeight: '600' },
  editBtn: { padding: 4 },
  settingsGroup: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.subtle, overflow: 'hidden' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.card, padding: 18, marginTop: 28, borderWidth: 1, borderColor: colors.border.alert },
  logoutText: { ...typography.bodyMd, color: colors.error, fontWeight: '600' },
  pressed: { opacity: 0.8 },
});
