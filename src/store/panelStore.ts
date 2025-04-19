import { create } from 'zustand'

export type TabValue = 'artifacts' | 'sources' | 'settings'

interface PanelState {
  isPanelVisible: boolean
  activeTab: TabValue
  togglePanel: () => void
  setActiveTab: (tab: TabValue) => void
  showPanel: (tab?: TabValue) => void
  hidePanel: () => void
}

export const usePanelStore = create<PanelState>((set) => ({
  isPanelVisible: false,
  activeTab: 'artifacts',
  togglePanel: () => set((state) => ({ isPanelVisible: !state.isPanelVisible })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  showPanel: (tab) => set((state) => ({ 
    isPanelVisible: true,
    activeTab: tab ?? state.activeTab 
  })),
  hidePanel: () => set({ isPanelVisible: false }),
}))