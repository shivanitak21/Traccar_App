import React, { useState, useRef, useEffect, useMemo } from 'react';
import { sanitizeBrandText } from '../utils/brandText';
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
import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Lock, Mail, Server, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import { API_CONFIG } from '../api/config';
import { storage } from '../utils/storage';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { login, isLoading, error, clearError } = useAuthStore();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [serverUrl, setServerUrl] = useState<string>(API_CONFIG.DEFAULT_BASE_URL);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <ScreenBackground variant="hero">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.delay(100).duration(600).springify()}
            style={styles.logoSection}
          >
            <View style={styles.logoMark}>
              <Text style={styles.logoLetter}>E</Text>
            </View>
            <Text style={styles.wordmark}>Elevatics</Text>
            <Text style={styles.tagline}>Vehicle Intelligence</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(250).duration(700).springify()}
            style={styles.formCard}
          >
            <Text style={styles.formTitle}>Sign in</Text>
            <Text style={styles.formSubtitle}>Connect to your fleet</Text>

            <View style={styles.fields}>
              <Input
                label="Server"
                value={serverUrl}
                onChangeText={setServerUrl}
                onFocus={() => setActiveField('server')}
                onBlur={() => setActiveField(null)}
                autoCapitalize="none"
                keyboardType="url"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                placeholder="https://your-server.com"
                accessibilityLabel="Server URL"
                leftIcon={
                  <Server
                    size={18}
                    color={activeField === 'server' ? colors.text.primary : colors.text.tertiary}
                    strokeWidth={1.8}
                  />
                }
                containerStyle={styles.field}
              />

              <Input
                ref={emailRef}
                label="Email"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setActiveField('email')}
                onBlur={() => setActiveField(null)}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="admin@company.com"
                accessibilityLabel="Email"
                leftIcon={
                  <Mail
                    size={18}
                    color={activeField === 'email' ? colors.text.primary : colors.text.tertiary}
                    strokeWidth={1.8}
                  />
                }
                containerStyle={styles.field}
              />

              <Input
                ref={passwordRef}
                label="Password"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setActiveField('password')}
                onBlur={() => setActiveField(null)}
                isPassword
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                placeholder="••••••••"
                accessibilityLabel="Password"
                leftIcon={
                  <Lock
                    size={18}
                    color={activeField === 'password' ? colors.text.primary : colors.text.tertiary}
                    strokeWidth={1.8}
                  />
                }
                containerStyle={styles.field}
              />
            </View>

            {error && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
                <Text style={styles.errorText}>{sanitizeBrandText(error)}</Text>
              </Animated.View>
            )}

            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Continue to sign in"
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitPressed,
                isLoading && styles.submitDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.text.inverse} size="small" />
              ) : (
                <View style={styles.submitContent}>
                  <Text style={styles.submitText}>Continue</Text>
                  <ChevronRight size={18} color={colors.text.inverse} strokeWidth={2.5} />
                </View>
              )}
            </Pressable>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(450).duration(600)}
            style={styles.footer}
          >
            <Text style={styles.footerText}>
              Powered by <Text style={styles.footerBrand}>Elevatics AI</Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 56,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...shadows.lg,
  },
  logoLetter: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -1,
  },
  wordmark: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: 8,
  },
  tagline: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadows.lg,
    marginBottom: 32,
  },
  formTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: 6,
  },
  formSubtitle: {
    ...typography.body,
    color: colors.text.tertiary,
    marginBottom: 28,
  },
  fields: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  field: {
    marginBottom: 0,
  },
  errorBanner: {
    backgroundColor: colors.errorMuted,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.alert,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: radius.lg,
    height: 56,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.inverse,
    letterSpacing: -0.2,
  },
  submitPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  footerBrand: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
