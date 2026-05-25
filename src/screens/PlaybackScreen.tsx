import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { GlassCard } from '../components/GlassCard';
import { WebMapView } from '../components/WebMapView';
import { Play, Pause, SkipBack, SkipForward, X, Calendar, Filter, Clock } from 'lucide-react-native';
import { usePrefsStore } from '../stores/prefsStore';
import { formatSpeed } from '../utils/units';

const { width, height } = Dimensions.get('window');

interface PlaybackScreenProps {
  deviceId: number;
  onClose?: () => void;
}

type TimeFilter = '24h' | '7d' | '30d' | 'custom';

export const PlaybackScreen: React.FC<PlaybackScreenProps> = ({ deviceId, onClose }) => {
  const [device, setDevice] = useState<TraccarDevice | null>(null);
  const [route, setRoute] = useState<TraccarPosition[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialCenter, setInitialCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const { prefs } = usePrefsStore();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [customFromDate, setCustomFromDate] = useState<Date>(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const [customToDate, setCustomToDate] = useState<Date>(new Date());
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [showFromTimePicker, setShowFromTimePicker] = useState(false);
  const [showToTimePicker, setShowToTimePicker] = useState(false);
  const playbackInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Only the moving trail — no full-route or future segments (prevents flash)
  const polylines = useMemo(() => {
    if (route.length < 2 || currentIndex < 1) return [];
    return [{
      id: 'trail',
      coordinates: route.slice(0, currentIndex + 1).map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })),
      color: '#22c55e',
      width: 6,
      opacity: 1,
    }];
  }, [route, currentIndex]);

  // Calculate current position and markers - MUST be before early returns
  const currentPosition = useMemo(() => {
    return route.length > 0 && currentIndex >= 0 ? route[currentIndex] : null;
  }, [route, currentIndex]);

  const speed = useMemo(() => {
    return currentPosition ? formatSpeed(currentPosition.speed, prefs.speedUnit) : formatSpeed(0, prefs.speedUnit);
  }, [currentPosition, prefs.speedUnit]);

  // Single vehicle marker at current position
  const markers = useMemo(() => {
    return currentPosition ? [
      {
        id: 'current',
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        title: device?.name || 'Device',
        description: speed,
        color: colors.primary,
        status: currentPosition.speed > 0 ? 'moving' : 'online',
        course: currentPosition.course || 0,
      },
    ] : [];
  }, [currentPosition, device, speed]);

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
          // Use provided custom dates
          from = fromDate || customFromDate;
          break;
      }

      const fromISO = from.toISOString();
      const toISO = to.toISOString();

      const routeData = await traccarAPI.getReportRoute(deviceId, fromISO, toISO);

      if (routeData.length === 0) {
        Alert.alert('No Data', `No route data found for the selected time period`);
        setRoute([]);
      } else {
        // Sort by time
        routeData.sort((a, b) => new Date(a.fixTime).getTime() - new Date(b.fixTime).getTime());
        setRoute(routeData);
        setCurrentIndex(0);

        if (routeData.length > 0) {
          const firstPoint = routeData[0];
          setInitialCenter({ latitude: firstPoint.latitude, longitude: firstPoint.longitude });
        }
      }
    } catch (error) {
      console.error('Failed to load route:', error);
      Alert.alert('Error', 'Failed to load route data');
    } finally {
      setLoading(false);
    }
  }, [deviceId, timeFilter, customFromDate]);

  useEffect(() => {
    loadRoute();

    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, [deviceId]);

  useEffect(() => {
    if (isPlaying && route.length > 0) {
      // Calculate playback speed to complete in 15 seconds
      const totalDuration = 15000;
      const intervalTime = Math.max(250, Math.floor(totalDuration / route.length));
      
      playbackInterval.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= route.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalTime);
    } else if (playbackInterval.current) {
      clearInterval(playbackInterval.current);
      playbackInterval.current = null;
    }

    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
        playbackInterval.current = null;
      }
    };
  }, [isPlaying, route.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const handleSkipForward = () => {
    setCurrentIndex(prev => Math.min(prev + 10, route.length - 1));
    setIsPlaying(false);
  };

  const handleSkipBackward = () => {
    setCurrentIndex(prev => Math.max(prev - 10, 0));
    setIsPlaying(false);
  };

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

  const getSpeedColor = (speed: number) => {
    const kmh = speed * 1.852;
    // Using darker, muted colors for better visibility on map
    if (kmh < 20) return '#1a4d2e'; // Dark green
    if (kmh < 60) return '#8b5a00'; // Dark orange
    return '#5C3A18'; // Dark warm amber (high speed)
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

  if (loading && route.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading route...</Text>
      </View>
    );
  }

  if (route.length === 0 && !loading) {
    return (
      <View style={styles.container}>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X color={colors.text.primary} size={24} />
          </TouchableOpacity>
        )}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No route data available</Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Filter color={colors.primary} size={20} />
            <Text style={styles.filterButtonText}>Change Time Range</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X color={colors.text.primary} size={24} />
        </TouchableOpacity>
      )}

      <WebMapView
        markers={markers}
        polylines={polylines}
        center={initialCenter || (route[0] ? { latitude: route[0].latitude, longitude: route[0].longitude } : { latitude: 0, longitude: 0 })}
        zoom={14}
        mapLayer="streets"
        smoothPlayback
        followMarker={isPlaying}
        style={styles.map}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading route...</Text>
        </View>
      )}

      {/* Filter button - positioned to not overlap close button */}
      <TouchableOpacity
        style={styles.filterButtonTop}
        onPress={() => setShowFilterModal(true)}
      >
        <Calendar color={colors.text.primary} size={18} />
        <Text style={styles.filterButtonText}>{getFilterLabel(timeFilter)}</Text>
      </TouchableOpacity>

      <View style={styles.controlsContainer}>
        <GlassCard style={styles.controlsCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Device:</Text>
              <Text style={styles.infoValue}>{device?.name || 'Unknown'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Speed:</Text>
              <Text style={[styles.infoValue, { color: getSpeedColor(currentPosition?.speed || 0) }]}>
                {speed}
              </Text>
            </View>
          </View>

          {currentPosition && (
            <Text style={styles.timestamp}>
              {new Date(currentPosition.fixTime).toLocaleString()}
            </Text>
          )}

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              {currentIndex + 1} / {route.length}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={route.length - 1}
              value={currentIndex}
              onValueChange={(value: number) => {
                setCurrentIndex(Math.round(value));
                setIsPlaying(false);
              }}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.glass.border}
              thumbTintColor={colors.primary}
              step={1}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.controlButton} onPress={handleSkipBackward}>
              <SkipBack color={colors.text.primary} size={24} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
              {isPlaying ? (
                <Pause color={colors.text.primary} size={32} />
              ) : (
                <Play color={colors.text.primary} size={32} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={handleSkipForward}>
              <SkipForward color={colors.text.primary} size={24} />
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>

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
          </GlassCard>
        </View>
      </Modal>
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,15,20,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
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
  filterButtonTop: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.primary,
    gap: 8,
  },
  filterButtonText: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '600',
  },
  map: {
    width,
    height,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  controlsCard: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    ...typography.small,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  infoValue: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  timestamp: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  datePickerContainer: {
    gap: 12,
  },
  dateLabel: {
    ...typography.small,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: 4,
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
});
