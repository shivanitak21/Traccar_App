import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { traccarAPI, TraccarDevice, TraccarPosition } from '../api/traccar';
import { GlassCard } from '../components/GlassCard';
import { WebMapView } from '../components/WebMapView';
import { Play, Pause, SkipBack, SkipForward, MapPin, X } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface PlaybackScreenProps {
  deviceId: number;
  onClose?: () => void;
}

export const PlaybackScreen: React.FC<PlaybackScreenProps> = ({ deviceId, onClose }) => {
  const [device, setDevice] = useState<TraccarDevice | null>(null);
  const [route, setRoute] = useState<TraccarPosition[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const playbackInterval = useRef<NodeJS.Timeout | null>(null);

  const loadRoute = async () => {
    try {
      const deviceData = await traccarAPI.getDevice(deviceId);
      setDevice(deviceData);

      const to = new Date();
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

      const fromISO = from.toISOString();
      const toISO = to.toISOString();

      const routeData = await traccarAPI.getRoute(deviceId, fromISO, toISO);

      if (routeData.length === 0) {
        Alert.alert('No Data', 'No route data found for the last 24 hours');
      }

      setRoute(routeData);

      if (routeData.length > 0) {
        const firstPoint = routeData[0];
        setMapCenter({ latitude: firstPoint.latitude, longitude: firstPoint.longitude });
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
      playbackInterval.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= route.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500);
    } else if (playbackInterval.current) {
      clearInterval(playbackInterval.current);
    }

    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, [isPlaying, route.length]);

  useEffect(() => {
    if (route.length > 0) {
      const currentPosition = route[currentIndex];
      if (currentPosition) {
        setMapCenter({ latitude: currentPosition.latitude, longitude: currentPosition.longitude });
      }
    }
  }, [currentIndex]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const handleSkipForward = () => {
    setCurrentIndex(prev => Math.min(prev + 10, route.length - 1));
  };

  const getSpeedColor = (speed: number) => {
    const kmh = speed * 1.852;
    if (kmh < 20) return colors.success;
    if (kmh < 60) return colors.warning;
    return colors.error;
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
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No route data available</Text>
      </View>
    );
  }

  const currentPosition = route[currentIndex];
  const speed = currentPosition ? Math.round(currentPosition.speed * 1.852) : 0;

  const markers = [];

  markers.push({
    id: 'start',
    latitude: route[0].latitude,
    longitude: route[0].longitude,
    title: 'Start',
    description: new Date(route[0].fixTime).toLocaleTimeString(),
    color: colors.success,
  });

  markers.push({
    id: 'end',
    latitude: route[route.length - 1].latitude,
    longitude: route[route.length - 1].longitude,
    title: 'End',
    description: new Date(route[route.length - 1].fixTime).toLocaleTimeString(),
    color: colors.error,
  });

  if (currentPosition) {
    markers.push({
      id: 'current',
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
      title: device?.name || 'Device',
      description: `${speed} km/h • ${new Date(currentPosition.fixTime).toLocaleTimeString()}`,
      color: colors.primary,
    });
  }

  const polylines: { coordinates: { latitude: number; longitude: number }[]; color: string; width: number }[] = [];
  for (let i = 0; i < currentIndex && i < route.length - 1; i++) {
    polylines.push({
      coordinates: [
        { latitude: route[i].latitude, longitude: route[i].longitude },
        { latitude: route[i + 1].latitude, longitude: route[i + 1].longitude },
      ],
      color: getSpeedColor(route[i].speed),
      width: 4,
    });
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
            <TouchableOpacity style={styles.controlButton} onPress={handleRestart}>
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
});
