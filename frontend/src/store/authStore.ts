import { create } from 'zustand';
import { User } from '../types/index.js';
import { api } from '../services/api.js';
import { connectSocket, disconnectSocket } from '../services/socket.js';
import { useCryptoStore } from './cryptoStore.js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string; displayName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.getCurrentUser();
      if (res && res.user) {
        set({ user: res.user, isAuthenticated: true });
        connectSocket();
        // Initialize Post-Quantum keys for this user
        await useCryptoStore.getState().initKeys(res.user.id, res.user.username);
        set({ isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login(credentials);
      if (res.token) {
        localStorage.setItem('pulse_jwt_fallback', res.token);
      }
      set({ user: res.user, isAuthenticated: true });
      connectSocket();
      // Ensure Post-Quantum keys exist and are published
      await useCryptoStore.getState().initKeys(res.user.id, res.user.username);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.register(data);
      if (res.token) {
        localStorage.setItem('pulse_jwt_fallback', res.token);
      }
      set({ user: res.user, isAuthenticated: true });
      connectSocket();
      // Generate and publish Post-Quantum keys
      await useCryptoStore.getState().initKeys(res.user.id, res.user.username);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Registration failed', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      localStorage.removeItem('pulse_jwt_fallback');
      disconnectSocket();
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  updateUser: (updates) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },

  updateProfile: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.updateProfile(updates);
      set({ user: res.user, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to update profile', isLoading: false });
      throw err;
    }
  },

  uploadAvatar: async (file: File) => {
    try {
      const res = await api.uploadProfilePhoto(file);
      const photoUrl = res.profilePhoto || res.url;
      const current = get().user;
      if (current) {
        set({ user: { ...current, profilePhoto: photoUrl } });
      }
      return photoUrl;
    } catch (err: any) {
      set({ error: err.message || 'Failed to upload photo' });
      throw err;
    }
  },
}));
