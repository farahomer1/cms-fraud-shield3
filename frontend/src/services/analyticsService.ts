// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import apiClient from './apiClient';

export interface FraudTrend {
  fraud_type: string;
  count: number;
  [key: string]: unknown;
}

export interface AgentEfficacy {
  agent_name: string;
  total_findings: number;
  flag_rate: number;
  avg_confidence: number;
  [key: string]: unknown;
}

export interface ProcessingSpeed {
  current_throughput: number;
  surge_capacity: number;
  unit: string;
}

export interface SavingsData {
  total_savings: number;
  [key: string]: unknown;
}

export interface InsightResponse {
  insight: string;
  [key: string]: unknown;
}

export interface DashboardMetrics {
  total_claims: number;
  flagged_claims: number;
  approved_claims: number;
  denied_claims: number;
  total_savings: number;
  [key: string]: unknown;
}

export const getFraudTrends = (): Promise<FraudTrend[]> =>
  apiClient.get('/analytics/fraud-trends').then((r) => r.data);

export const getAgentEfficacy = (): Promise<AgentEfficacy[]> =>
  apiClient.get('/analytics/agent-efficacy').then((r) => r.data);

export const getProcessingSpeed = (): Promise<ProcessingSpeed> =>
  apiClient.get('/analytics/processing-speed').then((r) => r.data);

export const getSavings = (): Promise<SavingsData> =>
  apiClient.get('/analytics/savings').then((r) => r.data);

export const getInsights = (chartType: string = 'fraud-trends'): Promise<InsightResponse> =>
  apiClient.get('/analytics/insights', { params: { chart_type: chartType } }).then((r) => r.data);

export const getDashboardMetrics = (): Promise<DashboardMetrics> =>
  apiClient.get('/analytics/dashboard-metrics').then((r) => r.data);
