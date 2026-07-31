// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import apiClient from './apiClient';

export interface HealthMetrics {
  api_avg_response_ms: number;
  gemini_avg_latency_ms: number;
  last_batch_duration_sec: number;
  error_rate_pct: number;
  active_sessions: number;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  [key: string]: unknown;
}

export const getHealthMetrics = (): Promise<HealthMetrics> =>
  apiClient.get('/monitoring/health-metrics').then((r) => r.data);

export const getLogs = (category: string = 'application', limit: number = 50): Promise<LogEntry[]> =>
  apiClient.get('/monitoring/logs', { params: { category, limit } }).then((r) => r.data);
