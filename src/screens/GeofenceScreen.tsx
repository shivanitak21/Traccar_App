import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { traccarAPI, TraccarDevice, TraccarGeofence } from '../api/traccar';
import { GlassCard } from '../components/GlassCard';
import { WebMapView } from '../components/WebMapView';
import { MapPinned, Plus, Trash2, Edit3, X, Save, Square, RectangleHorizontal } from 'lucide-react-native';

interface GeofenceScreenProps {
  deviceId: number;
  onClose?: () => void;
}

type DrawingMode = 'none' | 'polygon' | 'rectangle';

export const GeofenceScreen: React.FC<GeofenceScreenProps> = ({ deviceId, onClose }) => {
  const [device, setDevice] = useState<TraccarDevice | null>(null);
  const [geofences, setGeofences] = useState<TraccarGeofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<number | null>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<TraccarGeofence | null>(null);
  const [geofenceName, setGeofenceName] = useState('');
  const [geofenceDescription, setGeofenceDescription] = useState('');
  const [drawnArea, setDrawnArea] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  const loadData = async () => {
    try {
      const [deviceData, geofencesData, positionsData] = await Promise.all([
        traccarAPI.getDevice(deviceId),
        traccarAPI.getGeofences(),
        traccarAPI.getPositions(deviceId),
      ]);

      setDevice(deviceData);
      setGeofences(geofencesData);

      // Set map center to device position if available
      if (positionsData.length > 0) {
        const pos = positionsData[0];
        setMapCenter({ latitude: pos.latitude, longitude: pos.longitude });
      }
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

  const [showShapeSelector, setShowShapeSelector] = useState(false);

  const handleCreateGeofence = () => {
    // Show shape selector first
    setShowShapeSelector(true);
  };

  const handleShapeSelect = (shape: DrawingMode) => {
    setDrawingMode(shape);
    setGeofenceName('');
    setGeofenceDescription('');
    setDrawnArea(null);
    setEditingGeofence(null);
    setSelectedGeofenceId(null);
    setShowShapeSelector(false);
    setShowEditModal(false);
  };

  const zoomToGeofence = (geofence: TraccarGeofence) => {
    try {
      console.log('Zooming to geofence:', geofence.name, geofence.area);
      
      if (geofence.area.startsWith('CIRCLE')) {
        const match = geofence.area.match(/CIRCLE\s*\(([^)]+)\)/);
        if (match) {
          const parts = match[1].trim().split(/\s+/);
          const lat = parseFloat(parts[0]);
          const lon = parseFloat(parts[1]);
          console.log('Circle center:', lat, lon);
          setMapCenter({ latitude: lat, longitude: lon });
          // Force re-render
          setTimeout(() => {
            setMapCenter({ latitude: lat, longitude: lon });
          }, 100);
        }
      } else if (geofence.area.startsWith('POLYGON')) {
        const match = geofence.area.match(/POLYGON\s*\(\(([^)]+)\)\)/);
        if (match) {
          const coords = match[1].split(',').map(c => {
            const parts = c.trim().split(/\s+/);
            return { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
          });
          if (coords.length > 0) {
            const centerLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
            const centerLon = coords.reduce((sum, c) => sum + c.lon, 0) / coords.length;
            console.log('Polygon center:', centerLat, centerLon);
            setMapCenter({ latitude: centerLat, longitude: centerLon });
            // Force re-render
            setTimeout(() => {
              setMapCenter({ latitude: centerLat, longitude: centerLon });
            }, 100);
          }
        }
      }
    } catch (e) {
      console.error('Error parsing geofence area:', e);
    }
  };

  const handleEditGeofence = (geofence: TraccarGeofence) => {
    setEditingGeofence(geofence);
    setGeofenceName(geofence.name);
    setGeofenceDescription(geofence.description || '');
    setDrawnArea(geofence.area);
    setDrawingMode('none');
    setShowEditModal(true);
    setSelectedGeofenceId(geofence.id);
    
    // Zoom to geofence
    zoomToGeofence(geofence);
  };

  const handleDeleteGeofence = async (geofence: TraccarGeofence) => {
    Alert.alert(
      'Delete Geofence',
      `Are you sure you want to delete "${geofence.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await traccarAPI.deleteGeofence(geofence.id);
              await loadData();
              Alert.alert('Success', 'Geofence deleted successfully');
            } catch (error) {
              console.error('Failed to delete geofence:', error);
              Alert.alert('Error', 'Failed to delete geofence');
            }
          },
        },
      ]
    );
  };

  const handleSaveGeofence = async () => {
    if (!geofenceName.trim()) {
      Alert.alert('Error', 'Please enter a geofence name');
      return;
    }

    if (!drawnArea && !editingGeofence) {
      Alert.alert('Error', 'Please draw a geofence on the map');
      return;
    }

    try {
      const area = drawnArea || editingGeofence?.area || '';
      
      if (editingGeofence) {
        await traccarAPI.updateGeofence(editingGeofence.id, {
          name: geofenceName,
          description: geofenceDescription,
          area: area,
        });
        Alert.alert('Success', 'Geofence updated successfully');
      } else {
        await traccarAPI.createGeofence({
          name: geofenceName,
          description: geofenceDescription,
          area: area,
        });
        Alert.alert('Success', 'Geofence created successfully');
      }

      setShowEditModal(false);
      setDrawingMode('none');
      setDrawnArea(null);
      setEditingGeofence(null);
      setSelectedGeofenceId(null);
      await loadData();
    } catch (error) {
      console.error('Failed to save geofence:', error);
      Alert.alert('Error', 'Failed to save geofence');
    }
  };

  const handleGeofencePress = (geofenceId: number) => {
    const geofence = geofences.find(g => g.id === geofenceId);
    if (geofence) {
      // Just zoom to the geofence, don't open edit modal
      setSelectedGeofenceId(geofenceId);
      zoomToGeofence(geofence);
    }
  };

  const handleMapDrawing = (area: string) => {
    console.log('Geofence drawn:', area);
    setDrawnArea(area);
    setDrawingMode('none'); // Stop drawing mode
    setShowEditModal(true); // Now show the modal to enter details
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
      </View>

      <View style={styles.actionBar}>
        {drawingMode === 'none' ? (
          <TouchableOpacity style={styles.addButton} onPress={handleCreateGeofence}>
            <Plus color={colors.text.primary} size={24} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.addButton, styles.cancelButton]} 
            onPress={() => {
              setDrawingMode('none');
              setDrawnArea(null);
            }}
          >
            <X color={colors.text.primary} size={24} />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showShapeSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShapeSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Shape Type</Text>
              <TouchableOpacity onPress={() => setShowShapeSelector(false)}>
                <X color={colors.text.primary} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.shapeSelectorContainer}>
              <Text style={styles.shapeSelectorHint}>
                Choose the shape type for your geofence
              </Text>
              
              <TouchableOpacity
                style={styles.shapeOption}
                onPress={() => handleShapeSelect('polygon')}
              >
                <Square color={colors.primary} size={32} />
                <View style={styles.shapeOptionText}>
                  <Text style={styles.shapeOptionTitle}>Polygon</Text>
                  <Text style={styles.shapeOptionDescription}>
                    Draw a custom polygon shape by tapping points on the map
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shapeOption}
                onPress={() => handleShapeSelect('rectangle')}
              >
                <RectangleHorizontal color={colors.primary} size={32} />
                <View style={styles.shapeOptionText}>
                  <Text style={styles.shapeOptionTitle}>Rectangle</Text>
                  <Text style={styles.shapeOptionDescription}>
                    Draw a rectangle by clicking and dragging on the map
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      <View style={styles.mapContainer}>
        <WebMapView
          key={`map-${selectedGeofenceId}-${mapCenter?.latitude}-${mapCenter?.longitude}-${drawingMode}`}
          markers={[]}
          center={mapCenter || { latitude: 37.7749, longitude: -122.4194 }}
          zoom={drawingMode !== 'none' ? 11 : selectedGeofenceId ? 16 : 13}
          geofences={geofences}
          selectedGeofenceId={selectedGeofenceId || undefined}
          onGeofencePress={handleGeofencePress}
          drawingMode={drawingMode}
          onGeofenceDrawn={handleMapDrawing}
          style={styles.map}
        />
        {drawingMode !== 'none' && (
          <View style={styles.drawingOverlay}>
            <GlassCard style={styles.drawingHintCard}>
              <Text style={styles.drawingHintTitle}>Drawing Mode Active</Text>
              <Text style={styles.drawingHintText}>
                {drawingMode === 'polygon' 
                  ? '📍 Tap on map to add points\nDouble-tap to finish' 
                  : '▭ Click and drag to draw rectangle'}
              </Text>
              <TouchableOpacity 
                style={styles.cancelDrawingButton}
                onPress={() => {
                  setDrawingMode('none');
                  setDrawnArea(null);
                }}
              >
                <Text style={styles.cancelDrawingText}>Cancel Drawing</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        )}
      </View>

      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {geofences.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <MapPinned color={colors.text.tertiary} size={48} />
            <Text style={styles.emptyText}>No geofences found</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to create a geofence
            </Text>
          </GlassCard>
        ) : (
          geofences.map((geofence) => (
            <GlassCard key={geofence.id} style={styles.geofenceCard}>
              <TouchableOpacity
                style={styles.geofenceContent}
                onPress={() => {
                  setSelectedGeofenceId(geofence.id);
                  handleEditGeofence(geofence);
                }}
              >
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
              </TouchableOpacity>

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

      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowEditModal(false);
          setDrawingMode('none');
          setEditingGeofence(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingGeofence ? 'Edit Geofence' : 'Create Geofence'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setDrawingMode('none');
                  setEditingGeofence(null);
                }}
              >
                <X color={colors.text.primary} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={geofenceName}
                onChangeText={setGeofenceName}
                placeholder="e.g., Home, Office"
                placeholderTextColor={colors.text.tertiary}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                value={geofenceDescription}
                onChangeText={setGeofenceDescription}
                placeholder="Optional description"
                placeholderTextColor={colors.text.tertiary}
                multiline
              />

              {drawnArea ? (
                <View style={styles.drawnAreaSuccess}>
                  <Text style={styles.drawnAreaSuccessText}>✓ Geofence drawn successfully!</Text>
                  <TouchableOpacity
                    style={styles.redrawButton}
                    onPress={() => {
                      setDrawnArea(null);
                      setShowEditModal(false);
                      setDrawingMode('polygon');
                    }}
                  >
                    <Text style={styles.redrawButtonText}>Draw Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.label}>Drawing Mode</Text>
                  <View style={styles.drawingModeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.drawingModeButton,
                        drawingMode === 'polygon' && styles.drawingModeButtonActive,
                      ]}
                      onPress={() => {
                        setDrawingMode('polygon');
                        setShowEditModal(false);
                      }}
                    >
                      <Square color={drawingMode === 'polygon' ? colors.primary : colors.text.secondary} size={20} />
                      <Text
                        style={[
                          styles.drawingModeText,
                          drawingMode === 'polygon' && styles.drawingModeTextActive,
                        ]}
                      >
                        Polygon
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.drawingModeButton,
                        drawingMode === 'rectangle' && styles.drawingModeButtonActive,
                      ]}
                      onPress={() => {
                        setDrawingMode('rectangle');
                        setShowEditModal(false);
                      }}
                    >
                      <RectangleHorizontal color={drawingMode === 'rectangle' ? colors.primary : colors.text.secondary} size={20} />
                      <Text
                        style={[
                          styles.drawingModeText,
                          drawingMode === 'rectangle' && styles.drawingModeTextActive,
                        ]}
                      >
                        Rectangle
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.helpText}>
                    Close this dialog to draw on the map. The dialog will reopen when you finish drawing.
                  </Text>
                </>
              )}

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveGeofence}>
                <Save color={colors.text.primary} size={20} />
                <Text style={styles.saveButtonText}>
                  {editingGeofence ? 'Update' : 'Create'} Geofence
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
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
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
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
  actionBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    alignItems: 'flex-end',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  mapContainer: {
    height: 300,
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  drawingOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
  },
  drawingHintCard: {
    padding: 16,
    alignItems: 'center',
  },
  drawingHintTitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 8,
  },
  drawingHintText: {
    ...typography.small,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  cancelDrawingButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelDrawingText: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
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
  geofenceContent: {
    marginBottom: 12,
  },
  geofenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
  form: {
    gap: 16,
  },
  label: {
    ...typography.small,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: 12,
    padding: 12,
    color: colors.text.primary,
    minHeight: 44,
  },
  drawingModeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  drawingModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: 8,
  },
  drawingModeButtonActive: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  drawingModeText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  drawingModeTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  helpText: {
    ...typography.small,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  drawnAreaSuccess: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success,
  },
  drawnAreaSuccessText: {
    ...typography.body,
    color: colors.success,
    fontWeight: '600',
    marginBottom: 12,
  },
  redrawButton: {
    backgroundColor: colors.glass.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  redrawButtonText: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  shapeSelectorContainer: {
    gap: 16,
  },
  shapeSelectorHint: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  shapeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: 16,
  },
  shapeOptionText: {
    flex: 1,
  },
  shapeOptionTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  shapeOptionDescription: {
    ...typography.small,
    color: colors.text.secondary,
  },
});
