import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Navigation } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme/spacing';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SearchBar } from '../components/ui/SearchBar';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { DeviceCardSkeleton } from '../components/ui/SkeletonLoader';
import { DeviceCard } from '../components/DeviceCard';
import { elevaticsAPI, ElevaticsDevice, ElevaticsPosition } from '../api/elevatics';
import { elevaticsWS } from '../api/websocket';
import { useFleetStore, DeviceWithPosition } from '../stores/fleetStore';
import { useCompanionStore } from '../stores/companionStore';
import { useTabBarBottomInset } from '../utils/tabBarInset';

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
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const openCompanion = useCompanionStore(state => state.open);
  const tabBarInset = useTabBarBottomInset(16);
  const {
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
  const [loadError, setLoadError] = useState(false);

  const loadDevices = useCallback(async (isRefresh = false) => {
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
      console.error('Failed to load devices:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setDevices, updatePositions]);

  useEffect(() => {
    loadDevices();
    const handleDevices = (d: ElevaticsDevice[]) => updateDevices(d);
    const handlePositions = (p: ElevaticsPosition[]) => updatePositions(p);
    elevaticsWS.on('devices', handleDevices);
    elevaticsWS.on('positions', handlePositions);
    return () => {
      elevaticsWS.off('devices', handleDevices);
      elevaticsWS.off('positions', handlePositions);
    };
  }, [loadDevices, updateDevices, updatePositions]);

  const filteredDevices = getFilteredDevices().filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.uniqueId.toLowerCase().includes(q);
  });

  const renderItem = useCallback(({ item, index }: { item: DeviceWithPosition; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(350)}>
      <DeviceCard
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
          <ScreenHeader
            title="Vehicles"
            subtitle={`${filteredDevices.length} shown`}
            large={false}
          />

          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or ID…"
            accessibilityLabel="Search vehicles"
            style={styles.search}
          />

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

        {loading ? (
          <View style={styles.skeletonList}>
            {[1, 2, 3, 4].map(i => <DeviceCardSkeleton key={i} />)}
          </View>
        ) : loadError && filteredDevices.length === 0 ? (
          <ErrorState onRetry={() => loadDevices()} />
        ) : (
          <FlashList
            data={filteredDevices}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.listContent, { paddingBottom: tabBarInset }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadDevices(true)}
                tintColor={colors.text.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon={<Navigation size={28} color={colors.text.tertiary} strokeWidth={1.5} />}
                title="No vehicles found"
                subtitle={searchQuery ? 'Try a different search term' : 'Adjust your filter or pull to refresh'}
                actionLabel={searchQuery ? 'Clear search' : undefined}
                onAction={searchQuery ? () => setSearchQuery('') : undefined}
              />
            }
          />
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 8,
  },
  search: {
    marginBottom: 14,
  },
  filterWrap: {
    marginBottom: 8,
  },
  listContent: {
    paddingTop: 8,
  },
  skeletonList: {
    padding: spacing.screenPadding,
    paddingTop: 12,
  },
});
