import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { elevaticsAPI, ElevaticsDevice, ElevaticsPosition } from '../api/elevatics';
import { elevaticsWS } from '../api/websocket';
import { GlassCard } from '../components/GlassCard';
import { WebMapView } from '../components/WebMapView';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { IconButton } from '../components/ui/IconButton';
import { StatusChip } from '../components/ui/StatusChip';
import { Navigation, Zap, MapPin, X } from 'lucide-react-native';
import { usePrefsStore } from '../stores/prefsStore';
import { useFleetStore } from '../stores/fleetStore';
import { formatSpeed } from '../utils/units';
import { resolveAddressForPosition, getLocationLabel } from '../utils/address';
import { getThemeBaseMapLayer } from '../utils/mapTheme';
import { mergePositionHistory, positionsToPath } from '../utils/positionHistory';

const { width, height } = Dimensions.get('window');
const LIVE_TRAIL_HOURS = 1;
const MAX_TRAIL_POINTS = 120;
const LIVE_TRACK_ZOOM = 17;
const LIVE_POLL_INTERVAL_MS = 3000;

interface LiveTrackingScreenProps {
  deviceId: number;
  onClose?: () => void;
}

function matchesDeviceId(position: ElevaticsPosition, deviceId: number) {
  return Number(position.deviceId) === Number(deviceId);
}

