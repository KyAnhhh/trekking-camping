import axios from 'axios';
import { expireSession, isTokenExpired } from './authSession.js';

const axiosClient = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor tự động gắn JWT Token
axiosClient.interceptors.request.use(
  (config) => {
    // These endpoints do not use the previous login session.
    if (['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password'].includes(config.url)) return config;
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      expireSession(token);
      throw new axios.CanceledError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor xử lý lỗi hệ thống/hết hạn token
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith('/api/auth/')) {
      const authorization = error.config?.headers?.Authorization;
      if (authorization?.startsWith('Bearer ')) expireSession(authorization.slice(7));
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
