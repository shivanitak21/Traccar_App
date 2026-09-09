import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  Bell,
  AlertTriangle,
  Shield,
  Zap,
  Navigation,
  Power,
  Activity,
  Filter,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { EmptyState } from '../components/ui/EmptyState';
import { elevaticsAPI, ElevaticsEvent } from '../api/elevatics';
import { elevaticsWS } from '../api/websocket';
import { useFleetStore } from '../stores/fleetStore';
import { useTabBarBottomInset } from '../utils/tabBarInset';

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type FilterTab = 'all' | 'alerts' | 'geofence' | 'connection';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'geofence', label: 'Geofence' },
  { key: 'connection', label: 'Connection' },
];

function filterEvents(events: ElevaticsEvent[], tab: FilterTab): ElevaticsEvent[] {
  switch (tab) {
    case 'alerts': return events.filter(e => ['alarm', 'deviceOverspeed', 'maintenance'].includes(e.type));
    case 'geofence': return events.filter(e => ['geofenceEnter', 'geofenceExit'].includes(e.type));
    case 'connection': return events.filter(e => ['deviceOnline', 'deviceOffline', 'ignitionOn', 'ignitionOff'].includes(e.type));
    default: return events;
  }
}

export const AlertsScreen: React.FC = () => {
  const { recentEvents, devices, addEvents } = useFleetStore();
  const { colors } = useTheme();
  const tabBarInset = useTabBarBottomInset();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [events, setEvents] = useState<ElevaticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const to = new Date().toISOString();
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const data = await elevaticsAPI.getEvents(undefined, from, to);
      setEvents(data || []);
      if (data?.length) addEvents(data);
    } catch {
      setEvents(recentEvents as ElevaticsEvent[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recentEvents]);

  useEffect(() => {
    loadEvents();
    const handleWsEvents = (wsEvents: ElevaticsEvent[]) => {
      setEvents(prev => [...wsEvents, ...prev].slice(0, 200));
      addEvents(wsEvents);
    };
    elevaticsWS.on('events', handleWsEvents);
    return () => elevaticsWS.off('events', handleWsEvents);
  }, []);

  const displayEvents = filterEvents(events.length > 0 ? events : (recentEvents as ElevaticsEvent[]), activeFilter);
  const getDeviceName = (deviceId: number) => devices.find(d => d.id === deviceId)?.name ?? `Device #${deviceId}`;
  const alertCount = events.filter(e => ['alarm', 'deviceOverspeed'].includes(e.type)).length;
  const warnCount = events.filter(e => ['geofenceExit', 'maintenance'].includes(e.type)).length;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View entering={FadeInDown.delay(0).duration(450)} style={styles.header}>
          <ScreenHeader
            title="Alerts"
            large={false}
            right={
              <>
                {alertCount > 0 && (
                  <View style={styles.criticalBadge}>
                    <AlertTriangle size={12} color={colors.error} strokeWidth={2.5} />
                    <Text style={styles.criticalCount}>{alertCount}</Text>
                  </View>
                )}
                <Pressable
                  style={styles.filterBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Filter alerts"
                >
                  <Filter size={16} color={colors.text.secondary} strokeWidth={1.8} />
                </Pressable>
              </>
            }
          />

          {!loading && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.summaryRow}>
              <SummaryChip label={`${events.length} total`} color={colors.text.tertiary} colors={colors} />
              {alertCount > 0 && (
                <SummaryChip label={`${alertCount} critical`} color={colors.error} bgColor={colors.errorMuted} colors={colors} />
              )}
              {warnCount > 0 && (
                <SummaryChip label={`${warnCount} warnings`} color={colors.warning} bgColor={colors.warningMuted} colors={colors} />
              )}
            </Animated.View>
          )}

          <View style={styles.filterWrap}>
            <SegmentedControl
              options={FILTER_TABS.map(tab => ({ key: tab.key, label: tab.label }))}
              value={activeFilter}
              onChange={setActiveFilter}
            />
          </View>
        </Animated.View>

        <FlashList
          data={loading ? [] : displayEvents}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
              <EventRow event={item} deviceName={getDeviceName(item.deviceId)} colors={colors} />
            </Animated.View>
          )}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarInset }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadEvents(true)}
              tintColor={colors.text.primary}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.skeletonList}>
                {[1, 2, 3, 4, 5].map(i => <EventSkeleton key={i} colors={colors} />)}
              </View>
            ) : (
              <EmptyState
                icon={<Bell size={28} color={colors.text.tertiary} strokeWidth={1.5} />}
                title="No events found"
                subtitle={
                  activeFilter === 'all'
                    ? 'Live events will appear here as your fleet reports them'
                    : 'No events match this filter in the last 24h'
                }
              />
            )
          }
        />
      </SafeAreaView>
    </ScreenBackground>
  );
};

