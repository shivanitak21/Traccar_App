import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
  Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Bell,
  AlertTriangle,
  Shield,
  Zap,
  Navigation,
  Power,
  Activity,
  X,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { SegmentedControl } from './ui/SegmentedControl';
import { traccarAPI, TraccarEvent } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { useFleetStore } from '../stores/fleetStore';

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

interface AlertsPanelProps {
  visible: boolean;
  onClose: () => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ visible, onClose }) => {
  const { recentEvents, devices, addEvents } = useFleetStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [events, setEvents] = useState<TraccarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const eventMeta = useMemo(() => ({
    deviceOnline:  { label: 'Online',         icon: Power,         color: colors.success },
    deviceOffline: { label: 'Offline',        icon: Power,         color: colors.error },
    deviceMoving:  { label: 'Moving',         icon: Navigation,    color: colors.blue },
    deviceStopped: { label: 'Stopped',        icon: Navigation,    color: colors.text.tertiary },
    deviceOverspeed: { label: 'Overspeed',    icon: Zap,           color: colors.warning },
    geofenceEnter: { label: 'Geofence Enter', icon: Shield,        color: colors.primary },
    geofenceExit:  { label: 'Geofence Exit',  icon: Shield,        color: colors.accent },
    alarm:         { label: 'Alarm',          icon: AlertTriangle, color: colors.error },
    ignitionOn:    { label: 'Ignition On',    icon: Zap,           color: colors.success },
    ignitionOff:   { label: 'Ignition Off',   icon: Zap,           color: colors.text.tertiary },
    maintenance:   { label: 'Maintenance',    icon: Activity,      color: colors.accent },
  }), [colors]);

  const getEventMeta = useCallback((type: string) => {
    return (eventMeta as any)[type] ?? { label: type, icon: Bell, color: colors.text.tertiary };
  }, [eventMeta, colors]);

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const to = new Date().toISOString();
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const data = await traccarAPI.getEvents(undefined, from, to);
      setEvents(data || []);
      if (data?.length) addEvents(data);
    } catch {
      setEvents(recentEvents as TraccarEvent[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recentEvents, addEvents]);

  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    loadEvents();

    const handleWsEvents = (wsEvents: TraccarEvent[]) => {
      setEvents(prev => [...wsEvents, ...prev].slice(0, 200));
      addEvents(wsEvents);
    };
    traccarWS.on('events', handleWsEvents);
    return () => traccarWS.off('events', handleWsEvents);
  }, [visible, loadEvents, addEvents]);

  const displayEvents = filterEvents(
    events.length > 0 ? events : (recentEvents as TraccarEvent[]),
    activeFilter,
  );

  const getDeviceName = (deviceId: number) =>
    devices.find(d => d.id === deviceId)?.name ?? `Device #${deviceId}`;

  const alertCount = events.filter(e => ['alarm', 'deviceOverspeed'].includes(e.type)).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Bell size={20} color={colors.primary} strokeWidth={1.8} />
              <View>
                <Text style={styles.title}>Notifications</Text>
                <Text style={styles.subtitle}>
                  {events.length > 0 ? `${events.length} events in last 24h` : 'Live fleet events'}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          {!loading && alertCount > 0 && (
            <View style={styles.summaryRow}>
              <View style={styles.criticalChip}>
                <AlertTriangle size={12} color={colors.error} strokeWidth={2.5} />
                <Text style={styles.criticalText}>{alertCount} critical</Text>
              </View>
            </View>
          )}

          <View style={styles.filterWrap}>
            <SegmentedControl
              options={FILTER_TABS.map(tab => ({ key: tab.key, label: tab.label }))}
              value={activeFilter}
              onChange={setActiveFilter}
            />
          </View>

          <FlashList
            data={loading ? [] : displayEvents}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 20).duration(250)}>
                <EventRow event={item} deviceName={getDeviceName(item.deviceId)} getEventMeta={getEventMeta} colors={colors} />
              </Animated.View>
            )}
            keyExtractor={(item) => String(item.id)}
            estimatedItemSize={68}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadEvents(true)}
                tintColor={colors.text.primary}
              />
            }
            ListEmptyComponent={
              loading ? (
                <View style={styles.empty}>
                  <Text style={styles.emptySubtitle}>Loading events...</Text>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Bell size={36} color={colors.text.tertiary} strokeWidth={1.5} />
                  <Text style={styles.emptyTitle}>No events found</Text>
                  <Text style={styles.emptySubtitle}>
                    Live events will appear here as your fleet reports them
                  </Text>
                </View>
              )
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const EventRow: React.FC<{
  event: TraccarEvent;
  deviceName: string;
  getEventMeta: (type: string) => { label: string; icon: any; color: string };
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ event, deviceName, getEventMeta, colors }) => {
  const erStyles = useMemo(() => makeErStyles(colors), [colors]);
  const meta = getEventMeta(event.type);
  const IconComponent = meta.icon;

  return (
    <View style={erStyles.row}>
      <View style={[erStyles.iconWrap, { backgroundColor: `${meta.color}14` }]}>
        <IconComponent size={16} color={meta.color} strokeWidth={1.8} />
      </View>
      <View style={erStyles.content}>
        <View style={erStyles.topRow}>
          <Text style={erStyles.label}>{meta.label}</Text>
          <Text style={erStyles.time}>{formatTimeAgo(event.eventTime)}</Text>
        </View>
        <Text style={erStyles.device}>{deviceName}</Text>
      </View>
      <View style={[erStyles.severityDot, { backgroundColor: meta.color }]} />
    </View>
  );
};

const makeErStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
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
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: { flex: 1, gap: 2 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { ...typography.bodyMd, color: colors.text.primary },
  time: { ...typography.small, color: colors.text.tertiary },
  device: { ...typography.caption, color: colors.text.tertiary },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
});

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border.subtle,
    maxHeight: '82%',
    minHeight: '55%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    ...typography.h4,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  summaryRow: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: 10,
  },
  criticalChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.errorMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  criticalText: {
    ...typography.smallMd,
    color: colors.error,
  },
  filterWrap: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 32,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
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

export function getUnreadAlertCount(events: TraccarEvent[]): number {
  return events.filter(e =>
    ['alarm', 'deviceOverspeed', 'geofenceExit', 'deviceOffline'].includes(e.type),
  ).length;
}
