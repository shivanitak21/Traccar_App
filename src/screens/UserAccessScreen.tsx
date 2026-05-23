import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Shield, User, Plus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/Button';
import { traccarAPI, TraccarDevice, TraccarUser } from '../api/traccar';

interface TraccarPermission {
  userId?: number;
  deviceId?: number;
}

export const UserAccessScreen: React.FC = () => {
  const router = useRouter();
  const [users, setUsers] = useState<TraccarUser[]>([]);
  const [devices, setDevices] = useState<TraccarDevice[]>([]);
  const [permissions, setPermissions] = useState<TraccarPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, devicesData, permissionsData] = await Promise.all([
        traccarAPI.getUsers(),
        traccarAPI.getDevices(),
        traccarAPI.getPermissions(),
      ]);
      setUsers(usersData);
      setDevices(devicesData);
      setPermissions(permissionsData);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const deviceIdsByUser = useMemo(() => {
    const map = new Map<number, Set<number>>();
    permissions.forEach(permission => {
      if (permission.userId && permission.deviceId) {
        const existing = map.get(permission.userId) ?? new Set<number>();
        existing.add(permission.deviceId);
        map.set(permission.userId, existing);
      }
    });
    return map;
  }, [permissions]);

  const updateFlag = async (user: TraccarUser, key: keyof TraccarUser, value: boolean) => {
    try {
      const updated = await traccarAPI.updateUser(user.id, { ...user, [key]: value });
      setUsers(prev => prev.map(u => (u.id === user.id ? updated : u)));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update user');
    }
  };

  const toggleDeviceAccess = async (user: TraccarUser, deviceId: number, enabled: boolean) => {
    try {
      if (enabled) {
        await traccarAPI.linkPermission(user.id, deviceId);
        setPermissions(prev => [...prev, { userId: user.id, deviceId }]);
      } else {
        await traccarAPI.unlinkPermission(user.id, deviceId);
        setPermissions(prev =>
          prev.filter(p => !(p.userId === user.id && p.deviceId === deviceId))
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update device access');
      loadData();
    }
  };

  const openCreate = () => {
    setName('');
    setEmail('');
    setPassword('');
    setModalVisible(true);
  };

  const createUser = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Validation', 'Name, email, and password are required');
      return;
    }

    try {
      await traccarAPI.createUser({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        readonly: false,
        administrator: false,
        disabled: false,
      });
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create user');
    }
  };

  const deleteUser = (user: TraccarUser) => {
    Alert.alert('Delete user', `Remove ${user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await traccarAPI.deleteUser(user.id);
            loadData();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete user');
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
          <Text style={styles.title}>User Access</Text>
          <Pressable onPress={openCreate} style={styles.addBtn}>
            <Plus size={20} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.primary} />}
        >
          {users.map(user => {
            const assignedDeviceIds = deviceIdsByUser.get(user.id) ?? new Set<number>();
            const expanded = expandedUserId === user.id;

            return (
              <GlassCard key={user.id} style={styles.card}>
                <Pressable
                  onPress={() => setExpandedUserId(expanded ? null : user.id)}
                  style={styles.userRow}
                >
                  <View style={styles.avatar}>
                    <User size={18} color={colors.primary} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  {user.administrator && (
                    <View style={styles.adminBadge}>
                      <Shield size={12} color={colors.primary} />
                      <Text style={styles.adminText}>Admin</Text>
                    </View>
                  )}
                  {expanded ? (
                    <ChevronUp size={18} color={colors.text.tertiary} />
                  ) : (
                    <ChevronDown size={18} color={colors.text.tertiary} />
                  )}
                </Pressable>

                {expanded && (
                  <View style={styles.expandedSection}>
                    <FlagRow label="Administrator" value={!!user.administrator} onChange={v => updateFlag(user, 'administrator', v)} />
                    <FlagRow label="Read only" value={!!user.readonly} onChange={v => updateFlag(user, 'readonly', v)} />
                    <FlagRow label="Device read only" value={!!user.deviceReadonly} onChange={v => updateFlag(user, 'deviceReadonly', v)} />
                    <FlagRow label="Disabled" value={!!user.disabled} onChange={v => updateFlag(user, 'disabled', v)} />

                    <Text style={styles.devicesTitle}>Vehicle access</Text>
                    {devices.length === 0 ? (
                      <Text style={styles.emptyDevices}>No vehicles available</Text>
                    ) : (
                      devices.map(device => (
                        <View key={device.id} style={styles.deviceRow}>
                          <View style={styles.deviceInfo}>
                            <Text style={styles.deviceName}>{device.name}</Text>
                            <Text style={styles.deviceMeta}>{device.uniqueId}</Text>
                          </View>
                          <Switch
                            value={assignedDeviceIds.has(device.id)}
                            onValueChange={v => toggleDeviceAccess(user, device.id, v)}
                            trackColor={{ false: colors.border.default, true: colors.primaryMuted }}
                            thumbColor={assignedDeviceIds.has(device.id) ? colors.primary : colors.text.tertiary}
                          />
                        </View>
                      ))
                    )}

                    {!user.administrator && (
                      <Pressable onPress={() => deleteUser(user)} style={styles.deleteBtn}>
                        <Text style={styles.deleteText}>Delete user</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </GlassCard>
            );
          })}

          {!loading && users.length === 0 && (
            <Text style={styles.empty}>No users yet. Tap + to add one.</Text>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add User</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.text.tertiary}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.text.tertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setModalVisible(false)} />
              <Button title="Create" onPress={createUser} />
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
};

const FlagRow: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({
  label, value, onChange,
}) => (
  <View style={styles.flagRow}>
    <Text style={styles.flagLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.border.default, true: colors.primaryMuted }}
      thumbColor={value ? colors.primary : colors.text.tertiary}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { ...typography.h2, color: colors.text.primary, flex: 1 },
  addBtn: { padding: 8 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { padding: 14, gap: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1 },
  userName: { ...typography.bodyMd, color: colors.text.primary, fontWeight: '600' },
  userEmail: { ...typography.small, color: colors.text.tertiary },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 4 },
  adminText: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
  expandedSection: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border.subtle },
  flagRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  flagLabel: { ...typography.body, color: colors.text.secondary },
  devicesTitle: { ...typography.label, color: colors.text.tertiary, marginTop: 12, marginBottom: 4 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  deviceInfo: { flex: 1, paddingRight: 12 },
  deviceName: { ...typography.body, color: colors.text.primary },
  deviceMeta: { ...typography.small, color: colors.text.tertiary, marginTop: 2 },
  emptyDevices: { ...typography.small, color: colors.text.tertiary, paddingVertical: 8 },
  deleteBtn: { marginTop: 12, paddingVertical: 10, alignItems: 'center' },
  deleteText: { ...typography.body, color: colors.error, fontWeight: '600' },
  empty: { ...typography.body, color: colors.text.tertiary, textAlign: 'center', marginTop: 40 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { margin: 16, padding: 20, borderRadius: 16 },
  modalTitle: { ...typography.h3, color: colors.text.primary, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.border.default, borderRadius: 10, padding: 12, color: colors.text.primary, marginBottom: 10, backgroundColor: colors.backgroundSecondary },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
