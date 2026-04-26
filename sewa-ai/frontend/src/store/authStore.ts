// SEWA AI — frontend/src/store/authStore.ts
// Zustand state management — JWT + refresh token lifecycle

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient } from '../services/apiClient';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  tenantName: string;
  region: string;
  currency: string;
  language: string;
  consentPrefs?: Record<string, boolean>;
  notifPrefs?: { push: boolean; email: boolean; whatsapp: boolean; sms: boolean };
  patientRecord?: { id: string; mrn: string; dateOfBirth: string; sex: string; consentAI: boolean; consentResearch: boolean; consentThirdParty: boolean };
}

interface RegisterPayload {
  tenantSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string, tenantSlug: string) => Promise<{ mfaRequired?: boolean; mfaChallenge?: string }>;
  register: (payload: RegisterPayload) => Promise<void>;
  verifyMFA: (mfaChallenge: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password, tenantSlug) => {
        clearTimeout(refreshTimer); // prevent timer accumulation on re-login
        set({ isLoading: true, error: null });
        try {
          const res = await apiClient.post('/auth/login', { email, password, tenantSlug });

          if (res.data.mfaRequired) {
            set({ isLoading: false });
            return { mfaRequired: true, mfaChallenge: res.data.mfaChallenge };
          }

          const { accessToken, refreshToken, user } = res.data;
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          set({ user, token: accessToken, refreshToken, isAuthenticated: true, isLoading: false });
          return {};
        } catch (err: any) {
          const msg = err.response?.data?.message || 'Login failed';
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      register: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          await apiClient.post('/auth/register', payload);
          set({ isLoading: false });
        } catch (err: any) {
          const msg = err.response?.data?.message || 'Registration failed';
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      verifyMFA: async (mfaChallenge, code) => {
        set({ isLoading: true });
        try {
          const res = await apiClient.post('/auth/mfa/verify', { mfaChallenge, code });
          const { accessToken, refreshToken, user } = res.data;
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          set({ user, token: accessToken, refreshToken, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.message || 'MFA failed', isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          const { refreshToken } = get();
          if (refreshToken) await apiClient.post('/auth/logout', { refreshToken });
        } catch {}
        delete apiClient.defaults.headers.common['Authorization'];
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return;
        try {
          const res = await apiClient.post('/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefresh } = res.data;
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          set({ token: accessToken, refreshToken: newRefresh });
        } catch {
          await get().logout();
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'sewa-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token, refreshToken: state.refreshToken, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Auto-refresh access token 2 minutes before expiry
let refreshTimer: ReturnType<typeof setTimeout>;
useAuthStore.subscribe((state) => {
  clearTimeout(refreshTimer);
  if (state.isAuthenticated && state.token) {
    // JWT access token expires in 15m — refresh at 13m
    refreshTimer = setTimeout(() => {
      useAuthStore.getState().refreshAuth();
    }, 13 * 60 * 1000);
  }
});
