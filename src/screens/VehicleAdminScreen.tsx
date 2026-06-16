import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Trash2, Navigation, Pencil } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/Button';
import { elevaticsAPI, ElevaticsDevice } from '../api/elevatics';

export const VehicleAdminScreen: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [devices, setDevices] = useState<ElevaticsDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ElevaticsDevice | null>(null);
  const [name, setName] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [model, setModel] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await elevaticsAPI.getDevices();
      setDevices(data);
    } catch (err: any) { Alert.alert('Error', err?.message || 'Failed to load vehicles'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  const openCreate = () => {
    setEditing(null); setName(''); setUniqueId(''); setModel(''); setPhone(''); setCategory('');
    setModalVisible(true);
  };

  const openEdit = (device: ElevaticsDevice) => {
    setEditing(device); setName(device.name); setUniqueId(device.uniqueId);
    setModel(device.model || ''); setPhone(device.phone || ''); setCategory(device.category || '');
    setModalVisible(true);
  };

  const saveDevice = async () => {
    if (!name.trim() || !uniqueId.trim()) { Alert.alert('Validation', 'Name and unique ID are required'); return; }
    try {
      const payload: Partial<ElevaticsDevice> = { name: name.trim(), uniqueId: uniqueId.trim(), model: model.trim() || undefined, phone: phone.trim() || undefined, category: category.trim() || undefined };
      if (editing) { await elevaticsAPI.updateDevice(editing.id, { ...editing, ...payload }); }
      else { await elevaticsAPI.createDevice({ ...payload, disabled: false }); }
      setModalVisible(false); loadDevices();
    } catch (err: any) { Alert.alert('Error', err?.message || 'Failed to save vehicle'); }
  };

  const deleteDevice = (device: ElevaticsDevice) => {
    Alert.alert('Delete vehicle', `Remove ${device.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await elevaticsAPI.deleteDevice(device.id); loadDevices(); }
        catch (err: any) { Alert.alert('Error', err?.message || 'Failed to delete vehicle'); }
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.gradient.dark} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.title}>Manage Vehicles</Text>
          <Pressable onPress={openCreate} style={styles.addBtn}>
            <Plus size={20} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDevices} tintColor={colors.primary} />}
        >
          {devices.map(device => (
            <GlassCard key={device.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Navigation size={18} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceMeta}>{device.uniqueId}{device.model ? ` • ${device.model}` : ''}</Text>
                </View>
                <Pressable onPress={() => openEdit(device)} hitSlop={8} style={styles.actionBtn}>
                  <Pencil size={16} color={colors.text.secondary} />
                </Pressable>
                <Pressable onPress={() => deleteDevice(device)} hitSlop={8}>
                  <Trash2 size={16} color={colors.error} />
                </Pressable>
              </View>
            </GlassCard>
          ))}
          {!loading && devices.length === 0 && <Text style={styles.empty}>No vehicles yet. Tap + to add one.</Text>}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Vehicle' : 'Add Vehicle'}</Text>
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.text.tertiary} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Unique ID / IMEI" placeholderTextColor={colors.text.tertiary} value={uniqueId} onChangeText={setUniqueId} />
            <TextInput style={styles.input} placeholder="Model" placeholderTextColor={colors.text.tertiary} value={model} onChangeText={setModel} />
            <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={colors.text.tertiary} value={phone} onChangeText={setPhone} />
            <TextInput style={styles.input} placeholder="Category" placeholderTextColor={colors.text.tertiary} value={category} onChangeText={setCategory} />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setModalVisible(false)} />
              <Button title="Save" onPress={saveDevice} />
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { ...typography.h2, color: colors.text.primary, flex: 1 },
  addBtn: { padding: 8 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  deviceName: { ...typography.bodyMd, color: colors.text.primary, fontWeight: '600' },
  deviceMeta: { ...typography.small, color: colors.text.tertiary, marginTop: 2 },
  actionBtn: { marginRight: 4 },
  empty: { ...typography.body, color: colors.text.tertiary, textAlign: 'center', marginTop: 40 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { margin: 16, padding: 20, borderRadius: 16 },
  modalTitle: { ...typography.h3, color: colors.text.primary, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.border.default, borderRadius: 10, padding: 12, color: colors.text.primary, marginBottom: 10, backgroundColor: colors.backgroundSecondary },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
