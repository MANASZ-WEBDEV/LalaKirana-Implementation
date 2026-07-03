import axios from 'axios';
import { useToastStore } from '../store/toastStore';

let rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// Automatically append /api/v1 if not present in the custom environment variable
if (rawApiUrl && !rawApiUrl.includes('/api/v1')) {
  const cleanUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
  rawApiUrl = `${cleanUrl}/api/v1`;
}

const apiBaseUrl = rawApiUrl;

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lk_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { config } = error;

    // Check if network error (offline)
    const isNetworkError = !error.response && (!navigator.onLine || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error'));
    const isWriteRequest = config && ['post', 'put', 'delete'].includes(config.method?.toLowerCase() || '');

    if (isNetworkError && isWriteRequest) {
      try {
        const queue = JSON.parse(localStorage.getItem('lk_offline_queue') || '[]');
        
        // Prevent duplicate queueing of identical request within last 2 seconds
        const isDuplicate = queue.some(
          (item: any) =>
            item.url === config.url &&
            item.method === config.method &&
            JSON.stringify(item.data) === JSON.stringify(config.data) &&
            Date.now() - item.timestamp < 2000
        );

        if (!isDuplicate) {
          queue.push({
            url: config.url,
            method: config.method,
            data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
            timestamp: Date.now(),
          });
          localStorage.setItem('lk_offline_queue', JSON.stringify(queue));
          
          // Show toast alert
          useToastStore.getState().addToast(
            'warn',
            'You are offline. Changes saved locally and will sync when connection returns.'
          );
        }

        // Resolve with simulated success response
        return Promise.resolve({
          data: { message: 'Changes saved locally (offline)', success: true, offline: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        });
      } catch (e) {
        console.error('Failed to queue offline request:', e);
      }
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem('lk_token');
      localStorage.removeItem('lk_user');
      
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

