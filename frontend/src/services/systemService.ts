// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import apiClient from './apiClient';

export interface HealthCheckResponse {
  status: string;
  version: string;
  service: string;
}

export interface GeminiHealthResponse {
  status: string;
  [key: string]: unknown;
}

export interface ResetDatabaseResponse {
  status: string;
  message: string;
}

export const healthCheck = (): Promise<HealthCheckResponse> =>
  apiClient.get('/health').then((r) => r.data);

export const geminiHealth = (): Promise<GeminiHealthResponse> =>
  apiClient.get('/gemini/health').then((r) => r.data);

export const resetDatabase = (): Promise<ResetDatabaseResponse> =>
  apiClient.post('/reset').then((r) => r.data);
