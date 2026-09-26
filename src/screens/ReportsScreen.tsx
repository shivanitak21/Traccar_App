import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  MapPin,
  Route,
  Activity,
  ParkingCircle,
  Navigation2,
  Navigation,
  Clock,
  Fuel,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  Check,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { GlassCard } from '../components/GlassCard';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { sanitizeBrandText } from '../utils/brandText';
import { elevaticsAPI, ElevaticsTrip, ElevaticsSummary, ElevaticsStop, ElevaticsEvent, ElevaticsPosition } from '../api/elevatics';
import { useFleetStore } from '../stores/fleetStore';
import { usePrefsStore } from '../stores/prefsStore';
import { useTabBarBottomInset } from '../utils/tabBarInset';
import { WebMapView } from '../components/WebMapView';
import { getThemeBaseMapLayer } from '../utils/mapTheme';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusChip } from '../components/ui/StatusChip';
import { ReportChart, MetricBar } from '../components/reports/ReportChart';
import {
  formatDistance,
  formatDuration,
  formatSpeed,
  formatFuel,
  formatCoordinate,
  normalizeDurationSec,
} from '../utils/units';

type ReportType = 'route' | 'trips' | 'summary' | 'stops' | 'events';

const REPORT_TYPES: { key: ReportType; label: string; icon: any; desc: string }[] = [
  { key: 'route', label: 'Route Report', icon: MapPin, desc: 'Map, speed chart & route highlights' },
  { key: 'trips', label: 'Trip Report', icon: Route, desc: 'Trip cards with distance trends' },
  { key: 'summary', label: 'Fleet Summary', icon: BarChart3, desc: 'Key metrics at a glance' },
  { key: 'stops', label: 'Stop Report', icon: ParkingCircle, desc: 'Stop durations & locations' },
  { key: 'events', label: 'Event Report', icon: Activity, desc: 'Event breakdown & timeline' },
];

const LIST_PAGE_SIZE = 8;

function sampleItems<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const step = Math.ceil(items.length / max);
  return items.filter((_, i) => i % step === 0 || i === items.length - 1);
}

function formatEventType(type: string): string {
  return type
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .replace(/^\w/, c => c.toUpperCase());
}

function getEventVariant(type: string): 'error' | 'warning' | 'info' | 'neutral' {
  const lower = type.toLowerCase();
  if (lower.includes('alarm') || lower.includes('overspeed') || lower.includes('panic')) return 'error';
  if (lower.includes('geofence') || lower.includes('ignition')) return 'warning';
  if (lower.includes('device')) return 'info';
  return 'neutral';
}

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Custom', value: 'custom' },
];

function getDateRange(range: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  switch (range) {
    case 'today': {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to };
    }
    case 'yesterday': {
      const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setHours(23, 59, 59, 999);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case '7d': {
      const start = new Date(now); start.setDate(start.getDate() - 7);
      return { from: start.toISOString(), to };
    }
    case '30d': {
      const start = new Date(now); start.setDate(start.getDate() - 30);
      return { from: start.toISOString(), to };
    }
    default:
      return { from: new Date(now.getTime() - 24 * 3600000).toISOString(), to };
  }
}

