import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { GlassCard } from '../components/GlassCard';
import { WebMapView } from '../components/WebMapView';
import { Calendar, Clock, Navigation, MapPin, X, Filter } from 'lucide-react-native';

interface RouteHistoryScreenProps {
  deviceId: number;
  onClose?: () => void;
}

type TimeFilter = '24h' | '7d' | '30d' | 'custom';

interface RouteStats {
  totalDistance: number; // km
  runTime: number; // minutes
  idleTime: number; // minutes
  maxSpeed: number; // km/h
  avgSpeed: number; // km/h
  fromTime: Date;
  toTime: Date;
}

export const RouteHistoryScreen: React.FC<RouteHistoryScreenProps> = ({ deviceId, onClose }) => {
  const [device, setDevice] = useState<TraccarDevice | null>(null);
  const [route, setRoute] = useState<TraccarPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const [stats, setStats] = useState<RouteStats | null>(null);

  const calculateStats = (positions: TraccarPosition[]): RouteStats => {
    if (positions.length === 0) {
      return {
        totalDistance: 0,
        runTime: 0,
        idleTime: 0,
        maxSpeed: 0,
        avgSpeed: 0,
        fromTime: new Date(),
        toTime: new Date(),
      };
    }

    let totalDistance = 0; // in km
    let runTime = 0; // in minutes
    let idleTime = 0; // in minutes
    let maxSpeed = 0;
    let totalSpeed = 0;
    let speedCount = 0;

    const fromTime = new Date(positions[0].fixTime);
    const toTime = new Date(positions[positions.length - 1].fixTime);

    // Calculate distance between consecutive points
    for (let i = 0; i < positions.length - 1; i++) {
      const p1 = positions[i];
      const p2 = positions[i + 1];

      // Haversine formula for distance
      const R = 6371; // Earth radius in km
      const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
      const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1.latitude * Math.PI) / 180) *
          Math.cos((p2.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      totalDistance += distance;

      const speedKmh = p1.speed * 1.852;
      if (speedKmh > maxSpeed) {
        maxSpeed = speedKmh;
      }
      totalSpeed += speedKmh;
      speedCount++;

      // Calculate time difference in minutes
      const timeDiff = (new Date(p2.fixTime).getTime() - new Date(p1.fixTime).getTime()) / 1000 / 60;

      if (speedKmh < 1) {
        idleTime += timeDiff;
      } else {
        runTime += timeDiff;
      }
    }

    const avgSpeed = speedCount > 0 ? totalSpeed / speedCount : 0;

    return {
      totalDistance: Math.round(totalDistance * 100) / 100,
      runTime: Math.round(runTime),
      idleTime: Math.round(idleTime),
      maxSpeed: Math.round(maxSpeed),
      avgSpeed: Math.round(avgSpeed * 100) / 100,
      fromTime,
      toTime,
    };
  };

  const loadRoute = async (filter: TimeFilter = timeFilter) => {
    try {
      setLoading(true);
      const deviceData = await traccarAPI.getDevice(deviceId);
      setDevice(deviceData);

      const to = new Date();
      let from = new Date();

      switch (filter) {
        case '24h':
          from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
          break;
      }

      const fromISO = from.toISOString();
      const toISO = to.toISOString();

      const routeData = await traccarAPI.getRoute(deviceId, fromISO, toISO);

      if (routeData.length === 0) {
        setRoute([]);
        setStats(null);
      } else {
        // Sort by time
        routeData.sort((a, b) => new Date(a.fixTime).getTime() - new Date(b.fixTime).getTime());
        setRoute(routeData);
        setStats(calculateStats(routeData));
      }
    } catch (error) {
      console.error('Failed to load route history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoute();
  }, [deviceId]);

  const handleFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    setShowFilterModal(false);
    loadRoute(filter);
  };

  const getFilterLabel = (filter: TimeFilter) => {
    switch (filter) {
      case '24h':
        return 'Last 24 Hours';
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case 'custom':
        return 'Custom Range';
      default:
        return 'Last 24 Hours';
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getRoutePolylines = () => {
    if (route.length < 2) return [];

    const polylines: { coordinates: { latitude: number; longitude: number }[]; color: string; width: number }[] = [];

    for (let i = 0; i < route.length - 1; i++) {
      const speed = route[i].speed * 1.852;
      let color = colors.success;
      if (speed > 60) color = colors.error;
      else if (speed > 20) color = colors.warning;

      polylines.push({
        coordinates: [
          { latitude: route[i].latitude, longitude: route[i].longitude },
          { latitude: route[i + 1].latitude, longitude: route[i + 1].longitude },
        ],
        color,
        width: 4,
      });
    }

    return polylines;
  };

  const getMapCenter = () => {
    if (route.length === 0) return { latitude: 0, longitude: 0 };
    const centerIndex = Math.floor(route.length / 2);
    return {
      latitude: route[centerIndex].latitude,
      longitude: route[centerIndex].longitude,
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading route history...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={colors.gradient.dark} style={styles.container}>
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X color={colors.text.primary} size={24} />
        </TouchableOpacity>
      )}

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Navigation color={colors.primary} size={32} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Route History</Text>
            <Text style={styles.subtitle}>{device?.name || 'Unknown Device'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
          <Filter color={colors.text.primary} size={20} />
        </TouchableOpacity>
      </View>

      {route.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MapPin color={colors.text.tertiary} size={48} />
          <Text style={styles.emptyText}>No route data available</Text>
          <Text style={styles.emptySubtext}>Try selecting a different time range</Text>
        </View>
      ) : (
        <>
          <View style={styles.mapContainer}>
            <WebMapView
              markers={[]}
              polylines={getRoutePolylines()}
              center={getMapCenter()}
              zoom={13}
              style={styles.map}
            />
          </View>

          {stats && (
            <View style={styles.statsContainer}>
              <GlassCard style={styles.statsCard}>
                <Text style={styles.statsTitle}>Route Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Navigation color={colors.primary} size={24} />
                    <Text style={styles.statValue}>{stats.totalDistance} km</Text>
                    <Text style={styles.statLabel}>Total Distance</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Clock color={colors.success} size={24} />
                    <Text style={styles.statValue}>{formatDuration(stats.runTime)}</Text>
                    <Text style={styles.statLabel}>Run Time</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Clock color={colors.warning} size={24} />
                    <Text style={styles.statValue}>{formatDuration(stats.idleTime)}</Text>
                    <Text style={styles.statLabel}>Idle Time</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Navigation color={colors.error} size={24} />
                    <Text style={styles.statValue}>{stats.maxSpeed} km/h</Text>
                    <Text style={styles.statLabel}>Max Speed</Text>
                  </View>
                </View>
                <View style={styles.timeRange}>
                  <Text style={styles.timeRangeText}>
                    From: {stats.fromTime.toLocaleString()}
                  </Text>
                  <Text style={styles.timeRangeText}>
                    To: {stats.toTime.toLocaleString()}
                  </Text>
                </View>
              </GlassCard>
            </View>
          )}

          <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
            <Text style={styles.listTitle}>Route Points ({route.length})</Text>
            {route.map((position, index) => (
              <GlassCard key={index} style={styles.routeItem}>
                <View style={styles.routeItemHeader}>
                  <View style={styles.routeItemIcon}>
                    <MapPin color={colors.primary} size={20} />
                  </View>
                  <View style={styles.routeItemInfo}>
                    <Text style={styles.routeItemTime}>
                      {new Date(position.fixTime).toLocaleString()}
                    </Text>
                    <Text style={styles.routeItemSpeed}>
                      {Math.round(position.speed * 1.852)} km/h
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => {
                      setSelectedRouteIndex(index);
                    }}
                  >
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                </View>
                {position.address && (
                  <Text style={styles.routeItemAddress}>{position.address}</Text>
                )}
              </GlassCard>
            ))}
          </ScrollView>
        </>
      )}

      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time Range</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X color={colors.text.primary} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterOptions}>
              {(['24h', '7d', '30d'] as TimeFilter[]).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterOption,
                    timeFilter === filter && styles.filterOptionActive,
                  ]}
                  onPress={() => handleFilterChange(filter)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      timeFilter === filter && styles.filterOptionTextActive,
                    ]}
                  >
                    {getFilterLabel(filter)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>
      </Modal>

      {selectedRouteIndex !== null && (
        <Modal
          visible={selectedRouteIndex !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedRouteIndex(null)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.mapModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Route Point Details</Text>
                <TouchableOpacity onPress={() => setSelectedRouteIndex(null)}>
                  <X color={colors.text.primary} size={24} />
                </TouchableOpacity>
              </View>
              <WebMapView
                markers={[
                  {
                    id: 'selected',
                    latitude: route[selectedRouteIndex].latitude,
                    longitude: route[selectedRouteIndex].longitude,
                    title: 'Selected Point',
                    description: new Date(route[selectedRouteIndex].fixTime).toLocaleString(),
                    color: colors.primary,
                  },
                ]}
                center={{
                  latitude: route[selectedRouteIndex].latitude,
                  longitude: route[selectedRouteIndex].longitude,
                }}
                zoom={15}
                style={styles.modalMap}
              />
            </GlassCard>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 4,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  mapContainer: {
    height: 250,
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsCard: {
    padding: 16,
  },
  statsTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 243, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  statValue: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.small,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  timeRange: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  timeRangeText: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  listTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 12,
  },
  routeItem: {
    padding: 12,
    marginBottom: 12,
  },
  routeItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  routeItemInfo: {
    flex: 1,
  },
  routeItemTime: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeItemSpeed: {
    ...typography.small,
    color: colors.text.secondary,
  },
  routeItemAddress: {
    ...typography.small,
    color: colors.text.tertiary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  viewButtonText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    ...typography.small,
    color: colors.text.tertiary,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  mapModalContent: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
  },
  filterOptions: {
    gap: 12,
  },
  filterOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  filterOptionActive: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  filterOptionText: {
    ...typography.body,
    color: colors.text.primary,
  },
  filterOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalMap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
