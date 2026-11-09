// src/store/useAuthStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,

      // Set user session after login or registration
      setAuth: ({ user, token }) => {
        // Complete wipe of all storage to ensure zero leftover data from previous user
        localStorage.clear();
        sessionStorage.clear();
        
        localStorage.setItem('token', token);
        set({
          user,
          token,
          role: user?.role || 'user',
          isAuthenticated: true,
        });
      },

      // Update cached user or wallet details dynamically
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      // Logout and force window reload to wipe React component memory
      logout: () => {
        localStorage.clear();
        sessionStorage.clear();
        useAuthStore.persist.clearStorage();

        set({
          user: null,
          token: null,
          role: null,
          isAuthenticated: false,
        });

        // Force browser reload to clear React state & React Query caches
        window.location.href = '/login';
      },
    }),
    {
      name: 'monexafx-auth-storage',
    }
  )
);