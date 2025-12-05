import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { GlassCard } from '../components/GlassCard';
import { WebMapView } from '../components/WebMapView';
import { MapPin, X } from 'lucide-react-native';

export const MapScreen: React.FC = () => {
  const [devices, setDevices] = useState<TraccarDevice[]>([]);
  const [positions, setPositions] = useState<Map<number, TraccarPosition>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const [devicesData, positionsData] = await Promise.all([
        traccarAPI.getDevices(),
        traccarAPI.getPositions(),
      ]);

      setDevices(devicesData);

      const posMap = new Map<number, TraccarPosition>();
      positionsData.forEach(pos => {
        posMap.set(pos.deviceId, pos);
      });
      setPositions(posMap);
    } catch (error) {
      console.error('Failed to load map data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    traccarWS.connect();

    const handlePositionUpdate = (updatedPositions: TraccarPosition[]) => {
      const posMap = new Map(positions);
      updatedPositions.forEach(pos => {
        posMap.set(pos.deviceId, pos);
      });
      setPositions(posMap);
    };

    traccarWS.on('positions', handlePositionUpdate);

    return () => {
      traccarWS.off('positions', handlePositionUpdate);
    };
  }, []);

  const getDeviceName = (deviceId: number) => {
    return devices.find(d => d.id === deviceId)?.name || 'Unknown';
  };

  const getMapCenter = () => {
    if (positions.size === 0) return { latitude: 0, longitude: 0 };
    const firstPos = Array.from(positions.values())[0];
    return { latitude: firstPos.latitude, longitude: firstPos.longitude };
  };

  const getMarkers = () => {
    // Use a Map to ensure only one marker per device ID
    const markersMap = new Map<string, any>();
    
    Array.from(positions.entries()).forEach(([deviceId, position]) => {
      const device = devices.find(d => d.id === deviceId);
      const speed = Math.round(position.speed * 1.852);
      const markerId = deviceId.toString();
      
      // Only add if we haven't seen this device ID before
      if (!markersMap.has(markerId)) {
        markersMap.set(markerId, {
          id: markerId,
          latitude: position.latitude,
          longitude: position.longitude,
          title: device?.name || 'Unknown',
          description: `${speed} km/h • ${new Date(position.fixTime).toLocaleTimeString()}`,
          color: device?.status === 'online' ? colors.success : colors.error,
          deviceName: device?.name || 'Unknown',
          deviceModel: device?.model || '',
          status: device?.status || 'offline',
        });
      }
    });
    
    return Array.from(markersMap.values());
  };

  const selectedPosition = selectedDeviceId ? positions.get(selectedDeviceId) : null;
  const selectedDevice = selectedDeviceId ? devices.find(d => d.id === selectedDeviceId) : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <GlassCard style={styles.statsCard}>
          <Text style={styles.statsTitle}>Live Tracking</Text>
          <Text style={styles.statsValue}>{positions.size} devices online</Text>
        </GlassCard>
      </View>

      <View style={styles.mapContainer}>
        {positions.size > 0 ? (
          <>
            <WebMapView
              markers={getMarkers()}
              center={getMapCenter()}
              zoom={13}
              onMarkerPress={(markerId) => setSelectedDeviceId(Number(markerId))}
              showUserLocation={true}
              style={styles.map}
            />
            {selectedPosition && selectedDevice && (
              <View style={styles.deviceDetailsOverlay}>
                <GlassCard style={styles.deviceDetailsCard}>
                  <View style={styles.deviceDetailsHeader}>
                    <View style={styles.deviceDetailsInfo}>
                      <Text style={styles.deviceDetailsName}>{selectedDevice.name}</Text>
                      <Text style={styles.deviceDetailsSpeed}>
                        {Math.round(selectedPosition.speed * 1.852)} km/h
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedDeviceId(null)}
                      style={styles.closeButton}
                    >
                      <X color={colors.text.secondary} size={20} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.deviceDetailsBody}>
                    {selectedPosition.address ? (
                      <Text style={styles.address}>
                        📍 {selectedPosition.address}
                      </Text>
                    ) : (
                      <Text style={styles.coordinates}>
                        📍 {selectedPosition.latitude.toFixed(6)}, {selectedPosition.longitude.toFixed(6)}
                      </Text>
                    )}
                    <Text style={styles.timestamp}>
                      Last update: {new Date(selectedPosition.fixTime).toLocaleTimeString()}
                    </Text>
                  </View>
                </GlassCard>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MapPin color={colors.text.tertiary} size={48} />
            <Text style={styles.emptyText}>No active devices</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 16,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  statsCard: {
    padding: 20,
    marginBottom: 20,
  },
  statsTitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  statsValue: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  deviceDetailsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  deviceDetailsCard: {
    padding: 16,
  },
  deviceDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deviceDetailsInfo: {
    flex: 1,
  },
  deviceDetailsName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceDetailsSpeed: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceDetailsBody: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  coordinates: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  address: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  timestamp: {
    ...typography.small,
    color: colors.text.tertiary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 16,
  },
});
