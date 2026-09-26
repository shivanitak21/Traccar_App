import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { elevaticsAPI, ElevaticsDevice } from '../api/elevatics';
import { GlassCard } from '../components/GlassCard';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { IconButton } from '../components/ui/IconButton';
import { StatusChip } from '../components/ui/StatusChip';
import { Radio, Power, Lock, Unlock, AlertTriangle, Navigation, Volume2, X } from 'lucide-react-native';

interface CommandsScreenProps {
  deviceId: number;
  onClose?: () => void;
}

export const CommandsScreen: React.FC<CommandsScreenProps> = ({ deviceId, onClose }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [device, setDevice] = useState<ElevaticsDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const commands = useMemo(() => [
    { id: 'positionSingle', name: 'Request Position', type: 'positionSingle', description: 'Request a single position update from the device', icon: <Navigation color={colors.primary} size={22} strokeWidth={1.8} />, color: colors.primary },
    { id: 'engineStop', name: 'Engine Stop', type: 'engineStop', description: 'Remotely stop the engine', icon: <Power color={colors.error} size={22} strokeWidth={1.8} />, color: colors.error },
    { id: 'engineResume', name: 'Engine Resume', type: 'engineResume', description: 'Resume engine operation', icon: <Power color={colors.success} size={22} strokeWidth={1.8} />, color: colors.success },
    { id: 'alarmArm', name: 'Arm Alarm', type: 'alarmArm', description: 'Activate the alarm system', icon: <Lock color={colors.warning} size={22} strokeWidth={1.8} />, color: colors.warning },
    { id: 'alarmDisarm', name: 'Disarm Alarm', type: 'alarmDisarm', description: 'Deactivate the alarm system', icon: <Unlock color={colors.success} size={22} strokeWidth={1.8} />, color: colors.success },
    { id: 'sosOn', name: 'SOS Alert', type: 'custom', description: 'Send SOS alert to device', icon: <AlertTriangle color={colors.error} size={22} strokeWidth={1.8} />, color: colors.error },
    { id: 'horn', name: 'Horn', type: 'custom', description: 'Trigger the horn', icon: <Volume2 color={colors.secondary} size={22} strokeWidth={1.8} />, color: colors.secondary },
  ], [colors]);

  useEffect(() => {
    elevaticsAPI.getDevice(deviceId).then(setDevice).catch(() => Alert.alert('Error', 'Failed to load device information')).finally(() => setLoading(false));
  }, [deviceId]);

  const handleSendCommand = (command: typeof commands[0]) => {
    if (!device) return;
    Alert.alert(`Send ${command.name}?`, `Are you sure you want to send "${command.name}" command to ${device.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: async () => {
        setSending(true);
        try { await elevaticsAPI.sendCommand(deviceId, command.type, {}); Alert.alert('Success', `${command.name} command sent successfully`); }
        catch { Alert.alert('Error', 'Failed to send command. Please try again.'); }
        finally { setSending(false); }
      }},
    ]);
  };

  if (loading) {
    return (
      <ScreenBackground>
        <LoadingState label="Loading commands…" fullScreen />
      </ScreenBackground>
    );
  }

  if (!device) {
    return (
      <ScreenBackground>
        <EmptyState title="Device not found" subtitle="This vehicle could not be loaded." />
      </ScreenBackground>
    );
  }

  const isOnline = device.status === 'online';

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        {onClose ? (
          <View style={styles.closeWrap}>
            <IconButton accessibilityLabel="Close commands" onPress={onClose} size="sm">
              <X color={colors.text.primary} size={20} strokeWidth={2} />
            </IconButton>
          </View>
        ) : null}

        <View style={styles.headerPad}>
          <ScreenHeader
            title="Commands"
            subtitle={device.name}
            large={false}
            right={
              <StatusChip
                label={isOnline ? 'Online' : 'Offline'}
                variant={isOnline ? 'online' : 'offline'}
                size="sm"
              />
            }
          />
        </View>

        <View style={styles.warningBanner}>
          <AlertTriangle color={colors.warning} size={18} strokeWidth={2} />
          <Text style={styles.warningText}>Use commands carefully. Some actions may affect device operation.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {commands.map((command) => {
            const disabled = sending || !isOnline;
            return (
              <Pressable
                key={command.id}
                disabled={disabled}
                onPress={() => handleSendCommand(command)}
                accessibilityRole="button"
                accessibilityLabel={`Send ${command.name}`}
                accessibilityState={{ disabled }}
                style={({ pressed }) => [
                  styles.commandPressable,
                  pressed && !disabled && styles.pressed,
                  disabled && styles.disabled,
                ]}
              >
                <GlassCard style={styles.commandCard}>
                  <View style={[styles.commandIcon, { backgroundColor: `${command.color}20`, borderColor: command.color }]}>
                    {command.icon}
                  </View>
                  <View style={styles.commandInfo}>
                    <Text style={styles.commandName}>{command.name}</Text>
                    <Text style={styles.commandDescription}>{command.description}</Text>
                  </View>
                  {!isOnline && (
                    <View style={styles.offlineBadge}>
                      <Text style={styles.offlineText}>Offline</Text>
                    </View>
                  )}
                </GlassCard>
              </Pressable>
            );
          })}

          <GlassCard style={styles.infoCard}>
            <Text style={styles.infoTitle}>Command Information</Text>
            <Text style={styles.infoText}>Commands are sent to the device immediately. The device must be online to receive commands. Some commands may not be supported by all devices.</Text>
          </GlassCard>
        </ScrollView>

        {sending && (
          <View style={styles.overlay} pointerEvents="none">
            <GlassCard style={styles.overlayCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.overlayText}>Sending command…</Text>
            </GlassCard>
          </View>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1 },
  closeWrap: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.screenPadding,
    zIndex: 10,
  },
  headerPad: {
    paddingHorizontal: spacing.screenPadding,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningMuted,
    padding: spacing.md,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.alert,
    gap: 12,
  },
  warningText: { ...typography.small, color: colors.warning, flex: 1 },
  scrollContent: { padding: spacing.screenPadding, paddingTop: spacing.sm, paddingBottom: 40 },
  commandPressable: { marginBottom: 12 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.55 },
  commandCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  commandIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1.5,
  },
  commandInfo: { flex: 1 },
  commandName: { ...typography.bodyMd, color: colors.text.primary, marginBottom: 4 },
  commandDescription: { ...typography.small, color: colors.text.secondary },
  offlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  offlineText: { ...typography.tiny, color: colors.text.tertiary },
  infoCard: { padding: 20, marginTop: 12 },
  infoTitle: { ...typography.bodyMd, color: colors.text.primary, marginBottom: 8 },
  infoText: { ...typography.small, color: colors.text.secondary, lineHeight: 20 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  overlayCard: { padding: 40, alignItems: 'center' },
  overlayText: { ...typography.body, color: colors.text.primary, marginTop: 16 },
});
