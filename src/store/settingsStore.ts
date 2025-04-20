import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OpenAISettings {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

interface SettingsState {
  systemPrompt: string;
  temperature: number;
  openai: OpenAISettings;
  setSystemPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setOpenAISettings: (settings: Partial<OpenAISettings>) => void;
  clearOpenAISettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      systemPrompt: "",
      temperature: 0.7,
      openai: {},
      setSystemPrompt: (prompt: string) => set({ systemPrompt: prompt }),
      setTemperature: (temp: number) => set({ temperature: temp }),
      setOpenAISettings: (settings: Partial<OpenAISettings>) => 
        set((state) => ({ 
          openai: { ...state.openai, ...settings } 
        })),
      clearOpenAISettings: () => set({ openai: {} }),
    }),
    {
      name: 'settings-storage',
    }
  )
); 