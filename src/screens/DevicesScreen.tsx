import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  SlidersHorizontal,
  Navigation,
  MapPin,
  Power,
  ChevronRight,
  Map,
  History,
  Shield,
  Terminal,
  Info,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { StatusChip } from '../components/ui/StatusChip';
import { DeviceCardSkeleton } from '../components/ui/SkeletonLoader';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { useFleetStore, DeviceWithPosition } from '../stores/fleetStore';
import { usePrefsStore } from '../stores/prefsStore';
import { useCompanionStore } from '../stores/companionStore';
import { formatSpeed } from '../utils/units';

type FilterType = 'all' | 'online' | 'offline' | 'moving' | 'idle';

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online' },
  { key: 'moving', label: 'Moving' },
  { key: 'idle', label: 'Idle' },
  { key: 'offline', label: 'Offline' },
];

export const DevicesScreen: React.FC = () => {
  const router = useRouter();
  const openCompanion = useCompanionStore(state => state.open);
  const {
    devices,
    setDevices,
    updateDevices,
    updatePositions,
    getFilteredDevices,
    filter,
    setFilter,
  } = useFleetStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadDevices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [devicesData, positionsData] = await Promise.all([
        traccarAPI.getDevices(),
        traccarAPI.getPositions(),
      ]);
      updatePositions(positionsData);
      setDevices(devicesData);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();

    const handleDevices = (d: TraccarDevice[]) => updateDevices(d);
    const handlePositions = (p: TraccarPosition[]) => updatePositions(p);
    traccarWS.on('devices', handleDevices);
    traccarWS.on('positions', handlePositions);

    return () => {
      traccarWS.off('devices', handleDevices);
      traccarWS.off('positions', handlePositions);
    };
  }, []);

  const filteredDevices = getFilteredDevices().filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.uniqueId.toLowerCase().includes(q);
  });

  const renderItem = useCallback(({ item, index }: { item: DeviceWithPosition; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(350)}>
      <DeviceListItem
        device={item}
        onOpenCompanion={() => openCompanion(item.id, item.name)}
        onLiveTrack={() => router.push(`/device/${item.id}/live-track` as any)}
        onPlayback={() => router.push(`/device/${item.id}/playback` as any)}
        onGeofence={() => router.push(`/device/${item.id}/geofence` as any)}
        onInfo={() => router.push(`/device/${item.id}/info` as any)}
        onCommands={() => router.push(`/device/${item.id}/commands` as any)}
      />
    </Animated.View>
  ), [router, openCompanion]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0c12', '#0d0f14']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Vehicles</Text>
            <Pressable style={styles.filterButton}>
              <SlidersHorizontal size={18} color={colors.text.secondary} strokeWidth={1.8} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={styles.searchBar}>
            <Search size={16} color={colors.text.tertiary} strokeWidth={1.8} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or ID..."
              placeholderTextColor={colors.text.disabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              selectionColor={colors.primary}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Text style={styles.clearSearch}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* Filter chips */}
          <FlashList
            data={FILTER_TABS}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter(item.key);
                }}
                style={[
                  styles.filterChip,
                  filter === item.key && styles.filterChipActive,
                ]}
              >
                <Text style={[
                  styles.filterChipText,
                  filter === item.key && styles.filterChipTextActive,
                ]}>
                  {item.label}
                </Text>
                {filter === item.key && (
                  <Text style={styles.filterCount}>
                    {' '}{filteredDevices.length}
                  </Text>
                )}
              </Pressable>
            )}
          />
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.skeletonList}>
            {[1, 2, 3, 4].map(i => <DeviceCardSkeleton key={i} />)}
          </View>
        ) : (
          <FlashList
            data={filteredDevices}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadDevices(true)}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Navigation size={40} color={colors.text.tertiary} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No vehicles found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? 'Try a different search term' : 'Adjust your filter'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

// ── Device list item ──────────────────────────────────────────────────────────

