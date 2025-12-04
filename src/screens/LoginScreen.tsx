import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { GlassCard } from '../components/GlassCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { traccarAPI } from '../api/traccar';
import { storage } from '../utils/storage';
import { Navigation, Lock, Mail } from 'lucide-react-native';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [serverUrl, setServerUrl] = useState('https://turet.io');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!serverUrl || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      traccarAPI.setBaseUrl(serverUrl);
      await traccarAPI.initialize();
      await storage.saveServerUrl(serverUrl);

      await traccarAPI.login(email, password);

      onLoginSuccess();
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.gradient.dark} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Navigation color={colors.primary} size={48} />
            </View>
            <Text style={styles.title}>Fleet Tracker</Text>
            <Text style={styles.subtitle}>Futuristic Fleet Management</Text>
          </View>

          <View style={styles.formContainer}>
            <GlassCard style={styles.card}>
              <View style={styles.inputContainer}>
                <Navigation color={colors.primary} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Server URL"
                  placeholderTextColor={colors.text.tertiary}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputContainer}>
                <Mail color={colors.primary} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.text.tertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock color={colors.primary} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.text.tertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <AnimatedButton
                title={loading ? 'Logging in...' : 'Login'}
                onPress={handleLogin}
                disabled={loading}
                loading={loading}
                style={styles.button}
              />
            </GlassCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
  formContainer: {
    width: '100%',
  },
  card: {
    padding: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    paddingVertical: 16,
    marginLeft: 12,
  },
  button: {
    marginTop: 8,
  },
});
