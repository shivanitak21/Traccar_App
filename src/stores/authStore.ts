import { create } from 'zustand';
import { sanitizeBrandText } from '../utils/brandText';
import { elevaticsAPI, ElevaticsUser } from '../api/elevatics';
import { elevaticsWS } from '../api/websocket';
import { storage } from '../utils/storage';
import { API_CONFIG } from '../api/config';
import { useFleetStore } from './fleetStore';
import { useCompanionStore } from './companionStore';
import { queryClient } from '../api/queryClient';

interface AuthState {
  user: ElevaticsUser | null;
  serverUrl: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<boolean>;
  login: (serverUrl: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: ElevaticsUser) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  serverUrl: API_CONFIG.DEFAULT_BASE_URL,
  isAuthenticated: false,
  isLoading: false,
  hasHydrated: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const [savedUrl, savedAuth, savedUser, savedCookie] = await Promise.all([
        storage.getServerUrl(),
        storage.getSession(),
        storage.getUser(),
        storage.getSessionCookie(),
      ]);

      if (!savedAuth || !savedUser) {
        set({ isAuthenticated: false, isLoading: false, hasHydrated: true });
        return false;
      }

      const url = savedUrl ?? API_CONFIG.DEFAULT_BASE_URL;
      const previousUrl = elevaticsAPI.getBaseUrl();
      elevaticsAPI.setBaseUrl(url);
      await elevaticsAPI.initialize();

      if (previousUrl !== url) {
        elevaticsWS.disconnect();
      }

      if (savedCookie) {
        elevaticsAPI.setSessionCookie(savedCookie);
      }

      let user = savedUser;
      try {
        user = await elevaticsAPI.getSession();
        await storage.saveUser(user);
      } catch {
        await storage.clearSession();
        elevaticsAPI.clearAuth();
        set({
          user: null,
          serverUrl: url,
          isAuthenticated: false,
          isLoading: false,
          hasHydrated: true,
        });
        return false;
      }

      set({
        user,
        serverUrl: url,
        isAuthenticated: true,
        isLoading: false,
        hasHydrated: true,
      });

      return true;
    } catch {
      set({ isAuthenticated: false, isLoading: false, hasHydrated: true });
      return false;
    }
  },

  login: async (serverUrl: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const cleanUrl = serverUrl.replace(/\/$/, '');
      elevaticsAPI.setBaseUrl(cleanUrl);
      await storage.saveServerUrl(cleanUrl);

      const user = await elevaticsAPI.login(email, password);
      set({ user, serverUrl: cleanUrl, isAuthenticated: true, isLoading: false, hasHydrated: true });
    } catch (err: any) {
      set({ error: sanitizeBrandText(err.message ?? 'Login failed'), isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    elevaticsWS.disconnect();
    useCompanionStore.getState().close();
    elevaticsAPI.clearAuth();
    useFleetStore.getState().reset();
    queryClient.clear();

    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: true,
      error: null,
    });

    try {
      await elevaticsAPI.logout();
    } catch {}

    const savedUrl = await storage.getServerUrl();
    set({ serverUrl: savedUrl ?? API_CONFIG.DEFAULT_BASE_URL });
  },

  setUser: (user) => set({ user }),

  clearError: () => set({ error: null }),
}));