type ThemeColors = ReturnType<typeof useTheme>['colors'];

const EventRow: React.FC<{ event: ElevaticsEvent; deviceName: string; colors: ThemeColors }> = ({
  event, deviceName, colors,
}) => {
  const erStyles = useMemo(() => makeErStyles(colors), [colors]);
  const eventMeta: Record<string, { label: string; icon: any; color: string }> = {
    deviceOnline: { label: 'Online', icon: Power, color: colors.success },
    deviceOffline: { label: 'Offline', icon: Power, color: colors.error },
    deviceMoving: { label: 'Moving', icon: Navigation, color: colors.blue },
    deviceStopped: { label: 'Stopped', icon: Navigation, color: colors.text.tertiary },
    deviceOverspeed: { label: 'Overspeed', icon: Zap, color: colors.warning },
    geofenceEnter: { label: 'Geofence Enter', icon: Shield, color: colors.primary },
    geofenceExit: { label: 'Geofence Exit', icon: Shield, color: colors.accent },
    alarm: { label: 'Alarm', icon: AlertTriangle, color: colors.error },
    ignitionOn: { label: 'Ignition On', icon: Zap, color: colors.success },
    ignitionOff: { label: 'Ignition Off', icon: Zap, color: colors.text.tertiary },
    maintenance: { label: 'Maintenance', icon: Activity, color: colors.accent },
  };
  const meta = eventMeta[event.type] ?? { label: event.type, icon: Bell, color: colors.text.tertiary };
  const IconComponent = meta.icon;

  return (
    <View style={erStyles.row}>
      <View style={[erStyles.iconWrap, { backgroundColor: `${meta.color}14` }]}>
        <IconComponent size={18} color={meta.color} strokeWidth={1.8} />
      </View>
      <View style={erStyles.content}>
        <View style={erStyles.topRow}>
          <Text style={erStyles.label}>{meta.label}</Text>
          <Text style={erStyles.time}>{formatTimeAgo(event.eventTime)}</Text>
        </View>
        <Text style={erStyles.device}>{deviceName}</Text>
        {event.attributes?.alarm && (
          <Text style={erStyles.detail}>Alarm: {event.attributes.alarm}</Text>
        )}
      </View>
      <View style={[erStyles.severityDot, { backgroundColor: meta.color }]} />
    </View>
  );
};

const SummaryChip: React.FC<{ label: string; color: string; bgColor?: string; colors: ThemeColors }> = ({
  label, color, bgColor, colors,
}) => (
  <View style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: bgColor ?? colors.surface }]}>
    <Text style={[{ ...typography.small, fontWeight: '500', color }]}>{label}</Text>
  </View>
);

const EventSkeleton: React.FC<{ colors: ThemeColors }> = ({ colors }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.screenPadding, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, gap: 12, opacity: 0.4 }}>
    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceElevated }} />
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ height: 14, borderRadius: 6, backgroundColor: colors.surfaceElevated, width: '60%' }} />
      <View style={{ height: 11, borderRadius: 4, backgroundColor: colors.surfaceElevated, width: '35%' }} />
    </View>
  </View>
);

const makeErStyles = (colors: ThemeColors) => StyleSheet.create({
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
  content: { flex: 1, gap: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...typography.bodyMd, color: colors.text.primary },
  time: { ...typography.small, color: colors.text.tertiary, fontVariant: ['tabular-nums'] },
  device: { ...typography.caption, color: colors.text.tertiary },
  detail: { ...typography.small, color: colors.text.tertiary, fontStyle: 'italic' },
  severityDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
});

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 8,
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.errorMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.alert,
  },
  criticalCount: { ...typography.smallMd, color: colors.error },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  filterWrap: { marginBottom: 8 },
  listContent: {},
  skeletonList: {},
});
