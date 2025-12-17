/**
 * Settings Store
 * 
 * Persisted user preferences for AI mode
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AIMode = 'gpu' | 'cpu';

interface SettingsState {
  aiMode: AIMode;
  setAIMode: (mode: AIMode) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      aiMode: 'gpu',
      setAIMode: (aiMode) => set({ aiMode }),
    }),
    {
      name: 'void-settings',
    }
  )
);