export const ReportsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const tabBarInset = useTabBarBottomInset(24);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isWide = windowWidth >= 700;
  const screenPad = windowWidth < 360 ? 16 : spacing.screenPadding;
  const mapHeight = Math.round(Math.min(Math.max(windowHeight * 0.32, 200), 340));
  const { devices, setDevices } = useFleetStore();
  const { prefs } = usePrefsStore();
  const [reportType, setReportType] = useState<ReportType>('route');
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<ElevaticsTrip[]>([]);
  const [summary, setSummary] = useState<ElevaticsSummary[]>([]);
  const [stops, setStops] = useState<ElevaticsStop[]>([]);
  const [events, setEvents] = useState<ElevaticsEvent[]>([]);
  const [routePositions, setRoutePositions] = useState<ElevaticsPosition[]>([]);
  const [page, setPage] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        await elevaticsAPI.initialize();
        const data = await elevaticsAPI.getDevices();
        setDevices(data);
        if (data.length > 0) {
          setSelectedDeviceId(prev => prev ?? data[0].id);
        }
      } catch (err) {
        console.error('Failed to load devices for reports:', err);
        setError('Could not load vehicles. Pull to refresh or re-login.');
      }
    };

    loadDevices();
  }, [setDevices]);

  const runReport = useCallback(async () => {
    if (!selectedDeviceId) {
      const msg = 'Select a vehicle first';
      setError(msg);
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Reports', msg);
      return;
    }

    setLoading(true);
    setHasLoaded(false);
    setShowResults(false);
    setError(null);
    setTrips([]);
    setSummary([]);
    setStops([]);
    setEvents([]);
    setRoutePositions([]);
    setPage(0);

    try {
      await elevaticsAPI.initialize();
      const { from, to } = getDateRange(dateRange);

      switch (reportType) {
        case 'route': {
          const data = await elevaticsAPI.getReportRoute(selectedDeviceId, from, to);
          const sorted = (Array.isArray(data) ? data : []).sort(
            (a, b) => new Date(a.fixTime).getTime() - new Date(b.fixTime).getTime()
          );
          setRoutePositions(sorted);
          break;
        }
        case 'trips': {
          const data = await elevaticsAPI.getReportTrips(selectedDeviceId, from, to);
          setTrips(Array.isArray(data) ? data : []);
          break;
        }
        case 'summary': {
          const data = await elevaticsAPI.getReportSummary(selectedDeviceId, from, to);
          setSummary(Array.isArray(data) ? data : []);
          break;
        }
        case 'stops': {
          const data = await elevaticsAPI.getReportStops(selectedDeviceId, from, to);
          setStops(Array.isArray(data) ? data : []);
          break;
        }
        case 'events': {
          const data = await elevaticsAPI.getReportEvents(selectedDeviceId, from, to);
          setEvents(Array.isArray(data) ? data : []);
          break;
        }
      }
      setHasLoaded(true);
      setShowResults(true);
    } catch (err: any) {
      const msg = sanitizeBrandText(err?.message || 'Failed to generate report');
      console.error('Report error:', err);
      setError(msg);
      setHasLoaded(true);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  }, [selectedDeviceId, reportType, dateRange]);

  const visibleTrips = trips.slice(0, (page + 1) * LIST_PAGE_SIZE);
  const visibleStops = stops.slice(0, (page + 1) * LIST_PAGE_SIZE);
  const visibleEvents = events.slice(0, (page + 1) * LIST_PAGE_SIZE);

  const tripChartData = useMemo(() => {
    const slice = trips.slice(0, 12);
    return {
      labels: slice.map((_, i) => `#${i + 1}`),
      values: slice.map(t => t.distance),
    };
  }, [trips]);

  const stopChartData = useMemo(() => {
    const slice = stops.slice(0, 10);
    return {
      labels: slice.map((_, i) => `S${i + 1}`),
      values: slice.map(s => normalizeDurationSec(s.duration) / 60),
    };
  }, [stops]);

  const eventBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [events]);

  const routeChartData = useMemo(() => {
    const sampled = sampleItems(routePositions, 20);
    return {
      labels: sampled.map(p => new Date(p.fixTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
      values: sampled.map(p => p.speed || 0),
    };
  }, [routePositions]);

  const routePolyline = useMemo(() => {
    if (routePositions.length < 2) return [];
    return [{
      id: 'route',
      coordinates: routePositions.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
      color: colors.primary,
      width: 4,
    }];
  }, [routePositions, colors.primary]);

  const routeMarkers = useMemo(() => {
    if (routePositions.length === 0) return [];
    const start = routePositions[0];
    const end = routePositions[routePositions.length - 1];
    return [
      {
        id: 'route-start',
        latitude: start.latitude,
        longitude: start.longitude,
        title: 'Start',
        color: colors.success,
      },
      {
        id: 'route-end',
        latitude: end.latitude,
        longitude: end.longitude,
        title: 'End',
        color: colors.error,
      },
    ];
  }, [routePositions, colors.success, colors.error]);

  const routeMapCenter = useMemo(() => {
    if (routePositions.length === 0) return undefined;
    const mid = routePositions[Math.floor(routePositions.length / 2)];
    return { latitude: mid.latitude, longitude: mid.longitude };
  }, [routePositions]);

  const styles = useMemo(() => StyleSheet.create({
    safeArea: { flex: 1 },
    scrollContent: {
      paddingHorizontal: screenPad,
      paddingBottom: tabBarInset,
    },
    section: { marginBottom: 28 },
    sectionLabel: {
      ...typography.sectionLabel,
      color: colors.text.tertiary,
      marginBottom: 12,
      letterSpacing: 0.6,
    },
    reportTypeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -5,
    },
    reportTypeSlot: {
      width: isWide ? '33.333%' : '50%',
      padding: 5,
    },
    reportTypeCard: {
      minHeight: 72,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderWidth: 1.5,
      borderColor: colors.border.subtle,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    reportTypeCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    reportTypeLabel: {
      ...typography.captionMd,
      color: colors.text.secondary,
    },
    reportTypeDesc: {
      ...typography.tiny,
      color: colors.text.tertiary,
      lineHeight: 15,
    },
    vehicleList: {
      gap: 8,
    },
    vehicleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.default,
      marginRight: 8,
    },
    vehicleChipActive: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    vehicleChipText: {
      ...typography.captionMd,
      color: colors.text.tertiary,
      flexShrink: 1,
      maxWidth: Math.min(220, Math.max(96, windowWidth * 0.55)),
    },
    dateRangeRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    dateRangeChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    dateRangeChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    dateRangeText: {
      ...typography.captionMd,
      color: colors.text.tertiary,
    },
    runSection: {
      alignItems: 'stretch',
    },
    runButton: {
      alignSelf: 'stretch',
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.primary,
    },
    runFill: {
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    runContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    runText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.1,
    },
    runButtonPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.9,
    },
    runButtonDisabled: {
      opacity: 0.5,
    },
    resultsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    resultCount: {
      ...typography.caption,
      color: colors.text.tertiary,
    },
    errorBanner: {
      backgroundColor: colors.errorMuted,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.2)',
    },
    errorText: {
      ...typography.caption,
      color: colors.error,
    },
    noDevicesHint: {
      ...typography.caption,
      color: colors.text.tertiary,
      paddingVertical: 8,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 12,
    },
    metricHalf: { width: '47%' },
    mapContainer: {
      height: mapHeight,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingTop: 8,
      paddingBottom: 12,
      alignSelf: 'flex-start',
    },
    backText: {
      ...typography.captionMd,
      color: colors.text.secondary,
    },
    resultTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 18,
    },
    resultTitle: {
      ...typography.h2,
      color: colors.text.primary,
      flex: 1,
    },
    countBadge: {
      backgroundColor: colors.primaryMuted,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      flexShrink: 0,
      maxWidth: '46%',
    },
    countBadgeText: {
      ...typography.captionMd,
      color: colors.primary,
      fontWeight: '600',
    },
    loadMoreBtn: {
      alignItems: 'center',
      paddingVertical: 12,
      marginTop: 4,
      gap: 4,
    },
    loadMoreText: {
      ...typography.smallMd,
      color: colors.primary,
      fontWeight: '600',
    },
    breakdownCard: {
      padding: 16,
      marginBottom: 12,
      gap: 4,
    },
    breakdownTitle: {
      ...typography.captionMd,
      color: colors.text.primary,
      fontWeight: '600',
      marginBottom: 8,
    },
  }), [colors, tabBarInset, screenPad, isWide, windowWidth, mapHeight]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!showResults && (
          <>
          <Animated.View entering={FadeInDown.delay(0).duration(450)}>
            <ScreenHeader
              title="Reports"
              subtitle="Fleet performance & activity"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(450)} style={styles.section}>
            <Text style={styles.sectionLabel}>Filters</Text>
            <View style={styles.reportTypeGrid}>
              {REPORT_TYPES.map(rt => {
                const active = reportType === rt.key;
                return (
                  <Pressable
                    key={rt.key}
                    onPress={() => setReportType(rt.key)}
                    style={styles.reportTypeSlot}
                  >
                    <View style={[
                      styles.reportTypeCard,
                      active && styles.reportTypeCardActive,
                    ]}>
                      <rt.icon
                        size={18}
                        color={active ? colors.primary : colors.text.tertiary}
                        strokeWidth={1.8}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.reportTypeLabel,
                            active && { color: colors.text.primary },
                          ]}
                        >
                          {rt.label}
                        </Text>
                        <Text style={styles.reportTypeDesc} numberOfLines={3}>{rt.desc}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.section}>
            <Text style={styles.sectionLabel}>Vehicle</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vehicleList}
            >
              {devices.map(device => {
                const active = selectedDeviceId === device.id;
                return (
                  <Pressable
                    key={device.id}
                    onPress={() => setSelectedDeviceId(device.id)}
                    style={[
                      styles.vehicleChip,
                      active && styles.vehicleChipActive,
                    ]}
                  >
                    {active ? (
                      <Check size={14} color={colors.primary} strokeWidth={2.4} />
                    ) : (
                      <Navigation size={14} color={colors.text.tertiary} strokeWidth={1.8} />
                    )}
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.vehicleChipText,
                        active && { color: colors.text.primary },
                      ]}
                    >
                      {device.name}
                    </Text>
                  </Pressable>
                );
              })}
              {devices.length === 0 && (
                <Text style={styles.noDevicesHint}>No vehicles loaded yet...</Text>
              )}
            </ScrollView>
          </Animated.View>

          {error && !showResults && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Animated.View entering={FadeInDown.delay(180).duration(450)} style={styles.section}>
            <Text style={styles.sectionLabel}>Time Period</Text>
            <View style={styles.dateRangeRow}>
              {DATE_RANGES.slice(0, 4).map(r => (
                <Pressable
                  key={r.value}
                  onPress={() => setDateRange(r.value)}
                  style={[
                    styles.dateRangeChip,
                    dateRange === r.value && styles.dateRangeChipActive,
                  ]}
                >
                  <Text style={[
                    styles.dateRangeText,
                    dateRange === r.value && { color: colors.text.inverse },
                  ]}>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).duration(450)} style={[styles.section, styles.runSection]}>
            <Pressable
              onPress={runReport}
              disabled={loading || !selectedDeviceId}
              style={({ pressed }) => [
                styles.runButton,
                pressed && styles.runButtonPressed,
                (loading || !selectedDeviceId) && styles.runButtonDisabled,
              ]}
            >
              <View style={styles.runFill}>
                {loading ? (
                  <Text style={styles.runText}>Generating...</Text>
                ) : (
                  <View style={styles.runContent}>
                    <Sparkles size={16} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.runText}>Generate Report</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </Animated.View>
          </>
          )}

          {showResults && hasLoaded && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.section}>
              <Pressable
                onPress={() => setShowResults(false)}
                style={styles.backRow}
                accessibilityRole="button"
                accessibilityLabel="Back to filters"
              >
                <ChevronLeft size={18} color={colors.text.secondary} strokeWidth={2} />
                <Text style={styles.backText}>Back to filters</Text>
              </Pressable>
              <View style={styles.resultTitleRow}>
                <Text style={styles.resultTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {reportType === 'route' ? 'Trip Log'
                    : reportType === 'trips' ? 'Trip Report'
                    : reportType === 'summary' ? 'Fleet Summary'
                    : reportType === 'stops' ? 'Stop Report'
                    : 'Event Report'}
                </Text>
                {reportType === 'route' && routePositions.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText} numberOfLines={1}>{routePositions.length} points</Text>
                  </View>
                )}
                {reportType === 'trips' && trips.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{trips.length} trips</Text>
                  </View>
                )}
                {reportType === 'stops' && stops.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{stops.length} stops</Text>
                  </View>
                )}
                {reportType === 'events' && events.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{events.length} events</Text>
                  </View>
                )}
              </View>

              {!error && reportType === 'route' && (
                routePositions.length === 0 ? (
                  <EmptyResult message="No route points found for this period" />
                ) : (
                  <>
                    <RouteOverview positions={routePositions} prefs={prefs} />
                    {routeMapCenter && routePolyline.length > 0 && (
                      <View style={styles.mapContainer}>
                        <WebMapView
                          markers={routeMarkers}
                          polylines={routePolyline}
                          center={routeMapCenter}
                          zoom={12}
                          mapLayer={getThemeBaseMapLayer(isDark)}
                          fitToMarkers
                        />
                      </View>
                    )}
                    {routeChartData.values.length > 1 && (
                      <ReportChart
                        title="Speed Profile"
                        subtitle="Sampled over selected period"
                        labels={routeChartData.labels}
                        values={routeChartData.values}
                        type="line"
                        color={colors.blue}
                        valueFormatter={v => formatSpeed(v, prefs.speedUnit)}
                      />
                    )}
                    <RouteHighlights positions={routePositions} prefs={prefs} />
                  </>
                )
              )}

              {!error && reportType === 'trips' && (
                trips.length === 0 ? (
                  <EmptyResult message="No trips found for this period" />
                ) : (
                  <>
                    <TripsSummaryCard trips={trips} prefs={prefs} />
                    {tripChartData.values.length > 0 && (
                      <ReportChart
                        title="Trip Distances"
                        subtitle={`First ${tripChartData.values.length} trips`}
                        labels={tripChartData.labels}
                        values={tripChartData.values}
                        type="bar"
                        color={colors.primary}
                        valueFormatter={v => formatDistance(v, prefs.distanceUnit, 0)}
                      />
                    )}
                    {visibleTrips.map((trip, i) => (
                      <TripRow key={`${trip.startTime}-${i}`} trip={trip} index={i} />
                    ))}
                    {visibleTrips.length < trips.length && (
                      <LoadMoreButton
                        label={`Show more trips (${trips.length - visibleTrips.length} left)`}
                        onPress={() => setPage(p => p + 1)}
                      />
                    )}
                  </>
                )
              )}

              {!error && reportType === 'summary' && (
                summary.length === 0 ? (
                  <EmptyResult message="No data found for this period" />
                ) : (
                  summary.map((row, i) => (
                    <SummaryVisual key={`${row.deviceId}-${i}`} data={row} prefs={prefs} />
                  ))
                )
              )}

              {!error && reportType === 'stops' && (
                stops.length === 0 ? (
                  <EmptyResult message="No stops found for this period" />
                ) : (
                  <>
                    <StopsOverview stops={stops} />
                    {stopChartData.values.length > 0 && (
                      <ReportChart
                        title="Stop Durations"
                        subtitle="Minutes per stop"
                        labels={stopChartData.labels}
                        values={stopChartData.values}
                        type="bar"
                        color={colors.warning}
                        valueFormatter={v => `${Math.round(v)}m`}
                      />
                    )}
                    {visibleStops.map((stop, i) => (
                      <StopRow key={`${stop.startTime}-${i}`} stop={stop} />
                    ))}
                    {visibleStops.length < stops.length && (
                      <LoadMoreButton
                        label={`Show more stops (${stops.length - visibleStops.length} left)`}
                        onPress={() => setPage(p => p + 1)}
                      />
                    )}
                  </>
                )
              )}

              {!error && reportType === 'events' && (
                events.length === 0 ? (
                  <EmptyResult message="No events found for this period" />
                ) : (
                  <>
                    <EventsOverview events={events} breakdown={eventBreakdown} />
                    {eventBreakdown.length > 0 && (
                      <GlassCard style={styles.breakdownCard}>
                        <Text style={styles.breakdownTitle}>By Event Type</Text>
                        {eventBreakdown.map(([type, count], i) => (
                          <MetricBar
                            key={type}
                            label={formatEventType(type)}
                            value={count}
                            max={eventBreakdown[0][1]}
                            display={`${count}`}
                            color={colors.chart[i % colors.chart.length]}
                          />
                        ))}
                      </GlassCard>
                    )}
                    {visibleEvents.map((event, i) => (
                      <EventRow key={`${event.id}-${i}`} event={event} />
                    ))}
                    {visibleEvents.length < events.length && (
                      <LoadMoreButton
                        label={`Show more events (${events.length - visibleEvents.length} left)`}
                        onPress={() => setPage(p => p + 1)}
                      />
                    )}
                  </>
                )
              )}
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
};

