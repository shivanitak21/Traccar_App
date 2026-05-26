import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { GlassCard } from '../components/GlassCard';
import { usePrefsStore } from '../stores/prefsStore';
import { formatSpeed } from '../utils/units';
import { resolveAddressForPosition, getLocationLabel } from '../utils/address';
import { Info, Activity, Battery, Signal, Thermometer, Gauge, MapPin, X, Navigation, History } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface DeviceInfoScreenProps {
  deviceId: number;
  onClose?: () => void;
}

export const DeviceInfoScreen: React.FC<DeviceInfoScreenProps> = ({ deviceId, onClose }) => {
  const { prefs } = usePrefsStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [device, setDevice] = useState<TraccarDevice | null>(null);
  const [position, setPosition] = useState<TraccarPosition | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [deviceData, positions] = await Promise.all([traccarAPI.getDevice(deviceId), traccarAPI.getPositions(deviceId)]);
        setDevice(deviceData);
        if (positions.length > 0) {
          const latest = positions[0];
          setPosition(latest);
          setAddress(await resolveAddressForPosition(latest));
        }
      } catch (error) { console.error('Failed to load device info:', error); }
      finally { setLoading(false); }
    };
    loadData();
  }, [deviceId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading device info...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Device not found</Text>
      </View>
    );
  }

  const battery = position?.attributes?.battery;
  const fuel = position?.attributes?.fuel;
  const temperature = position?.attributes?.deviceTemp;
  const odometer = position?.attributes?.totalDistance ? (position.attributes.totalDistance / 1000).toFixed(2) : null;

  return (
    <LinearGradient colors={colors.gradient.dark} style={styles.container}>
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X color={colors.text.primary} size={24} />
        </TouchableOpacity>
      )}

      <View style={styles.header}>
        <Info color={colors.primary} size={32} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Device Information</Text>
          <Text style={styles.subtitle}>{device.name}</Text>
        </View>
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.routeHistoryButton} onPress={() => { if (onClose) onClose(); router.push(`/device/${deviceId}/route-history` as any); }}>
          <History color={colors.primary} size={20} />
          <Text style={styles.routeHistoryButtonText}>Route History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          {[
            { label: 'Name', value: device.name },
            { label: 'Unique ID', value: device.uniqueId },
            { label: 'Model', value: device.model || 'N/A' },
            { label: 'Category', value: device.category || 'N/A' },
            { label: 'Last Update', value: device.lastUpdate ? new Date(device.lastUpdate).toLocaleString() : 'N/A' },
          ].map(item => (
            <View key={item.label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{item.label}:</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[styles.infoValue, { color: device.status === 'online' ? colors.success : colors.error }]}>{device.status}</Text>
          </View>
        </GlassCard>

        {position && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Current Position</Text>
            <View style={styles.addressContainer}>
              <MapPin color={colors.primary} size={20} />
              <View style={styles.addressContent}>
                <Text style={styles.addressLabel}>Location:</Text>
                <Text style={styles.addressText}>{getLocationLabel({ address, positionAddress: position.address, latitude: position.latitude, longitude: position.longitude })}</Text>
              </View>
            </View>
            <View style={styles.sensorGrid}>
              <View style={styles.sensorCard}>
                <Gauge color={colors.success} size={24} />
                <Text style={styles.sensorLabel}>Speed</Text>
                <Text style={styles.sensorValue}>{formatSpeed(position.speed, prefs.speedUnit)}</Text>
              </View>
              <View style={styles.sensorCard}>
                <Activity color={colors.warning} size={24} />
                <Text style={styles.sensorLabel}>Altitude</Text>
                <Text style={styles.sensorValue}>{Math.round(position.altitude)} m</Text>
              </View>
              <View style={styles.sensorCard}>
                <Signal color={colors.secondary} size={24} />
                <Text style={styles.sensorLabel}>Protocol</Text>
                <Text style={styles.sensorValue}>{position.protocol}</Text>
              </View>
            </View>
          </GlassCard>
        )}

        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>Sensors & Attributes</Text>
          <View style={styles.sensorGrid}>
            {battery !== undefined && battery !== null && (
              <View style={styles.sensorCard}>
                <Battery color={battery > 20 ? colors.success : colors.error} size={24} />
                <Text style={styles.sensorLabel}>Battery</Text>
                <Text style={styles.sensorValue}>{Math.round(battery)}%</Text>
              </View>
            )}
            {fuel !== undefined && fuel !== null && (
              <View style={styles.sensorCard}>
                <Gauge color={colors.primary} size={24} />
                <Text style={styles.sensorLabel}>Fuel</Text>
                <Text style={styles.sensorValue}>{Math.round(fuel)} L</Text>
              </View>
            )}
            {temperature !== undefined && temperature !== null && (
              <View style={styles.sensorCard}>
                <Thermometer color={colors.warning} size={24} />
                <Text style={styles.sensorLabel}>Temperature</Text>
                <Text style={styles.sensorValue}>{Math.round(temperature)}°C</Text>
              </View>
            )}
            {odometer && (
              <View style={styles.sensorCard}>
                <Activity color={colors.secondary} size={24} />
                <Text style={styles.sensorLabel}>Odometer</Text>
                <Text style={styles.sensorValue}>{odometer} km</Text>
              </View>
            )}
          </View>
          {(!battery && !fuel && !temperature && !odometer) && (
            <Text style={styles.noSensorsText}>No sensor data available</Text>
          )}
        </GlassCard>

        {device.contact && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact:</Text>
              <Text style={styles.infoValue}>{device.contact}</Text>
            </View>
            {device.phone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{device.phone}</Text>
              </View>
            )}
          </GlassCard>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body, color: colors.text.secondary, marginTop: 16 },
  closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glass.border },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, paddingBottom: 12 },
  headerText: { marginLeft: 16, flex: 1 },
  title: { ...typography.h2, color: colors.text.primary, fontWeight: '700' },
  subtitle: { ...typography.small, color: colors.text.secondary, marginTop: 4 },
  actionBar: { paddingHorizontal: 20, paddingBottom: 16 },
  routeHistoryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.glass.background, borderWidth: 2, borderColor: colors.primary, gap: 8 },
  routeHistoryButtonText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  scrollContent: { padding: 20, paddingTop: 0 },
  section: { padding: 20, marginBottom: 16 },
  sectionTitle: { ...typography.h3, color: colors.text.primary, fontWeight: '700', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  infoLabel: { ...typography.body, color: colors.text.tertiary },
  infoValue: { ...typography.body, color: colors.text.primary, fontWeight: '600', flex: 1, textAlign: 'right' },
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sensorCard: { flex: 1, minWidth: '45%', backgroundColor: colors.primaryGlow, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.glass.border, alignItems: 'center' },
  sensorLabel: { ...typography.small, color: colors.text.tertiary, marginTop: 8 },
  sensorValue: { ...typography.body, color: colors.text.primary, fontWeight: '700', fontSize: 16, marginTop: 4 },
  addressContainer: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.primaryGlow, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.glass.border, marginBottom: 16, gap: 10 },
  addressContent: { flex: 1 },
  addressLabel: { ...typography.small, color: colors.text.tertiary, marginBottom: 4, fontWeight: '600' },
  addressText: { ...typography.body, color: colors.text.primary, fontSize: 13 },
  noSensorsText: { ...typography.body, color: colors.text.tertiary, textAlign: 'center', paddingVertical: 20 },
});
