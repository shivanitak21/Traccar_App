import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { GlassCard } from './GlassCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { TraccarDevice } from '../api/traccar';
import { Car, Circle, Navigation, Play, MapPinned, Info, Radio } from 'lucide-react-native';
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
  index,
  onLiveTrack,
  onPlayback,
  onGeofence,
  onDeviceInfo,
  onCommands,
}) => {
  const isOnline = device.status === 'online';
  const statusColor = isOnline ? colors.success : colors.text.tertiary;
  const vehicleImageUrl = getVehicleImageUrl(device.model, device.name);
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.imageContainer}>
        {imageError ? (
          <View style={[styles.vehicleImage, styles.placeholderContainer]}>
            <Car color={colors.primary} size={64} />
            <Text style={styles.placeholderText}>{device.name}</Text>
          </View>
        ) : (
          <>
            {imageLoading && (
              <View style={[styles.vehicleImage, styles.loadingContainer]}>
                <Car color={colors.primary} size={48} />
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
        <View style={styles.imageOverlay}>
          <View style={styles.header}>
            <View style={styles.info}>
              <Text style={styles.name}>{device.name}</Text>
              <Text style={styles.uniqueId}>{device.uniqueId}</Text>
            </View>
            <View style={styles.status}>
              <Circle color={statusColor} size={12} fill={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {device.lastUpdate && (
        <View style={styles.footer}>
          <Text style={styles.lastUpdate}>
            Last update: {new Date(device.lastUpdate).toLocaleString()}
          </Text>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onLiveTrack}>
          <Navigation color={colors.secondary} size={18} />
          <Text style={styles.actionText}>Live</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onPlayback}>
          <Play color={colors.secondary} size={18} />
          <Text style={styles.actionText}>Playback</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onGeofence}>
          <MapPinned color={colors.secondary} size={18} />
          <Text style={styles.actionText}>Geofence</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onDeviceInfo}>
          <Info color={colors.secondary} size={18} />
          <Text style={styles.actionText}>Info</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onCommands}>
          <Radio color={colors.secondary} size={18} />
          <Text style={styles.actionText}>Commands</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    backgroundColor: colors.primaryGlow,
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
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  uniqueId: {
    ...typography.small,
    color: colors.text.tertiary,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    ...typography.small,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  lastUpdate: {
    ...typography.small,
    color: colors.text.secondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 243, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: 4,
  },
  actionText: {
    ...typography.small,
    color: colors.text.primary,
    fontSize: 10,
    fontWeight: '600',
  },
});
