import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import {
  MapPin,
  Bell,
  ChevronRight,
  Wifi,
  WifiOff,
  X,
  Car,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { GlassCard } from '../components/GlassCard';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { ScreenHeader, HeaderIconButton } from '../components/ui/ScreenHeader';
import { StatusChip } from '../components/ui/StatusChip';
import { DeviceCardSkeleton } from '../components/ui/SkeletonLoader';
import { FleetStatsStrip } from '../components/ui/MetricCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { WebMapView, MapLayerType } from '../components/WebMapView';
import { AlertsPanel, getUnreadAlertCount } from '../components/AlertsPanel';
import { elevaticsAPI, ElevaticsDevice, ElevaticsPosition } from '../api/elevatics';
import { elevaticsWS } from '../api/websocket';
import { useFleetStore } from '../stores/fleetStore';
import { usePrefsStore } from '../stores/prefsStore';
import { useCompanionStore } from '../stores/companionStore';
import { useAuthStore } from '../stores/authStore';
import { formatSpeed, type SpeedUnit } from '../utils/units';
import { getLocationLabel } from '../utils/address';
import { getThemeBaseMapLayer } from '../utils/mapTheme';
import { useTabBarBottomInset } from '../utils/tabBarInset';

const DEFAULT_MAP_CENTER = { latitude: 20.5937, longitude: 78.9629 };
const MAP_HEIGHT = Math.min(Math.max(Dimensions.get('window').height * 0.54, 360), 520);

export const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
    recentEvents,
  } = useFleetStore();
  const { prefs } = usePrefsStore();
  const openCompanion = useCompanionStore(state => state.open);
  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [alertsVisible, setAlertsVisible] = useState(false);
  const [mapScrollEnabled, setMapScrollEnabled] = useState(true);
  const tabBarInset = useTabBarBottomInset(24);

  const lockParentScroll = useCallback(() => setMapScrollEnabled(false), []);
  const unlockParentScroll = useCallback(() => setMapScrollEnabled(true), []);

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
    if (!useAuthStore.getState().isAuthenticated) return;
    if (isRefresh) setRefreshing(true);
    try {
      setLoadError(false);
      const [devicesData, positionsData] = await Promise.all([
        elevaticsAPI.getDevices(),
        elevaticsAPI.getPositions(),
      ]);
      updatePositions(positionsData);
      setDevices(devicesData);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setDevices, updatePositions]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    loadData();
    elevaticsWS.connect();

    const handleConnected = (connected: boolean) => setWsConnected(connected);
    const handleDevices = (d: ElevaticsDevice[]) => updateDevices(d);
    const handlePositions = (p: ElevaticsPosition[]) => updatePositions(p);
    const handleEvents = (e: any[]) => addEvents(e);

    elevaticsWS.on('connected', handleConnected);
    elevaticsWS.on('devices', handleDevices);
    elevaticsWS.on('positions', handlePositions);
    elevaticsWS.on('events', handleEvents);

    return () => {
      elevaticsWS.off('connected', handleConnected);
      elevaticsWS.off('devices', handleDevices);
      elevaticsWS.off('positions', handlePositions);
      elevaticsWS.off('events', handleEvents);
    };
  }, [isAuthenticated, loadData, setWsConnected, updateDevices, updatePositions, addEvents]);

  const stats = getFleetStats();
  const recentDevices = devices.slice(0, 5);
  const selectedDevice = selectedDeviceId
    ? devices.find(d => d.id === selectedDeviceId)
    : null;

  const mapMarkers = useMemo(() => {
    return devices
      .filter(d => d.position?.latitude && d.position?.longitude)
      .map(d => {
        const locationLabel = getLocationLabel({
          address: d.address,
          positionAddress: d.position?.address,
          latitude: d.position?.latitude,
          longitude: d.position?.longitude,
        });
        return {
          id: `vehicle-${d.id}`,
          latitude: d.position!.latitude,
          longitude: d.position!.longitude,
          title: d.name,
          description: locationLabel,
          color: d.isMoving ? colors.blue : d.computedStatus === 'online' ? colors.success : colors.error,
          status: d.isMoving ? 'moving' : d.computedStatus === 'online' ? 'online' : 'offline',
          course: d.position!.course || 0,
        };
      });
  }, [devices, colors]);

  const mapCenter = useMemo(() => {
    if (selectedDevice?.position) {
      return { latitude: selectedDevice.position.latitude, longitude: selectedDevice.position.longitude };
    }
    if (mapMarkers.length === 1) {
      return { latitude: mapMarkers[0].latitude, longitude: mapMarkers[0].longitude };
    }
    if (mapMarkers.length > 1) {
      const latSum = mapMarkers.reduce((sum, m) => sum + m.latitude, 0);
      const lonSum = mapMarkers.reduce((sum, m) => sum + m.longitude, 0);
      return { latitude: latSum / mapMarkers.length, longitude: lonSum / mapMarkers.length };
    }
    return DEFAULT_MAP_CENTER;
  }, [selectedDevice, mapMarkers]);

  const mapZoom = selectedDevice ? 14 : mapMarkers.length === 1 ? 13 : mapMarkers.length > 1 ? 11 : 5;
  const shouldFitAllMarkers = !selectedDeviceId && mapMarkers.length > 0;
  const dashboardMapLayer: MapLayerType = getThemeBaseMapLayer(isDark);

  const now = new Date();
  const hour = now.getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0];
  const greeting = firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
  const alertCount = getUnreadAlertCount(recentEvents);

  return (
    <ScreenBackground variant="hero">
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarInset }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={mapScrollEnabled}
          nestedScrollEnabled
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={colors.text.primary}
              progressBackgroundColor={colors.surface}
            />
          }
        >
          <Animated.View entering={FadeInDown.delay(0).duration(500)}>
            <ScreenHeader
              subtitle={greeting}
              title="Dashboard"
              right={
                <>
                  <HeaderIconButton onPress={() => router.push('/(tabs)/map' as any)}>
                    <View style={styles.wsIconWrap}>
                      <Animated.View style={[styles.wsPulseRing, wsPulseStyle, {
                        backgroundColor: wsConnected ? 'rgba(48,209,88,0.18)' : 'transparent',
                      }]} />
                      {wsConnected
                        ? <Wifi size={16} color={colors.success} strokeWidth={2} />
                        : <WifiOff size={16} color={colors.text.tertiary} strokeWidth={2} />
                      }
                    </View>
                  </HeaderIconButton>
                  <HeaderIconButton
                    badgeCount={alertCount}
                    onPress={() => setAlertsVisible(true)}
                  >
                    <Bell size={18} color={colors.text.primary} strokeWidth={1.8} />
                  </HeaderIconButton>
                </>
              }
            />
          </Animated.View>

          {loadError && !loading && devices.length === 0 ? (
            <ErrorState onRetry={() => loadData()} style={{ marginBottom: 24 }} />
          ) : null}

          {!loading && (
            <Animated.View entering={FadeInDown.delay(40).duration(500)} style={styles.section}>
              <FleetStatsStrip
                total={stats.total}
                online={stats.online}
                moving={stats.moving}
                idle={stats.idle}
              />
            </Animated.View>
          )}

          {!loading && (
            <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Live Map</Text>
                  <Text style={styles.sectionSubtitle}>
                    {stats.total > 0
                      ? stats.moving > 0
                        ? `${stats.moving} vehicle${stats.moving === 1 ? '' : 's'} in motion`
                        : `${stats.online} online across your fleet`
                      : 'Fleet locations will appear here'}
                  </Text>
                </View>
                <Pressable style={styles.sectionAction} onPress={() => router.push('/(tabs)/map' as any)}>
                  <Text style={styles.sectionActionText}>Full screen</Text>
                  <ChevronRight size={14} color={colors.primary} strokeWidth={2.5} />
                </Pressable>
              </View>

              <View style={styles.mapWrap}>
                <WebMapView
                  markers={mapMarkers}
                  center={mapCenter}
                  zoom={mapZoom}
                  fitToMarkers={shouldFitAllMarkers}
                  mapLayer={dashboardMapLayer}
                  onInteractionStart={lockParentScroll}
                  onInteractionEnd={unlockParentScroll}
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
                    <GlassCard style={styles.mapDetailCard} blur>
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
                        {getLocationLabel({
                          address: selectedDevice.address,
                          positionAddress: selectedDevice.position?.address,
                          latitude: selectedDevice.position?.latitude,
                          longitude: selectedDevice.position?.longitude,
                        })}
                      </Text>
                      <View style={styles.mapDetailActions}>
                        <Pressable
                          style={styles.mapActionBtn}
                          onPress={() => openCompanion(selectedDevice.id, selectedDevice.name)}
                        >
                          <Text style={styles.mapActionBtnText}>Ask AI</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.mapActionBtn, styles.mapActionBtnPrimary]}
                          onPress={() => router.push(`/device/${selectedDevice.id}/live-track` as any)}
                        >
                          <Text style={[styles.mapActionBtnText, styles.mapActionBtnTextPrimary]}>
                            Live Track
                          </Text>
                        </Pressable>
                      </View>
                    </GlassCard>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={[styles.section, styles.lastSection]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Fleet</Text>
                {!loading && stats.total > 0 && (
                  <Text style={styles.sectionSubtitle}>
                    {stats.total} vehicle{stats.total === 1 ? '' : 's'} registered
                  </Text>
                )}
              </View>
              {!loading && recentDevices.length > 0 && (
                <Pressable style={styles.sectionAction} onPress={() => router.push('/(tabs)/devices' as any)}>
                  <Text style={styles.sectionActionText}>See all</Text>
                  <ChevronRight size={14} color={colors.primary} strokeWidth={2.5} />
                </Pressable>
              )}
            </View>

            {loading ? (
              <View style={styles.vehicleList}>
                <DeviceCardSkeleton />
                <DeviceCardSkeleton />
                <DeviceCardSkeleton />
              </View>
            ) : recentDevices.length === 0 ? (
              <EmptyState
                icon={<Car size={28} color={colors.text.tertiary} strokeWidth={1.5} />}
                title="No vehicles yet"
                subtitle="Your fleet will appear here once devices are connected"
                actionLabel="Refresh"
                onAction={() => loadData(true)}
              />
            ) : (
              <GlassCard style={styles.vehicleListCard} padding={0} blur>
                {recentDevices.map((device, idx) => (
                  <Animated.View key={device.id} entering={FadeInDown.delay(idx * 50).duration(400)}>
                    <DashboardVehicleRow
                      device={device}
                      speedUnit={prefs.speedUnit}
                      onPress={() => openCompanion(device.id, device.name)}
                      isLast={idx === recentDevices.length - 1}
                    />
                  </Animated.View>
                ))}
              </GlassCard>
            )}
          </Animated.View>
        </ScrollView>

        <AlertsPanel visible={alertsVisible} onClose={() => setAlertsVisible(false)} />
      </SafeAreaView>
    </ScreenBackground>
  );
};

