import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { GlassCard } from '../components/GlassCard';
import { traccarAPI } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { storage } from '../utils/storage';
import { User, Server, LogOut } from 'lucide-react-native';

interface SettingsScreenProps {
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout }) => {
  const [user, setUser] = useState<any>(null);
  const [serverUrl, setServerUrl] = useState<string>('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const userData = await storage.getUser();
    const url = await storage.getServerUrl();
    setUser(userData);
    setServerUrl(url || '');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await traccarAPI.logout();
              traccarWS.disconnect();
              onLogout();
            } catch (error) {
              console.error('Logout error:', error);
              onLogout();
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={colors.gradient.dark} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>

        <GlassCard gradient style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <User color={colors.primary} size={40} />
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
        </GlassCard>

        <Text style={styles.sectionTitle}>Server Information</Text>
        <GlassCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Server color={colors.primary} size={20} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Server URL</Text>
              <Text style={styles.infoValue}>{serverUrl}</Text>
            </View>
          </View>
        </GlassCard>

        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.8}>
          <GlassCard style={styles.logoutCard}>
            <LogOut color={colors.error} size={20} />
            <Text style={styles.logoutText}>Logout</Text>
          </GlassCard>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: 24,
  },
  profileCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 12,
  },
  infoCard: {
    padding: 20,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    ...typography.body,
    color: colors.text.primary,
  },
  logoutCard: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
});
