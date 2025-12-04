import React, { useState, useEffect } from 'react';
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
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { traccarAPI, TraccarDevice, TraccarGeofence } from '../api/traccar';
import { GlassCard } from '../components/GlassCard';
import { MapPinned, Plus, Trash2, Edit3, X } from 'lucide-react-native';

interface GeofenceScreenProps {
  deviceId: number;
  onClose?: () => void;
}

export const GeofenceScreen: React.FC<GeofenceScreenProps> = ({ deviceId, onClose }) => {
  const [device, setDevice] = useState<TraccarDevice | null>(null);
  const [geofences, setGeofences] = useState<TraccarGeofence[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [deviceData, geofencesData] = await Promise.all([
        traccarAPI.getDevice(deviceId),
        traccarAPI.getGeofences(),
      ]);

      setDevice(deviceData);
      setGeofences(geofencesData);
    } catch (error) {
      console.error('Failed to load geofences:', error);
      Alert.alert('Error', 'Failed to load geofences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [deviceId]);

  const handleCreateGeofence = () => {
    Alert.alert(
      'Create Geofence',
      'This feature allows you to create geofences on a map. Implementation requires a map drawing interface.',
      [{ text: 'OK' }]
    );
  };

  const handleEditGeofence = (geofence: TraccarGeofence) => {
    Alert.alert(
      'Edit Geofence',
      `Edit geofence: ${geofence.name}`,
      [{ text: 'Cancel' }, { text: 'Edit', onPress: () => {} }]
    );
  };

  const handleDeleteGeofence = (geofence: TraccarGeofence) => {
    Alert.alert(
      'Delete Geofence',
      `Are you sure you want to delete "${geofence.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Geofence deleted successfully');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading geofences...</Text>
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
        <View style={styles.headerContent}>
          <MapPinned color={colors.primary} size={32} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Geofence Management</Text>
            <Text style={styles.subtitle}>{device?.name || 'Unknown Device'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleCreateGeofence}>
          <Plus color={colors.text.primary} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {geofences.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <MapPinned color={colors.text.tertiary} size={48} />
            <Text style={styles.emptyText}>No geofences found</Text>
            <Text style={styles.emptySubtext}>
              Create a geofence to monitor when devices enter or exit specific areas
            </Text>
          </GlassCard>
        ) : (
          geofences.map((geofence) => (
            <GlassCard key={geofence.id} style={styles.geofenceCard}>
              <View style={styles.geofenceHeader}>
                <View style={styles.geofenceIcon}>
                  <MapPinned color={colors.primary} size={24} />
                </View>
                <View style={styles.geofenceInfo}>
                  <Text style={styles.geofenceName}>{geofence.name}</Text>
                  {geofence.description && (
                    <Text style={styles.geofenceDescription}>{geofence.description}</Text>
                  )}
                </View>
              </View>

              <View style={styles.geofenceActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditGeofence(geofence)}
                >
                  <Edit3 color={colors.primary} size={18} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteGeofence(geofence)}
                >
                  <Trash2 color={colors.error} size={18} />
                  <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>
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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
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
    textAlign: 'center',
  },
  geofenceCard: {
    padding: 16,
    marginBottom: 16,
  },
  geofenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  geofenceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  geofenceInfo: {
    flex: 1,
  },
  geofenceName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  geofenceDescription: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 4,
  },
  geofenceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 243, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 0, 85, 0.05)',
  },
  actionText: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '600',
  },
});
