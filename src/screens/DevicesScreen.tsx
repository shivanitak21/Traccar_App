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
import {
  Search,
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
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ControlButton, ControlButtonRow } from '../components/ui/ControlButton';
import { StatusChip } from '../components/ui/StatusChip';
import { DeviceCardSkeleton } from '../components/ui/SkeletonLoader';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { useFleetStore, DeviceWithPosition } from '../stores/fleetStore';
import { usePrefsStore } from '../stores/prefsStore';
import { useCompanionStore } from '../stores/companionStore';
import { formatSpeed } from '../utils/units';
import { getLocationLabel } from '../utils/address';

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
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ScreenHeader title="Vehicles" large={false} />

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

          <View style={styles.filterWrap}>
            <SegmentedControl
              options={FILTER_TABS.map(tab => ({
                key: tab.key,
                label: tab.label,
                count: filter === tab.key ? filteredDevices.length : undefined,
              }))}
              value={filter}
              onChange={setFilter}
            />
          </View>
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
                tintColor={colors.text.primary}
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
    </ScreenBackground>
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
            <Text style={diStyles.id}>{device.uniqueId}</Text>
            {(device.address || device.position?.latitude) && (
              <View style={diStyles.locationRow}>
                <MapPin size={10} color={colors.text.tertiary} strokeWidth={2} />
                <Text style={diStyles.coords} numberOfLines={2}>
                  {getLocationLabel({
                    address: device.address,
                    positionAddress: device.position?.address,
                    latitude: device.position?.latitude,
                    longitude: device.position?.longitude,
                  })}
                </Text>
              </View>
            )}
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
          <ControlButtonRow>
            <ControlButton
              size="sm"
              icon={<Navigation size={16} color={colors.text.primary} strokeWidth={1.8} />}
              label="Live"
              onPress={onLiveTrack}
            />
            <ControlButton
              size="sm"
              icon={<History size={16} color={colors.text.primary} strokeWidth={1.8} />}
              label="Playback"
              onPress={onPlayback}
            />
            <ControlButton
              size="sm"
              icon={<Map size={16} color={colors.text.primary} strokeWidth={1.8} />}
              label="Geofence"
              onPress={onGeofence}
            />
            <ControlButton
              size="sm"
              icon={<Terminal size={16} color={colors.text.primary} strokeWidth={1.8} />}
              label="Commands"
              onPress={onCommands}
            />
            <ControlButton
              size="sm"
              icon={<Info size={16} color={colors.text.primary} strokeWidth={1.8} />}
              label="Details"
              onPress={onInfo}
            />
          </ControlButtonRow>
        </View>
      )}
    </View>
  );
};

const diStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    marginHorizontal: spacing.screenPadding,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
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
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 4,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 8,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 10,
    marginBottom: 14,
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

  filterWrap: {
    marginBottom: 8,
  },

  listContent: {
    paddingTop: 8,
    paddingBottom: 120,
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
