import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from './GlassCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { TraccarDevice } from '../api/traccar';
import { Car, Circle, Navigation, Play, MapPinned, Info, Radio } from 'lucide-react-native';

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

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Car color={colors.primary} size={24} />
        </View>
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

      {device.lastUpdate && (
        <View style={styles.footer}>
          <Text style={styles.lastUpdate}>
            Last update: {new Date(device.lastUpdate).toLocaleString()}
          </Text>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onLiveTrack}>
          <Navigation color={colors.primary} size={18} />
          <Text style={styles.actionText}>Live</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onPlayback}>
          <Play color={colors.success} size={18} />
          <Text style={styles.actionText}>Playback</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onGeofence}>
          <MapPinned color={colors.warning} size={18} />
          <Text style={styles.actionText}>Geofence</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onDeviceInfo}>
          <Info color={colors.secondary} size={18} />
          <Text style={styles.actionText}>Info</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onCommands}>
          <Radio color={colors.accent} size={18} />
          <Text style={styles.actionText}>Commands</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    marginTop: 12,
    paddingTop: 12,
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
    paddingTop: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
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
