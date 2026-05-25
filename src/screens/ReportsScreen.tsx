import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  MapPin,
  Route,
  Activity,
  ParkingCircle,
  Calendar,
  ChevronRight,
  ChevronDown,
  Navigation2,
  Navigation,
  Clock,
  Fuel,
  TrendingUp,
  BarChart3,
  Download,
  Play,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { GlassCard } from '../components/GlassCard';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { StatusChip } from '../components/ui/StatusChip';
import { traccarAPI, TraccarTrip, TraccarSummary, TraccarStop, TraccarEvent, TraccarPosition } from '../api/traccar';
import { useFleetStore } from '../stores/fleetStore';
import { usePrefsStore } from '../stores/prefsStore';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
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
  { key: 'route', label: 'Route Report', icon: MapPin, desc: 'Position-by-position route table' },
  { key: 'trips', label: 'Trip Report', icon: Route, desc: 'Start/end points, distance, duration' },
  { key: 'summary', label: 'Fleet Summary', icon: BarChart3, desc: 'Distance, fuel, engine hours' },
  { key: 'stops', label: 'Stop Report', icon: ParkingCircle, desc: 'Parking locations and durations' },
  { key: 'events', label: 'Event Report', icon: Activity, desc: 'All device events and alerts' },
];

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

function getAttr(position: TraccarPosition, key: string): string {
  const val = position.attributes?.[key];
  if (val === undefined || val === null) return '—';
  return String(val);
}

