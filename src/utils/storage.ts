import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeServerUrl } from './serverUrl';

const KEYS = {
  SESSION: '@traccar_session',
  SESSION_COOKIE: '@traccar_cookie',
  USER: '@traccar_user',
  SERVER_URL: '@traccar_server',
  MAP_STYLE: '@traccar_map_style',
  PREFERENCES: '@traccar_prefs',
} as const;

export const storage = {
  async saveSession(session: string) {
    await AsyncStorage.setItem(KEYS.SESSION, session);
  },

  async getSession(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.SESSION);
  },

  async saveSessionCookie(cookie: string) {
    await AsyncStorage.setItem(KEYS.SESSION_COOKIE, cookie);
  },

  async getSessionCookie(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.SESSION_COOKIE);
  },

  async saveUser(user: any) {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  async getUser(): Promise<any | null> {
    const data = await AsyncStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  async saveServerUrl(url: string) {
    const normalized = normalizeServerUrl(url);
    await AsyncStorage.setItem(KEYS.SERVER_URL, normalized);
  },

  async getServerUrl(): Promise<string | null> {
    const url = await AsyncStorage.getItem(KEYS.SERVER_URL);
    if (!url) return null;

    const normalized = normalizeServerUrl(url);
    if (normalized !== url) {
      await AsyncStorage.setItem(KEYS.SERVER_URL, normalized);
    }
    return normalized;
  },

  async saveMapStyle(style: string) {
    await AsyncStorage.setItem(KEYS.MAP_STYLE, style);
  },

  async getMapStyle(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.MAP_STYLE);
  },

  async savePreferences(prefs: Record<string, any>) {
    await AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
  },

  async getPreferences(): Promise<Record<string, any>> {
    const data = await AsyncStorage.getItem(KEYS.PREFERENCES);
    return data ? JSON.parse(data) : {};
  },

  async clearSession() {
    await AsyncStorage.multiRemove([KEYS.SESSION, KEYS.SESSION_COOKIE, KEYS.USER]);
  },

  async clearAll() {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
