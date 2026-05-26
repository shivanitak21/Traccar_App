import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { GlassCard } from '../components/GlassCard';
import { WebMapView } from '../components/WebMapView';
import { Navigation, Zap, MapPin, X } from 'lucide-react-native';
import { usePrefsStore } from '../stores/prefsStore';
import { formatSpeed } from '../utils/units';
import { resolveAddressForPosition, getLocationLabel } from '../utils/address';
import { getThemeBaseMapLayer } from '../utils/mapTheme';

const { width, height } = Dimensions.get('window');

interface LiveTrackingScreenProps {
  deviceId: number;
  onClose?: () => void;
}

export const LiveTrackingScreen: React.FC<LiveTrackingScreenProps> = ({ deviceId, onClose }) => {
  const { prefs } = usePrefsStore();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [device, setDevice] = useState<TraccarDevice | null>(null);
  const [position, setPosition] = useState<TraccarPosition | null>(null);
  const [positionHistory, setPositionHistory] = useState<TraccarPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  const updateAddress = async (pos: TraccarPosition) => {
    const resolved = await resolveAddressForPosition(pos);
    setAddress(resolved);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [deviceData, positions] = await Promise.all([traccarAPI.getDevice(deviceId), traccarAPI.getPositions(deviceId)]);
        setDevice(deviceData);
        if (positions.length > 0) {
          const latestPosition = positions[0];
          setPosition(latestPosition);
          setPositionHistory(positions.slice(0, 30));
          setMapCenter({ latitude: latestPosition.latitude, longitude: latestPosition.longitude });
          void updateAddress(latestPosition);
        }
      } catch (error) { console.error('Failed to load tracking data:', error); }
      finally { setLoading(false); }
    };

    loadData();
    traccarWS.connect();

    const handlePositionUpdate = (updatedPositions: TraccarPosition[]) => {
      const devicePosition = updatedPositions.find(p => p.deviceId === deviceId);
      if (devicePosition) {
        setPosition(devicePosition);
        setPositionHistory(prev => [devicePosition, ...prev.slice(0, 29)]);
        setMapCenter({ latitude: devicePosition.latitude, longitude: devicePosition.longitude });
        void updateAddress(devicePosition);
      }
    };

    traccarWS.on('positions', handlePositionUpdate);
    return () => { traccarWS.off('positions', handlePositionUpdate); };
  }, [deviceId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (!position) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No position data available</Text>
      </View>
    );
  }

  const speedLabel = formatSpeed(position.speed, prefs.speedUnit);
  const pathCoordinates = positionHistory.filter(p => p.latitude && p.longitude).map(p => ({ latitude: p.latitude, longitude: p.longitude }));
  const locationLabel = getLocationLabel({ address, positionAddress: position.address, latitude: position.latitude, longitude: position.longitude });

  const markers = [{ id: deviceId.toString(), latitude: position.latitude, longitude: position.longitude, title: device?.name || 'Unknown Device', description: locationLabel, color: colors.primary, status: position.speed > 0 ? 'moving' : 'online', course: position.course || 0 }];
  const polylines = pathCoordinates.length > 1 ? [{ coordinates: pathCoordinates, color: '#10b981', width: 5, opacity: 0.9 }] : [];

  return (
    <View style={styles.container}>
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X color={colors.text.primary} size={24} />
        </TouchableOpacity>
      )}

      <WebMapView markers={markers} polylines={polylines} center={mapCenter || { latitude: position.latitude, longitude: position.longitude }} zoom={15} mapLayer={getThemeBaseMapLayer(isDark)} showUserLocation={true} style={styles.map} />

      <View style={styles.infoContainer}>
        <GlassCard style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Navigation color={colors.primary} size={24} />
            <View style={styles.infoContent}>
              <Text style={styles.deviceName}>{device?.name || 'Unknown Device'}</Text>
              <Text style={styles.deviceStatus}>Live Tracking</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Zap color={colors.success} size={20} />
              <View>
                <Text style={styles.statValue}>{speedLabel}</Text>
                <Text style={styles.statLabel}>Speed</Text>
              </View>
            </View>
            <View style={styles.stat}>
              <MapPin color={colors.secondary} size={20} />
              <View style={styles.statContent}>
                <Text style={styles.statValue} numberOfLines={2}>{locationLabel}</Text>
                <Text style={styles.statLabel}>Location</Text>
              </View>
            </View>
          </View>

          <Text style={styles.timestamp}>Last update: {new Date(position.fixTime).toLocaleString()}</Text>
        </GlassCard>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body, color: colors.text.secondary, marginTop: 16 },
  closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glass.border },
  map: { width, height },
  infoContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  infoCard: { padding: 16 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  infoContent: { flex: 1, marginLeft: 12 },
  deviceName: { ...typography.body, color: colors.text.primary, fontWeight: '700', fontSize: 18 },
  deviceStatus: { ...typography.small, color: colors.success, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  statContent: { flex: 1 },
  statValue: { ...typography.small, color: colors.text.primary, fontWeight: '600' },
  statLabel: { ...typography.small, color: colors.text.tertiary, fontSize: 10 },
  timestamp: { ...typography.small, color: colors.text.tertiary, fontSize: 11 },
});