export const LiveTrackingScreen: React.FC<LiveTrackingScreenProps> = ({ deviceId, onClose }) => {
  const { prefs } = usePrefsStore();
  const updatePositions = useFleetStore(state => state.updatePositions);
  const fleetPosition = useFleetStore(state => state.positions.get(deviceId) ?? null);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [device, setDevice] = useState<ElevaticsDevice | null>(null);
  const [position, setPosition] = useState<ElevaticsPosition | null>(null);
  const [positionHistory, setPositionHistory] = useState<ElevaticsPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<string | null>(null);
  const [initialCenter, setInitialCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const lastAppliedPositionIdRef = useRef<number | null>(null);
  const positionRef = useRef<ElevaticsPosition | null>(null);
  positionRef.current = position;

  const applyPositionUpdate = useCallback((devicePosition: ElevaticsPosition, refreshAddress = true) => {
    setPosition(devicePosition);
    setPositionHistory(prev => mergePositionHistory(prev, devicePosition, MAX_TRAIL_POINTS));
    lastAppliedPositionIdRef.current = devicePosition.id;
    if (refreshAddress) {
      void resolveAddressForPosition(devicePosition).then(setAddress);
    }
  }, []);

  useEffect(() => {
    if (!Number.isFinite(deviceId)) return;

    const loadData = async () => {
      try {
        const to = new Date();
        const from = new Date(to.getTime() - LIVE_TRAIL_HOURS * 60 * 60 * 1000);
        const [deviceData, positions, routeData] = await Promise.all([
          elevaticsAPI.getDevice(deviceId),
          elevaticsAPI.getPositions(deviceId),
          elevaticsAPI.getReportRoute(deviceId, from.toISOString(), to.toISOString()).catch(() => []),
        ]);
        setDevice(deviceData);

        const latestPosition = positions[0] ?? routeData[routeData.length - 1] ?? null;
        if (latestPosition) {
          setPosition(latestPosition);
          setPositionHistory(
            mergePositionHistory(routeData.length > 0 ? routeData : positions, [], MAX_TRAIL_POINTS),
          );
          lastAppliedPositionIdRef.current = latestPosition.id;
          setInitialCenter({ latitude: latestPosition.latitude, longitude: latestPosition.longitude });
          void resolveAddressForPosition(latestPosition).then(setAddress);
        }
      } catch (error) {
        console.error('Failed to load tracking data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    elevaticsWS.connect();

    const handlePositionUpdate = (updatedPositions: ElevaticsPosition[]) => {
      const devicePosition = updatedPositions.find(p => matchesDeviceId(p, deviceId));
      if (!devicePosition) return;
      updatePositions([devicePosition]);
      applyPositionUpdate(devicePosition);
    };

    elevaticsWS.on('positions', handlePositionUpdate);
    return () => { elevaticsWS.off('positions', handlePositionUpdate); };
  }, [deviceId, applyPositionUpdate, updatePositions]);

  useEffect(() => {
    if (loading || !fleetPosition || !Number.isFinite(deviceId)) return;
    if (fleetPosition.id === lastAppliedPositionIdRef.current) return;
    applyPositionUpdate(fleetPosition, false);
  }, [fleetPosition, deviceId, applyPositionUpdate, loading]);

  useEffect(() => {
    if (loading || !Number.isFinite(deviceId)) return;

    const pollLatestPosition = async () => {
      try {
        const positions = await elevaticsAPI.getPositions(deviceId);
        const latest = positions[0];
        if (!latest) return;

        const unchanged =
          latest.id === lastAppliedPositionIdRef.current &&
          positionRef.current?.latitude === latest.latitude &&
          positionRef.current?.longitude === latest.longitude;
        if (unchanged) return;

        updatePositions([latest]);
        applyPositionUpdate(latest, false);
      } catch {
        // polling is a fallback; ignore transient errors
      }
    };

    void pollLatestPosition();
    const interval = setInterval(pollLatestPosition, LIVE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [deviceId, loading, applyPositionUpdate, updatePositions]);

  const locationLabel = getLocationLabel({
    address,
    positionAddress: position?.address,
    latitude: position?.latitude ?? 0,
    longitude: position?.longitude ?? 0,
  });

  const markers = useMemo(() => {
    if (!position) return [];
    return [{
      id: deviceId.toString(),
      latitude: position.latitude,
      longitude: position.longitude,
      title: device?.name || 'Unknown Device',
      description: locationLabel,
      color: colors.primary,
      status: position.speed > 0 ? 'moving' : 'online',
      course: position.course || 0,
    }];
  }, [deviceId, position, device?.name, locationLabel, colors.primary]);

  const polylines = useMemo(() => {
    const pathCoordinates = positionsToPath(positionHistory);
    if (pathCoordinates.length < 2) return [];
    return [{
      id: 'trail',
      coordinates: pathCoordinates,
      color: colors.success,
      width: 6,
      opacity: 1,
    }];
  }, [positionHistory, colors.success]);

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingState label="Loading live track…" fullScreen />
      </View>
    );
  }

  if (!position) {
    return (
      <View style={styles.container}>
        <EmptyState title="No position data" subtitle="This vehicle has not reported a location yet." />
      </View>
    );
  }

  const speedLabel = formatSpeed(position.speed, prefs.speedUnit);
  const isMoving = position.speed > 0;

  return (
    <View style={styles.container}>
      {onClose ? (
        <View style={styles.closeButton}>
          <IconButton accessibilityLabel="Close live tracking" onPress={onClose} variant="filled">
            <X color={colors.text.primary} size={20} strokeWidth={2} />
          </IconButton>
        </View>
      ) : null}

      <WebMapView
        markers={markers}
        polylines={polylines}
        center={initialCenter || { latitude: position.latitude, longitude: position.longitude }}
        zoom={LIVE_TRACK_ZOOM}
        mapLayer={getThemeBaseMapLayer(isDark)}
        showUserLocation
        smoothPlayback
        followMarker
        style={styles.map}
      />

      <View style={styles.infoContainer}>
        <GlassCard style={styles.infoCard} blur>
          <View style={styles.infoHeader}>
            <Navigation color={colors.primary} size={22} strokeWidth={1.8} />
            <View style={styles.infoContent}>
              <Text style={styles.deviceName}>{device?.name || 'Unknown Device'}</Text>
              <StatusChip label="Live Tracking" variant={isMoving ? 'moving' : 'online'} size="sm" />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Zap color={colors.success} size={18} strokeWidth={2} />
              <View>
                <Text style={styles.statValue}>{speedLabel}</Text>
                <Text style={styles.statLabel}>Speed</Text>
              </View>
            </View>
            <View style={styles.stat}>
              <MapPin color={colors.secondary} size={18} strokeWidth={2} />
              <View style={styles.statContent}>
                <Text style={styles.statValue} numberOfLines={2}>{locationLabel}</Text>
                <Text style={styles.statLabel}>Location</Text>
              </View>
            </View>
          </View>

          <Text style={styles.timestamp}>Last update · {new Date(position.fixTime).toLocaleString()}</Text>
        </GlassCard>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  map: { width, height },
  infoContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  infoCard: { padding: 16, gap: 4 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 4 },
  infoContent: { flex: 1, marginLeft: 12, gap: 6 },
  deviceName: { ...typography.h4, color: colors.text.primary },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  statContent: { flex: 1 },
  statValue: { ...typography.smallMd, color: colors.text.primary },
  statLabel: { ...typography.tiny, color: colors.text.tertiary },
  timestamp: { ...typography.tiny, color: colors.text.tertiary },
});
