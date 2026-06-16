import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { elevaticsAPI, ElevaticsDevice } from '../api/elevatics';
import { GlassCard } from '../components/GlassCard';
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
    { id: 'positionSingle', name: 'Request Position', type: 'positionSingle', description: 'Request a single position update from the device', icon: <Navigation color={colors.primary} size={24} />, color: colors.primary },
    { id: 'engineStop', name: 'Engine Stop', type: 'engineStop', description: 'Remotely stop the engine', icon: <Power color={colors.error} size={24} />, color: colors.error },
    { id: 'engineResume', name: 'Engine Resume', type: 'engineResume', description: 'Resume engine operation', icon: <Power color={colors.success} size={24} />, color: colors.success },
    { id: 'alarmArm', name: 'Arm Alarm', type: 'alarmArm', description: 'Activate the alarm system', icon: <Lock color={colors.warning} size={24} />, color: colors.warning },
    { id: 'alarmDisarm', name: 'Disarm Alarm', type: 'alarmDisarm', description: 'Deactivate the alarm system', icon: <Unlock color={colors.success} size={24} />, color: colors.success },
    { id: 'sosOn', name: 'SOS Alert', type: 'custom', description: 'Send SOS alert to device', icon: <AlertTriangle color={colors.error} size={24} />, color: colors.error },
    { id: 'horn', name: 'Horn', type: 'custom', description: 'Trigger the horn', icon: <Volume2 color={colors.secondary} size={24} />, color: colors.secondary },
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading commands...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Device not found</Text>
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
        <Radio color={colors.primary} size={32} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Device Commands</Text>
          <Text style={styles.subtitle}>{device.name}</Text>
        </View>
      </View>

      <View style={styles.warningBanner}>
        <AlertTriangle color={colors.warning} size={20} />
        <Text style={styles.warningText}>Use commands carefully. Some actions may affect device operation.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {commands.map((command) => (
          <TouchableOpacity key={command.id} disabled={sending || device.status !== 'online'} onPress={() => handleSendCommand(command)} activeOpacity={0.8}>
            <GlassCard style={styles.commandCard}>
              <View style={[styles.commandIcon, { backgroundColor: `${command.color}20`, borderColor: command.color }]}>
                {command.icon}
              </View>
              <View style={styles.commandInfo}>
                <Text style={styles.commandName}>{command.name}</Text>
                <Text style={styles.commandDescription}>{command.description}</Text>
              </View>
              {device.status !== 'online' && (
                <View style={styles.offlineBadge}>
                  <Text style={styles.offlineText}>Offline</Text>
                </View>
              )}
            </GlassCard>
          </TouchableOpacity>
        ))}

        <GlassCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>Command Information</Text>
          <Text style={styles.infoText}>Commands are sent to the device immediately. The device must be online to receive commands. Some commands may not be supported by all devices.</Text>
        </GlassCard>
      </ScrollView>

      {sending && (
        <View style={styles.overlay}>
          <GlassCard style={styles.overlayCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.overlayText}>Sending command...</Text>
          </GlassCard>
        </View>
      )}
    </LinearGradient>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body, color: colors.text.secondary, marginTop: 16 },
  closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glass.border },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60 },
  headerText: { marginLeft: 16, flex: 1 },
  title: { ...typography.h2, color: colors.text.primary, fontWeight: '700' },
  subtitle: { ...typography.small, color: colors.text.secondary, marginTop: 4 },
  warningBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.warning}18`, padding: 16, marginHorizontal: 20, marginBottom: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.warning },
  warningText: { ...typography.small, color: colors.warning, marginLeft: 12, flex: 1 },
  scrollContent: { padding: 20, paddingTop: 10 },
  commandCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12 },
  commandIcon: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 2 },
  commandInfo: { flex: 1 },
  commandName: { ...typography.body, color: colors.text.primary, fontWeight: '700', fontSize: 16, marginBottom: 4 },
  commandDescription: { ...typography.small, color: colors.text.secondary },
  offlineBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.backgroundSecondary },
  offlineText: { ...typography.small, color: colors.text.tertiary, fontSize: 11 },
  infoCard: { padding: 20, marginTop: 20 },
  infoTitle: { ...typography.body, color: colors.text.primary, fontWeight: '700', marginBottom: 8 },
  infoText: { ...typography.small, color: colors.text.secondary, lineHeight: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  overlayCard: { padding: 40, alignItems: 'center' },
  overlayText: { ...typography.body, color: colors.text.primary, marginTop: 16 },
});
