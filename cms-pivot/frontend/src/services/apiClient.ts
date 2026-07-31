// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || 'An unexpected error occurred';
    console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} — ${message}`);
    return Promise.reject(error);
  }
);

export default apiClient;
