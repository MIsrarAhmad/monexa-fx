import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';

export const useCountries = () => useQuery({
  queryKey: ['registration-countries'],
  queryFn: async () => {
    const response = await axiosInstance.get('/auth/countries');
    const codes = response.data.data?.countries;
    if (!Array.isArray(codes) || codes.length === 0 || !codes.every((code) => typeof code === 'string' && /^[A-Z]{2}$/.test(code))) {
      throw new Error('Invalid country list received');
    }
    const regionNames = typeof Intl.DisplayNames === 'function'
      ? new Intl.DisplayNames(['en'], { type: 'region' })
      : null;
    return codes
      .map((code) => ({ code, name: regionNames?.of(code) || code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});
