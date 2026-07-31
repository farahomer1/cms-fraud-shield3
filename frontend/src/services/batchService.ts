// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import apiClient from './apiClient';
import { Batch, Document } from '../types';

export interface ProcessBatchResponse {
  status: string;
  batch_id: string;
  message: string;
}

export const listBatches = (): Promise<Batch[]> =>
  apiClient.get('/batches').then((r) => r.data);

export const getBatch = (batchId: string): Promise<Batch> =>
  apiClient.get(`/batches/${batchId}`).then((r) => r.data);

export const listBatchDocuments = (batchId: string): Promise<Document[]> =>
  apiClient.get(`/batches/${batchId}/documents`).then((r) => r.data);

export const processBatch = (batchId: string): Promise<ProcessBatchResponse> =>
  apiClient.post(`/batches/${batchId}/process`).then((r) => r.data);
