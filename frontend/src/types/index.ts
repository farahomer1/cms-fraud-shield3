// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

export interface Batch {
  id: string;
  name: string;
  received_date: string;
  file_count: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  total_claims: number;
  flagged_count: number;
  approved_count: number;
  created_at: string;
}

export interface Member {
  id: string;
  name_display: string;
  ssn_last4: string;
  date_of_birth: string;
  date_of_death: string | null;
  vital_status: 'alive' | 'deceased';
  service_branch: string | null;
  disability_rating: number | null;
}

export interface Provider {
  id: string;
  name: string;
  npi: string;
  provider_type: 'individual' | 'organization';
  specialty: string | null;
  address: Record<string, string>;
  risk_score: number;
  accreditation_status: 'accredited' | 'unaccredited' | 'suspended';
  claim_history: Record<string, unknown>;
}

export interface Document {
  id: string;
  batch_id: string;
  filename: string;
  file_type: 'pdf' | 'edi_837p' | 'edi_837i' | 'ehr';
  file_path: string;
  file_size: number;
  parse_status: 'raw' | 'parsing' | 'parsed' | 'error';
}

export interface Claim {
  id: string;
  claim_number: string;
  batch_id: string;
  veteran_id: string;
  provider_id: string;
  claim_type: 'medical' | 'disability' | 'pension' | 'dental' | 'dme';
  normalized_data: Record<string, unknown> | null;
  status: 'pending' | 'parsing' | 'parsed' | 'processing' | 'flagged' | 'approved' | 'denied';
  risk_level: 'high' | 'medium' | 'low' | null;
  billing_amount: number;
  service_date: string;
  diagnosis_codes: string[];
  procedure_codes: string[];
  created_at: string;
  veteran?: Member;
  provider?: Provider;
  findings?: AgentFinding[];
  decision?: Decision | null;
}

export interface AgentFinding {
  id: string;
  claim_id: string;
  agent_name: string;
  fraud_type: string;
  confidence_score: number;
  recommendation: 'pass' | 'flag';
  flagged_data_points: string[];
  evidence_summary: string;
  finding_details: Record<string, unknown>;
  processing_time_ms: number;
  created_at: string;
}

export interface Decision {
  id: string;
  claim_id: string;
  decision_type: 'approved' | 'denied' | 'false_positive';
  actor: string;
  actor_role: string;
  rationale: string | null;
  savings_amount: number | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  claim_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actor_type: 'agent' | 'human' | 'system';
  action_type: 'finding' | 'decision' | 'chat' | 'batch_event' | 'ticket' | 'system';
  claim_id: string | null;
  details: Record<string, unknown>;
  confidence_score: number | null;
}

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface Toast {
  id: string;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export interface AgentFlag {
  id: string;
  claimId: string;
  claimNumber: string;
  flaggedBy: string;
  notes: string;
  timestamp: string;
}

export type UserRole = 'Enrollment Analyst' | 'Senior Investigator' | 'Platform Administrator';
export type UserStatus = 'active' | 'inactive' | 'locked';

export interface SystemUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone: string;
  office: string;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  mfaEnabled: boolean;
  notes: string;
}

/* ─── Auditor Workflow Types ─── */

export type WorkflowCategory =
  | 'claims_audit'
  | 'compliance_review'
  | 'financial_audit'
  | 'performance_audit'
  | 'fraud_investigation'
  | 'provider_audit'
  | 'it_security_audit'
  | 'custom';

export type WorkflowStatus = 'active' | 'inactive' | 'draft' | 'archived';
export type WorkflowRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type WorkflowStepType =
  | 'data_collection'
  | 'ai_analysis'
  | 'compliance_check'
  | 'summarization'
  | 'risk_scoring'
  | 'report_generation'
  | 'notification'
  | 'manual_review';

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  description: string;
  config: Record<string, unknown>;
  order: number;
}

export interface WorkflowSchedule {
  enabled: boolean;
  cron: string;
  timezone: string;
  nextRun: string | null;
  lastRun: string | null;
}

export interface WorkflowRunResult {
  stepId: string;
  stepName: string;
  status: 'success' | 'warning' | 'error' | 'skipped';
  output: string;
  duration_ms: number;
  timestamp: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: WorkflowRunStatus;
  triggeredBy: 'manual' | 'schedule' | 'api';
  startedAt: string;
  completedAt: string | null;
  results: WorkflowRunResult[];
  summary: string | null;
}

export interface AuditorWorkflow {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  schedule: WorkflowSchedule;
  dataSources: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  runCount: number;
  tags: string[];
}

export interface PipelineAgent {
  id: string;
  name: string;
  description: string;
  type: 'rule-based' | 'ai-based';
  /** For rule-based: the natural-language rule. For ai-based: the prompt. */
  definition: string;
  status: 'draft' | 'testing' | 'production' | 'disabled';
  createdAt: string;
  updatedAt: string;
  flags: AgentFlag[];
}
