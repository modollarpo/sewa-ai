// SEWA AI — settingsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  lang: string;
  region: string;
  setLang: (l: string) => void;
  setRegion: (r: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      lang: 'en',
      region: 'uk',
      setLang: (lang) => set({ lang }),
      setRegion: (region) => set({ region }),
    }),
    { name: 'sewa-settings' }
  )
);
