import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { StatCard } from '../components/StatCard';
import { traccarAPI, TraccarDevice } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { Car, Activity, MapPin, AlertCircle } from 'lucide-react-native';

export const DashboardScreen: React.FC = () => {
  const [devices, setDevices] = useState<TraccarDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const devicesData = await traccarAPI.getDevices();
      setDevices(devicesData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    traccarWS.connect();

    const handleDeviceUpdate = (updatedDevices: TraccarDevice[]) => {
      setDevices(updatedDevices);
    };

    traccarWS.on('devices', handleDeviceUpdate);

    return () => {
      traccarWS.off('devices', handleDeviceUpdate);
    };
  }, []);

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.length - onlineDevices;

  return (
    <LinearGradient colors={colors.gradient.dark} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Fleet Dashboard</Text>
          <Text style={styles.subtitle}>Real-time fleet monitoring</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Total Vehicles"
            value={devices.length}
            icon={<Car color={colors.secondary} size={32} />}
            index={0}
          />
          <StatCard
            title="Online"
            value={onlineDevices}
            icon={<Activity color={colors.secondary} size={32} />}
            index={1}
          />
          <StatCard
            title="Offline"
            value={offlineDevices}
            icon={<AlertCircle color={colors.secondary} size={32} />}
            index={2}
          />
          <StatCard
            title="Tracked"
            value={devices.filter(d => d.positionId).length}
            icon={<MapPin color={colors.secondary} size={32} />}
            index={3}
          />
        </View>
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
  header: {
    marginBottom: 32,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
});
