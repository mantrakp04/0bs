import { create } from 'zustand';
import type { Document } from '@langchain/core/documents';

interface FileUploadState {
  uploadedFiles: Document[];
  isUploading: boolean;
  error: string | null;
  uploadFile: (file: File) => Promise<void>;
  removeFile: (file: Document) => void;
}

export const useFileUploadStore = create<FileUploadState>((set) => ({
  uploadedFiles: [],
  isUploading: false,
  error: null,
  uploadFile: async (file: File) => {
    try {
      set({ isUploading: true, error: null });
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const { documents } = await response.json();

      set((state) => ({
        uploadedFiles: [...state.uploadedFiles, ...documents],
        isUploading: false,
      }));
    } catch (error) {
      console.error('Upload error:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to upload file', isUploading: false });
    }
  },
  removeFile: (file: Document) => {
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter((doc) => doc !== file)
    }));
  },
}));
