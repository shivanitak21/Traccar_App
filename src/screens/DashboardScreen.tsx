import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { GlassCard } from '../components/GlassCard';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { Car, Circle, Navigation, Clock, MapPin, Power } from 'lucide-react-native';
import { getVehicleImageUrl } from '../utils/vehicleImages';
import { reverseGeocode } from '../utils/geocoding';

interface DeviceWithPosition extends TraccarDevice {
  position?: TraccarPosition;
  address?: string;
}

export const DashboardScreen: React.FC = () => {
  const [devices, setDevices] = useState<DeviceWithPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  const loadData = async () => {
    try {
      const [devicesData, positionsData] = await Promise.all([
        traccarAPI.getDevices(),
        traccarAPI.getPositions(),
      ]);

      const positionsMap = new Map<number, TraccarPosition>();
      positionsData.forEach(pos => {
        positionsMap.set(pos.deviceId, pos);
      });

      // Enrich devices with position data and addresses
      const enrichedDevices = await Promise.all(
        devicesData.map(async (device) => {
          const position = positionsMap.get(device.id);
          let address: string | undefined;
          
          if (position) {
            // Try to get address from position or reverse geocode
            if (position.address) {
              address = position.address;
            } else {
              address = await reverseGeocode(position.latitude, position.longitude) || undefined;
            }
          }

          return {
            ...device,
            position,
            address,
          };
        })
      );

      setDevices(enrichedDevices);
      
      // Animate cards in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    traccarWS.connect();

    const handleDeviceUpdate = (updatedDevices: TraccarDevice[]) => {
      setDevices(prev => {
        return updatedDevices.map(device => {
          const existing = prev.find(d => d.id === device.id);
          return {
            ...device,
            position: existing?.position,
            address: existing?.address,
          };
        });
      });
    };

    const handlePositionUpdate = (updatedPositions: TraccarPosition[]) => {
      setDevices(prev => {
        return prev.map(device => {
          const position = updatedPositions.find(p => p.deviceId === device.id);
          if (position) {
            return {
              ...device,
              position,
            };
          }
          return device;
        });
      });
    };

    traccarWS.on('devices', handleDeviceUpdate);
    traccarWS.on('positions', handlePositionUpdate);

    return () => {
      traccarWS.off('devices', handleDeviceUpdate);
      traccarWS.off('positions', handlePositionUpdate);
    };
  }, []);

  const getStatusText = (device: DeviceWithPosition): string => {
    if (!device.position) return 'Stopped';
    const speed = device.position.speed * 1.852; // Convert to km/h
    if (speed < 1) return 'Idle';
    if (speed > 0) return 'Running';
    return 'Stopped';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Running':
        return colors.success;
      case 'Idle':
        return colors.warning;
      default:
        return colors.text.tertiary;
    }
  };

  const getIgnitionStatus = (device: DeviceWithPosition): boolean => {
    // Check if ignition is on based on attributes or speed
    if (device.position?.attributes?.ignition !== undefined) {
      return device.position.attributes.ignition;
    }
    // Fallback: if speed > 0, assume ignition is on
    return (device.position?.speed || 0) > 0;
  };

  return (
    <LinearGradient colors={colors.gradient.dark} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Vehicles</Text>
          <Text style={styles.subtitle}>Live tracking dashboard</Text>
        </View>

        {devices.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Car color={colors.text.tertiary} size={48} />
            <Text style={styles.emptyText}>No vehicles found</Text>
          </GlassCard>
        ) : (
          devices.map((device, index) => {
            const vehicleImageUrl = getVehicleImageUrl(device.model, device.name);
            const status = getStatusText(device);
            const statusColor = getStatusColor(status);
            const isOnline = device.status === 'online';
            const speed = device.position ? Math.round(device.position.speed * 1.852) : 0;
            const ignition = getIgnitionStatus(device);
            const lastUpdate = device.lastUpdate ? new Date(device.lastUpdate) : null;

            return (
              <Animated.View
                key={device.id}
                style={[
                  styles.cardWrapper,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <GlassCard style={styles.vehicleCard}>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: vehicleImageUrl }}
                      style={styles.vehicleImage}
                      resizeMode="cover"
                    />
                    <View style={styles.imageOverlay}>
                      <View style={styles.statusBadge}>
                        <Circle
                          size={8}
                          fill={isOnline ? colors.success : colors.text.tertiary}
                          color={isOnline ? colors.success : colors.text.tertiary}
                        />
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                          {status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.vehicleHeader}>
                      <View style={styles.vehicleInfo}>
                        <Text style={styles.vehicleName}>{device.name}</Text>
                        <Text style={styles.vehiclePlate}>{device.uniqueId}</Text>
                      </View>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Navigation color={colors.primary} size={20} />
                        <View style={styles.statContent}>
                          <Text style={styles.statValue}>{speed} km/h</Text>
                          <Text style={styles.statLabel}>Speed</Text>
                        </View>
                      </View>

                      <View style={styles.statItem}>
                        <Power
                          color={ignition ? colors.success : colors.text.tertiary}
                          size={20}
                        />
                        <View style={styles.statContent}>
                          <Text
                            style={[
                              styles.statValue,
                              { color: ignition ? colors.success : colors.text.tertiary },
                            ]}
                          >
                            {ignition ? 'ON' : 'OFF'}
                          </Text>
                          <Text style={styles.statLabel}>Ignition</Text>
                        </View>
                      </View>
                    </View>

                    {device.address && (
                      <View style={styles.locationRow}>
                        <MapPin color={colors.primary} size={16} />
                        <Text style={styles.locationText} numberOfLines={2}>
                          {device.address}
                        </Text>
                      </View>
                    )}

                    {lastUpdate && (
                      <View style={styles.timeRow}>
                        <Clock color={colors.text.tertiary} size={14} />
                        <Text style={styles.timeText}>
                          Last updated: {lastUpdate.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </GlassCard>
              </Animated.View>
            );
          })
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
  header: {
    marginBottom: 24,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: 8,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  cardWrapper: {
    marginBottom: 20,
  },
  vehicleCard: {
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusBadgeText: {
    ...typography.small,
    fontWeight: '600',
    fontSize: 12,
  },
  cardContent: {
    padding: 16,
  },
  vehicleHeader: {
    marginBottom: 16,
  },
  vehicleInfo: {
    marginBottom: 4,
  },
  vehicleName: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  vehiclePlate: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 243, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 2,
  },
  statLabel: {
    ...typography.small,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 243, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginBottom: 12,
    gap: 8,
  },
  locationText: {
    ...typography.small,
    color: colors.text.secondary,
    flex: 1,
    fontSize: 13,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    ...typography.small,
    color: colors.text.tertiary,
    fontSize: 12,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 16,
  },
});
