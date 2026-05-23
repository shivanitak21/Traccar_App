import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Activity,
  TrendingUp,
  MapPin,
  Bell,
  ChevronRight,
  Navigation,
  Zap,
  Clock,
  Wifi,
  WifiOff,
  X,
  User,
  Users,
  Shield,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/ui/StatusChip';
import { FleetStatsStrip } from '../components/ui/MetricCard';
import { DeviceCardSkeleton } from '../components/ui/SkeletonLoader';
import { WebMapView } from '../components/WebMapView';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { useFleetStore } from '../stores/fleetStore';
import { usePrefsStore } from '../stores/prefsStore';
import { useCompanionStore } from '../stores/companionStore';
import { useAuthStore } from '../stores/authStore';
import { formatSpeed, type SpeedUnit } from '../utils/units';
import { reverseGeocode } from '../utils/geocoding';

const DEFAULT_MAP_CENTER = { latitude: 20.5937, longitude: 78.9629 };

export const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const {
    devices,
    wsConnected,
    setDevices,
    updateDevices,
    updatePositions,
    addEvents,
    setWsConnected,
    updateDeviceAddress,
    getFleetStats,
  } = useFleetStore();
  const { prefs } = usePrefsStore();
  const openCompanion = useCompanionStore(state => state.open);
  const user = useAuthStore(state => state.user);
  const isAdmin = !!user?.administrator;

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  // WS status pulse animation
  const wsPulse = useSharedValue(1);
  React.useEffect(() => {
    if (wsConnected) {
      wsPulse.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1
      );
    } else {
      wsPulse.value = 1;
    }
  }, [wsConnected]);

  const wsPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wsPulse.value }],
  }));

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [devicesData, positionsData] = await Promise.all([
        traccarAPI.getDevices(),
        traccarAPI.getPositions(),
      ]);

      updatePositions(positionsData);
      setDevices(devicesData);

      // Enrich addresses in background (non-blocking)
      positionsData.forEach(async (pos) => {
        if (!pos.address) {
          const addr = await reverseGeocode(pos.latitude, pos.longitude);
          if (addr) updateDeviceAddress(pos.deviceId, addr);
        } else {
          updateDeviceAddress(pos.deviceId, pos.address);
        }
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    traccarWS.connect();

    const handleConnected = (connected: boolean) => setWsConnected(connected);
    const handleDevices = (d: TraccarDevice[]) => updateDevices(d);
    const handlePositions = (p: TraccarPosition[]) => updatePositions(p);
    const handleEvents = (e: any[]) => addEvents(e);

    traccarWS.on('connected', handleConnected);
    traccarWS.on('devices', handleDevices);
    traccarWS.on('positions', handlePositions);
    traccarWS.on('events', handleEvents);

    return () => {
      traccarWS.off('connected', handleConnected);
      traccarWS.off('devices', handleDevices);
      traccarWS.off('positions', handlePositions);
      traccarWS.off('events', handleEvents);
    };
  }, []);

  const stats = getFleetStats();
  const recentDevices = devices.slice(0, 5);
  const selectedDevice = selectedDeviceId
    ? devices.find(d => d.id === selectedDeviceId)
    : null;

  const mapMarkers = useMemo(() => {
    return devices
      .filter(d => d.position?.latitude && d.position?.longitude)
      .map(d => ({
        id: `vehicle-${d.id}`,
        latitude: d.position!.latitude,
        longitude: d.position!.longitude,
        title: d.name,
        description: d.isMoving
          ? formatSpeed(d.position!.speed, prefs.speedUnit)
          : d.computedStatus === 'online' ? 'Idle' : 'Offline',
        color: d.isMoving ? colors.blue : d.computedStatus === 'online' ? colors.success : colors.error,
        status: d.isMoving ? 'moving' : d.computedStatus === 'online' ? 'online' : 'offline',
        course: d.position!.course || 0,
      }));
  }, [devices, prefs.speedUnit]);

  const mapCenter = useMemo(() => {
    if (selectedDevice?.position) {
      return { latitude: selectedDevice.position.latitude, longitude: selectedDevice.position.longitude };
    }
    if (mapMarkers.length > 0) {
      return { latitude: mapMarkers[0].latitude, longitude: mapMarkers[0].longitude };
    }
    return DEFAULT_MAP_CENTER;
  }, [selectedDevice, mapMarkers]);

  const mapZoom = mapMarkers.length > 0 ? 11 : 5;
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0c12', '#0d0f14']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surface}
            />
          }
        >
          {/* ── Header ────────────────────────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.delay(0).duration(500)}
            style={styles.header}
          >
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.headerTitle}>Fleet Overview</Text>
            </View>

            <View style={styles.headerRight}>
              {/* WS connection indicator */}
              <Pressable
                style={styles.wsIndicator}
                onPress={() => router.push('/(tabs)/map' as any)}
              >
                <View style={styles.wsIconWrap}>
                  <Animated.View style={[styles.wsPulseRing, wsPulseStyle, {
                    backgroundColor: wsConnected ? 'rgba(16,185,129,0.15)' : 'transparent',
                  }]} />
                  {wsConnected
                    ? <Wifi size={14} color={colors.success} strokeWidth={2} />
                    : <WifiOff size={14} color={colors.text.tertiary} strokeWidth={2} />
                  }
                </View>
              </Pressable>

              {/* Alerts bell */}
              <Pressable
                style={styles.bellButton}
                onPress={() => router.push('/(tabs)/alerts' as any)}
              >
                <Bell size={20} color={colors.text.secondary} strokeWidth={1.8} />
                <View style={styles.bellDot} />
              </Pressable>
            </View>
          </Animated.View>

          {/* ── Fleet Stats Strip ─────────────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.delay(80).duration(500)}
            style={styles.section}
          >
            {loading ? (
              <View style={styles.statsSkeletonRow}>
                {[1, 2, 3, 4].map(i => (
                  <View key={i} style={styles.statSkeletonItem} />
                ))}
              </View>
            ) : (
              <FleetStatsStrip
                total={stats.total}
                online={stats.online}
                moving={stats.moving}
                idle={stats.idle}
              />
            )}
          </Animated.View>

          {/* ── Fleet Map ─────────────────────────────────────────────────── */}
          {!loading && stats.total > 0 && (
            <Animated.View
              entering={FadeInDown.delay(120).duration(500)}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>Live Fleet Map</Text>
              <View style={styles.mapWrap}>
                <WebMapView
                  markers={mapMarkers}
                  center={mapCenter}
                  zoom={mapZoom}
                  onMarkerPress={(markerId) => {
                    const deviceId = parseInt(markerId.replace('vehicle-', ''), 10);
                    if (!isNaN(deviceId)) {
                      const device = devices.find(d => d.id === deviceId);
                      if (device) {
                        setSelectedDeviceId(deviceId);
                        openCompanion(device.id, device.name);
                      }
                    }
                  }}
                  style={styles.map}
                />
                {selectedDevice?.position && (
                  <View style={styles.mapDetailOverlay}>
                    <GlassCard style={styles.mapDetailCard}>
                      <View style={styles.mapDetailHeader}>
                        <View style={styles.mapDetailInfo}>
                          <Text style={styles.mapDetailName}>{selectedDevice.name}</Text>
                          <Text style={styles.mapDetailSpeed}>
                            {formatSpeed(selectedDevice.position.speed, prefs.speedUnit)}
                          </Text>
                        </View>
                        <Pressable onPress={() => setSelectedDeviceId(null)} hitSlop={8}>
                          <X size={18} color={colors.text.secondary} />
                        </Pressable>
                      </View>
                      <Text style={styles.mapDetailMeta} numberOfLines={2}>
                        {selectedDevice.address || selectedDevice.uniqueId}
                      </Text>
                      <Text style={styles.mapDetailMeta}>
                        Last update: {new Date(selectedDevice.position.fixTime).toLocaleTimeString()}
                      </Text>
                      <Pressable
                        style={styles.trackBtn}
                        onPress={() => openCompanion(selectedDevice.id, selectedDevice.name)}
                      >
                        <Text style={styles.trackBtnText}>Ask AI</Text>
                        <ChevronRight size={14} color={colors.primary} />
                      </Pressable>
                      <Pressable
                        style={styles.trackBtn}
                        onPress={() => router.push(`/device/${selectedDevice.id}/live-track` as any)}
                      >
                        <Text style={styles.trackBtnText}>Live Track</Text>
                        <ChevronRight size={14} color={colors.primary} />
                      </Pressable>
                    </GlassCard>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* ── Quick Actions ─────────────────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.delay(140).duration(500)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.quickActionsGrid}>
              <QuickActionCard
                icon={<Navigation size={22} color={colors.primary} strokeWidth={1.8} />}
                label="Live Map"
                accent={colors.primary}
                onPress={() => router.push('/(tabs)/map' as any)}
              />
              <QuickActionCard
                icon={<Navigation size={22} color={colors.blue} strokeWidth={1.8} />}
                label="Vehicles"
                accent={colors.blue}
                onPress={() => router.push('/(tabs)/devices' as any)}
              />
              <QuickActionCard
                icon={<Activity size={22} color={colors.accent} strokeWidth={1.8} />}
                label="Reports"
                accent={colors.accent}
                onPress={() => router.push('/(tabs)/reports' as any)}
              />
              <QuickActionCard
                icon={<Bell size={22} color={colors.error} strokeWidth={1.8} />}
                label="Alerts"
                accent={colors.error}
                onPress={() => router.push('/(tabs)/alerts' as any)}
              />
            </View>
          </Animated.View>

          {isAdmin && (
            <Animated.View
              entering={FadeInDown.delay(170).duration(500)}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>Administration</Text>
              <View style={styles.quickActionsGrid}>
                <QuickActionCard
                  icon={<Navigation size={22} color={colors.primary} strokeWidth={1.8} />}
                  label="Manage Vehicles"
                  accent={colors.primary}
                  onPress={() => router.push('/admin/vehicles')}
                />
                <QuickActionCard
                  icon={<User size={22} color={colors.blue} strokeWidth={1.8} />}
                  label="Drivers"
                  accent={colors.blue}
                  onPress={() => router.push('/admin/drivers')}
                />
                <QuickActionCard
                  icon={<Users size={22} color={colors.accent} strokeWidth={1.8} />}
                  label="User Access"
                  accent={colors.accent}
                  onPress={() => router.push('/admin/users')}
                />
                <QuickActionCard
                  icon={<Shield size={22} color={colors.error} strokeWidth={1.8} />}
                  label="Settings"
                  accent={colors.error}
                  onPress={() => router.push('/(tabs)/settings')}
                />
              </View>
            </Animated.View>
          )}

          {/* ── Recent Vehicles ───────────────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Vehicles</Text>
              <Pressable
                style={styles.seeAll}
                onPress={() => router.push('/(tabs)/devices' as any)}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <ChevronRight size={14} color={colors.primary} strokeWidth={2} />
              </Pressable>
            </View>

            {loading ? (
              <>
                <DeviceCardSkeleton />
                <DeviceCardSkeleton />
                <DeviceCardSkeleton />
              </>
            ) : recentDevices.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Navigation size={36} color={colors.text.tertiary} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No vehicles found</Text>
                <Text style={styles.emptySubtitle}>
                  Connect your Traccar server to see your fleet
                </Text>
              </GlassCard>
            ) : (
              recentDevices.map((device, idx) => (
                <Animated.View
                  key={device.id}
                  entering={FadeInDown.delay(idx * 60).duration(400)}
                >
                  <DashboardVehicleRow
                    device={device}
                    speedUnit={prefs.speedUnit}
                    onPress={() => openCompanion(device.id, device.name)}
                  />
                </Animated.View>
              ))
            )}
          </Animated.View>

          {/* ── Activity Summary ──────────────────────────────────────────── */}
          {!loading && stats.total > 0 && (
            <Animated.View
              entering={FadeInDown.delay(280).duration(500)}
              style={[styles.section, { marginBottom: 32 }]}
            >
              <Text style={styles.sectionTitle}>Activity Today</Text>
              <View style={styles.activityGrid}>
                <ActivityTile
                  icon={<TrendingUp size={18} color={colors.primary} strokeWidth={1.8} />}
                  label="Distance"
                  value="—"
                  unit={prefs.distanceUnit === 'mi' ? 'mi' : prefs.distanceUnit === 'nm' ? 'nm' : 'km'}
                />
                <ActivityTile
                  icon={<Clock size={18} color={colors.accent} strokeWidth={1.8} />}
                  label="Drive Time"
                  value="—"
                  unit="hrs"
                />
                <ActivityTile
                  icon={<Zap size={18} color={colors.blue} strokeWidth={1.8} />}
                  label="Fuel Used"
                  value="—"
                  unit={prefs.fuelUnit === 'liters' ? 'L' : 'gal'}
                />
                <ActivityTile
                  icon={<MapPin size={18} color={colors.error} strokeWidth={1.8} />}
                  label="Alerts"
                  value={String(useFleetStore.getState().recentEvents.length)}
                  unit=""
                />
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const QuickActionCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  accent: string;
  onPress: () => void;
}> = ({ icon, label, accent, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [qaStyles.card, pressed && qaStyles.pressed]}
  >
    <View style={[qaStyles.iconWrap, { backgroundColor: `${accent}18` }]}>
      {icon}
    </View>
    <Text style={qaStyles.label}>{label}</Text>
  </Pressable>
);

const qaStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 10,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.smallMd,
    color: colors.text.secondary,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
});

const DashboardVehicleRow: React.FC<{
  device: any;
  speedUnit: SpeedUnit;
  onPress: () => void;
}> = ({ device, speedUnit, onPress }) => {
  const statusVariant = device.isMoving ? 'moving'
    : device.computedStatus === 'online' ? 'idle'
    : 'offline';

  const statusLabel = device.isMoving ? 'Moving'
    : device.computedStatus === 'online' ? 'Idle'
    : 'Offline';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [dvStyles.row, pressed && dvStyles.pressed]}
    >
      {/* Status indicator line */}
      <View style={[dvStyles.statusBar, {
        backgroundColor: device.isMoving ? colors.blue
          : device.computedStatus === 'online' ? colors.success
          : colors.text.tertiary,
      }]} />

      <View style={dvStyles.iconWrap}>
        <Navigation size={20} color={colors.text.tertiary} strokeWidth={1.6} />
      </View>

      <View style={dvStyles.info}>
        <Text style={dvStyles.name} numberOfLines={1}>{device.name}</Text>
        {device.address ? (
          <View style={dvStyles.locationRow}>
            <MapPin size={11} color={colors.text.tertiary} strokeWidth={2} />
            <Text style={dvStyles.address} numberOfLines={1}>{device.address}</Text>
          </View>
        ) : (
          <Text style={dvStyles.id}>{device.uniqueId}</Text>
        )}
      </View>

      <View style={dvStyles.right}>
        <StatusChip label={statusLabel} variant={statusVariant} size="sm" />
        {device.position && device.position.speed > 0 && (
          <Text style={dvStyles.speed}>
            {formatSpeed(device.position.speed, speedUnit)}
          </Text>
        )}
      </View>

      <ChevronRight size={16} color={colors.text.tertiary} strokeWidth={1.8} />
    </Pressable>
  );
};

const dvStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 12,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  statusBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  address: {
    ...typography.small,
    color: colors.text.tertiary,
    flex: 1,
  },
  id: {
    ...typography.small,
    color: colors.text.tertiary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  speed: {
    ...typography.tiny,
    color: colors.text.tertiary,
    fontVariant: ['tabular-nums'],
  },
});

const ActivityTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}> = ({ icon, label, value, unit }) => (
  <View style={atStyles.tile}>
    <View style={atStyles.header}>
      {icon}
      <Text style={atStyles.label}>{label}</Text>
    </View>
    <View style={atStyles.valueRow}>
      <Text style={atStyles.value}>{value}</Text>
      {unit ? <Text style={atStyles.unit}>{unit}</Text> : null}
    </View>
  </View>
);

const atStyles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    ...typography.tiny,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  value: {
    ...typography.metricSm,
    color: colors.text.primary,
    fontSize: 20,
  },
  unit: {
    ...typography.small,
    color: colors.text.tertiary,
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
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerLeft: {
    gap: 2,
  },
  greeting: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wsIndicator: {
    padding: 4,
  },
  wsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    position: 'relative',
  },
  wsPulseRing: {
    position: 'absolute',
    inset: -3,
    borderRadius: 13,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: 12,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 12,
  },
  seeAllText: {
    ...typography.caption,
    color: colors.primary,
  },

  // Quick actions
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },

  // Activity grid
  activityGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },

  // Fleet map
  mapWrap: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapDetailOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  mapDetailCard: {
    padding: 12,
    gap: 6,
  },
  mapDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapDetailInfo: {
    flex: 1,
    gap: 2,
  },
  mapDetailName: {
    ...typography.bodyMd,
    color: colors.text.primary,
    fontWeight: '600',
  },
  mapDetailSpeed: {
    ...typography.smallMd,
    color: colors.primary,
  },
  mapDetailMeta: {
    ...typography.small,
    color: colors.text.tertiary,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trackBtnText: {
    ...typography.smallMd,
    color: colors.primary,
    fontWeight: '600',
  },

  // Skeleton states
  statsSkeletonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statSkeletonItem: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
  },

  // Empty state
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
