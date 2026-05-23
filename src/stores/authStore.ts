import { create } from 'zustand';
import { traccarAPI, TraccarUser } from '../api/traccar';
import { traccarWS } from '../api/websocket';
import { storage } from '../utils/storage';
import { API_CONFIG } from '../api/config';
import { useFleetStore } from './fleetStore';
import { queryClient } from '../api/queryClient';

interface AuthState {
  user: TraccarUser | null;
  serverUrl: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<boolean>;
  login: (serverUrl: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: TraccarUser) => void;
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
      const previousUrl = traccarAPI.getBaseUrl();
      traccarAPI.setBaseUrl(url);
      await traccarAPI.initialize();

      if (previousUrl !== url) {
        traccarWS.disconnect();
      }

      if (savedCookie) {
        traccarAPI.setSessionCookie(savedCookie);
      }

      let user = savedUser;
      try {
        user = await traccarAPI.getSession();
        await storage.saveUser(user);
      } catch {
        // Fall back to cached user if session refresh fails
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
      traccarAPI.setBaseUrl(cleanUrl);
      await storage.saveServerUrl(cleanUrl);

      const user = await traccarAPI.login(email, password);
      set({ user, serverUrl: cleanUrl, isAuthenticated: true, isLoading: false, hasHydrated: true });
    } catch (err: any) {
      set({ error: err.message ?? 'Login failed', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    traccarWS.disconnect();

    try {
      await traccarAPI.logout();
    } catch {}

    useFleetStore.getState().reset();
    queryClient.clear();

    const savedUrl = await storage.getServerUrl();
    set({
      user: null,
      serverUrl: savedUrl ?? API_CONFIG.DEFAULT_BASE_URL,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: true,
      error: null,
    });
  },

  setUser: (user) => set({ user }),

  clearError: () => set({ error: null }),
}));
