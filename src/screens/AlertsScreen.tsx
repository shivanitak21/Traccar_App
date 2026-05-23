import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  AlertTriangle,
  MapPin,
  Shield,
  Zap,
  Navigation,
  Power,
  Activity,
  Clock,
  Filter,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { StatusChip } from '../components/ui/StatusChip';
import { traccarAPI, TraccarEvent } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { useFleetStore } from '../stores/fleetStore';

// Traccar event type metadata
const EVENT_META: Record<string, { label: string; icon: any; color: string; severity: 'error' | 'warning' | 'info' | 'neutral' }> = {
  deviceOnline: { label: 'Online', icon: Power, color: colors.success, severity: 'info' },
  deviceOffline: { label: 'Offline', icon: Power, color: colors.error, severity: 'error' },
  deviceMoving: { label: 'Moving', icon: Navigation, color: colors.blue, severity: 'info' },
  deviceStopped: { label: 'Stopped', icon: Navigation, color: colors.text.tertiary, severity: 'neutral' },
  deviceOverspeed: { label: 'Overspeed', icon: Zap, color: colors.warning, severity: 'warning' },
  geofenceEnter: { label: 'Geofence Enter', icon: Shield, color: colors.primary, severity: 'info' },
  geofenceExit: { label: 'Geofence Exit', icon: Shield, color: colors.accent, severity: 'warning' },
  alarm: { label: 'Alarm', icon: AlertTriangle, color: colors.error, severity: 'error' },
  ignitionOn: { label: 'Ignition On', icon: Zap, color: colors.success, severity: 'info' },
  ignitionOff: { label: 'Ignition Off', icon: Zap, color: colors.text.tertiary, severity: 'neutral' },
  maintenance: { label: 'Maintenance', icon: Activity, color: colors.accent, severity: 'warning' },
};

function getEventMeta(type: string) {
  return EVENT_META[type] ?? {
    label: type,
    icon: Bell,
    color: colors.text.tertiary,
    severity: 'neutral' as const,
  };
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

type FilterTab = 'all' | 'alerts' | 'geofence' | 'connection';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'geofence', label: 'Geofence' },
  { key: 'connection', label: 'Connection' },
];

function filterEvents(events: TraccarEvent[], tab: FilterTab): TraccarEvent[] {
  switch (tab) {
    case 'alerts':
      return events.filter(e => ['alarm', 'deviceOverspeed', 'maintenance'].includes(e.type));
    case 'geofence':
      return events.filter(e => ['geofenceEnter', 'geofenceExit'].includes(e.type));
    case 'connection':
      return events.filter(e => ['deviceOnline', 'deviceOffline', 'ignitionOn', 'ignitionOff'].includes(e.type));
    default:
      return events;
  }
}

