import { create } from 'zustand'

interface PanelState {
  isPanelVisible: boolean
  togglePanel: () => void
}

export const usePanelStore = create<PanelState>((set) => ({
  isPanelVisible: false,
  togglePanel: () => set((state) => ({ isPanelVisible: !state.isPanelVisible })),
}))