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
  useWindowDimensions,
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
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ListRow } from '../components/ui/ListRow';
import { useAuthStore } from '../stores/authStore';
import { usePrefsStore } from '../stores/prefsStore';
import { elevaticsWS } from '../api/websocket';
import { useTabBarBottomInset } from '../utils/tabBarInset';
import type { ThemeMode } from '../theme/themes';

interface SettingsScreenProps {
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout }) => {
  const router = useRouter();
  const { user, serverUrl, logout } = useAuthStore();
  const { prefs, initialize: initPrefs, setPref, savePrefs } = usePrefsStore();
  const { colors, themeMode, setThemeMode } = useTheme();
  const tabBarInset = useTabBarBottomInset();
  const { width: windowWidth } = useWindowDimensions();
  const screenPad = windowWidth < 360 ? 16 : spacing.screenPadding;
  const styles = useMemo(() => makeStyles(colors, screenPad), [colors, screenPad]);
  const [wsConnected, setWsConnected] = useState(elevaticsWS.isConnected);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => { initPrefs(); }, [initPrefs]);

  useEffect(() => {
    const handleConnect = (connected: boolean) => setWsConnected(connected);
    elevaticsWS.on('connected', handleConnect);
    return () => elevaticsWS.off('connected', handleConnect);
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
    elevaticsWS.disconnect();
    setTimeout(() => elevaticsWS.connect(), 500);
  };

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const rowRight = (value: string, valueColor?: string) => (
    <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
      {value}
    </Text>
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarInset }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(0).duration(500)}>
            <ScreenHeader title="Settings" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(500)}>
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName} numberOfLines={1}>{user?.name || 'Administrator'}</Text>
                  <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || ''}</Text>
                  {user?.administrator && (
                    <View style={styles.adminBadge}>
                      <Shield size={10} color={colors.primary} strokeWidth={2} />
                      <Text style={styles.adminText}>Administrator</Text>
                    </View>
                  )}
                </View>
                <Pressable style={styles.editBtn} accessibilityRole="button" accessibilityLabel="Edit profile">
                  <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={1.8} />
                </Pressable>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <SectionLabel title="Connection" colors={colors} />
            <View style={styles.group}>
              <ListRow
                grouped
                divider
                title="Server URL"
                left={<Server size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                right={rowRight(serverUrl || '')}
                showChevron={false}
              />
              <ListRow
                grouped
                title="Live connection"
                left={<Wifi size={18} color={wsConnected ? colors.success : colors.text.tertiary} strokeWidth={1.8} />}
                right={
                  <View style={styles.rightCluster}>
                    {rowRight(wsConnected ? 'Connected' : 'Disconnected', wsConnected ? colors.success : colors.error)}
                    <RefreshCw size={14} color={colors.text.tertiary} strokeWidth={2} />
                  </View>
                }
                onPress={handleReconnectWS}
                accessibilityLabel="Reconnect live connection"
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <SectionLabel title="Appearance" colors={colors} />
            <View style={styles.group}>
              <ListRow
                grouped
                title="Theme"
                left={<ThemeIcon size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                right={rowRight(themeLabel)}
                onPress={cycleTheme}
                accessibilityLabel={`Theme, ${themeLabel}`}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(500)}>
            <SectionLabel title="Preferences" colors={colors} />
            <View style={styles.group}>
              <ListRow
                grouped
                divider
                title="Distance unit"
                left={<Ruler size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                right={rowRight(prefs.distanceUnit.toUpperCase())}
                onPress={() => cyclePref('distanceUnit', ['km', 'mi', 'nm'])}
                accessibilityLabel="Distance unit"
              />
              <ListRow
                grouped
                divider
                title="Speed unit"
                left={<Gauge size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                right={rowRight(prefs.speedUnit === 'kmh' ? 'KM/H' : prefs.speedUnit === 'mph' ? 'MPH' : 'KN')}
                onPress={() => cyclePref('speedUnit', ['kmh', 'mph', 'kn'])}
                accessibilityLabel="Speed unit"
              />
              <ListRow
                grouped
                divider
                title="Fuel unit"
                left={<Fuel size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                right={rowRight(prefs.fuelUnit === 'liters' ? 'Liters' : prefs.fuelUnit === 'us_gallons' ? 'US Gal' : 'Imp Gal')}
                onPress={() => cyclePref('fuelUnit', ['liters', 'us_gallons', 'imp_gallons'])}
                accessibilityLabel="Fuel unit"
              />
              <ListRow
                grouped
                divider
                title="Push notifications"
                left={<Bell size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                right={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: colors.border.default, true: `${colors.primary}60` }}
                    thumbColor={notificationsEnabled ? colors.primary : colors.text.tertiary}
                    accessibilityLabel="Push notifications"
                  />
                }
                showChevron={false}
              />
              <ListRow
                grouped
                title="Save preferences"
                left={<Map size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                right={rowRight(savingPrefs ? 'Saving...' : 'Sync to server')}
                onPress={handleSavePrefs}
                accessibilityLabel="Save preferences"
              />
            </View>
          </Animated.View>

          {user?.administrator && (
            <Animated.View entering={FadeInDown.delay(210).duration(500)}>
              <SectionLabel title="Administration" colors={colors} />
              <View style={styles.group}>
                <ListRow
                  grouped
                  divider
                  title="Manage vehicles"
                  left={<Navigation size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                  onPress={() => router.push('/admin/vehicles')}
                  accessibilityLabel="Manage vehicles"
                />
                <ListRow
                  grouped
                  divider
                  title="Manage drivers"
                  left={<User size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                  onPress={() => router.push('/admin/drivers')}
                  accessibilityLabel="Manage drivers"
                />
                <ListRow
                  grouped
                  title="User access"
                  left={<Users size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                  onPress={() => router.push('/admin/users')}
                  accessibilityLabel="User access"
                />
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(240).duration(500)}>
            <SectionLabel title="App" colors={colors} />
            <View style={styles.group}>
              <ListRow
                grouped
                divider
                title="Clear cache"
                left={<Database size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert('Cache cleared', 'Local data has been cleared.');
                }}
                accessibilityLabel="Clear cache"
              />
              <ListRow
                grouped
                divider
                title="App version"
                left={<Info size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                right={rowRight('1.0.0')}
                showChevron={false}
              />
              <ListRow
                grouped
                title="Help & Support"
                left={<HelpCircle size={18} color={colors.text.secondary} strokeWidth={1.8} />}
                onPress={() => {}}
                accessibilityLabel="Help and support"
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Pressable
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
            >
              <LogOut size={18} color={colors.error} strokeWidth={1.8} />
              <Text style={styles.logoutText}>Sign out</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
};

type ThemeColors = ReturnType<typeof useTheme>['colors'];

const SectionLabel: React.FC<{ title: string; colors: ThemeColors }> = ({ title, colors }) => (
  <Text style={{ ...typography.sectionLabel, color: colors.text.tertiary, marginBottom: 8, marginTop: 24, paddingHorizontal: 4, letterSpacing: 0.6 }}>{title}</Text>
);

const makeStyles = (colors: ThemeColors, screenPad: number) => StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: screenPad },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 16,
    overflow: 'hidden',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.4 },
  profileInfo: { flex: 1, minWidth: 0, gap: 2 },
  profileName: { ...typography.h4, color: colors.text.primary },
  profileEmail: { ...typography.caption, color: colors.text.tertiary },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start', marginTop: 4 },
  adminText: { ...typography.tiny, color: colors.primary, fontWeight: '600' },
  editBtn: { padding: 4 },
  group: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  rowValue: { ...typography.caption, color: colors.text.tertiary, flexShrink: 1 },
  rightCluster: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginTop: 28, borderWidth: 1, borderColor: colors.border.alert },
  logoutText: { ...typography.bodyMd, color: colors.error, fontWeight: '600' },
  pressed: { opacity: 0.8 },
});
