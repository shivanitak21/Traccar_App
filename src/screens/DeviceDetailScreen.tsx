import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { GlassCard } from '../components/GlassCard';
import { elevaticsAPI, ElevaticsDevice, ElevaticsPosition } from '../api/elevatics';
import { Navigation, MapPin, Clock, Activity, Gauge } from 'lucide-react-native';
import { usePrefsStore } from '../stores/prefsStore';
import { formatSpeed } from '../utils/units';
import { resolveAddressForPosition, getLocationLabel } from '../utils/address';

interface DeviceDetailScreenProps {
  route: {
    params: {
      deviceId: number;
    };
  };
}

export const DeviceDetailScreen: React.FC<DeviceDetailScreenProps> = ({ route }) => {
  const { deviceId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { prefs } = usePrefsStore();
  const [device, setDevice] = useState<ElevaticsDevice | null>(null);
  const [position, setPosition] = useState<ElevaticsPosition | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDeviceDetail(); }, [deviceId]);

  const loadDeviceDetail = async () => {
    try {
      const [deviceData, positionsData] = await Promise.all([elevaticsAPI.getDevice(deviceId), elevaticsAPI.getPositions(deviceId)]);
      setDevice(deviceData);
      if (positionsData.length > 0) {
        const latest = positionsData[0];
        setPosition(latest);
        setAddress(await resolveAddressForPosition(latest));
      }
    } catch (error) {
      console.error('Failed to load device detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Device not found</Text>
      </View>
    );
  }

  const isOnline = device.status === 'online';
  const speedLabel = position ? formatSpeed(position.speed, prefs.speedUnit) : formatSpeed(0, prefs.speedUnit);

  return (
    <LinearGradient colors={colors.gradient.dark} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View>
          <GlassCard gradient style={styles.headerCard}>
            <View style={styles.iconContainer}>
              <Navigation color={colors.primary} size={40} strokeWidth={1.5} />
            </View>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.uniqueId}>{device.uniqueId}</Text>
            <View style={[styles.statusBadge, isOnline && styles.statusOnline]}>
              <Activity color={isOnline ? colors.success : colors.text.tertiary} size={16} />
              <Text style={[styles.statusText, isOnline && styles.statusTextOnline]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </GlassCard>
        </View>

        {position && (
          <>
            <View>
              <Text style={styles.sectionTitle}>Location</Text>
              <GlassCard style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <MapPin color={colors.primary} size={20} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue}>
                      {getLocationLabel({ address, positionAddress: position.address, latitude: position.latitude, longitude: position.longitude })}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </View>

            <View>
              <Text style={styles.sectionTitle}>Telemetry</Text>
              <GlassCard style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Gauge color={colors.primary} size={20} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Speed</Text>
                    <Text style={styles.infoValue}>{speedLabel}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Activity color={colors.success} size={20} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Course</Text>
                    <Text style={styles.infoValue}>{Math.round(position.course)}°</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Clock color={colors.secondary} size={20} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Last Update</Text>
                    <Text style={styles.infoValue}>{new Date(position.fixTime).toLocaleString()}</Text>
                  </View>
                </View>
              </GlassCard>
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.body, color: colors.text.secondary },
  headerCard: { padding: 24, alignItems: 'center', marginBottom: 24 },
  iconContainer: { width: 80, height: 80, borderRadius: 20, backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  deviceName: { ...typography.h2, color: colors.text.primary, marginBottom: 8 },
  uniqueId: { ...typography.caption, color: colors.text.secondary, marginBottom: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface },
  statusOnline: { backgroundColor: 'rgba(0, 255, 136, 0.1)' },
  statusText: { ...typography.caption, color: colors.text.tertiary, fontWeight: '600' },
  statusTextOnline: { color: colors.success },
  sectionTitle: { ...typography.h3, color: colors.text.primary, marginBottom: 12 },
  infoCard: { padding: 20, marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  infoContent: { flex: 1, marginLeft: 12 },
  infoLabel: { ...typography.small, color: colors.text.secondary, marginBottom: 4 },
  infoValue: { ...typography.body, color: colors.text.primary },
});
