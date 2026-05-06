import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

const KEYS = {
  accessToken: 'scorrd_access_token',
  refreshToken: 'scorrd_refresh_token',
  user: 'scorrd_user',
} as const;

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  pushToken: string | null;
  hydrated: boolean;
  sessionExpired: boolean;
  expiredPath: string | null;
  setSession: (tokens: { access_token: string; refresh_token: string }, user: User) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  clearSession: () => Promise<void>;
  expireSession: () => Promise<void>;
  hydrate: () => Promise<void>;
  setPushToken: (token: string) => void;
  setExpiredPath: (path: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  pushToken: null,
  hydrated: false,
  sessionExpired: false,
  expiredPath: null,

  setSession: async ({ access_token, refresh_token }, user) => {
    await SecureStore.setItemAsync(KEYS.accessToken, access_token);
    await SecureStore.setItemAsync(KEYS.refreshToken, refresh_token);
    await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
    set({ accessToken: access_token, refreshToken: refresh_token, user, sessionExpired: false });
  },

  setUser: async (user) => {
    await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
    set({ user });
  },

  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.accessToken).catch(() => {}),
      SecureStore.deleteItemAsync(KEYS.refreshToken).catch(() => {}),
      SecureStore.deleteItemAsync(KEYS.user).catch(() => {}),
    ]);
    set({ accessToken: null, refreshToken: null, user: null, sessionExpired: false });
  },

  expireSession: async () => {
    // Clear Zustand state first — AuthGate sees this immediately and redirects
    set({ accessToken: null, refreshToken: null, user: null, sessionExpired: true });
    // SecureStore cleanup in background (don't block redirect)
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.accessToken).catch(() => {}),
      SecureStore.deleteItemAsync(KEYS.refreshToken).catch(() => {}),
      SecureStore.deleteItemAsync(KEYS.user).catch(() => {}),
    ]);
  },

  setExpiredPath: (path) => set({ expiredPath: path }),

  setPushToken: (token) => set({ pushToken: token }),

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        SecureStore.getItemAsync(KEYS.accessToken),
        SecureStore.getItemAsync(KEYS.refreshToken),
        SecureStore.getItemAsync(KEYS.user),
      ]);

      if (accessToken && refreshToken && userJson) {
        set({
          accessToken,
          refreshToken,
          user: JSON.parse(userJson) as User,
          hydrated: true,
        });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));
