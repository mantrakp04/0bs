import { create } from "zustand";

interface CreateTaskStore {
  text: string;
  setText: (text: string) => void;
}

export const useCreateTaskStore = create<CreateTaskStore>((set) => ({
  text: "",
  setText: (text) => set({ text }),
}));
