// SEWA XAI — mobile/src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/apiClient';

interface User { id:string; email:string; firstName:string; lastName:string; role:string; tenantId:string; tenantName:string; region:string; currency:string; language:string; phone?:string; nhsNumber?:string; speciality?:string; }

interface AuthStore {
  user: User | null; token: string | null; refreshToken: string | null; isAuthenticated: boolean; isLoading: boolean; error: string | null;
  login(email:string, password:string, tenantSlug:string): Promise<{mfaRequired?:boolean; mfaChallenge?:string}>;
  verifyMFA(mfaChallenge:string, code:string): Promise<void>;
  refreshAuth(): Promise<void>;
  logout(): Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user:null, token:null, refreshToken:null, isAuthenticated:false, isLoading:false, error:null,

      login: async (email, password, tenantSlug) => {
        set({ isLoading:true, error:null });
        try {
          const { data } = await apiClient.post('/auth/login', { email, password, tenantSlug });
          if (data.mfaRequired) { set({ isLoading:false }); return { mfaRequired:true, mfaChallenge:data.mfaChallenge }; }
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
          set({ user:data.user, token:data.accessToken, refreshToken:data.refreshToken, isAuthenticated:true, isLoading:false });
          return {};
        } catch (e:any) { set({ error:e.response?.data?.message||'Login failed', isLoading:false }); throw e; }
      },

      verifyMFA: async (mfaChallenge, code) => {
        set({ isLoading:true });
        const { data } = await apiClient.post('/auth/mfa/verify', { mfaChallenge, code });
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        set({ user:data.user, token:data.accessToken, refreshToken:data.refreshToken, isAuthenticated:true, isLoading:false });
      },

      refreshAuth: async () => {
        const rt = get().refreshToken;
        if (!rt) return;
        const { data } = await apiClient.post('/auth/refresh', { refreshToken:rt });
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        set({ token:data.accessToken, refreshToken:data.refreshToken });
      },

      logout: async () => {
        const rt = get().refreshToken;
        if (rt) await apiClient.post('/auth/logout', { refreshToken:rt }).catch(()=>{});
        delete apiClient.defaults.headers.common['Authorization'];
        set({ user:null, token:null, refreshToken:null, isAuthenticated:false });
      },
    }),
    { name:'sewa-auth', storage: createJSONStorage(()=>AsyncStorage), partialize:(s)=>({ user:s.user, token:s.token, refreshToken:s.refreshToken, isAuthenticated:s.isAuthenticated }) }
  )
);

// ── Offline Store ──────────────────────────────────────────────
// mobile/src/store/offlineStore.ts
