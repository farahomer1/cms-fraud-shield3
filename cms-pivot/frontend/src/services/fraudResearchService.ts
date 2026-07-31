// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import apiClient from './apiClient';

export interface FraudCluster {
  cluster_id: string;
  label: string;
  claim_count: number;
  avg_risk_score: number;
  [key: string]: unknown;
}

export interface AnomalyAnalysis {
  insights: string;
  clusters: FraudCluster[];
  [key: string]: unknown;
}

export interface PatternSearchResult {
  results: Record<string, unknown>[];
  [key: string]: unknown;
}

export const getClusters = (): Promise<FraudCluster[]> =>
  apiClient.get('/fraud-research/clusters').then((r) => r.data);

export const analyze = (): Promise<AnomalyAnalysis> =>
  apiClient.get('/fraud-research/analyze').then((r) => r.data);

export const searchPatterns = (query: string): Promise<PatternSearchResult> =>
  apiClient.post('/fraud-research/search', { query }).then((r) => r.data);
