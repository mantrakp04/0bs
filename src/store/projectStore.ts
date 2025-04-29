import { create } from 'zustand';
import { type projects } from '@/server/db/schema';
import { type InferSelectModel } from 'drizzle-orm';
import { usePanelStore } from './panelStore';

type Project = InferSelectModel<typeof projects>;

interface ProjectState {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  clearSelectedProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  selectedProject: null,
  setSelectedProject: (project) => {
    // Only set the selected project if it's different from the current one
    // or if the current one is null
    set({ selectedProject: project });
    
    // If selecting a project, show panel with sources tab
    if (project) {
      usePanelStore.setState({ isPanelVisible: true, activeTab: 'sources' });
    }
  },
  clearSelectedProject: () => set({ selectedProject: null }),
}));