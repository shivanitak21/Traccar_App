import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { createShadows } from '../theme/shadows';
import { elevaticsAPI, ElevaticsDevice, ElevaticsPosition } from '../api/elevatics';
import { elevaticsWS } from '../api/websocket';
import { GlassCard } from '../components/GlassCard';
import { WebMapView, MapLayerType } from '../components/WebMapView';
import { IconButton } from '../components/ui/IconButton';
import { StatusChip } from '../components/ui/StatusChip';
import { LoadingState } from '../components/ui/LoadingState';
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
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
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
  const isMoving = selectedPosition ? (selectedPosition.speed * 1.852) >= 1 : false;

  const polylines = useMemo(() => {
    if (!selectedDeviceId) return [];
    const trail = positionTrails.get(selectedDeviceId) ?? [];
    const coordinates = positionsToPath(trail);
    if (coordinates.length < 2) return [];
    return [{
      id: 'trail',
      coordinates,
      color: colors.success,
      width: 6,
      opacity: 1,
    }];
  }, [selectedDeviceId, positionTrails, colors.success]);

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingState label="Loading map…" fullScreen />
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

        <View style={[styles.topControls, { top: insets.top + 12 }]}>
          {positions.size === 0 ? (
            <View style={styles.noDevicesBanner}>
              <MapPin size={14} color={colors.text.secondary} strokeWidth={2} />
              <Text style={styles.noDevicesText}>No live vehicle positions yet</Text>
            </View>
          ) : (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{positions.size} live</Text>
            </View>
          )}

          <IconButton
            accessibilityLabel="Map layers"
            onPress={() => setShowLayerSelector(!showLayerSelector)}
            variant="filled"
            style={styles.layerFab}
          >
            <Layers color={colors.text.primary} size={20} strokeWidth={1.8} />
          </IconButton>
        </View>

        {showLayerSelector && (
          <View style={[styles.layerSelector, { top: insets.top + 72 }]}>
            <GlassCard style={styles.layerCard} blur>
              <Text style={styles.layerTitle}>Map Type</Text>
              {mapLayers.map((layer) => {
                const active = resolveMapLayer(mapLayer, isDark) === layer.type;
                return (
                  <Pressable
                    key={layer.type}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.layerOption,
                      active && styles.layerOptionActive,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => { setMapLayer(layer.type); setShowLayerSelector(false); }}
                  >
                    <Text style={[styles.layerOptionText, active && styles.layerOptionTextActive]}>
                      {layer.label}
                    </Text>
                  </Pressable>
                );
              })}
            </GlassCard>
          </View>
        )}

        {selectedPosition && selectedDevice && (
          <View style={[styles.deviceDetailsOverlay, { bottom: tabBarBottomInset }]}>
            <GlassCard style={styles.deviceDetailsCard} blur>
              <View style={styles.deviceDetailsHeader}>
                <View style={styles.deviceDetailsInfo}>
                  <Text style={styles.deviceDetailsName}>{selectedDevice.name}</Text>
                  <View style={styles.chipRow}>
                    <StatusChip
                      label={formatSpeed(selectedPosition.speed, prefs.speedUnit)}
                      variant={isMoving ? 'moving' : selectedDevice.status === 'online' ? 'idle' : 'offline'}
                      size="sm"
                    />
                  </View>
                </View>
                <IconButton
                  accessibilityLabel="Close vehicle details"
                  onPress={() => setSelectedDeviceId(null)}
                  size="sm"
                  variant="ghost"
                >
                  <X color={colors.text.secondary} size={18} strokeWidth={2} />
                </IconButton>
              </View>
              <View style={styles.deviceDetailsBody}>
                <View style={styles.addressRow}>
                  <MapPin size={13} color={colors.text.tertiary} strokeWidth={2} />
                  <Text style={styles.address} numberOfLines={2}>
                    {selectedDeviceId
                      ? getLocationLabel({
                          address: deviceAddresses.get(selectedDeviceId),
                          positionAddress: selectedPosition.address,
                          latitude: selectedPosition.latitude,
                          longitude: selectedPosition.longitude,
                        })
                      : 'No address'}
                  </Text>
                </View>
                <Text style={styles.timestamp}>
                  Last update · {new Date(selectedPosition.fixTime).toLocaleTimeString()}
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.askAiBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => openCompanion(selectedDevice.id, selectedDevice.name)}
                  accessibilityRole="button"
                  accessibilityLabel="Ask AI Companion"
                >
                  <Text style={styles.askAiText}>Ask AI Companion</Text>
                </Pressable>
              </View>
            </GlassCard>
          </View>
        )}
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => {
  const elevation = createShadows(isDark, colors);
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    mapContainer: {
      flex: 1,
      overflow: 'hidden',
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    topControls: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 10,
      gap: 12,
    },
    noDevicesBanner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.glass.background,
      borderRadius: radius.lg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.glass.border,
      ...elevation.md,
    },
    noDevicesText: {
      ...typography.smallMd,
      color: colors.text.secondary,
      flex: 1,
    },
    countBadge: {
      backgroundColor: colors.glass.background,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.glass.border,
      ...elevation.sm,
    },
    countText: {
      ...typography.smallMd,
      color: colors.text.primary,
    },
    layerFab: {
      ...elevation.md,
    },
    deviceDetailsOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      paddingHorizontal: spacing.md,
    },
    deviceDetailsCard: {
      padding: spacing.md,
      ...elevation.float,
    },
    deviceDetailsHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 8,
    },
    deviceDetailsInfo: { flex: 1, gap: 8 },
    deviceDetailsName: {
      ...typography.h4,
      color: colors.text.primary,
    },
    chipRow: {
      flexDirection: 'row',
    },
    deviceDetailsBody: {
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border.subtle,
      gap: 6,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },
    address: {
      ...typography.small,
      color: colors.text.secondary,
      flex: 1,
      lineHeight: 18,
    },
    timestamp: {
      ...typography.tiny,
      color: colors.text.tertiary,
      marginLeft: 19,
    },
    askAiBtn: {
      marginTop: 8,
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.control,
      minHeight: 40,
      justifyContent: 'center',
    },
    askAiText: {
      ...typography.smallMd,
      color: colors.primary,
      fontWeight: '600',
    },
    layerSelector: {
      position: 'absolute',
      right: spacing.md,
      zIndex: 10,
      minWidth: 160,
    },
    layerCard: { padding: 12 },
    layerTitle: {
      ...typography.smallMd,
      color: colors.text.secondary,
      marginBottom: 8,
    },
    layerOption: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      marginBottom: 4,
      minHeight: 44,
      justifyContent: 'center',
    },
    layerOptionActive: {
      backgroundColor: colors.primaryMuted,
    },
    layerOptionText: {
      ...typography.body,
      color: colors.text.primary,
    },
    layerOptionTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
  });
};
