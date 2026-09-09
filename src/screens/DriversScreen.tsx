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
import { ArrowLeft, Plus, Trash2, User, Phone, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { GlassCard } from '../components/GlassCard';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { elevaticsAPI, ElevaticsDriver } from '../api/elevatics';

export const DriversScreen: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [drivers, setDrivers] = useState<ElevaticsDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ElevaticsDriver | null>(null);
  const [name, setName] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const loadDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await elevaticsAPI.getDrivers();
      setDrivers(data);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const openCreate = () => {
    setEditing(null); setName(''); setUniqueId(''); setPhone(''); setEmail('');
    setModalVisible(true);
  };

  const openEdit = (driver: ElevaticsDriver) => {
    setEditing(driver); setName(driver.name); setUniqueId(driver.uniqueId);
    setPhone(String(driver.attributes?.phone || '')); setEmail(String(driver.attributes?.email || ''));
    setModalVisible(true);
  };

  const saveDriver = async () => {
    if (!name.trim() || !uniqueId.trim()) { Alert.alert('Validation', 'Name and unique ID are required'); return; }
    try {
      const payload = { name: name.trim(), uniqueId: uniqueId.trim(), attributes: { phone: phone.trim(), email: email.trim() } };
      if (editing) { await elevaticsAPI.updateDriver(editing.id, { ...editing, ...payload }); }
      else { await elevaticsAPI.createDriver(payload); }
      setModalVisible(false); loadDrivers();
    } catch (err: any) { Alert.alert('Error', err?.message || 'Failed to save driver'); }
  };

  const deleteDriver = (driver: ElevaticsDriver) => {
    Alert.alert('Delete driver', `Remove ${driver.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await elevaticsAPI.deleteDriver(driver.id); loadDrivers(); }
        catch (err: any) { Alert.alert('Error', err?.message || 'Failed to delete driver'); }
      }},
    ]);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <ArrowLeft size={22} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">Drivers</Text>
          <Pressable onPress={openCreate} style={styles.addBtn} accessibilityRole="button" accessibilityLabel="Add driver">
            <Plus size={20} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDrivers} tintColor={colors.primary} />}
        >
          {loading && drivers.length === 0 ? (
            <LoadingState label="Loading driversâ€¦" />
          ) : null}
          {drivers.map(driver => (
            <GlassCard key={driver.id} style={styles.card}>
              <Pressable onPress={() => openEdit(driver)} accessibilityRole="button" accessibilityLabel={`Edit ${driver.name}`}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <User size={18} color={colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <Text style={styles.driverId}>ID: {driver.uniqueId}</Text>
                  </View>
                  <Pressable onPress={() => deleteDriver(driver)} hitSlop={8} accessibilityLabel={`Delete ${driver.name}`}>
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
            <EmptyState
              icon={<User size={28} color={colors.text.tertiary} strokeWidth={1.5} />}
              title="No drivers yet"
              subtitle="Tap + to add a driver to your fleet"
              actionLabel="Add driver"
              onAction={openCreate}
            />
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
    </ScreenBackground>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 8, marginRight: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h2, color: colors.text.primary, flex: 1 },
  addBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
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
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalCard: { margin: 16, padding: 20, borderRadius: 16 },
  modalTitle: { ...typography.h3, color: colors.text.primary, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.border.default, borderRadius: 10, padding: 12, color: colors.text.primary, marginBottom: 10, backgroundColor: colors.backgroundSecondary, minHeight: 48 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
