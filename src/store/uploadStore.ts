import { create } from 'zustand';
import type { sources } from '@/server/db/schema';

interface FileUploadState {
  uploadedFiles: {
    source: typeof sources.$inferSelect;
    url: string;
  }[];
  isUploading: boolean;
  error: string | null;
  uploadFile: (file: File) => Promise<void>;
  removeFile: (source: typeof sources.$inferSelect) => void;
}

export const useFileUploadStore = create<FileUploadState>((set) => ({
  uploadedFiles: [],
  isUploading: false,
  error: null,
  uploadFile: async (file: File) => {
    try {
      set({ isUploading: true, error: null });
      
      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const { files } = await response.json();

      set((state) => ({
        uploadedFiles: [...state.uploadedFiles, ...files],
        isUploading: false,
      }));
    } catch (error) {
      console.error('Upload error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to upload file', isUploading: false });
    }
  },
  removeFile: (source: typeof sources.$inferSelect) => {
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter((file) => file.source.id !== source.id)
    }));
  },
}));