const DashboardVehicleRow: React.FC<{
  device: any;
  speedUnit: SpeedUnit;
  onPress: () => void;
  isLast?: boolean;
}> = ({ device, speedUnit, onPress, isLast }) => {
  const { colors } = useTheme();
  const dvStyles = useMemo(() => makeDvStyles(colors), [colors]);

  const statusVariant = device.isMoving ? 'moving'
    : device.computedStatus === 'online' ? 'idle'
    : 'offline';

  const statusLabel = device.isMoving ? 'Moving'
    : device.computedStatus === 'online' ? 'Idle'
    : 'Offline';

  const statusColor = device.isMoving ? colors.blue
    : device.computedStatus === 'online' ? colors.success
    : colors.text.tertiary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        dvStyles.row,
        !isLast && dvStyles.rowBorder,
        pressed && dvStyles.pressed,
      ]}
    >
      <View style={[dvStyles.statusDot, { backgroundColor: statusColor }]} />

      <View style={dvStyles.info}>
        <Text style={dvStyles.name} numberOfLines={1}>{device.name}</Text>
        {device.address ? (
          <View style={dvStyles.locationRow}>
            <MapPin size={11} color={colors.text.tertiary} strokeWidth={2} />
            <Text style={dvStyles.address} numberOfLines={1}>{device.address}</Text>
          </View>
        ) : device.position ? (
          <View style={dvStyles.locationRow}>
            <MapPin size={11} color={colors.text.tertiary} strokeWidth={2} />
            <Text style={dvStyles.address} numberOfLines={1}>
              {getLocationLabel({
                address: device.address,
                positionAddress: device.position?.address,
                latitude: device.position.latitude,
                longitude: device.position.longitude,
              })}
            </Text>
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

      <ChevronRight size={15} color={colors.text.tertiary} strokeWidth={1.8} />
    </Pressable>
  );
};

const makeDvStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  pressed: {
    backgroundColor: colors.surfaceHover,
    opacity: 0.9,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...typography.bodyMd,
    color: colors.text.primary,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    gap: 5,
  },
  speed: {
    ...typography.tiny,
    color: colors.text.secondary,
    fontVariant: ['tabular-nums'],
  },
});

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
  },
  wsIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  wsPulseRing: {
    position: 'absolute',
    inset: -4,
    borderRadius: 18,
  },
  section: {
    marginBottom: 32,
  },
  lastSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
  },
  sectionActionText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  mapWrap: {
    height: MAP_HEIGHT,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    position: 'relative',
    ...shadows.lg,
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
    padding: 14,
    gap: 8,
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
  mapDetailActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  mapActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.control,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  mapActionBtnPrimary: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.border.accent,
  },
  mapActionBtnText: {
    ...typography.smallMd,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  mapActionBtnTextPrimary: {
    color: colors.text.primary,
  },
  vehicleList: {
    gap: 10,
  },
  vehicleListCard: {
    overflow: 'hidden',
    ...shadows.md,
  },
});