export const ReportsScreen: React.FC = () => {
  const { devices, setDevices } = useFleetStore();
  const { prefs } = usePrefsStore();
  const [reportType, setReportType] = useState<ReportType>('route');
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<TraccarTrip[]>([]);
  const [summary, setSummary] = useState<TraccarSummary[]>([]);
  const [stops, setStops] = useState<TraccarStop[]>([]);
  const [events, setEvents] = useState<TraccarEvent[]>([]);
  const [routePositions, setRoutePositions] = useState<TraccarPosition[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        await traccarAPI.initialize();
        const data = await traccarAPI.getDevices();
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
    setError(null);
    setTrips([]);
    setSummary([]);
    setStops([]);
    setEvents([]);
    setRoutePositions([]);
    setPage(0);

    try {
      await traccarAPI.initialize();
      const { from, to } = getDateRange(dateRange);

      switch (reportType) {
        case 'route': {
          const data = await traccarAPI.getReportRoute(selectedDeviceId, from, to);
          const sorted = (Array.isArray(data) ? data : []).sort(
            (a, b) => new Date(a.fixTime).getTime() - new Date(b.fixTime).getTime()
          );
          setRoutePositions(sorted);
          break;
        }
        case 'trips': {
          const data = await traccarAPI.getReportTrips(selectedDeviceId, from, to);
          setTrips(Array.isArray(data) ? data : []);
          break;
        }
        case 'summary': {
          const data = await traccarAPI.getReportSummary(selectedDeviceId, from, to);
          setSummary(Array.isArray(data) ? data : []);
          break;
        }
        case 'stops': {
          const data = await traccarAPI.getReportStops(selectedDeviceId, from, to);
          setStops(Array.isArray(data) ? data : []);
          break;
        }
        case 'events': {
          const data = await traccarAPI.getReportEvents(selectedDeviceId, from, to);
          setEvents(Array.isArray(data) ? data : []);
          break;
        }
      }
      setHasLoaded(true);
    } catch (err: any) {
      const msg = err?.message || 'Failed to generate report';
      console.error('Report error:', err);
      setError(msg);
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [selectedDeviceId, reportType, dateRange]);

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  const totalPages = Math.max(1, Math.ceil(
    (reportType === 'route' ? routePositions.length
      : reportType === 'trips' ? trips.length
      : reportType === 'stops' ? stops.length
      : reportType === 'events' ? events.length
      : summary.length) / PAGE_SIZE
  ));

  const pagedRoute = routePositions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pagedTrips = trips.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pagedStops = stops.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pagedEvents = events.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const routeColumns: DataTableColumn<TraccarPosition>[] = [
    { key: 'fixTime', label: 'Fix Time', width: 150, render: r => new Date(r.fixTime).toLocaleString() },
    { key: 'latitude', label: 'Latitude', width: 110, render: r => formatCoordinate(r.latitude, prefs.coordinateFormat) },
    { key: 'longitude', label: 'Longitude', width: 110, render: r => formatCoordinate(r.longitude, prefs.coordinateFormat) },
    { key: 'speed', label: 'Speed', width: 90, render: r => formatSpeed(r.speed, prefs.speedUnit) },
    { key: 'course', label: 'Course', width: 70, render: r => `${Math.round(r.course || 0)}°` },
    { key: 'address', label: 'Address', width: 180, render: r => r.address || '—' },
    { key: 'valid', label: 'Valid', width: 60, render: r => (r.valid ? 'Yes' : 'No') },
    { key: 'ignition', label: 'Ignition', width: 70, render: r => getAttr(r, 'ignition') },
    { key: 'motion', label: 'Motion', width: 70, render: r => getAttr(r, 'motion') },
    { key: 'distance', label: 'Distance', width: 100, render: r => formatDistance(Number(getAttr(r, 'distance') === '—' ? 0 : getAttr(r, 'distance')), prefs.distanceUnit) },
  ];

  const tripColumns: DataTableColumn<TraccarTrip>[] = [
    { key: 'startTime', label: 'Start', width: 150, render: r => new Date(r.startTime).toLocaleString() },
    { key: 'endTime', label: 'End', width: 150, render: r => new Date(r.endTime).toLocaleString() },
    { key: 'driverName', label: 'Driver', width: 120, render: r => r.driverName || '—' },
    { key: 'distance', label: 'Distance', width: 100, render: r => formatDistance(r.distance, prefs.distanceUnit) },
    { key: 'duration', label: 'Duration', width: 90, render: r => formatDuration(normalizeDurationSec(r.duration)) },
    { key: 'averageSpeed', label: 'Avg Speed', width: 100, render: r => formatSpeed(r.averageSpeed, prefs.speedUnit) },
    { key: 'maxSpeed', label: 'Max Speed', width: 100, render: r => formatSpeed(r.maxSpeed, prefs.speedUnit) },
    { key: 'startAddress', label: 'Start Address', width: 180, render: r => r.startAddress || '—' },
    { key: 'endAddress', label: 'End Address', width: 180, render: r => r.endAddress || '—' },
  ];

  const stopColumns: DataTableColumn<TraccarStop>[] = [
    { key: 'startTime', label: 'Start', width: 150, render: r => new Date(r.startTime).toLocaleString() },
    { key: 'endTime', label: 'End', width: 150, render: r => new Date(r.endTime).toLocaleString() },
    { key: 'duration', label: 'Duration', width: 90, render: r => formatDuration(normalizeDurationSec(r.duration)) },
    { key: 'address', label: 'Address', width: 200, render: r => r.address || '—' },
  ];

  const summaryColumns: DataTableColumn<TraccarSummary>[] = [
    { key: 'deviceName', label: 'Vehicle', width: 140, render: r => r.deviceName },
    { key: 'distance', label: 'Distance', width: 100, render: r => formatDistance(r.distance, prefs.distanceUnit) },
    { key: 'averageSpeed', label: 'Avg Speed', width: 100, render: r => formatSpeed(r.averageSpeed, prefs.speedUnit) },
    { key: 'maxSpeed', label: 'Max Speed', width: 100, render: r => formatSpeed(r.maxSpeed, prefs.speedUnit) },
    { key: 'engineHours', label: 'Engine Hrs', width: 100, render: r => r.engineHours ? `${r.engineHours.toFixed(1)} h` : '—' },
    { key: 'spentFuel', label: 'Fuel', width: 90, render: r => r.spentFuel ? formatFuel(r.spentFuel, prefs.fuelUnit) : '—' },
  ];

  const eventColumns: DataTableColumn<TraccarEvent>[] = [
    { key: 'eventTime', label: 'Time', width: 150, render: r => new Date(r.eventTime).toLocaleString() },
    { key: 'type', label: 'Type', width: 140, render: r => r.type },
    { key: 'deviceId', label: 'Device ID', width: 90, render: r => String(r.deviceId) },
  ];

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(0).duration(450)}>
            <ScreenHeader
              title="Reports"
              subtitle="Fleet performance & activity"
              large={false}
            />
          </Animated.View>

          {/* Report type selector */}
          <Animated.View entering={FadeInDown.delay(60).duration(450)} style={styles.section}>
            <Text style={styles.sectionLabel}>Report Type</Text>
            <View style={styles.reportTypeGrid}>
              {REPORT_TYPES.map(rt => (
                <Pressable
                  key={rt.key}
                  onPress={() => setReportType(rt.key)}
                  style={[
                    styles.reportTypeCard,
                    reportType === rt.key && styles.reportTypeCardActive,
                  ]}
                >
                  <View style={[
                    styles.reportTypeIcon,
                    {
                      backgroundColor: reportType === rt.key
                        ? colors.accentMuted
                        : colors.backgroundSecondary,
                    },
                  ]}>
                    <rt.icon
                      size={20}
                      color={reportType === rt.key ? colors.text.primary : colors.text.tertiary}
                      strokeWidth={1.8}
                    />
                  </View>
                  <Text style={[
                    styles.reportTypeLabel,
                    reportType === rt.key && { color: colors.text.primary },
                  ]}>
                    {rt.label}
                  </Text>
                  <Text style={styles.reportTypeDesc}>{rt.desc}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Vehicle selector */}
          <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.section}>
            <Text style={styles.sectionLabel}>Vehicle</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vehicleList}
            >
              {devices.map(device => (
                <Pressable
                  key={device.id}
                  onPress={() => setSelectedDeviceId(device.id)}
                  style={[
                    styles.vehicleChip,
                    selectedDeviceId === device.id && styles.vehicleChipActive,
                  ]}
                >
                  <Navigation
                    size={14}
                    color={selectedDeviceId === device.id ? colors.text.inverse : colors.text.tertiary}
                    strokeWidth={1.8}
                  />
                  <Text style={[
                    styles.vehicleChipText,
                    selectedDeviceId === device.id && { color: colors.text.inverse },
                  ]}>
                    {device.name}
                  </Text>
                </Pressable>
              ))}
              {devices.length === 0 && (
                <Text style={styles.noDevicesHint}>No vehicles loaded yet...</Text>
              )}
            </ScrollView>
          </Animated.View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Date range */}
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

          {/* Run button */}
          <Animated.View entering={FadeInDown.delay(220).duration(450)} style={styles.section}>
            <Pressable
              onPress={runReport}
              disabled={loading || !selectedDeviceId}
              style={({ pressed }) => [
                styles.runButton,
                pressed && styles.runButtonPressed,
                (loading || !selectedDeviceId) && styles.runButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={colors.gradient.cta}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.runGradient}
              >
                {loading ? (
                  <Text style={styles.runText}>Generating...</Text>
                ) : (
                  <View style={styles.runContent}>
                    <Play size={16} color="#0d0f14" strokeWidth={2.5} />
                    <Text style={styles.runText}>Generate Report</Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Results */}
          {hasLoaded && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.section}>
              <View style={styles.resultsHeader}>
                <Text style={styles.sectionLabel}>Results</Text>
                {reportType === 'route' && routePositions.length > 0 && (
                  <Text style={styles.resultCount}>{routePositions.length} points</Text>
                )}
                {reportType === 'trips' && trips.length > 0 && (
                  <Text style={styles.resultCount}>{trips.length} trips</Text>
                )}
                {reportType === 'stops' && stops.length > 0 && (
                  <Text style={styles.resultCount}>{stops.length} stops</Text>
                )}
                {reportType === 'events' && events.length > 0 && (
                  <Text style={styles.resultCount}>{events.length} events</Text>
                )}
              </View>

              {!error && reportType === 'route' && (
                routePositions.length === 0 ? (
                  <EmptyResult message="No route points found for this period" />
                ) : (
                  <>
                    <DataTable
                      columns={routeColumns}
                      data={pagedRoute}
                      keyExtractor={(row, i) => `${row.id}-${i}`}
                      emptyMessage="No route data"
                    />
                    <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />
                  </>
                )
              )}

              {!error && reportType === 'trips' && (
                trips.length === 0 ? (
                  <EmptyResult message="No trips found for this period" />
                ) : (
                  <>
                    <TripsSummaryCard trips={trips} prefs={prefs} />
                    <DataTable
                      columns={tripColumns}
                      data={pagedTrips}
                      keyExtractor={(row, i) => `${row.startTime}-${i}`}
                    />
                    <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />
                  </>
                )
              )}

              {!error && reportType === 'summary' && (
                summary.length === 0 ? (
                  <EmptyResult message="No data found for this period" />
                ) : (
                  <DataTable
                    columns={summaryColumns}
                    data={summary}
                    keyExtractor={(row, i) => `${row.deviceId}-${i}`}
                  />
                )
              )}

              {!error && reportType === 'stops' && (
                stops.length === 0 ? (
                  <EmptyResult message="No stops found for this period" />
                ) : (
                  <>
                    <DataTable columns={stopColumns} data={pagedStops} keyExtractor={(row, i) => `${row.startTime}-${i}`} />
                    <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />
                  </>
                )
              )}

              {!error && reportType === 'events' && (
                events.length === 0 ? (
                  <EmptyResult message="No events found for this period" />
                ) : (
                  <>
                    <DataTable columns={eventColumns} data={pagedEvents} keyExtractor={(row, i) => `${row.id}-${i}`} />
                    <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />
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

const TripsSummaryCard: React.FC<{ trips: TraccarTrip[]; prefs: ReturnType<typeof usePrefsStore.getState>['prefs'] }> = ({ trips, prefs }) => {
  const totalDist = trips.reduce((s, t) => s + (t.distance || 0), 0);
  const totalTime = trips.reduce((s, t) => s + normalizeDurationSec(t.duration), 0);
  const maxSpeed = Math.max(...trips.map(t => t.maxSpeed || 0));
  const totalFuel = trips.reduce((s, t) => s + (t.spentFuel || 0), 0);

  return (
    <View style={tscStyles.card}>
      <View style={tscStyles.row}>
        <TscStat
          icon={<Navigation2 size={16} color={colors.primary} strokeWidth={1.8} />}
          label="Total Distance"
          value={formatDistance(totalDist, prefs.distanceUnit)}
        />
        <TscStat
          icon={<Clock size={16} color={colors.blue} strokeWidth={1.8} />}
          label="Drive Time"
          value={formatDuration(totalTime)}
        />
        <TscStat
          icon={<TrendingUp size={16} color={colors.accent} strokeWidth={1.8} />}
          label="Max Speed"
          value={formatSpeed(maxSpeed, prefs.speedUnit)}
        />
        {totalFuel > 0 && (
          <TscStat
            icon={<Fuel size={16} color={colors.error} strokeWidth={1.8} />}
            label="Fuel Used"
            value={formatFuel(totalFuel, prefs.fuelUnit)}
          />
        )}
      </View>
    </View>
  );
};

const PaginationBar: React.FC<{ page: number; totalPages: number; onChange: (p: number) => void }> = ({
  page, totalPages, onChange,
}) => (
  <View style={pgStyles.row}>
    <Pressable disabled={page <= 0} onPress={() => onChange(page - 1)} style={pgStyles.btn}>
      <Text style={pgStyles.btnText}>Previous</Text>
    </Pressable>
    <Text style={pgStyles.label}>Page {page + 1} / {totalPages}</Text>
    <Pressable disabled={page >= totalPages - 1} onPress={() => onChange(page + 1)} style={pgStyles.btn}>
      <Text style={pgStyles.btnText}>Next</Text>
    </Pressable>
  </View>
);

const pgStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.backgroundSecondary },
  btnText: { ...typography.small, color: colors.primary, fontWeight: '600' },
  label: { ...typography.small, color: colors.text.secondary },
});

const TscStat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon, label, value,
}) => (
  <View style={tscStyles.stat}>
    {icon}
    <Text style={tscStyles.statValue}>{value}</Text>
    <Text style={tscStyles.statLabel}>{label}</Text>
  </View>
);

