// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import apiClient from './apiClient';
import { AuditEntry } from '../types';

export interface AuditLogFilters {
  actor?: string;
  action_type?: string;
  claim_id?: string;
  limit?: number;
}

export interface AuditEventPayload {
  actor: string;
  actor_type: string;
  action_type: string;
  claim_id?: string;
  details: Record<string, unknown>;
  confidence_score?: number | null;
}

export const listAuditLogs = (filters: AuditLogFilters = {}): Promise<AuditEntry[]> =>
  apiClient.get('/audit-log', { params: filters }).then((r) => r.data);

export const getAuditEntry = (entryId: string): Promise<AuditEntry> =>
  apiClient.get(`/audit-log/${entryId}`).then((r) => r.data);

export const createAuditLogBatch = (
  entries: AuditEventPayload[],
  signal?: AbortSignal,
): Promise<{ count: number; status: string }> =>
  apiClient.post('/audit-log/batch', { entries }, { signal }).then((r) => r.data);