// ── Report sub-components ─────────────────────────────────────────────────────

const TripsSummaryCard: React.FC<{ trips: ElevaticsTrip[]; prefs: ReturnType<typeof usePrefsStore.getState>['prefs'] }> = ({ trips, prefs }) => {
  const { colors } = useTheme();
  const totalDist = trips.reduce((s, t) => s + (t.distance || 0), 0);
  const totalTime = trips.reduce((s, t) => s + normalizeDurationSec(t.duration), 0);
  const maxSpeed = Math.max(...trips.map(t => t.maxSpeed || 0));
  const totalFuel = trips.reduce((s, t) => s + (t.spentFuel || 0), 0);

  const tscStyles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(16,185,129,0.2)',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      flexWrap: 'wrap',
      gap: 12,
    },
    stat: {
      alignItems: 'center',
      gap: 4,
      minWidth: 70,
    },
    statValue: {
      ...typography.captionMd,
      color: colors.text.primary,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      ...typography.tiny,
      color: colors.text.tertiary,
      textAlign: 'center',
    },
  }), [colors]);

  return (
    <View style={tscStyles.card}>
      <View style={tscStyles.row}>
        <View style={tscStyles.stat}>
          <Navigation2 size={16} color={colors.primary} strokeWidth={1.8} />
          <Text style={tscStyles.statValue}>{formatDistance(totalDist, prefs.distanceUnit)}</Text>
          <Text style={tscStyles.statLabel}>Total Distance</Text>
        </View>
        <View style={tscStyles.stat}>
          <Clock size={16} color={colors.blue} strokeWidth={1.8} />
          <Text style={tscStyles.statValue}>{formatDuration(totalTime)}</Text>
          <Text style={tscStyles.statLabel}>Drive Time</Text>
        </View>
        <View style={tscStyles.stat}>
          <TrendingUp size={16} color={colors.accent} strokeWidth={1.8} />
          <Text style={tscStyles.statValue}>{formatSpeed(maxSpeed, prefs.speedUnit)}</Text>
          <Text style={tscStyles.statLabel}>Max Speed</Text>
        </View>
        {totalFuel > 0 && (
          <View style={tscStyles.stat}>
            <Fuel size={16} color={colors.error} strokeWidth={1.8} />
            <Text style={tscStyles.statValue}>{formatFuel(totalFuel, prefs.fuelUnit)}</Text>
            <Text style={tscStyles.statLabel}>Fuel Used</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const LoadMoreButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    btn: { alignItems: 'center', paddingVertical: 12, marginTop: 4, gap: 4 },
    text: { ...typography.smallMd, color: colors.primary, fontWeight: '600' },
  }), [colors]);

  return (
    <Pressable onPress={onPress} style={styles.btn}>
      <Text style={styles.text}>{label}</Text>
      <ChevronDown size={16} color={colors.primary} strokeWidth={2} />
    </Pressable>
  );
};

