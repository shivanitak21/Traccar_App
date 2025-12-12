import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { GlassCard } from '../components/GlassCard';
import { WebMapView, MapLayerType } from '../components/WebMapView';
import { MapPin, X, Layers } from 'lucide-react-native';
import { reverseGeocode } from '../utils/geocoding';

export const MapScreen: React.FC = () => {
  const [devices, setDevices] = useState<TraccarDevice[]>([]);
  const [positions, setPositions] = useState<Map<number, TraccarPosition>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('normal');
  const [showLayerSelector, setShowLayerSelector] = useState(false);
  const [deviceAddresses, setDeviceAddresses] = useState<Map<number, string>>(new Map());

  const loadData = async () => {
    try {
      const [devicesData, positionsData] = await Promise.all([
        traccarAPI.getDevices(),
        traccarAPI.getPositions(),
      ]);

      setDevices(devicesData);

      const posMap = new Map<number, TraccarPosition>();
      const addressMap = new Map<number, string>();
      
      // Get addresses for all positions
      await Promise.all(
        positionsData.map(async (pos) => {
          posMap.set(pos.deviceId, pos);
          
          if (pos.address) {
            addressMap.set(pos.deviceId, pos.address);
          } else {
            const addr = await reverseGeocode(pos.latitude, pos.longitude);
            if (addr) {
              addressMap.set(pos.deviceId, addr);
            }
          }
        })
      );
      
      setPositions(posMap);
      setDeviceAddresses(addressMap);
    } catch (error) {
      console.error('Failed to load map data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    traccarWS.connect();

    const handlePositionUpdate = async (updatedPositions: TraccarPosition[]) => {
      const posMap = new Map(positions);
      const addressMap = new Map(deviceAddresses);
      
      await Promise.all(
        updatedPositions.map(async (pos) => {
          posMap.set(pos.deviceId, pos);
          
          // Update address if not already cached
          if (!addressMap.has(pos.deviceId)) {
            if (pos.address) {
              addressMap.set(pos.deviceId, pos.address);
            } else {
              const addr = await reverseGeocode(pos.latitude, pos.longitude);
              if (addr) {
                addressMap.set(pos.deviceId, addr);
              }
            }
          }
        })
      );
      
      setPositions(posMap);
      setDeviceAddresses(addressMap);
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
    // Create EXACTLY one marker per device - no duplicates
    const uniqueMarkers: any[] = [];
    const processedDeviceIds = new Set<number>();
    
    // Process each position entry ONCE
    positions.forEach((position, deviceId) => {
      // Skip if we've already processed this device
      if (processedDeviceIds.has(deviceId)) {
        console.warn(`Skipping duplicate device ID: ${deviceId}`);
        return;
      }
      
      const device = devices.find(d => d.id === deviceId);
      if (!device) {
        console.warn(`Device not found for ID: ${deviceId}`);
        return;
      }
      
      // Mark as processed
      processedDeviceIds.add(deviceId);
      
      const speed = Math.round(position.speed * 1.852);
      
      uniqueMarkers.push({
        id: `vehicle-${deviceId}`, // Unique string ID
        latitude: position.latitude,
        longitude: position.longitude,
        title: device.name,
        description: `${speed} km/h`,
        color: device.status === 'online' ? colors.success : colors.error,
        deviceName: device.name,
        deviceModel: device.model || '',
        status: device.status,
      });
    });
    
    console.log(`✓ MapScreen: ${uniqueMarkers.length} unique markers (${devices.length} total devices)`);
    return uniqueMarkers;
  };

  const mapLayers: { type: MapLayerType; label: string }[] = [
    { type: 'normal', label: 'Normal' },
    { type: 'satellite', label: 'Satellite' },
    { type: 'terrain', label: 'Terrain' },
    { type: 'hybrid', label: 'Hybrid' },
  ];

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
      <View style={styles.mapContainer}>
        {positions.size > 0 ? (
          <>
            <WebMapView
              markers={getMarkers()}
              center={getMapCenter()}
              zoom={13}
              onMarkerPress={(markerId) => {
                // Extract device ID from marker ID (format: "vehicle-123")
                const deviceId = parseInt(markerId.replace('vehicle-', ''));
                if (!isNaN(deviceId)) {
                  setSelectedDeviceId(deviceId);
                }
              }}
              showUserLocation={true}
              mapLayer={mapLayer}
              style={styles.map}
            />
            
            <TouchableOpacity
              style={styles.layerButton}
              onPress={() => setShowLayerSelector(!showLayerSelector)}
            >
              <Layers color={colors.text.primary} size={20} />
            </TouchableOpacity>

            {showLayerSelector && (
              <View style={styles.layerSelector}>
                <GlassCard style={styles.layerCard}>
                  <Text style={styles.layerTitle}>Map Type</Text>
                  {mapLayers.map((layer) => (
                    <TouchableOpacity
                      key={layer.type}
                      style={[
                        styles.layerOption,
                        mapLayer === layer.type && styles.layerOptionActive,
                      ]}
                      onPress={() => {
                        setMapLayer(layer.type);
                        setShowLayerSelector(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.layerOptionText,
                          mapLayer === layer.type && styles.layerOptionTextActive,
                        ]}
                      >
                        {layer.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </GlassCard>
              </View>
            )}
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
                    <Text style={styles.address}>
                      📍 {selectedDeviceId ? deviceAddresses.get(selectedDeviceId) || 'Loading address...' : 'No address'}
                    </Text>
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
  mapContainer: {
    flex: 1,
    margin: 0,
    borderRadius: 0,
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
    backgroundColor: colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceDetailsBody: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
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
  layerButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
    zIndex: 10,
  },
  layerSelector: {
    position: 'absolute',
    top: 80,
    right: 20,
    zIndex: 10,
    minWidth: 150,
  },
  layerCard: {
    padding: 12,
  },
  layerTitle: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  layerOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  layerOptionActive: {
    backgroundColor: colors.primaryGlow,
  },
  layerOptionText: {
    ...typography.body,
    color: colors.text.primary,
    fontSize: 14,
  },
  layerOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
