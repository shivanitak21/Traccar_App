import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SESSION: '@traccar_session',
  USER: '@traccar_user',
  SERVER_URL: '@traccar_server',
};

export const storage = {
  async saveSession(session: string) {
    await AsyncStorage.setItem(KEYS.SESSION, session);
  },

  async getSession(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.SESSION);
  },

  async saveUser(user: any) {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  async getUser(): Promise<any | null> {
    const data = await AsyncStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  async saveServerUrl(url: string) {
    await AsyncStorage.setItem(KEYS.SERVER_URL, url);
  },

  async getServerUrl(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.SERVER_URL);
  },

  async clearAll() {
    await AsyncStorage.multiRemove([KEYS.SESSION, KEYS.USER, KEYS.SERVER_URL]);
  },
};
