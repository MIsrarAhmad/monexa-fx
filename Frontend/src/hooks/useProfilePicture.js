import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';

export const profilePictureKey = (userId) => ['profile-picture', userId];

export const useProfilePicture = (userId) => useQuery({
  queryKey: profilePictureKey(userId),
  enabled: Boolean(userId),
  staleTime: 5 * 60 * 1000,
  retry: false,
  queryFn: async () => {
    try {
      const response = await axiosInstance.get('/user/profile-picture', { responseType: 'blob' });
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read profile picture'));
        reader.readAsDataURL(response.data);
      });
    } catch (error) {
      if (error.response?.status === 404) return null;
      console.error('Could not load profile picture:', error.message);
      throw error;
    }
  },
});