const tscStyles = StyleSheet.create({
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
});

const TripRow: React.FC<{ trip: TraccarTrip; index: number }> = ({ trip, index }) => {
  const { prefs } = usePrefsStore();
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
      <TripStat label="Duration" value={formatDuration(trip.duration / 1000)} />
      <TripStat label="Avg Speed" value={formatSpeed(trip.averageSpeed, prefs.speedUnit)} />
      <TripStat label="Max Speed" value={formatSpeed(trip.maxSpeed, prefs.speedUnit)} />
      {trip.spentFuel != null && trip.spentFuel > 0 && (
        <TripStat label="Fuel" value={formatFuel(trip.spentFuel, prefs.fuelUnit)} />
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

const TripStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={trStyles.stat}>
    <Text style={trStyles.statVal}>{value}</Text>
    <Text style={trStyles.statLbl}>{label}</Text>
  </View>
);

const trStyles = StyleSheet.create({
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
});

const SummaryCard: React.FC<{ data: TraccarSummary }> = ({ data }) => {
  const { prefs } = usePrefsStore();
  return (
  <GlassCard style={sumStyles.card}>
    <Text style={sumStyles.device}>{data.deviceName}</Text>
    <View style={sumStyles.grid}>
      <SumStat label="Distance" value={formatDistance(data.distance, prefs.distanceUnit)} />
      <SumStat label="Max Speed" value={formatSpeed(data.maxSpeed, prefs.speedUnit)} />
      <SumStat label="Avg Speed" value={formatSpeed(data.averageSpeed, prefs.speedUnit)} />
      {data.engineHours != null && (
        <SumStat label="Engine Hrs" value={formatDuration(data.engineHours)} />
      )}
      {data.spentFuel != null && data.spentFuel > 0 && (
        <SumStat label="Fuel" value={formatFuel(data.spentFuel, prefs.fuelUnit)} />
      )}
    </View>
  </GlassCard>
  );
};

const SumStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={sumStyles.stat}>
    <Text style={sumStyles.val}>{value}</Text>
    <Text style={sumStyles.lbl}>{label}</Text>
  </View>
);

const sumStyles = StyleSheet.create({
  card: { padding: 16, marginBottom: 8 },
  device: { ...typography.h4, color: colors.text.primary, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  val: { ...typography.captionMd, color: colors.text.primary, fontVariant: ['tabular-nums'] },
  lbl: { ...typography.tiny, color: colors.text.tertiary },
});

const StopRow: React.FC<{ stop: TraccarStop }> = ({ stop }) => (
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
          {new Date(stop.startTime).toLocaleTimeString()} — {formatDuration(stop.duration / 1000)}
        </Text>
      </View>
      <Text style={stStyles.dur}>{formatDuration(stop.duration / 1000)}</Text>
    </View>
  </GlassCard>
);

const stStyles = StyleSheet.create({
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
});

const EmptyResult: React.FC<{ message: string }> = ({ message }) => (
  <View style={emStyles.container}>
    <BarChart3 size={32} color={colors.text.tertiary} strokeWidth={1.5} />
    <Text style={emStyles.text}>{message}</Text>
  </View>
);

const evStyles = StyleSheet.create({
  row: {
    padding: 14,
    marginBottom: 8,
    gap: 4,
  },
  type: {
    ...typography.bodyMd,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  time: {
    ...typography.small,
    color: colors.text.tertiary,
  },
});

const emStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  text: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center' },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 120,
  },
  section: { marginBottom: 28 },
  sectionLabel: {
    ...typography.sectionLabel,
    color: colors.text.tertiary,
    marginBottom: 12,
  },

  reportTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reportTypeCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 10,
  },
  reportTypeCardActive: {
    borderColor: colors.border.strong,
    backgroundColor: colors.surfaceElevated,
  },
  reportTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTypeLabel: {
    ...typography.captionMd,
    color: colors.text.primary,
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
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  vehicleChipText: {
    ...typography.captionMd,
    color: colors.text.tertiary,
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

  runButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  runGradient: {
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
    fontSize: 16,
    fontWeight: '700',
    color: '#0d0f14',
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
});
