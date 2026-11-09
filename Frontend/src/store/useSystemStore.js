// src/store/useSystemStore.js
import { create } from 'zustand';
import axiosInstance from '../api/axiosInstance';

export const useSystemStore = create((set) => ({
  isMaintenanceMode: false,
  maintenanceMessage: 'System is under scheduled maintenance.',
  isLoading: true,

  fetchMaintenanceStatus: async () => {
    try {
      const res = await axiosInstance.get('/admin/maintenance');
      set({
        isMaintenanceMode: res.data.isMaintenanceMode,
        maintenanceMessage: res.data.message || 'System is under maintenance.',
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  toggleMaintenanceMode: async () => {
    try {
      const res = await axiosInstance.put('/admin/maintenance');
      set({ isMaintenanceMode: res.data.isMaintenanceMode });
      return res.data;
    } catch (err) {
      throw err;
    }
  },
}));