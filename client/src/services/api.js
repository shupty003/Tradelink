/**
 * services/api.js — Axios HTTP Client
 *
 * Configured Axios instance for all API calls.
 * Interceptors will handle auth token injection and 401 refresh once
 * auth is implemented.
 *
 * Usage:
 *   import api from '../services/api';
 *   const { data } = await api.get('/skills');
 */

import axios from 'axios';
import { API_BASE_URL } from '../constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('tl_token') || localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (!token && import.meta.env.DEV) {
      config.headers['x-demo-user-id'] =
        localStorage.getItem('demoUserId') || '64f1a1b2c3d4e5f60718293a';
    }

    return config;
  },
  error => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  response => response,
  async error => {
    // TODO: handle 401 — attempt token refresh, then retry original request
    const { response } = error;

    if (response?.status === 401) {
      // Placeholder: redirect to login or attempt refresh
      console.warn('[API] Unauthorized — redirecting to login');
    }

    return Promise.reject(error);
  }
);

export default api;