const RouteOverview: React.FC<{
  positions: ElevaticsPosition[];
  prefs: ReturnType<typeof usePrefsStore.getState>['prefs'];
}> = ({ positions, prefs }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const stacked = width < 400;
  const maxSpeed = Math.max(...positions.map(p => p.speed || 0));
  const avgSpeed = positions.reduce((s, p) => s + (p.speed || 0), 0) / Math.max(positions.length, 1);
  const start = positions[0];
  const end = positions[positions.length - 1];
  const spanSec = start && end
    ? (new Date(end.fixTime).getTime() - new Date(start.fixTime).getTime()) / 1000
    : 0;

  const stats = [
    { label: 'GPS Points', value: String(positions.length) },
    { label: 'Duration', value: formatDuration(spanSec) },
    { label: 'Avg Speed', value: formatSpeed(avgSpeed, prefs.speedUnit) },
    { label: 'Max Speed', value: formatSpeed(maxSpeed, prefs.speedUnit) },
  ];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
      {stats.map(stat => (
        <View
          key={stat.label}
          style={{
            width: stacked ? '50%' : '25%',
            gap: 4,
            paddingRight: 8,
            marginBottom: stacked ? 12 : 0,
          }}
        >
          <Text
            style={{ ...typography.metricSm, fontSize: stacked ? 20 : 22, lineHeight: stacked ? 24 : 26, color: colors.text.primary }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {stat.value}
          </Text>
          <Text style={{ ...typography.tiny, color: colors.text.tertiary }} numberOfLines={1}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
};

const RouteHighlights: React.FC<{
  positions: ElevaticsPosition[];
  prefs: ReturnType<typeof usePrefsStore.getState>['prefs'];
}> = ({ positions, prefs }) => {
  const { colors } = useTheme();
  const start = positions[0];
  const end = positions[positions.length - 1];
  const peak = positions.reduce((best, p) => ((p.speed || 0) > (best.speed || 0) ? p : best), positions[0]);

  const styles = useMemo(() => StyleSheet.create({
    card: { padding: 16, marginBottom: 8, gap: 4, borderRadius: 16 },
    title: { ...typography.h4, color: colors.text.primary, marginBottom: 8 },
    row: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
    rail: { width: 14, alignItems: 'center' },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    line: { width: 2, flex: 1, backgroundColor: colors.border.default, marginTop: 4, marginBottom: -4 },
    info: { flex: 1, gap: 2, paddingBottom: 14 },
    label: { ...typography.captionMd, color: colors.text.primary, fontWeight: '600' },
    time: { ...typography.smallMd, color: colors.text.secondary, fontVariant: ['tabular-nums'] },
    detail: { ...typography.small, color: colors.text.tertiary },
  }), [colors]);

  const items = [
    { label: 'Start', color: colors.success, position: start },
    { label: 'Peak Speed', color: colors.warning, position: peak, extra: formatSpeed(peak.speed, prefs.speedUnit) },
    { label: 'End', color: colors.error, position: end },
  ];

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>Route Highlights</Text>
      {items.map((item, index) => (
        <View key={item.label} style={styles.row}>
          <View style={styles.rail}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            {index < items.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.info}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.time}>{new Date(item.position.fixTime).toLocaleString()}</Text>
            <Text style={styles.detail} numberOfLines={2}>
              {item.position.address
                || `${formatCoordinate(item.position.latitude, prefs.coordinateFormat)}, ${formatCoordinate(item.position.longitude, prefs.coordinateFormat)}`}
              {item.extra ? ` · ${item.extra}` : ''}
            </Text>
          </View>
        </View>
      ))}
    </GlassCard>
  );
};

const StopsOverview: React.FC<{ stops: ElevaticsStop[] }> = ({ stops }) => {
  const { colors } = useTheme();
  const totalDuration = stops.reduce((s, stop) => s + normalizeDurationSec(stop.duration), 0);
  const longest = stops.reduce((best, stop) =>
    normalizeDurationSec(stop.duration) > normalizeDurationSec(best.duration) ? stop : best, stops[0]);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
      <MetricCard
        style={{ width: '47%' }}
        size="sm"
        label="Total Stops"
        value={stops.length}
        icon={<ParkingCircle size={18} color={colors.warning} strokeWidth={1.8} />}
        accent={colors.warning}
      />
      <MetricCard
        style={{ width: '47%' }}
        size="sm"
        label="Parked Time"
        value={formatDuration(totalDuration)}
        icon={<Clock size={18} color={colors.blue} strokeWidth={1.8} />}
        accent={colors.blue}
      />
      <MetricCard
        style={{ width: '100%' }}
        size="sm"
        label="Longest Stop"
        value={formatDuration(normalizeDurationSec(longest.duration))}
        icon={<MapPin size={18} color={colors.primary} strokeWidth={1.8} />}
        accent={colors.primary}
      />
    </View>
  );
};

const EventsOverview: React.FC<{
  events: ElevaticsEvent[];
  breakdown: [string, number][];
}> = ({ events, breakdown }) => {
  const { colors } = useTheme();
  const topType = breakdown[0]?.[0];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
      <MetricCard
        style={{ width: '47%' }}
        size="sm"
        label="Total Events"
        value={events.length}
        icon={<Activity size={18} color={colors.blue} strokeWidth={1.8} />}
        accent={colors.blue}
      />
      <MetricCard
        style={{ width: '47%' }}
        size="sm"
        label="Event Types"
        value={breakdown.length}
        icon={<BarChart3 size={18} color={colors.primary} strokeWidth={1.8} />}
        accent={colors.primary}
      />
      {topType && (
        <MetricCard
          style={{ width: '100%' }}
          size="sm"
          label="Most Common"
          value={formatEventType(topType)}
          icon={<AlertTriangle size={18} color={colors.warning} strokeWidth={1.8} />}
          accent={colors.warning}
        />
      )}
    </View>
  );
};