const DeviceListItem: React.FC<{
  device: DeviceWithPosition;
  onOpenCompanion: () => void;
  onLiveTrack: () => void;
  onPlayback: () => void;
  onGeofence: () => void;
  onInfo: () => void;
  onCommands: () => void;
}> = ({ device, onOpenCompanion, onLiveTrack, onPlayback, onGeofence, onInfo, onCommands }) => {
  const [expanded, setExpanded] = useState(false);
  const { prefs } = usePrefsStore();

  const statusVariant = device.isMoving ? 'moving'
    : device.computedStatus === 'online' ? 'idle'
    : 'offline';

  const statusLabel = device.isMoving && device.position
    ? formatSpeed(device.position.speed, prefs.speedUnit)
    : device.computedStatus === 'online' ? 'Idle'
    : 'Offline';

  const accentColor = device.isMoving ? colors.blue
    : device.computedStatus === 'online' ? colors.success
    : colors.text.tertiary;

  return (
    <View style={diStyles.card}>
      {/* Status bar */}
      <View style={[diStyles.statusBar, { backgroundColor: accentColor }]} />

      {/* Main row */}
      <View style={diStyles.mainRow}>
        <Pressable
          onPress={onOpenCompanion}
          style={diStyles.mainPressable}
        >
          <View style={[diStyles.iconWrap, { borderColor: `${accentColor}30` }]}>
            <Navigation size={20} color={accentColor} strokeWidth={1.6} />
          </View>

          <View style={diStyles.info}>
            <Text style={diStyles.name} numberOfLines={1}>{device.name}</Text>
            <View style={diStyles.meta}>
              <Text style={diStyles.id}>{device.uniqueId}</Text>
              {device.position?.latitude && (
                <>
                  <Text style={diStyles.dot}>·</Text>
                  <MapPin size={10} color={colors.text.tertiary} strokeWidth={2} />
                  <Text style={diStyles.coords} numberOfLines={1}>
                    {device.position.latitude.toFixed(4)}, {device.position.longitude.toFixed(4)}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={diStyles.rightSection}>
            <StatusChip
              label={statusLabel}
              variant={statusVariant}
              size="sm"
            />
            {device.ignitionOn !== undefined && (
              <View style={diStyles.ignitionRow}>
                <Power
                  size={11}
                  color={device.ignitionOn ? colors.success : colors.text.tertiary}
                  strokeWidth={2}
                />
                <Text style={[
                  diStyles.ignitionText,
                  { color: device.ignitionOn ? colors.success : colors.text.tertiary }
                ]}>
                  {device.ignitionOn ? 'ON' : 'OFF'}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={() => setExpanded(v => !v)}
          hitSlop={8}
          style={diStyles.expandBtn}
        >
          <ChevronRight
            size={16}
            color={colors.text.tertiary}
            strokeWidth={1.8}
            style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
          />
        </Pressable>
      </View>

      {/* Expanded actions */}
      {expanded && (
        <View style={diStyles.actions}>
          <DeviceAction
            icon={<Navigation size={16} color={colors.primary} strokeWidth={1.8} />}
            label="Live Track"
            onPress={onLiveTrack}
            accent={colors.primary}
          />
          <DeviceAction
            icon={<History size={16} color={colors.blue} strokeWidth={1.8} />}
            label="Playback"
            onPress={onPlayback}
            accent={colors.blue}
          />
          <DeviceAction
            icon={<Map size={16} color={colors.accent} strokeWidth={1.8} />}
            label="Geofence"
            onPress={onGeofence}
            accent={colors.accent}
          />
          <DeviceAction
            icon={<Terminal size={16} color={colors.text.secondary} strokeWidth={1.8} />}
            label="Commands"
            onPress={onCommands}
            accent={colors.text.secondary}
          />
          <DeviceAction
            icon={<Info size={16} color={colors.text.secondary} strokeWidth={1.8} />}
            label="Details"
            onPress={onInfo}
            accent={colors.text.secondary}
          />
        </View>
      )}
    </View>
  );
};

const DeviceAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  accent: string;
}> = ({ icon, label, onPress, accent }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      daStyles.btn,
      { borderColor: `${accent}25` },
      pressed && daStyles.pressed,
    ]}
  >
    {icon}
    <Text style={[daStyles.label, { color: accent }]}>{label}</Text>
  </Pressable>
);

const daStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
  },
  label: {
    ...typography.smallMd,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.75,
  },
});

const diStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: spacing.screenPadding,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  statusBar: {
    height: 2,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    gap: 4,
  },
  mainPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  expandBtn: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  id: {
    ...typography.small,
    color: colors.text.tertiary,
    fontVariant: ['tabular-nums'],
  },
  dot: {
    color: colors.text.tertiary,
    fontSize: 10,
  },
  coords: {
    ...typography.small,
    color: colors.text.tertiary,
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  ignitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ignitionText: {
    ...typography.tiny,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 14,
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

  // Header
  header: {
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: 14,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: spacing.screenPadding,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    paddingVertical: 10,
  },
  clearSearch: {
    color: colors.text.tertiary,
    fontSize: 14,
  },

  // Filter chips
  filterList: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  filterChipText: {
    ...typography.smallMd,
    color: colors.text.tertiary,
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  filterCount: {
    ...typography.smallMd,
    color: colors.primary,
  },

  // List
  listContent: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  skeletonList: {
    padding: spacing.screenPadding,
    paddingTop: 12,
  },

  // Empty
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 10,
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
