import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { GlassCard } from '../components/GlassCard';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { Car, MapPin, Clock, Activity, Gauge } from 'lucide-react-native';

interface DeviceDetailScreenProps {
  route: {
    params: {
      deviceId: number;
    };
  };
}

export const DeviceDetailScreen: React.FC<DeviceDetailScreenProps> = ({ route }) => {
  const { deviceId } = route.params;
  const [device, setDevice] = useState<TraccarDevice | null>(null);
  const [position, setPosition] = useState<TraccarPosition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeviceDetail();
  }, [deviceId]);

  const loadDeviceDetail = async () => {
    try {
      const [deviceData, positionsData] = await Promise.all([
        traccarAPI.getDevice(deviceId),
        traccarAPI.getPositions(deviceId),
      ]);

      setDevice(deviceData);
      if (positionsData.length > 0) {
        setPosition(positionsData[0]);
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
  const speed = position ? Math.round(position.speed * 1.852) : 0;

  return (
    <LinearGradient colors={colors.gradient.dark} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View>
          <GlassCard gradient style={styles.headerCard}>
            <View style={styles.iconContainer}>
              <Car color={colors.primary} size={40} />
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
                    <Text style={styles.infoLabel}>Coordinates</Text>
                    <Text style={styles.infoValue}>
                      {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                    </Text>
                  </View>
                </View>
                {position.address && (
                  <View style={styles.infoRow}>
                    <MapPin color={colors.secondary} size={20} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Address</Text>
                      <Text style={styles.infoValue}>{position.address}</Text>
                    </View>
                  </View>
                )}
              </GlassCard>
            </View>

            <View>
              <Text style={styles.sectionTitle}>Telemetry</Text>
              <GlassCard style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Gauge color={colors.primary} size={20} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Speed</Text>
                    <Text style={styles.infoValue}>{speed} km/h</Text>
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
                    <Text style={styles.infoValue}>
                      {new Date(position.fixTime).toLocaleString()}
                    </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  headerCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deviceName: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: 8,
  },
  uniqueId: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  statusOnline: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  statusText: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  statusTextOnline: {
    color: colors.success,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 12,
  },
  infoCard: {
    padding: 20,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    ...typography.body,
    color: colors.text.primary,
  },
});
