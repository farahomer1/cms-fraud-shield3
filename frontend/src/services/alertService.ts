// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import apiClient from './apiClient';

export interface Alert {
  claim_id: string;
  claim_number: string;
  risk_level: 'high' | 'medium' | 'low' | null;
  flagging_agents: string[];
  veteran_name: string;
  beneficiary_name?: string;
  provider_name: string;
  billing_amount: number;
  timestamp: string;
}

export const getRecentAlerts = (limit: number = 10): Promise<Alert[]> =>
  apiClient.get('/alerts/recent', { params: { limit } }).then((r) => r.data);
