import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  apiKey: string;
  serverUrl: string;
  showDebug: boolean;
  showSettings: boolean; // 控制 SettingsModal 显示
  
  setApiKey: (key: string) => void;
  setServerUrl: (url: string) => void;
  toggleDebug: () => void;
  toggleSettings: (show?: boolean) => void; // 新增
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      apiKey: '',
      serverUrl: 'ws://localhost:8000/ws/debate',
      showDebug: false,
      showSettings: false,
      
      setApiKey: (key) => set({ apiKey: key }),
      setServerUrl: (url) => set({ serverUrl: url }),
      toggleDebug: () => set((state) => ({ showDebug: !state.showDebug })),
      toggleSettings: (show) => set((state) => ({ showSettings: show !== undefined ? show : !state.showSettings })),
    }),
    {
      name: 'platform-war-settings',
    }
  )
);
