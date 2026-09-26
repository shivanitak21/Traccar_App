import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { elevaticsAPI, ElevaticsDevice, ElevaticsPosition } from '../api/elevatics';
import { GlassCard } from '../components/GlassCard';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { IconButton } from '../components/ui/IconButton';
import { StatusChip } from '../components/ui/StatusChip';
import { usePrefsStore } from '../stores/prefsStore';
import { formatSpeed } from '../utils/units';
import { resolveAddressForPosition, getLocationLabel } from '../utils/address';
import { Activity, Battery, Signal, Thermometer, Gauge, MapPin, X, History } from 'lucide-react-native';
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
  const [device, setDevice] = useState<ElevaticsDevice | null>(null);
  const [position, setPosition] = useState<ElevaticsPosition | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [deviceData, positions] = await Promise.all([elevaticsAPI.getDevice(deviceId), elevaticsAPI.getPositions(deviceId)]);
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
      <ScreenBackground>
        <LoadingState label="Loading device info…" fullScreen />
      </ScreenBackground>
    );
  }

  if (!device) {
    return (
      <ScreenBackground>
        <EmptyState title="Device not found" subtitle="This vehicle could not be loaded." />
      </ScreenBackground>
    );
  }

  const battery = position?.attributes?.battery;
  const fuel = position?.attributes?.fuel;
  const temperature = position?.attributes?.deviceTemp;
  const odometer = position?.attributes?.totalDistance ? (position.attributes.totalDistance / 1000).toFixed(2) : null;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        {onClose ? (
          <View style={styles.closeWrap}>
            <IconButton accessibilityLabel="Close device info" onPress={onClose} size="sm">
              <X color={colors.text.primary} size={20} strokeWidth={2} />
            </IconButton>
          </View>
        ) : null}

        <View style={styles.headerPad}>
          <ScreenHeader
            title="Device Info"
            subtitle={device.name}
            large={false}
            right={
              <StatusChip
                label={device.status === 'online' ? 'Online' : 'Offline'}
                variant={device.status === 'online' ? 'online' : 'offline'}
                size="sm"
              />
            }
          />
        </View>

        <View style={styles.actionBar}>
          <Pressable
            style={({ pressed }) => [styles.routeHistoryButton, pressed && { opacity: 0.85 }]}
            onPress={() => { if (onClose) onClose(); router.push(`/device/${deviceId}/route-history` as any); }}
            accessibilityRole="button"
            accessibilityLabel="Open route history"
          >
            <History color={colors.primary} size={18} strokeWidth={2} />
            <Text style={styles.routeHistoryButtonText}>Route History</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </GlassCard>

          {position && (
            <GlassCard style={styles.section}>
              <Text style={styles.sectionTitle}>Current Position</Text>
              <View style={styles.addressContainer}>
                <MapPin color={colors.primary} size={18} strokeWidth={2} />
                <View style={styles.addressContent}>
                  <Text style={styles.addressLabel}>Location</Text>
                  <Text style={styles.addressText}>{getLocationLabel({ address, positionAddress: position.address, latitude: position.latitude, longitude: position.longitude })}</Text>
                </View>
              </View>
              <View style={styles.sensorGrid}>
                <View style={styles.sensorCard}>
                  <Gauge color={colors.success} size={22} strokeWidth={1.8} />
                  <Text style={styles.sensorLabel}>Speed</Text>
                  <Text style={styles.sensorValue}>{formatSpeed(position.speed, prefs.speedUnit)}</Text>
                </View>
                <View style={styles.sensorCard}>
                  <Activity color={colors.warning} size={22} strokeWidth={1.8} />
                  <Text style={styles.sensorLabel}>Altitude</Text>
                  <Text style={styles.sensorValue}>{Math.round(position.altitude)} m</Text>
                </View>
                <View style={styles.sensorCard}>
                  <Signal color={colors.secondary} size={22} strokeWidth={1.8} />
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
                  <Battery color={battery > 20 ? colors.success : colors.error} size={22} strokeWidth={1.8} />
                  <Text style={styles.sensorLabel}>Battery</Text>
                  <Text style={styles.sensorValue}>{Math.round(battery)}%</Text>
                </View>
              )}
              {fuel !== undefined && fuel !== null && (
                <View style={styles.sensorCard}>
                  <Gauge color={colors.primary} size={22} strokeWidth={1.8} />
                  <Text style={styles.sensorLabel}>Fuel</Text>
                  <Text style={styles.sensorValue}>{Math.round(fuel)} L</Text>
                </View>
              )}
              {temperature !== undefined && temperature !== null && (
                <View style={styles.sensorCard}>
                  <Thermometer color={colors.warning} size={22} strokeWidth={1.8} />
                  <Text style={styles.sensorLabel}>Temperature</Text>
                  <Text style={styles.sensorValue}>{Math.round(temperature)}°C</Text>
                </View>
              )}
              {odometer && (
                <View style={styles.sensorCard}>
                  <Activity color={colors.secondary} size={22} strokeWidth={1.8} />
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
                <Text style={styles.infoLabel}>Contact</Text>
                <Text style={styles.infoValue}>{device.contact}</Text>
              </View>
              {device.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{device.phone}</Text>
                </View>
              )}
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1 },
  closeWrap: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.screenPadding,
    zIndex: 10,
  },
  headerPad: {
    paddingHorizontal: spacing.screenPadding,
  },
  actionBar: { paddingHorizontal: spacing.screenPadding, paddingBottom: spacing.md },
  routeHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.border.accent,
    gap: 8,
  },
  routeHistoryButtonText: { ...typography.bodyMd, color: colors.primary },
  scrollContent: { padding: spacing.screenPadding, paddingTop: 0, paddingBottom: 40 },
  section: { padding: 20, marginBottom: 14 },
  sectionTitle: { ...typography.h4, color: colors.text.primary, marginBottom: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
    gap: 12,
  },
  infoLabel: { ...typography.body, color: colors.text.tertiary },
  infoValue: { ...typography.bodyMd, color: colors.text.primary, flex: 1, textAlign: 'right' },
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sensorCard: {
    flex: 1,
    minWidth: '42%',
    backgroundColor: colors.surfaceElevated,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
  },
  sensorLabel: { ...typography.small, color: colors.text.tertiary, marginTop: 8 },
  sensorValue: { ...typography.bodyMd, color: colors.text.primary, marginTop: 4 },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: 16,
    gap: 10,
  },
  addressContent: { flex: 1 },
  addressLabel: { ...typography.smallMd, color: colors.text.tertiary, marginBottom: 4 },
  addressText: { ...typography.body, color: colors.text.primary, fontSize: 13 },
  noSensorsText: { ...typography.body, color: colors.text.tertiary, textAlign: 'center', paddingVertical: 20 },
});
