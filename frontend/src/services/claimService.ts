// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import apiClient from './apiClient';
import { Claim, AgentFinding, ChatMessage } from '../types';

export interface ClaimFilters {
  status?: string;
  risk_level?: string;
  batch_id?: string;
  provider_id?: string;
}

export interface ClaimSummaryResponse {
  summary: string;
}

export interface ChatRequest {
  message: string;
  sessionUser: string;
}

export interface DecisionRequest {
  decisionType: 'approved' | 'denied' | 'false_positive';
  actor: string;
  actorRole: string;
  rationale?: string | null;
}

export interface DecisionResponse {
  id: string;
  claimId: string;
  decisionType: string;
  savingsAmount: number | null;
  message: string;
}

export const listClaims = (filters: ClaimFilters = {}): Promise<Claim[]> =>
  apiClient.get('/claims', { params: filters }).then((r) => r.data);

export const getClaim = (claimId: string): Promise<Claim> =>
  apiClient.get(`/claims/${claimId}`).then((r) => r.data);

export const getFindings = (claimId: string): Promise<AgentFinding[]> =>
  apiClient.get(`/claims/${claimId}/findings`).then((r) => r.data);

export const getSummary = (claimId: string): Promise<ClaimSummaryResponse> =>
  apiClient.get(`/claims/${claimId}/summary`).then((r) => r.data);

export const sendChat = (claimId: string, body: ChatRequest): Promise<ChatMessage> =>
  apiClient.post(`/claims/${claimId}/chat`, body).then((r) => r.data);

export const getChatHistory = (claimId: string): Promise<ChatMessage[]> =>
  apiClient.get(`/claims/${claimId}/chat/history`).then((r) => r.data);

export const decide = (claimId: string, body: DecisionRequest): Promise<DecisionResponse> =>
  apiClient.post(`/claims/${claimId}/decide`, body).then((r) => r.data);
