import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { elevaticsAPI, ElevaticsDevice, ElevaticsPosition } from '../api/elevatics';
import { elevaticsWS } from '../api/websocket';
import { GlassCard } from '../components/GlassCard';
import { WebMapView, MapLayerType } from '../components/WebMapView';
import { MapPin, X, Layers } from 'lucide-react-native';
import { useCompanionStore } from '../stores/companionStore';
import { usePrefsStore } from '../stores/prefsStore';
import { formatSpeed } from '../utils/units';
import { resolveAddressForPosition, getLocationLabel } from '../utils/address';
import { useTabBarBottomInset } from '../utils/tabBarInset';
import { getThemeBaseMapLayer, resolveMapLayer } from '../utils/mapTheme';
import { mergePositionHistory, positionsToPath } from '../utils/positionHistory';

const DEFAULT_MAP_CENTER = { latitude: 20.5937, longitude: 78.9629 };

export const MapScreen: React.FC = () => {
  const openCompanion = useCompanionStore(state => state.open);
  const { prefs } = usePrefsStore();
  const tabBarBottomInset = useTabBarBottomInset(12);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const themeBaseLayer = getThemeBaseMapLayer(isDark);

  const [devices, setDevices] = useState<ElevaticsDevice[]>([]);
  const [positions, setPositions] = useState<Map<number, ElevaticsPosition>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayerType>(themeBaseLayer);
  const [showLayerSelector, setShowLayerSelector] = useState(false);
  const [deviceAddresses, setDeviceAddresses] = useState<Map<number, string>>(new Map());
  const [positionTrails, setPositionTrails] = useState<Map<number, ElevaticsPosition[]>>(new Map());

  useEffect(() => {
    setMapLayer(prev => resolveMapLayer(prev, isDark));
  }, [isDark]);

  const loadData = async () => {
    try {
      const [devicesData, positionsData] = await Promise.all([
        elevaticsAPI.getDevices(),
        elevaticsAPI.getPositions(),
      ]);
      setDevices(devicesData);
      const posMap = new Map<number, ElevaticsPosition>();
      const addressMap = new Map<number, string>();
      await Promise.all(
        positionsData.map(async (pos) => {
          posMap.set(pos.deviceId, pos);
          const address = pos.address || await resolveAddressForPosition(pos);
          if (address) addressMap.set(pos.deviceId, address);
        })
      );
      setPositions(posMap);
      setDeviceAddresses(addressMap);
      setPositionTrails(prev => {
        const next = new Map(prev);
        positionsData.forEach(pos => {
          const existing = next.get(pos.deviceId) ?? [];
          next.set(pos.deviceId, mergePositionHistory(existing, pos));
        });
        return next;
      });
    } catch (error) {
      console.error('Failed to load map data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    elevaticsWS.connect();
    const handlePositionUpdate = (updatedPositions: ElevaticsPosition[]) => {
      setPositions(prev => {
        const posMap = new Map(prev);
        updatedPositions.forEach(pos => posMap.set(pos.deviceId, pos));
        return posMap;
      });

      setPositionTrails(prev => {
        const next = new Map(prev);
        updatedPositions.forEach(pos => {
          const existing = next.get(pos.deviceId) ?? [];
          next.set(pos.deviceId, mergePositionHistory(existing, pos));
        });
        return next;
      });

      void Promise.all(
        updatedPositions.map(async (pos) => {
          const resolvedAddress = await resolveAddressForPosition(pos);
          if (!resolvedAddress) return;
          setDeviceAddresses(prev => {
            const next = new Map(prev);
            next.set(pos.deviceId, resolvedAddress);
            return next;
          });
        }),
      );
    };
    elevaticsWS.on('positions', handlePositionUpdate);
    return () => { elevaticsWS.off('positions', handlePositionUpdate); };
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) return;

    const loadTrail = async () => {
      const to = new Date();
      const from = new Date(to.getTime() - 60 * 60 * 1000);
      const route = await elevaticsAPI.getReportRoute(selectedDeviceId, from.toISOString(), to.toISOString()).catch(() => []);
      if (route.length === 0) return;

      setPositionTrails(prev => {
        const next = new Map(prev);
        const existing = next.get(selectedDeviceId) ?? [];
        next.set(selectedDeviceId, mergePositionHistory(existing, route, 120));
        return next;
      });
    };

    void loadTrail();
  }, [selectedDeviceId]);

  const getMapCenter = () => {
    if (selectedDeviceId) {
      const pos = positions.get(selectedDeviceId);
      if (pos) return { latitude: pos.latitude, longitude: pos.longitude };
    }
    if (positions.size === 0) return DEFAULT_MAP_CENTER;
    const coords = Array.from(positions.values());
    if (coords.length === 1) return { latitude: coords[0].latitude, longitude: coords[0].longitude };
    const latSum = coords.reduce((sum, pos) => sum + pos.latitude, 0);
    const lonSum = coords.reduce((sum, pos) => sum + pos.longitude, 0);
    return { latitude: latSum / coords.length, longitude: lonSum / coords.length };
  };

  const getMapZoom = () => {
    if (selectedDeviceId) return 14;
    if (positions.size === 1) return 13;
    if (positions.size > 1) return 11;
    return 5;
  };

  const getMarkers = () => {
    const uniqueMarkers: any[] = [];
    const processedDeviceIds = new Set<number>();
    positions.forEach((position, deviceId) => {
      if (processedDeviceIds.has(deviceId)) return;
      const device = devices.find(d => d.id === deviceId);
      if (!device) return;
      processedDeviceIds.add(deviceId);
      const address = deviceAddresses.get(deviceId);
      uniqueMarkers.push({
        id: `vehicle-${deviceId}`,
        latitude: position.latitude,
        longitude: position.longitude,
        title: device.name,
        description: getLocationLabel({ address, positionAddress: position.address, latitude: position.latitude, longitude: position.longitude }),
        color: device.status === 'online' ? colors.success : colors.error,
        deviceName: device.name,
        deviceModel: device.model || '',
        status: (position.speed * 1.852) >= 1 ? 'moving' : device.status === 'online' ? 'online' : 'offline',
        course: position.course || 0,
      });
    });
    return uniqueMarkers;
  };

  const mapLayers: { type: MapLayerType; label: string }[] = [
    { type: themeBaseLayer, label: 'Standard' },
    { type: 'satellite', label: 'Satellite' },
    { type: 'terrain', label: 'Terrain' },
    { type: 'hybrid', label: 'Hybrid' },
  ];

  const selectedPosition = selectedDeviceId ? positions.get(selectedDeviceId) : null;
  const selectedDevice = selectedDeviceId ? devices.find(d => d.id === selectedDeviceId) : null;
  const mapMarkers = getMarkers();
  const shouldFitAllMarkers = !selectedDeviceId && mapMarkers.length > 0;

  const polylines = useMemo(() => {
    if (!selectedDeviceId) return [];
    const trail = positionTrails.get(selectedDeviceId) ?? [];
    const coordinates = positionsToPath(trail);
    if (coordinates.length < 2) return [];
    return [{
      id: 'trail',
      coordinates,
      color: '#22c55e',
      width: 6,
      opacity: 1,
    }];
  }, [selectedDeviceId, positionTrails]);

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
        <WebMapView
          markers={mapMarkers}
          polylines={polylines}
          center={getMapCenter()}
          zoom={getMapZoom()}
          fitToMarkers={shouldFitAllMarkers}
          onMarkerPress={(markerId) => {
            const deviceId = parseInt(markerId.replace('vehicle-', ''), 10);
            if (!isNaN(deviceId)) {
              const device = devices.find(d => d.id === deviceId);
              if (device) {
                setSelectedDeviceId(deviceId);
                openCompanion(device.id, device.name);
              }
            }
          }}
          showUserLocation
          mapLayer={resolveMapLayer(mapLayer, isDark)}
          style={styles.map}
        />

        <TouchableOpacity style={styles.layerButton} onPress={() => setShowLayerSelector(!showLayerSelector)}>
          <Layers color={colors.text.primary} size={20} />
        </TouchableOpacity>

        {showLayerSelector && (
          <View style={styles.layerSelector}>
            <GlassCard style={styles.layerCard}>
              <Text style={styles.layerTitle}>Map Type</Text>
              {mapLayers.map((layer) => (
                <TouchableOpacity
                  key={layer.type}
                  style={[styles.layerOption, resolveMapLayer(mapLayer, isDark) === layer.type && styles.layerOptionActive]}
                  onPress={() => { setMapLayer(layer.type); setShowLayerSelector(false); }}
                >
                  <Text style={[styles.layerOptionText, resolveMapLayer(mapLayer, isDark) === layer.type && styles.layerOptionTextActive]}>
                    {layer.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </GlassCard>
          </View>
        )}

        {positions.size === 0 && (
          <View style={styles.noDevicesBanner}>
            <Text style={styles.noDevicesText}>No live vehicle positions yet</Text>
          </View>
        )}

        {selectedPosition && selectedDevice && (
          <View style={[styles.deviceDetailsOverlay, { bottom: tabBarBottomInset }]}>
            <GlassCard style={styles.deviceDetailsCard}>
              <View style={styles.deviceDetailsHeader}>
                <View style={styles.deviceDetailsInfo}>
                  <Text style={styles.deviceDetailsName}>{selectedDevice.name}</Text>
                  <Text style={styles.deviceDetailsSpeed}>
                    {formatSpeed(selectedPosition.speed, prefs.speedUnit)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedDeviceId(null)} style={styles.closeButton}>
                  <X color={colors.text.secondary} size={20} />
                </TouchableOpacity>
              </View>
              <View style={styles.deviceDetailsBody}>
                <Text style={styles.address}>
                  📍 {selectedDeviceId
                    ? getLocationLabel({
                        address: deviceAddresses.get(selectedDeviceId),
                        positionAddress: selectedPosition.address,
                        latitude: selectedPosition.latitude,
                        longitude: selectedPosition.longitude,
                      })
                    : 'No address'}
                </Text>
                <Text style={styles.timestamp}>
                  Last update: {new Date(selectedPosition.fixTime).toLocaleTimeString()}
                </Text>
                <TouchableOpacity style={styles.askAiBtn} onPress={() => openCompanion(selectedDevice.id, selectedDevice.name)}>
                  <Text style={styles.askAiText}>Ask AI Companion</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        )}
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
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
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  noDevicesBanner: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 80,
    backgroundColor: colors.glass.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  noDevicesText: {
    ...typography.small,
    color: colors.text.secondary,
  },
  deviceDetailsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  deviceDetailsCard: { padding: 16 },
  deviceDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deviceDetailsInfo: { flex: 1 },
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
  askAiBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  askAiText: {
    ...typography.smallMd,
    color: colors.primary,
    fontWeight: '600',
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
  layerCard: { padding: 12 },
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