export const AlertsScreen: React.FC = () => {
  const { recentEvents, devices, addEvents } = useFleetStore();
  const [events, setEvents] = useState<TraccarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      // Load last 24h of events
      const to = new Date().toISOString();
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const data = await traccarAPI.getEvents(undefined, from, to);
      setEvents(data || []);
      if (data?.length) addEvents(data);
    } catch {
      // fallback to WS events
      setEvents(recentEvents as TraccarEvent[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recentEvents]);

  useEffect(() => {
    loadEvents();

    const handleWsEvents = (wsEvents: TraccarEvent[]) => {
      setEvents(prev => [...wsEvents, ...prev].slice(0, 200));
      addEvents(wsEvents);
    };
    traccarWS.on('events', handleWsEvents);
    return () => traccarWS.off('events', handleWsEvents);
  }, []);

  const displayEvents = filterEvents(events.length > 0 ? events : (recentEvents as TraccarEvent[]), activeFilter);

  const getDeviceName = (deviceId: number) =>
    devices.find(d => d.id === deviceId)?.name ?? `Device #${deviceId}`;

  // Count by severity for summary chips
  const alertCount = events.filter(e => ['alarm', 'deviceOverspeed'].includes(e.type)).length;
  const warnCount = events.filter(e => ['geofenceExit', 'maintenance'].includes(e.type)).length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0c12', '#0d0f14']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(450)} style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Alerts</Text>
            <View style={styles.headerRight}>
              {alertCount > 0 && (
                <View style={styles.criticalBadge}>
                  <AlertTriangle size={12} color={colors.error} strokeWidth={2.5} />
                  <Text style={styles.criticalCount}>{alertCount}</Text>
                </View>
              )}
              <Pressable style={styles.filterBtn}>
                <Filter size={16} color={colors.text.secondary} strokeWidth={1.8} />
              </Pressable>
            </View>
          </View>

          {/* Summary row */}
          {!loading && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.summaryRow}>
              <SummaryChip
                label={`${events.length} total`}
                color={colors.text.tertiary}
              />
              {alertCount > 0 && (
                <SummaryChip
                  label={`${alertCount} critical`}
                  color={colors.error}
                  bgColor={colors.errorMuted}
                />
              )}
              {warnCount > 0 && (
                <SummaryChip
                  label={`${warnCount} warnings`}
                  color={colors.warning}
                  bgColor={colors.warningMuted}
                />
              )}
            </Animated.View>
          )}

          {/* Filter tabs */}
          <View style={styles.filterTabs}>
            {FILTER_TABS.map(tab => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                style={[
                  styles.filterTab,
                  activeFilter === tab.key && styles.filterTabActive,
                ]}
              >
                <Text style={[
                  styles.filterTabText,
                  activeFilter === tab.key && styles.filterTabTextActive,
                ]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Events list */}
        <FlashList
          data={loading ? [] : displayEvents}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
              <EventRow
                event={item}
                deviceName={getDeviceName(item.deviceId)}
              />
            </Animated.View>
          )}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadEvents(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.skeletonList}>
                {[1, 2, 3, 4, 5].map(i => <EventSkeleton key={i} />)}
              </View>
            ) : (
              <View style={styles.empty}>
                <Bell size={40} color={colors.text.tertiary} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No events found</Text>
                <Text style={styles.emptySubtitle}>
                  {activeFilter === 'all'
                    ? 'Live events will appear here as your fleet reports them'
                    : 'No events match this filter in the last 24h'}
                </Text>
              </View>
            )
          }
        />
      </SafeAreaView>
    </View>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const EventRow: React.FC<{
  event: TraccarEvent;
  deviceName: string;
}> = ({ event, deviceName }) => {
  const meta = getEventMeta(event.type);
  const IconComponent = meta.icon;
  const timeAgo = formatTimeAgo(event.eventTime);

  return (
    <View style={erStyles.row}>
      <View style={[erStyles.iconWrap, { backgroundColor: `${meta.color}14` }]}>
        <IconComponent size={18} color={meta.color} strokeWidth={1.8} />
      </View>

      <View style={erStyles.content}>
        <View style={erStyles.topRow}>
          <Text style={erStyles.label}>{meta.label}</Text>
          <Text style={erStyles.time}>{timeAgo}</Text>
        </View>
        <Text style={erStyles.device}>{deviceName}</Text>
        {event.attributes?.alarm && (
          <Text style={erStyles.detail}>
            Alarm: {event.attributes.alarm}
          </Text>
        )}
      </View>

      <View style={[erStyles.severityDot, { backgroundColor: meta.color }]} />
    </View>
  );
};

const erStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.bodyMd,
    color: colors.text.primary,
  },
  time: {
    ...typography.small,
    color: colors.text.tertiary,
    fontVariant: ['tabular-nums'],
  },
  device: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  detail: {
    ...typography.small,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
});

const SummaryChip: React.FC<{ label: string; color: string; bgColor?: string }> = ({
  label, color, bgColor,
}) => (
  <View style={[scStyles.chip, bgColor ? { backgroundColor: bgColor } : {}]}>
    <Text style={[scStyles.text, { color }]}>{label}</Text>
  </View>
);

const scStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  text: {
    ...typography.small,
    fontWeight: '500',
  },
});

const EventSkeleton: React.FC = () => (
  <View style={[erStyles.row, { opacity: 0.4 }]}>
    <View style={[erStyles.iconWrap, { backgroundColor: colors.surfaceElevated }]} />
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ height: 14, borderRadius: 6, backgroundColor: colors.surfaceElevated, width: '60%' }} />
      <View style={{ height: 11, borderRadius: 4, backgroundColor: colors.surfaceElevated, width: '35%' }} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: 12,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.errorMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  criticalCount: {
    ...typography.smallMd,
    color: colors.error,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.screenPadding,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    gap: 0,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: colors.primary,
  },
  filterTabText: {
    ...typography.captionMd,
    color: colors.text.tertiary,
  },
  filterTabTextActive: {
    color: colors.primary,
  },
  listContent: {
    paddingBottom: 20,
  },
  skeletonList: {},
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
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
    lineHeight: 20,
  },
});
