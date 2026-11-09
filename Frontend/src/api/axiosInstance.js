// Frontend/src/api/axiosInstance.js
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const DEFAULT_API_URL = 'https://b-project-tau.vercel.app/api';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || DEFAULT_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Always get token strictly from Zustand store state
axiosInstance.interceptors.request.use(
  (config) => {
    // Strictly prioritize active store token over raw localStorage to prevent token bleeding
    const token = useAuthStore.getState().token || localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const requestUrl = error.config ? error.config.url : '';

    const isAuthRoute = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

    if (status === 401 && !isAuthRoute) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;