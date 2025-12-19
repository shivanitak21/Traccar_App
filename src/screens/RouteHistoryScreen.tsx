import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { GlassCard } from '../components/GlassCard';
import { WebMapView } from '../components/WebMapView';
import { Calendar, Clock, Navigation, MapPin, X, Filter, Eye } from 'lucide-react-native';

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

interface RouteSegment {
  fromTime: Date;
  toTime: Date;
  distance: number; // km
  positions: TraccarPosition[];
}

export const RouteHistoryScreen: React.FC<RouteHistoryScreenProps> = ({ deviceId, onClose }) => {
  const [device, setDevice] = useState<TraccarDevice | null>(null);
  const [route, setRoute] = useState<TraccarPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedRouteSegment, setSelectedRouteSegment] = useState<RouteSegment | null>(null);
  const [stats, setStats] = useState<RouteStats | null>(null);
  const [customFromDate, setCustomFromDate] = useState<Date>(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const [customToDate, setCustomToDate] = useState<Date>(new Date());
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [showFromTimePicker, setShowFromTimePicker] = useState(false);
  const [showToTimePicker, setShowToTimePicker] = useState(false);
  const [showRouteOnMap, setShowRouteOnMap] = useState(false);

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

  const loadRoute = useCallback(async (filter: TimeFilter = timeFilter, fromDate?: Date, toDate?: Date) => {
    try {
      setLoading(true);
      const deviceData = await traccarAPI.getDevice(deviceId);
      setDevice(deviceData);

      const to = toDate || new Date();
      let from = fromDate || new Date();

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
          from = fromDate || customFromDate;
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
  }, [deviceId, timeFilter, customFromDate]);

  useEffect(() => {
    loadRoute();
  }, [deviceId]);

  const handleFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    setShowFilterModal(false);
    if (filter === 'custom') {
      setShowCustomDatePicker(true);
    } else {
      loadRoute(filter);
    }
  };

  const handleCustomDateApply = () => {
    if (customFromDate >= customToDate) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }
    setShowCustomDatePicker(false);
    setShowFilterModal(false);
    loadRoute('custom', customFromDate, customToDate);
  };

  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const parseDateTime = (value: string): Date => {
    const [datePart, timePart] = value.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [0, 0];
    return new Date(year, month - 1, day, hours, minutes);
  };

  // Group route into segments by day for better display
  const routeSegments = useMemo(() => {
    if (route.length === 0) return [];

    const segments: RouteSegment[] = [];
    let currentSegment: RouteSegment | null = null;

    route.forEach((position, index) => {
      const positionDate = new Date(position.fixTime);
      const positionDay = positionDate.toDateString();

      if (!currentSegment || new Date(currentSegment.fromTime).toDateString() !== positionDay) {
        // Start new segment
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          fromTime: positionDate,
          toTime: positionDate,
          distance: 0,
          positions: [position],
        };
      } else {
        // Add to current segment
        currentSegment.positions.push(position);
        currentSegment.toTime = positionDate;

        // Calculate distance from previous point in the segment
        if (currentSegment.positions.length > 1) {
          const prevPos = currentSegment.positions[currentSegment.positions.length - 2];
          const R = 6371; // Earth radius in km
          const dLat = ((position.latitude - prevPos.latitude) * Math.PI) / 180;
          const dLon = ((position.longitude - prevPos.longitude) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((prevPos.latitude * Math.PI) / 180) *
              Math.cos((position.latitude * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          currentSegment.distance += distance;
        }
      }
    });

    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments;
  }, [route]);

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

  const getRoutePolylines = useCallback((positions: TraccarPosition[]) => {
    if (positions.length < 2) return [];

    const polylines: { coordinates: { latitude: number; longitude: number }[]; color: string; width: number }[] = [];

    for (let i = 0; i < positions.length - 1; i++) {
      const speed = positions[i].speed * 1.852;
      let color = colors.success;
      if (speed > 60) color = colors.error;
      else if (speed > 20) color = colors.warning;

      polylines.push({
        coordinates: [
          { latitude: positions[i].latitude, longitude: positions[i].longitude },
          { latitude: positions[i + 1].latitude, longitude: positions[i + 1].longitude },
        ],
        color,
        width: 4,
      });
    }

    return polylines;
  }, []);

  const getMapCenter = useCallback((positions: TraccarPosition[]) => {
    if (positions.length === 0) return { latitude: 0, longitude: 0 };
    const centerIndex = Math.floor(positions.length / 2);
    return {
      latitude: positions[centerIndex].latitude,
      longitude: positions[centerIndex].longitude,
    };
  }, []);

  const handleViewRoute = (segment: RouteSegment) => {
    setSelectedRouteSegment(segment);
    setShowRouteOnMap(true);
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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Navigation color={colors.primary} size={32} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Route History</Text>
            <Text style={styles.subtitle}>{device?.name || 'Unknown Device'}</Text>
          </View>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Filter color={colors.text.primary} size={20} />
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity style={styles.closeButtonHeader} onPress={onClose}>
              <X color={colors.text.primary} size={20} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {route.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MapPin color={colors.text.tertiary} size={48} />
          <Text style={styles.emptyText}>No route data available</Text>
          <Text style={styles.emptySubtext}>Try selecting a different time range</Text>
        </View>
      ) : (
        <>
          {showRouteOnMap && selectedRouteSegment ? (
            <View style={styles.mapContainer}>
              <WebMapView
                markers={[]}
                polylines={getRoutePolylines(selectedRouteSegment.positions)}
                center={getMapCenter(selectedRouteSegment.positions)}
                zoom={13}
                style={styles.map}
              />
              <TouchableOpacity
                style={styles.closeMapButton}
                onPress={() => setShowRouteOnMap(false)}
              >
                <X color={colors.text.primary} size={20} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mapContainer}>
              <WebMapView
                markers={[]}
                polylines={getRoutePolylines(route)}
                center={getMapCenter(route)}
                zoom={13}
                style={styles.map}
              />
            </View>
          )}

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

          <ScrollView 
            style={styles.listContainer} 
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.listTitle}>Route History ({routeSegments.length} segments)</Text>
            {routeSegments.map((segment, index) => (
              <GlassCard key={index} style={styles.routeItem}>
                <View style={styles.routeItemHeader}>
                  <View style={styles.routeItemIcon}>
                    <Navigation color={colors.primary} size={20} />
                  </View>
                  <View style={styles.routeItemInfo}>
                    <Text style={styles.routeItemTime}>
                      {segment.fromTime.toLocaleDateString()} {segment.fromTime.toLocaleTimeString()} - {segment.toTime.toLocaleTimeString()}
                    </Text>
                    <Text style={styles.routeItemDistance}>
                      Distance: {segment.distance.toFixed(2)} km
                    </Text>
                    <Text style={styles.routeItemPoints}>
                      {segment.positions.length} points
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => handleViewRoute(segment)}
                  >
                    <Eye color={colors.primary} size={18} />
                    <Text style={styles.viewButtonText}>View</Text>
                  </TouchableOpacity>
                </View>
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
              {(['24h', '7d', '30d', 'custom'] as TimeFilter[]).map((filter) => (
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

      <Modal
        visible={showCustomDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Date Range</Text>
              <TouchableOpacity onPress={() => setShowCustomDatePicker(false)}>
                <X color={colors.text.primary} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.datePickerScrollView}>
              <View style={styles.datePickerContainer}>
                <Text style={styles.dateLabel}>From Date & Time</Text>
                <View style={styles.dateRow}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowFromDatePicker(true)}
                  >
                    <Calendar color={colors.primary} size={20} />
                    <Text style={styles.dateButtonText}>{formatDateTime(customFromDate).split(' ')[0]}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowFromTimePicker(true)}
                  >
                    <Clock color={colors.primary} size={20} />
                    <Text style={styles.dateButtonText}>{formatDateTime(customFromDate).split(' ')[1]}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.dateLabel, { marginTop: 16 }]}>To Date & Time</Text>
                <View style={styles.dateRow}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowToDatePicker(true)}
                  >
                    <Calendar color={colors.primary} size={20} />
                    <Text style={styles.dateButtonText}>{formatDateTime(customToDate).split(' ')[0]}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowToTimePicker(true)}
                  >
                    <Clock color={colors.primary} size={20} />
                    <Text style={styles.dateButtonText}>{formatDateTime(customToDate).split(' ')[1]}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.applyButton} onPress={handleCustomDateApply}>
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>

              {showFromDatePicker && (
                <DateTimePicker
                  value={customFromDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowFromDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      const newDate = new Date(selectedDate);
                      newDate.setHours(customFromDate.getHours());
                      newDate.setMinutes(customFromDate.getMinutes());
                      setCustomFromDate(newDate);
                    }
                  }}
                />
              )}

              {showToDatePicker && (
                <DateTimePicker
                  value={customToDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowToDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      const newDate = new Date(selectedDate);
                      newDate.setHours(customToDate.getHours());
                      newDate.setMinutes(customToDate.getMinutes());
                      setCustomToDate(newDate);
                    }
                  }}
                />
              )}

              {showFromTimePicker && (
                <DateTimePicker
                  value={customFromDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowFromTimePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      const newDate = new Date(customFromDate);
                      newDate.setHours(selectedDate.getHours());
                      newDate.setMinutes(selectedDate.getMinutes());
                      setCustomFromDate(newDate);
                    }
                  }}
                />
              )}

              {showToTimePicker && (
                <DateTimePicker
                  value={customToDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowToTimePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      const newDate = new Date(customToDate);
                      newDate.setHours(selectedDate.getHours());
                      newDate.setMinutes(selectedDate.getMinutes());
                      setCustomToDate(newDate);
                    }
                  }}
                />
              )}
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  closeButtonHeader: {
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
  routeItemDistance: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  routeItemPoints: {
    ...typography.small,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 6,
  },
  viewButtonText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  closeMapButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
    zIndex: 10,
  },
  datePickerScrollView: {
    maxHeight: 400,
  },
  datePickerContainer: {
    gap: 12,
  },
  dateLabel: {
    ...typography.small,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
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
