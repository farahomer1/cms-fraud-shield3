// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import apiClient from './apiClient';

export interface Overpayment {
  id: string;
  claim_id: string;
  claim_number: string;
  provider_name: string;
  provider_npi: string;
  original_billing_amount: number;
  allowable_amount: number;
  overpayment_amount: number;
  recoupment_status: 'identified' | 'notified' | 'in_recoupment' | 'recouped' | 'reconciled';
  date_identified: string;
  fms_paid_date: string | null;
  assigned_analyst: string;
  created_at: string;
  updated_at: string;
}

export interface OverpaymentSummary {
  total_identified: { count: number; amount: number };
  in_progress: { count: number; amount: number };
  recouped: { count: number; amount: number };
  recovery_rate: number;
}

export interface RecoupmentTrendPoint {
  date: string;
  cumulative_amount: number;
  amount: number;
}

export interface OverpaymentDetail extends Overpayment {
  claim_type: string;
  claim_billing_amount: number | null;
  service_date: string | null;
  claim_status: string;
  risk_level: string | null;
  decision?: {
    id: string;
    decision_type: string;
    actor: string;
    actor_role: string;
    rationale: string | null;
    savings_amount: number | null;
    created_at: string | null;
  };
  findings?: Array<{
    id: string;
    agent_name: string;
    fraud_type: string;
    confidence_score: number;
    recommendation: string;
    evidence_summary: string;
  }>;
  timeline?: Array<{
    status: string;
    timestamp: string;
    completed: boolean;
  }>;
}

export interface OverpaymentFilters {
  status?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
}

export const listOverpayments = (filters: OverpaymentFilters = {}): Promise<Overpayment[]> =>
  apiClient.get('/overpayments', { params: filters }).then((r) => r.data);

export const getOverpaymentSummary = (): Promise<OverpaymentSummary> =>
  apiClient.get('/overpayments/summary').then((r) => r.data);

export const getRecoupmentTrend = (): Promise<RecoupmentTrendPoint[]> =>
  apiClient.get('/overpayments/trend').then((r) => r.data);

export const getOverpaymentDetail = (id: string): Promise<OverpaymentDetail> =>
  apiClient.get(`/overpayments/${id}`).then((r) => r.data);

// --- Pivot Analytics Types ---

export type PivotDimension = 'provider' | 'provider_npi' | 'status' | 'analyst' | 'month' | 'risk_level' | 'claim_type' | 'fraud_type';

export interface PivotGroup {
  dimension: string;
  record_count: number;
  total_amount: number;
  avg_amount: number;
  min_amount: number;
  max_amount: number;
  total_billed: number;
  total_allowable: number;
  recouped_count: number;
  recouped_amount: number;
  recovery_rate: number;
  pct_of_total: number;
  earliest_date: string | null;
  latest_date: string | null;
}

export interface PivotInsight {
  type: string;
  severity: 'high' | 'medium' | 'warning' | 'info';
  title: string;
  description: string;
  metric: number;
  dimension?: string;
}

export interface PivotResult {
  group_by: string;
  groups: PivotGroup[];
  totals: {
    record_count: number;
    total_amount: number;
    recouped_amount: number;
    recovery_rate: number;
    group_count: number;
  };
  insights: PivotInsight[];
}

export const getOverpaymentPivot = (
  groupBy: PivotDimension = 'provider',
  status?: string,
): Promise<PivotResult> =>
  apiClient
    .get('/overpayments/pivot', {
      params: { group_by: groupBy, ...(status && status !== 'all' ? { status } : {}) },
    })
    .then((r) => r.data);

export const exportOverpaymentsCsv = (status?: string): Promise<Blob> =>
  apiClient
    .get('/overpayments/export', {
      params: status ? { status } : {},
      responseType: 'blob',
    })
    .then((r) => r.data);