const EventRow: React.FC<{ event: ElevaticsEvent }> = ({ event }) => {
  const { colors } = useTheme();
  const variant = getEventVariant(event.type);

  const styles = useMemo(() => StyleSheet.create({
    card: { padding: 12, marginBottom: 6, gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    time: { ...typography.small, color: colors.text.tertiary, fontVariant: ['tabular-nums'] },
  }), [colors]);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <StatusChip label={formatEventType(event.type)} variant={variant} size="sm" />
        <Text style={styles.time}>{new Date(event.eventTime).toLocaleString()}</Text>
      </View>
    </GlassCard>
  );
};

const SummaryVisual: React.FC<{
  data: ElevaticsSummary;
  prefs: ReturnType<typeof usePrefsStore.getState>['prefs'];
}> = ({ data, prefs }) => {
  const { colors } = useTheme();
  const metrics = [
    { label: 'Distance', value: data.distance, display: formatDistance(data.distance, prefs.distanceUnit), color: colors.primary },
    { label: 'Max Speed', value: data.maxSpeed, display: formatSpeed(data.maxSpeed, prefs.speedUnit), color: colors.warning },
    { label: 'Avg Speed', value: data.averageSpeed, display: formatSpeed(data.averageSpeed, prefs.speedUnit), color: colors.blue },
    ...(data.engineHours ? [{ label: 'Engine Hours', value: data.engineHours, display: `${data.engineHours.toFixed(1)} h`, color: colors.success }] : []),
    ...(data.spentFuel && data.spentFuel > 0 ? [{ label: 'Fuel Used', value: data.spentFuel, display: formatFuel(data.spentFuel, prefs.fuelUnit), color: colors.error }] : []),
  ];
  const maxMetric = Math.max(...metrics.map(m => m.value), 1);

  const styles = useMemo(() => StyleSheet.create({
    card: { padding: 16, marginBottom: 12, gap: 12 },
    device: { ...typography.h4, color: colors.text.primary },
    subtitle: { ...typography.small, color: colors.text.tertiary, marginTop: -6 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metricBox: {
      width: '47%',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    metricValue: { ...typography.captionMd, color: colors.text.primary, fontWeight: '700', fontVariant: ['tabular-nums'] },
    metricLabel: { ...typography.tiny, color: colors.text.tertiary },
  }), [colors]);

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.device}>{data.deviceName}</Text>
      <Text style={styles.subtitle}>Performance breakdown</Text>

      <View style={styles.grid}>
        {metrics.slice(0, 4).map(metric => (
          <View key={metric.label} style={styles.metricBox}>
            <Text style={styles.metricValue}>{metric.display}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      {metrics.map(metric => (
        <MetricBar
          key={metric.label}
          label={metric.label}
          value={metric.value}
          max={maxMetric}
          display={metric.display}
          color={metric.color}
        />
      ))}
    </GlassCard>
  );
};

const TripRow: React.FC<{ trip: ElevaticsTrip; index: number }> = ({ trip, index }) => {
  const { colors } = useTheme();
  const { prefs } = usePrefsStore();

  const trStyles = useMemo(() => StyleSheet.create({
    card: {
      padding: 14,
      marginBottom: 8,
      gap: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    indexBadge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    indexText: {
      ...typography.smallMd,
      color: colors.primary,
      fontWeight: '700',
    },
    info: {
      flex: 1,
      gap: 2,
    },
    startTime: {
      ...typography.smallMd,
      color: colors.text.secondary,
      fontVariant: ['tabular-nums'],
    },
    startAddr: {
      ...typography.small,
      color: colors.text.tertiary,
    },
    distBadge: {
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    dist: {
      ...typography.smallMd,
      color: colors.primary,
      fontVariant: ['tabular-nums'],
    },
    statsRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    stat: {
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      alignItems: 'center',
      minWidth: 72,
    },
    statVal: {
      ...typography.smallMd,
      color: colors.text.primary,
      fontVariant: ['tabular-nums'],
    },
    statLbl: {
      ...typography.tiny,
      color: colors.text.tertiary,
    },
    endRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    endAddr: {
      ...typography.small,
      color: colors.text.tertiary,
      flex: 1,
    },
  }), [colors]);

  return (
    <GlassCard style={trStyles.card}>
      <View style={trStyles.header}>
        <View style={trStyles.indexBadge}>
          <Text style={trStyles.indexText}>{index + 1}</Text>
        </View>
        <View style={trStyles.info}>
          <Text style={trStyles.startTime}>
            {new Date(trip.startTime).toLocaleString()}
          </Text>
          <Text style={trStyles.startAddr} numberOfLines={1}>
            {trip.startAddress || `${trip.startLat?.toFixed(4)}, ${trip.startLon?.toFixed(4)}`}
          </Text>
        </View>
        <View style={trStyles.distBadge}>
          <Text style={trStyles.dist}>{formatDistance(trip.distance, prefs.distanceUnit)}</Text>
        </View>
      </View>

      <View style={trStyles.statsRow}>
        <View style={trStyles.stat}>
          <Text style={trStyles.statVal}>{formatDuration(normalizeDurationSec(trip.duration))}</Text>
          <Text style={trStyles.statLbl}>Duration</Text>
        </View>
        <View style={trStyles.stat}>
          <Text style={trStyles.statVal}>{formatSpeed(trip.averageSpeed, prefs.speedUnit)}</Text>
          <Text style={trStyles.statLbl}>Avg Speed</Text>
        </View>
        <View style={trStyles.stat}>
          <Text style={trStyles.statVal}>{formatSpeed(trip.maxSpeed, prefs.speedUnit)}</Text>
          <Text style={trStyles.statLbl}>Max Speed</Text>
        </View>
        {trip.spentFuel != null && trip.spentFuel > 0 && (
          <View style={trStyles.stat}>
            <Text style={trStyles.statVal}>{formatFuel(trip.spentFuel, prefs.fuelUnit)}</Text>
            <Text style={trStyles.statLbl}>Fuel</Text>
          </View>
        )}
      </View>

      {trip.endAddress && (
        <View style={trStyles.endRow}>
          <Navigation2 size={11} color={colors.error} strokeWidth={2} />
          <Text style={trStyles.endAddr} numberOfLines={1}>{trip.endAddress}</Text>
        </View>
      )}
    </GlassCard>
  );
};

const StopRow: React.FC<{ stop: ElevaticsStop }> = ({ stop }) => {
  const { colors } = useTheme();

  const stStyles = useMemo(() => StyleSheet.create({
    card: { padding: 12, marginBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dotWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: 'rgba(245,158,11,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
    info: { flex: 1, gap: 2 },
    addr: { ...typography.bodyMd, color: colors.text.primary },
    time: { ...typography.small, color: colors.text.tertiary, fontVariant: ['tabular-nums'] },
    dur: { ...typography.captionMd, color: colors.accent, fontVariant: ['tabular-nums'] },
  }), [colors]);

  return (
    <GlassCard style={stStyles.card}>
      <View style={stStyles.row}>
        <View style={stStyles.dotWrap}>
          <View style={stStyles.dot} />
        </View>
        <View style={stStyles.info}>
          <Text style={stStyles.addr} numberOfLines={1}>
            {stop.address || `${stop.lat?.toFixed(4)}, ${stop.lon?.toFixed(4)}`}
          </Text>
          <Text style={stStyles.time}>
            {new Date(stop.startTime).toLocaleTimeString()} — {new Date(stop.endTime).toLocaleTimeString()}
          </Text>
        </View>
        <Text style={stStyles.dur}>{formatDuration(normalizeDurationSec(stop.duration))}</Text>
      </View>
    </GlassCard>
  );
};

const EmptyResult: React.FC<{ message: string }> = ({ message }) => {
  const { colors } = useTheme();

  return (
    <EmptyState
      icon={<BarChart3 size={28} color={colors.text.tertiary} strokeWidth={1.5} />}
      title="No results"
      subtitle={message}
    />
  );
};
