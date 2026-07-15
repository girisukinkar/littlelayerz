import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  defaultPackagingCost: number;
  defaultDeliveryCost: number;
  electricityRate: number;
  printerPower: number;
  setSettings: (settings: Partial<Omit<SettingsState, 'setSettings'>>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultPackagingCost: 0,
      defaultDeliveryCost: 0,
      electricityRate: 7.1,
      printerPower: 0.08,
      setSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
    }),
    {
      name: 'dexter3d-settings',
    }
  )
);
