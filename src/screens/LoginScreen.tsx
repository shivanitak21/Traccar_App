import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Eye, EyeOff, Lock, Mail, Server, ChevronRight } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import { useAuthStore } from '../stores/authStore';
import { API_CONFIG } from '../api/config';
import { storage } from '../utils/storage';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [serverUrl, setServerUrl] = useState<string>(API_CONFIG.DEFAULT_BASE_URL);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    storage.getServerUrl().then((savedUrl) => {
      if (savedUrl) setServerUrl(savedUrl);
    });
  }, []);

  const handleLogin = async () => {
    if (!serverUrl.trim() || !email.trim() || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    try {
      clearError();
      await login(serverUrl.trim(), email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onLoginSuccess();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0a0c12', '#0d0f14', '#0f1520']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Subtle ambient glow */}
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & wordmark */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600).springify()}
            style={styles.logoSection}
          >
            <View style={styles.logoMark}>
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Text style={styles.logoLetter}>E</Text>
              </LinearGradient>
              <View style={styles.logoPulse} />
            </View>

            <Text style={styles.wordmark}>Elevatics IoT</Text>
            <Text style={styles.tagline}>Fleet Intelligence Platform</Text>
          </Animated.View>

          {/* Login form card */}
          <Animated.View
            entering={FadeInDown.delay(250).duration(700).springify()}
            style={styles.formCard}
          >
            <Text style={styles.formTitle}>Sign in</Text>
            <Text style={styles.formSubtitle}>Access your fleet dashboard</Text>

            {/* Server URL */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Server URL</Text>
              <View style={[
                styles.inputWrapper,
                activeField === 'server' && styles.inputActive,
              ]}>
                <Server
                  size={17}
                  color={activeField === 'server' ? colors.primary : colors.text.tertiary}
                  strokeWidth={1.8}
                />
                <TextInput
                  style={styles.input}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  onFocus={() => setActiveField('server')}
                  onBlur={() => setActiveField(null)}
                  autoCapitalize="none"
                  keyboardType="url"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  placeholder="https://elevaticsiot.com"
                  placeholderTextColor={colors.text.disabled}
                  selectionColor={colors.primary}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email address</Text>
              <View style={[
                styles.inputWrapper,
                activeField === 'email' && styles.inputActive,
              ]}>
                <Mail
                  size={17}
                  color={activeField === 'email' ? colors.primary : colors.text.tertiary}
                  strokeWidth={1.8}
                />
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setActiveField('email')}
                  onBlur={() => setActiveField(null)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  placeholder="admin@company.com"
                  placeholderTextColor={colors.text.disabled}
                  selectionColor={colors.primary}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={[
                styles.inputWrapper,
                activeField === 'password' && styles.inputActive,
              ]}>
                <Lock
                  size={17}
                  color={activeField === 'password' ? colors.primary : colors.text.tertiary}
                  strokeWidth={1.8}
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setActiveField('password')}
                  onBlur={() => setActiveField(null)}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.disabled}
                  selectionColor={colors.primary}
                />
                <Pressable
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={8}
                >
                  {showPassword
                    ? <Eye size={17} color={colors.text.tertiary} strokeWidth={1.8} />
                    : <EyeOff size={17} color={colors.text.tertiary} strokeWidth={1.8} />
                  }
                </Pressable>
              </View>
            </View>

            {/* Error message */}
            {error && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            {/* Submit */}
            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitPressed,
                isLoading && styles.submitDisabled,
              ]}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0d0f14" size="small" />
                ) : (
                  <View style={styles.submitContent}>
                    <Text style={styles.submitText}>Sign in</Text>
                    <ChevronRight size={18} color="#0d0f14" strokeWidth={2.5} />
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Footer */}
          <Animated.View
            entering={FadeInDown.delay(450).duration(600)}
            style={styles.footer}
          >
            <Text style={styles.footerText}>
              Powered by{' '}
              <Text style={styles.footerBrand}>Traccar</Text>
              {' '}· Enterprise Fleet Management
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 48,
  },

  // Ambient glows — subtle, not neon
  glowTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(16,185,129,0.04)',
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(59,130,246,0.04)',
  },

  // Logo section
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoMark: {
    position: 'relative',
    marginBottom: 20,
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0d0f14',
    letterSpacing: -0.5,
  },
  logoPulse: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  wordmark: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  tagline: {
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },

  // Form card
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.lg,
    marginBottom: 24,
  },
  formTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 4,
  },
  formSubtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: 28,
  },

  // Fields
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    ...typography.smallMd,
    color: colors.text.secondary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 10,
  },
  inputActive: {
    borderColor: colors.border.focus,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.text.primary,
    paddingVertical: Platform.OS === 'android' ? 10 : 0,
  },

  // Error
  errorBanner: {
    backgroundColor: colors.errorMuted,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },

  // Submit
  submitButton: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d0f14',
    letterSpacing: 0.1,
  },
  submitPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  submitDisabled: {
    opacity: 0.7,
  },

  // Footer
  footer: {
    alignItems: 'center',
  },
  footerText: {
    ...typography.small,
    color: colors.text.tertiary,
  },
  footerBrand: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
