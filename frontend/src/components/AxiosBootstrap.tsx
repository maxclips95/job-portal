'use client';

import { useEffect } from 'react';
import axios, { InternalAxiosRequestConfig } from 'axios';

let isConfigured = false;

const getApiOrigin = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
};

const normalizeRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

  if (!config.baseURL) {
    config.baseURL = getApiOrigin();
  }

  if (config.url && config.baseURL.endsWith('/api') && config.url.startsWith('/api/')) {
    config.url = config.url.replace(/^\/api/, '');
  }

  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  if (typeof config.withCredentials === 'undefined') {
    config.withCredentials = true;
  }

  return config;
};

const configureAxios = () => {
  if (isConfigured) return;

  axios.defaults.baseURL = getApiOrigin();
  axios.defaults.withCredentials = true;
  axios.interceptors.request.use((config: InternalAxiosRequestConfig) => normalizeRequest(config));

  isConfigured = true;
};

export default function AxiosBootstrap() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      configureAxios();
    }
  }, []);

  return null;
}
