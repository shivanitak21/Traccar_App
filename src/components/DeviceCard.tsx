import React, { useMemo, useState, memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Navigation,
  MapPin,
  Power,
  ChevronRight,
  Map,
  History,
  Terminal,
  Info,
  Clock,
} from 'lucide-react-native';
import { ControlButton, ControlButtonRow } from './ui/ControlButton';
import { StatusChip } from './ui/StatusChip';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { createShadows } from '../theme/shadows';
import { DeviceWithPosition } from '../stores/fleetStore';
import { usePrefsStore } from '../stores/prefsStore';
import { formatSpeed } from '../utils/units';
import { getLocationLabel } from '../utils/address';

interface DeviceCardProps {
  device: DeviceWithPosition;
  onOpenCompanion: () => void;
  onLiveTrack: () => void;
  onPlayback: () => void;
  onGeofence: () => void;
  onInfo: () => void;
  onCommands: () => void;
  defaultExpanded?: boolean;
}

export const DeviceCard: React.FC<DeviceCardProps> = memo(({
  device,
  onOpenCompanion,
  onLiveTrack,
  onPlayback,
  onGeofence,
  onInfo,
  onCommands,
  defaultExpanded = false,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { prefs } = usePrefsStore();

  const statusVariant = device.isMoving
    ? 'moving'
    : device.computedStatus === 'online'
      ? 'idle'
      : 'offline';

  const statusLabel =
    device.isMoving && device.position
      ? formatSpeed(device.position.speed, prefs.speedUnit)
      : device.computedStatus === 'online'
        ? 'Idle'
        : 'Offline';

  const accentColor = device.isMoving
    ? colors.blue
    : device.computedStatus === 'online'
      ? colors.success
      : colors.text.tertiary;

  const location = getLocationLabel({
    address: device.address,
    positionAddress: device.position?.address,
    latitude: device.position?.latitude,
    longitude: device.position?.longitude,
  });

  const lastUpdate = device.lastUpdate
    ? new Date(device.lastUpdate).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : device.position?.fixTime
      ? new Date(device.position.fixTime).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`${device.name}, ${statusLabel}`}
    >
      <View style={[styles.statusBar, { backgroundColor: accentColor }]} />

      <View style={styles.mainRow}>
        <Pressable
          onPress={onOpenCompanion}
          style={({ pressed }) => [styles.mainPressable, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Open companion for ${device.name}`}
        >
          <View style={[styles.iconWrap, { borderColor: `${accentColor}30` }]}>
            <Navigation size={20} color={accentColor} strokeWidth={1.6} />
          </View>

          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {device.name}
            </Text>
            <Text style={styles.id}>{device.uniqueId}</Text>
            {!!location && (
              <View style={styles.metaRow}>
                <MapPin size={10} color={colors.text.tertiary} strokeWidth={2} />
                <Text style={styles.metaText} numberOfLines={2}>
                  {location}
                </Text>
              </View>
            )}
            {lastUpdate ? (
              <View style={styles.metaRow}>
                <Clock size={10} color={colors.text.tertiary} strokeWidth={2} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {lastUpdate}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.rightSection}>
            <StatusChip label={statusLabel} variant={statusVariant} size="sm" />
            {device.ignitionOn !== undefined && (
              <View style={styles.ignitionRow}>
                <Power
                  size={11}
                  color={device.ignitionOn ? colors.success : colors.text.tertiary}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.ignitionText,
                    { color: device.ignitionOn ? colors.success : colors.text.tertiary },
                  ]}
                >
                  {device.ignitionOn ? 'ON' : 'OFF'}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          style={styles.expandBtn}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse actions' : 'Expand actions'}
          accessibilityState={{ expanded }}
        >
          <ChevronRight
            size={16}
            color={colors.text.tertiary}
            strokeWidth={1.8}
            style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
          />
        </Pressable>
      </View>

      {expanded && (
        <View style={styles.actions}>
          <ControlButtonRow>
            <ControlButton
              size="sm"
              icon={<Navigation size={16} color={colors.text.primary} strokeWidth={1.8} />}
              label="Live"
              onPress={onLiveTrack}
            />
            <ControlButton
              size="sm"
              icon={<History size={16} color={colors.text.primary} strokeWidth={1.8} />}
              label="Playback"
              onPress={onPlayback}
            />
            <ControlButton
              size="sm"
              icon={<Map size={16} color={colors.text.primary} strokeWidth={1.8} />}
              label="Geofence"
              onPress={onGeofence}
            />
            <ControlButton
              size="sm"
              icon={<Terminal size={16} color={colors.text.primary} strokeWidth={1.8} />}
              label="Commands"
              onPress={onCommands}
            />
            <ControlButton
              size="sm"
              icon={<Info size={16} color={colors.text.primary} strokeWidth={1.8} />}
              label="Details"
              onPress={onInfo}
            />
          </ControlButtonRow>
        </View>
      )}
    </View>
  );
});

DeviceCard.displayName = 'DeviceCard';

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => {
  const elevation = createShadows(isDark, colors);
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.card,
      marginHorizontal: spacing.screenPadding,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      overflow: 'hidden',
      ...elevation.card,
    },
    statusBar: {
      height: 2,
    },
    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 8,
      gap: 4,
    },
    mainPressable: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    pressed: {
      opacity: 0.85,
    },
    expandBtn: {
      padding: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 44,
      minHeight: 44,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    info: {
      flex: 1,
      gap: 4,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 4,
      marginTop: 2,
    },
    name: {
      ...typography.bodyMd,
      color: colors.text.primary,
    },
    id: {
      ...typography.small,
      color: colors.text.tertiary,
      fontVariant: ['tabular-nums'],
    },
    metaText: {
      ...typography.small,
      color: colors.text.tertiary,
      flex: 1,
    },
    rightSection: {
      alignItems: 'flex-end',
      gap: 4,
    },
    ignitionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    ignitionText: {
      ...typography.tiny,
      fontWeight: '600',
    },
    actions: {
      paddingHorizontal: 14,
      paddingBottom: 16,
      paddingTop: 4,
    },
  });
};
