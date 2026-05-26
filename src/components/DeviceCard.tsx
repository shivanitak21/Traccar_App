import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from './GlassCard';
import { ControlButton, ControlButtonRow } from './ui/ControlButton';
import { StatusChip } from './ui/StatusChip';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';
import { TraccarDevice } from '../api/traccar';
import { Navigation, Play, MapPinned, Info, Radio } from 'lucide-react-native';
import { getVehicleImageUrl } from '../utils/vehicleImages';

interface DeviceCardProps {
  device: TraccarDevice;
  index: number;
  onLiveTrack: () => void;
  onPlayback: () => void;
  onGeofence: () => void;
  onDeviceInfo: () => void;
  onCommands: () => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onLiveTrack,
  onPlayback,
  onGeofence,
  onDeviceInfo,
  onCommands,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isOnline = device.status === 'online';
  const vehicleImageUrl = getVehicleImageUrl(device.model, device.name);
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.imageContainer}>
        {imageError ? (
          <View style={[styles.vehicleImage, styles.placeholderContainer]}>
            <Navigation color={colors.text.secondary} size={72} strokeWidth={1.2} />
          </View>
        ) : (
          <>
            {imageLoading && (
              <View style={[styles.vehicleImage, styles.loadingContainer]}>
                <Navigation color={colors.text.tertiary} size={48} strokeWidth={1.5} />
              </View>
            )}
            <Image
              source={{ uri: vehicleImageUrl }}
              style={[styles.vehicleImage, imageLoading && styles.hidden]}
              resizeMode="cover"
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
              onLoad={() => setImageLoading(false)}
            />
          </>
        )}
        <LinearGradient
          colors={colors.gradient.hero}
          style={styles.imageGradient}
        />
        <View style={styles.imageOverlay}>
          <View style={styles.header}>
            <View style={styles.info}>
              <Text style={styles.name}>{device.name}</Text>
              <Text style={styles.uniqueId}>{device.uniqueId}</Text>
            </View>
            <StatusChip
              label={isOnline ? 'Online' : 'Offline'}
              variant={isOnline ? 'online' : 'offline'}
              size="sm"
            />
          </View>
        </View>
      </View>

      {device.lastUpdate && (
        <View style={styles.footer}>
          <Text style={styles.lastUpdate}>
            Updated {new Date(device.lastUpdate).toLocaleString()}
          </Text>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <ControlButtonRow>
          <ControlButton
            icon={<Navigation size={20} color={colors.text.primary} strokeWidth={1.8} />}
            label="Live"
            onPress={onLiveTrack}
          />
          <ControlButton
            icon={<Play size={20} color={colors.text.primary} strokeWidth={1.8} />}
            label="Playback"
            onPress={onPlayback}
          />
          <ControlButton
            icon={<MapPinned size={20} color={colors.text.primary} strokeWidth={1.8} />}
            label="Geofence"
            onPress={onGeofence}
          />
          <ControlButton
            icon={<Info size={20} color={colors.text.primary} strokeWidth={1.8} />}
            label="Info"
            onPress={onDeviceInfo}
          />
          <ControlButton
            icon={<Radio size={20} color={colors.text.primary} strokeWidth={1.8} />}
            label="Commands"
            onPress={onCommands}
          />
        </ControlButtonRow>
      </View>
    </GlassCard>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  card: {
    marginBottom: 20,
    padding: 0,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
    backgroundColor: colors.backgroundSecondary,
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hidden: {
    opacity: 0,
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.h3,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  uniqueId: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  lastUpdate: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  actionsContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});
