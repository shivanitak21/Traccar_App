import React, { useCallback, useEffect, useState } from 'react';
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
import { ArrowLeft, Plus, Trash2, User, Phone, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/Button';
import { traccarAPI, TraccarDriver } from '../api/traccar';

export const DriversScreen: React.FC = () => {
  const router = useRouter();
  const [drivers, setDrivers] = useState<TraccarDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<TraccarDriver | null>(null);
  const [name, setName] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const loadDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await traccarAPI.getDrivers();
      setDrivers(data);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setUniqueId('');
    setPhone('');
    setEmail('');
    setModalVisible(true);
  };

  const openEdit = (driver: TraccarDriver) => {
    setEditing(driver);
    setName(driver.name);
    setUniqueId(driver.uniqueId);
    setPhone(String(driver.attributes?.phone || ''));
    setEmail(String(driver.attributes?.email || ''));
    setModalVisible(true);
  };

  const saveDriver = async () => {
    if (!name.trim() || !uniqueId.trim()) {
      Alert.alert('Validation', 'Name and unique ID are required');
      return;
    }
    try {
      const payload = {
        name: name.trim(),
        uniqueId: uniqueId.trim(),
        attributes: { phone: phone.trim(), email: email.trim() },
      };
      if (editing) {
        await traccarAPI.updateDriver(editing.id, { ...editing, ...payload });
      } else {
        await traccarAPI.createDriver(payload);
      }
      setModalVisible(false);
      loadDrivers();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save driver');
    }
  };

  const deleteDriver = (driver: TraccarDriver) => {
    Alert.alert('Delete driver', `Remove ${driver.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await traccarAPI.deleteDriver(driver.id);
            loadDrivers();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete driver');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0a0c12', '#0d0f14']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.title}>Drivers</Text>
          <Pressable onPress={openCreate} style={styles.addBtn}>
            <Plus size={20} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDrivers} tintColor={colors.primary} />}
        >
          {drivers.map(driver => (
            <GlassCard key={driver.id} style={styles.card}>
              <Pressable onPress={() => openEdit(driver)}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <User size={18} color={colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <Text style={styles.driverId}>ID: {driver.uniqueId}</Text>
                  </View>
                  <Pressable onPress={() => deleteDriver(driver)} hitSlop={8}>
                    <Trash2 size={18} color={colors.error} />
                  </Pressable>
                </View>
                {(driver.attributes?.phone || driver.attributes?.email) && (
                  <View style={styles.metaRow}>
                    {driver.attributes?.phone ? (
                      <View style={styles.metaItem}>
                        <Phone size={12} color={colors.text.tertiary} />
                        <Text style={styles.metaText}>{String(driver.attributes.phone)}</Text>
                      </View>
                    ) : null}
                    {driver.attributes?.email ? (
                      <View style={styles.metaItem}>
                        <Mail size={12} color={colors.text.tertiary} />
                        <Text style={styles.metaText}>{String(driver.attributes.email)}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </Pressable>
            </GlassCard>
          ))}
          {!loading && drivers.length === 0 && (
            <Text style={styles.empty}>No drivers yet. Tap + to add one.</Text>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Driver' : 'Add Driver'}</Text>
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.text.tertiary} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Unique ID" placeholderTextColor={colors.text.tertiary} value={uniqueId} onChangeText={setUniqueId} />
            <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={colors.text.tertiary} value={phone} onChangeText={setPhone} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.text.tertiary} value={email} onChangeText={setEmail} keyboardType="email-address" />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setModalVisible(false)} />
              <Button title="Save" onPress={saveDriver} />
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { ...typography.h2, color: colors.text.primary, flex: 1 },
  addBtn: { padding: 8 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  driverName: { ...typography.bodyMd, color: colors.text.primary, fontWeight: '600' },
  driverId: { ...typography.small, color: colors.text.tertiary, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.small, color: colors.text.secondary },
  empty: { ...typography.body, color: colors.text.tertiary, textAlign: 'center', marginTop: 40 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { margin: 16, padding: 20, borderRadius: 16 },
  modalTitle: { ...typography.h3, color: colors.text.primary, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text.primary, marginBottom: 10, backgroundColor: colors.backgroundSecondary },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
