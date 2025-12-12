import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { GlassCard } from '../components/GlassCard';
import { WebMapView } from '../components/WebMapView';
import { Play, Pause, SkipBack, SkipForward, X, Calendar, Filter } from 'lucide-react-native';

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
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const playbackInterval = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTime = useRef<number>(0);

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
          // For custom, use last 24h as default, user can extend later
          from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
          break;
      }

      const fromISO = from.toISOString();
      const toISO = to.toISOString();

      const routeData = await traccarAPI.getRoute(deviceId, fromISO, toISO);

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
          setMapCenter({ latitude: firstPoint.latitude, longitude: firstPoint.longitude });
        }
      }
    } catch (error) {
      console.error('Failed to load route:', error);
      Alert.alert('Error', 'Failed to load route data');
    } finally {
      setLoading(false);
    }
  };

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
      // Calculate playback speed to complete in 10-20 seconds
      const totalDuration = 15000; // 15 seconds
      const intervalTime = Math.max(100, Math.floor(totalDuration / route.length)); // Min 100ms for smoothness
      
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
  
  // Separate effect for map center updates to prevent blinking
  useEffect(() => {
    if (route.length > 0 && currentIndex % 20 === 0) {
      const currentPosition = route[currentIndex];
      if (currentPosition) {
        setMapCenter({
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
        });
      }
    }
  }, [currentIndex, route.length]);

  useEffect(() => {
    if (route.length > 0 && !isPlaying) {
      const currentPosition = route[currentIndex];
      if (currentPosition) {
        setMapCenter({ latitude: currentPosition.latitude, longitude: currentPosition.longitude });
      }
    }
  }, [currentIndex, route.length]);

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
    loadRoute(filter);
  };

  const getSpeedColor = (speed: number) => {
    const kmh = speed * 1.852;
    // Using darker, muted colors for better visibility on map
    if (kmh < 20) return '#1a4d2e'; // Dark green
    if (kmh < 60) return '#8b5a00'; // Dark orange
    return '#6b0000'; // Dark red
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading route...</Text>
      </View>
    );
  }

  if (route.length === 0) {
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

  const currentPosition = route[currentIndex];
  const speed = currentPosition ? Math.round(currentPosition.speed * 1.852) : 0;

  // Single vehicle marker at current position
  const markers = [
    {
      id: 'current',
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
      title: device?.name || 'Device',
      description: `${speed} km/h • ${new Date(currentPosition.fixTime).toLocaleTimeString()}`,
      color: colors.primary,
      status: 'online',
    },
  ];

  // Build complete route polyline with color coding
  // Show complete route from start to current position as a single polyline for smoothness
  const polylines: { coordinates: { latitude: number; longitude: number }[]; color: string; width: number }[] = [];
  
  if (currentIndex > 0) {
    // Draw past route (from start to current) in dark gray
    const pastCoordinates = route.slice(0, currentIndex + 1).map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));
    
    if (pastCoordinates.length > 1) {
      polylines.push({
        coordinates: pastCoordinates,
        color: '#1a1a2e', // Dark color for past route
        width: 5,
      });
    }
  }
  
  // Draw remaining route in very dark gray to show path ahead
  if (currentIndex < route.length - 1) {
    const futureCoordinates = route.slice(currentIndex).map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));
    
    if (futureCoordinates.length > 1) {
      polylines.push({
        coordinates: futureCoordinates,
        color: '#0d0d1a', // Very dark color for future route
        width: 3,
      });
    }
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
        center={mapCenter || { latitude: route[0].latitude, longitude: route[0].longitude }}
        zoom={13}
        style={styles.map}
      />

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
                {speed} km/h
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
});
