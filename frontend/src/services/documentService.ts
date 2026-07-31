// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import apiClient from './apiClient';

export interface ParseDocumentResponse {
  document_id: string;
  parse_status: string;
  claims_created: number;
  [key: string]: unknown;
}

export interface ParsedDataResponse {
  document_id: string;
  parse_status: string;
  normalized_data: Record<string, unknown> | null;
}

export const getRawDocumentUrl = (docId: string): string =>
  `${apiClient.defaults.baseURL}/documents/${docId}/raw`;

export const parseDocument = (docId: string): Promise<ParseDocumentResponse> =>
  apiClient.post(`/documents/${docId}/parse`).then((r) => r.data);

export const getParsedData = (docId: string): Promise<ParsedDataResponse> =>
  apiClient.get(`/documents/${docId}/parsed`).then((r) => r.data);
