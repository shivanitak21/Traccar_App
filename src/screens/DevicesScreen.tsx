import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { DeviceCard } from '../components/DeviceCard';
import { traccarAPI, TraccarDevice } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export const DevicesScreen: React.FC = () => {
  const router = useRouter();
  const [devices, setDevices] = useState<TraccarDevice[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<TraccarDevice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDevices = async () => {
    try {
      const data = await traccarAPI.getDevices();
      setDevices(data);
      setFilteredDevices(data);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();

    const handleDeviceUpdate = (updatedDevices: TraccarDevice[]) => {
      setDevices(updatedDevices);
      filterDevices(searchQuery, updatedDevices);
    };

    traccarWS.on('devices', handleDeviceUpdate);

    return () => {
      traccarWS.off('devices', handleDeviceUpdate);
    };
  }, []);

  const filterDevices = (query: string, deviceList: TraccarDevice[] = devices) => {
    if (!query.trim()) {
      setFilteredDevices(deviceList);
      return;
    }

    const filtered = deviceList.filter(
      device =>
        device.name.toLowerCase().includes(query.toLowerCase()) ||
        device.uniqueId.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredDevices(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    filterDevices(text);
  };

  return (
    <LinearGradient colors={colors.gradient.dark} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Devices</Text>
        <View style={styles.searchContainer}>
          <Search color={colors.primary} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search devices..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadDevices}
            tintColor={colors.primary}
          />
        }
      >
        {filteredDevices.map((device, index) => (
          <DeviceCard
            key={device.id}
            device={device}
            index={index}
            onLiveTrack={() => router.push(`/device/${device.id}/live-track` as any)}
            onPlayback={() => router.push(`/device/${device.id}/playback` as any)}
            onGeofence={() => router.push(`/device/${device.id}/geofence` as any)}
            onDeviceInfo={() => router.push(`/device/${device.id}/info` as any)}
            onCommands={() => router.push(`/device/${device.id}/commands` as any)}
          />
        ))}

        {filteredDevices.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No devices found</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    paddingVertical: 14,
    marginLeft: 12,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
  },
});
