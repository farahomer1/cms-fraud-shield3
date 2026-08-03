// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { createContext, useCallback, useContext, useState } from 'react';
import type {
  AuditorWorkflow,
  WorkflowRun,
  WorkflowRunResult,
  WorkflowRunStatus,
} from '../types';

/* ─── Seed Data: Pre-built audit workflows covering common use cases ─── */
const SEED_WORKFLOWS: AuditorWorkflow[] = [
  {
    id: 'wf-claims-compliance',
    name: 'Claims Compliance Audit',
    description:
      'Validates post-adjudicated claims against CMS and VA reimbursement policies, including NCCI edits, MUE limits, and fee schedule compliance.',
    category: 'claims_audit',
    status: 'active',
    steps: [
      { id: 's1', name: 'Collect Claims Data', type: 'data_collection', description: 'Pull claims from BigQuery for the target period', config: { source: 'bigquery', period: '30d' }, order: 1 },
      { id: 's2', name: 'NCCI Edit Check', type: 'compliance_check', description: 'Validate procedure code pairs against NCCI edits', config: { ruleSet: 'ncci' }, order: 2 },
      { id: 's3', name: 'MUE Limit Check', type: 'compliance_check', description: 'Verify units of service against MUE thresholds', config: { ruleSet: 'mue' }, order: 3 },
      { id: 's4', name: 'Fee Schedule Validation', type: 'compliance_check', description: 'Compare billed amounts to VA/CMS fee schedules', config: { ruleSet: 'fee_schedule' }, order: 4 },
      { id: 's5', name: 'AI Summarization', type: 'summarization', description: 'Generate executive summary of compliance findings', config: { model: 'gemini' }, order: 5 },
      { id: 's6', name: 'Generate Report', type: 'report_generation', description: 'Produce compliance audit report', config: { format: 'pdf' }, order: 6 },
    ],
    schedule: { enabled: true, cron: '0 6 * * 1', timezone: 'America/New_York', nextRun: '2026-02-16T06:00:00Z', lastRun: '2026-02-09T06:00:00Z' },
    dataSources: ['bigquery', 'va_claims_db', 'fee_schedule'],
    createdBy: 'Sarah Mitchell',
    createdAt: '2025-11-01T10:00:00Z',
    updatedAt: '2026-01-15T14:30:00Z',
    lastRunAt: '2026-02-09T06:00:00Z',
    runCount: 14,
    tags: ['compliance', 'claims', 'CMS'],
  },
  {
    id: 'wf-duplicate-payments',
    name: 'Duplicate Payment Detection',
    description:
      'Scans for duplicate or overlapping payments across claims, providers, and time periods to identify potential overpayments.',
    category: 'financial_audit',
    status: 'active',
    steps: [
      { id: 's1', name: 'Extract Payment Records', type: 'data_collection', description: 'Gather payment data for the audit period', config: { source: 'bigquery', period: '90d' }, order: 1 },
      { id: 's2', name: 'Duplicate Detection', type: 'ai_analysis', description: 'Use AI to identify matching claims with similar amounts, dates, and providers', config: { model: 'gemini', threshold: 0.85 }, order: 2 },
      { id: 's3', name: 'Risk Scoring', type: 'risk_scoring', description: 'Score potential duplicates by overpayment amount and confidence', config: {}, order: 3 },
      { id: 's4', name: 'Summarize Findings', type: 'summarization', description: 'AI-generated summary of duplicate payment patterns', config: { model: 'gemini' }, order: 4 },
      { id: 's5', name: 'Generate Report', type: 'report_generation', description: 'Create duplicate payment audit report', config: { format: 'pdf' }, order: 5 },
    ],
    schedule: { enabled: true, cron: '0 2 1 * *', timezone: 'America/New_York', nextRun: '2026-03-01T02:00:00Z', lastRun: '2026-02-01T02:00:00Z' },
    dataSources: ['bigquery', 'va_claims_db'],
    createdBy: 'David Chen',
    createdAt: '2025-10-15T09:00:00Z',
    updatedAt: '2026-01-20T11:00:00Z',
    lastRunAt: '2026-02-01T02:00:00Z',
    runCount: 4,
    tags: ['financial', 'duplicates', 'overpayments'],
  },
  {
    id: 'wf-provider-risk',
    name: 'Provider Risk Assessment',
    description:
      'Evaluates provider billing patterns, complaint history, and accreditation status to generate risk profiles and flag high-risk providers.',
    category: 'provider_audit',
    status: 'active',
    steps: [
      { id: 's1', name: 'Collect Provider Data', type: 'data_collection', description: 'Pull provider profiles, billing history, and complaint records', config: { source: 'npi_registry' }, order: 1 },
      { id: 's2', name: 'Billing Pattern Analysis', type: 'ai_analysis', description: 'AI analysis of billing patterns for anomalies', config: { model: 'gemini' }, order: 2 },
      { id: 's3', name: 'OIG LEIE Cross-Check', type: 'compliance_check', description: 'Verify providers against OIG exclusion list', config: { ruleSet: 'leie' }, order: 3 },
      { id: 's4', name: 'Risk Score Calculation', type: 'risk_scoring', description: 'Calculate composite risk score per provider', config: { weights: { billing: 0.4, complaints: 0.3, accreditation: 0.3 } }, order: 4 },
      { id: 's5', name: 'Generate Risk Report', type: 'report_generation', description: 'Produce provider risk assessment report', config: { format: 'pdf' }, order: 5 },
    ],
    schedule: { enabled: true, cron: '0 4 15 * *', timezone: 'America/New_York', nextRun: '2026-02-15T04:00:00Z', lastRun: '2026-01-15T04:00:00Z' },
    dataSources: ['npi_registry', 'cms_claims_db', 'bigquery'],
    createdBy: 'Sarah Mitchell',
    createdAt: '2025-11-20T14:00:00Z',
    updatedAt: '2026-01-15T04:00:00Z',
    lastRunAt: '2026-01-15T04:00:00Z',
    runCount: 3,
    tags: ['providers', 'risk', 'OIG'],
  },
  {
    id: 'wf-cmn-dme-compliance',
    name: 'Medicare DME CMN Compliance Review',
    description:
      'Reviews claims processing accuracy for Durable Medical Equipment (DME) Certificate of Medical Necessity (CMN), ensuring strict adherence to Medicare guidelines.',
    category: 'compliance_review',
    status: 'active',
    steps: [
      { id: 's1', name: 'Identify DME Claims', type: 'data_collection', description: 'Filter claims related to Durable Medical Equipment (DME)', config: { source: 'bigquery', filter: 'dme_claims' }, order: 1 },
      { id: 's2', name: 'CMN Verification', type: 'compliance_check', description: 'Verify Certificate of Medical Necessity (CMN) under Medicare provisions', config: { ruleSet: 'cmn_requirements' }, order: 2 },
      { id: 's3', name: 'Processing Accuracy Check', type: 'ai_analysis', description: 'AI review of claim processing decisions for accuracy', config: { model: 'gemini' }, order: 3 },
      { id: 's4', name: 'Summarize Findings', type: 'summarization', description: 'Generate summary of compliance gaps', config: { model: 'gemini' }, order: 4 },
      { id: 's5', name: 'Generate Report', type: 'report_generation', description: 'Produce DME CMN compliance report', config: { format: 'pdf' }, order: 5 },
    ],
    schedule: { enabled: false, cron: '0 6 1 */3 *', timezone: 'America/New_York', nextRun: null, lastRun: '2026-01-01T06:00:00Z' },
    dataSources: ['bigquery', 'cms_claims_db', 'medical_records'],
    createdBy: 'James Rodriguez',
    createdAt: '2025-12-01T08:00:00Z',
    updatedAt: '2026-01-10T09:00:00Z',
    lastRunAt: '2026-01-01T06:00:00Z',
    runCount: 2,
    tags: ['CMN', 'DME', 'compliance'],
  },
  {
    id: 'wf-fraud-pattern-scan',
    name: 'FWA Pattern Detection Scan',
    description:
      'Uses AI-powered pattern recognition to scan for fraud, waste, and abuse indicators across claims data, including upcoding, unbundling, and phantom billing.',
    category: 'fraud_investigation',
    status: 'active',
    steps: [
      { id: 's1', name: 'Data Collection', type: 'data_collection', description: 'Collect claims and provider data for analysis period', config: { source: 'bigquery', period: '60d' }, order: 1 },
      { id: 's2', name: 'Upcoding Detection', type: 'ai_analysis', description: 'Detect systematic upcoding patterns', config: { model: 'gemini', pattern: 'upcoding' }, order: 2 },
      { id: 's3', name: 'Unbundling Detection', type: 'ai_analysis', description: 'Identify potential unbundling of services', config: { model: 'gemini', pattern: 'unbundling' }, order: 3 },
      { id: 's4', name: 'Phantom Billing Check', type: 'ai_analysis', description: 'Cross-reference claims against scheduling data', config: { model: 'gemini', pattern: 'phantom' }, order: 4 },
      { id: 's5', name: 'Risk Scoring', type: 'risk_scoring', description: 'Score identified patterns by severity and dollar impact', config: {}, order: 5 },
      { id: 's6', name: 'Generate FWA Report', type: 'report_generation', description: 'Compile fraud pattern detection report', config: { format: 'pdf' }, order: 6 },
    ],
    schedule: { enabled: true, cron: '0 1 * * 0', timezone: 'America/New_York', nextRun: '2026-02-15T01:00:00Z', lastRun: '2026-02-08T01:00:00Z' },
    dataSources: ['bigquery', 'va_claims_db', 'medical_records', 'npi_registry'],
    createdBy: 'David Chen',
    createdAt: '2025-10-01T11:00:00Z',
    updatedAt: '2026-02-08T01:00:00Z',
    lastRunAt: '2026-02-08T01:00:00Z',
    runCount: 19,
    tags: ['fraud', 'FWA', 'upcoding', 'unbundling'],
  },
  {
    id: 'wf-recoupment-review',
    name: 'Overpayment Recoupment Review',
    description:
      'Identifies improper payments eligible for recoupment by comparing payment amounts against allowed amounts, fee schedules, and coverage rules.',
    category: 'financial_audit',
    status: 'active',
    steps: [
      { id: 's1', name: 'Collect Flagged Claims', type: 'data_collection', description: 'Pull claims flagged for potential overpayment', config: { source: 'bigquery', filter: 'flagged' }, order: 1 },
      { id: 's2', name: 'Overpayment Calculation', type: 'ai_analysis', description: 'Calculate overpayment amounts based on fee schedule comparison', config: { model: 'gemini' }, order: 2 },
      { id: 's3', name: 'Manual Review Queue', type: 'manual_review', description: 'Queue high-dollar items for human reviewer sign-off', config: { threshold: 10000 }, order: 3 },
      { id: 's4', name: 'Generate Recoupment Report', type: 'report_generation', description: 'Produce recoupment summary with recommended actions', config: { format: 'pdf' }, order: 4 },
      { id: 's5', name: 'Send Notifications', type: 'notification', description: 'Notify relevant stakeholders of recoupment findings', config: { channel: 'email' }, order: 5 },
    ],
    schedule: { enabled: true, cron: '0 8 1,15 * *', timezone: 'America/New_York', nextRun: '2026-02-15T08:00:00Z', lastRun: '2026-02-01T08:00:00Z' },
    dataSources: ['bigquery', 'va_claims_db', 'fee_schedule'],
    createdBy: 'Maria Thompson',
    createdAt: '2025-11-10T10:00:00Z',
    updatedAt: '2026-02-01T08:00:00Z',
    lastRunAt: '2026-02-01T08:00:00Z',
    runCount: 7,
    tags: ['recoupment', 'overpayments', 'financial'],
  },
  {
    id: 'wf-data-quality',
    name: 'Data Quality Assessment',
    description:
      'Audits the completeness, accuracy, and consistency of ingested claims data across all data sources. Identifies integrity issues and missing fields.',
    category: 'performance_audit',
    status: 'draft',
    steps: [
      { id: 's1', name: 'Schema Validation', type: 'compliance_check', description: 'Validate data fields against expected schema', config: { ruleSet: 'schema' }, order: 1 },
      { id: 's2', name: 'Completeness Check', type: 'data_collection', description: 'Measure fill rates across required fields', config: { source: 'bigquery' }, order: 2 },
      { id: 's3', name: 'Cross-Source Consistency', type: 'ai_analysis', description: 'Compare data across sources for discrepancies', config: { model: 'gemini' }, order: 3 },
      { id: 's4', name: 'Generate Quality Report', type: 'report_generation', description: 'Produce data quality assessment report', config: { format: 'pdf' }, order: 4 },
    ],
    schedule: { enabled: false, cron: '0 3 * * *', timezone: 'America/New_York', nextRun: null, lastRun: null },
    dataSources: ['bigquery', 'va_claims_db'],
    createdBy: 'James Rodriguez',
    createdAt: '2026-01-20T16:00:00Z',
    updatedAt: '2026-01-25T09:00:00Z',
    lastRunAt: null,
    runCount: 0,
    tags: ['data quality', 'integrity'],
  },
  {
    id: 'wf-referral-auth',
    name: 'Referral & Authorization Audit',
    description:
      'Verifies that billed services align with corresponding VA referrals or authorizations, detecting mismatches in codes, frequencies, and approval status.',
    category: 'compliance_review',
    status: 'inactive',
    steps: [
      { id: 's1', name: 'Collect Claims with Referrals', type: 'data_collection', description: 'Pull claims and linked referral/authorization data', config: { source: 'bigquery' }, order: 1 },
      { id: 's2', name: 'Service-Auth Matching', type: 'compliance_check', description: 'Cross-reference billed services against authorized services', config: { ruleSet: 'auth_match' }, order: 2 },
      { id: 's3', name: 'Frequency Validation', type: 'compliance_check', description: 'Check service frequency against authorization limits', config: { ruleSet: 'auth_frequency' }, order: 3 },
      { id: 's4', name: 'AI Gap Analysis', type: 'ai_analysis', description: 'AI identifies systematic authorization gaps', config: { model: 'gemini' }, order: 4 },
      { id: 's5', name: 'Generate Report', type: 'report_generation', description: 'Produce referral authorization audit report', config: { format: 'pdf' }, order: 5 },
    ],
    schedule: { enabled: false, cron: '0 5 1 * *', timezone: 'America/New_York', nextRun: null, lastRun: '2025-12-01T05:00:00Z' },
    dataSources: ['bigquery', 'va_claims_db', 'vbms'],
    createdBy: 'Sarah Mitchell',
    createdAt: '2025-09-15T13:00:00Z',
    updatedAt: '2025-12-15T10:00:00Z',
    lastRunAt: '2025-12-01T05:00:00Z',
    runCount: 3,
    tags: ['referrals', 'authorization', 'compliance'],
  },
];

/* ─── Fake run results for demo ─── */
const SEED_RUNS: WorkflowRun[] = [
  {
    id: 'run-001',
    workflowId: 'wf-claims-compliance',
    status: 'completed',
    triggeredBy: 'schedule',
    startedAt: '2026-02-09T06:00:00Z',
    completedAt: '2026-02-09T06:04:32Z',
    results: [
      { stepId: 's1', stepName: 'Collect Claims Data', status: 'success', output: 'Collected 2,847 claims from last 30 days', duration_ms: 12400, timestamp: '2026-02-09T06:00:12Z' },
      { stepId: 's2', stepName: 'NCCI Edit Check', status: 'warning', output: '23 claims with NCCI edit violations found (0.8%)', duration_ms: 45200, timestamp: '2026-02-09T06:00:57Z' },
      { stepId: 's3', stepName: 'MUE Limit Check', status: 'warning', output: '8 claims exceeded MUE limits for stated procedure codes', duration_ms: 31000, timestamp: '2026-02-09T06:01:28Z' },
      { stepId: 's4', stepName: 'Fee Schedule Validation', status: 'success', output: '99.2% of claims within fee schedule tolerance. 12 claims over-billed by >10%', duration_ms: 52300, timestamp: '2026-02-09T06:02:20Z' },
      { stepId: 's5', stepName: 'AI Summarization', status: 'success', output: 'Summary generated: 31 total compliance issues identified across 2,847 claims. Estimated improper payments: $47,230', duration_ms: 8900, timestamp: '2026-02-09T06:02:29Z' },
      { stepId: 's6', stepName: 'Generate Report', status: 'success', output: 'Compliance audit report generated (PDF, 12 pages)', duration_ms: 3200, timestamp: '2026-02-09T06:02:32Z' },
    ],
    summary: 'Audit of 2,847 claims found 31 compliance issues (1.1% flag rate). 23 NCCI edit violations, 8 MUE limit exceedances. Estimated improper payments: $47,230. No critical issues; all within acceptable thresholds.',
  },
  {
    id: 'run-002',
    workflowId: 'wf-fraud-pattern-scan',
    status: 'completed',
    triggeredBy: 'schedule',
    startedAt: '2026-02-08T01:00:00Z',
    completedAt: '2026-02-08T01:12:15Z',
    results: [
      { stepId: 's1', stepName: 'Data Collection', status: 'success', output: 'Collected 5,432 claims from last 60 days across 312 providers', duration_ms: 18700, timestamp: '2026-02-08T01:00:19Z' },
      { stepId: 's2', stepName: 'Upcoding Detection', status: 'warning', output: '3 providers flagged for systematic upcoding patterns (confidence > 0.85)', duration_ms: 156000, timestamp: '2026-02-08T01:02:55Z' },
      { stepId: 's3', stepName: 'Unbundling Detection', status: 'success', output: '1 provider flagged for potential unbundling of E/M services', duration_ms: 142000, timestamp: '2026-02-08T01:05:17Z' },
      { stepId: 's4', stepName: 'Phantom Billing Check', status: 'success', output: 'No phantom billing patterns detected', duration_ms: 198000, timestamp: '2026-02-08T01:08:35Z' },
      { stepId: 's5', stepName: 'Risk Scoring', status: 'success', output: 'Risk scores assigned: 3 high-risk, 7 medium-risk, 302 low-risk providers', duration_ms: 24000, timestamp: '2026-02-08T01:08:59Z' },
      { stepId: 's6', stepName: 'Generate FWA Report', status: 'success', output: 'FWA report generated (PDF, 18 pages)', duration_ms: 4500, timestamp: '2026-02-08T01:09:03Z' },
    ],
    summary: 'Weekly FWA scan of 5,432 claims found 4 providers with concerning patterns. 3 suspected upcoding (combined overpayment estimate: $82,450), 1 suspected unbundling ($12,300). Referrals created for fraud investigation team.',
  },
];

/* ─── Context ─── */
interface AuditorWorkflowContextState {
  workflows: AuditorWorkflow[];
  runs: WorkflowRun[];
  addWorkflow: (workflow: Omit<AuditorWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'runCount'>) => void;
  updateWorkflow: (id: string, updates: Partial<Omit<AuditorWorkflow, 'id' | 'createdAt'>>) => void;
  deleteWorkflow: (id: string) => void;
  toggleWorkflowStatus: (id: string) => void;
  executeWorkflow: (id: string) => Promise<WorkflowRun>;
  getWorkflowById: (id: string) => AuditorWorkflow | undefined;
  getRunsForWorkflow: (workflowId: string) => WorkflowRun[];
}

const AuditorWorkflowContext = createContext<AuditorWorkflowContextState>({
  workflows: [],
  runs: [],
  addWorkflow: () => {},
  updateWorkflow: () => {},
  deleteWorkflow: () => {},
  toggleWorkflowStatus: () => {},
  executeWorkflow: () => Promise.resolve({} as WorkflowRun),
  getWorkflowById: () => undefined,
  getRunsForWorkflow: () => [],
});

/* ─── Simulated workflow execution ─── */
const STEP_TYPE_OUTPUTS: Record<string, string[]> = {
  data_collection: [
    'Collected 1,247 records from data sources',
    'Retrieved 3,891 claims from the audit period',
    'Gathered 892 provider records for analysis',
  ],
  ai_analysis: [
    'AI analysis identified 12 anomalous patterns across 3,400 records',
    'Pattern recognition flagged 7 high-confidence findings (>0.85)',
    'Machine learning model processed 2,100 claims with 94.2% accuracy',
  ],
  compliance_check: [
    '98.5% compliance rate achieved. 22 violations flagged for review',
    'All records validated against current regulatory requirements. 5 exceptions noted',
    'Cross-referenced against 847 rules. 15 non-compliant records identified',
  ],
  summarization: [
    'Executive summary generated: Key findings include 3 high-priority issues requiring immediate attention',
    'Narrative report drafted with 5 actionable recommendations',
    'Summary: Audit found overall compliance within acceptable thresholds with targeted improvements needed',
  ],
  risk_scoring: [
    'Risk scores calculated: 4 high-risk, 12 medium-risk, 186 low-risk items',
    'Composite risk index: 2.3 (within normal range). 6 outliers flagged',
    'Provider risk profiles updated. 3 providers elevated to enhanced monitoring',
  ],
  report_generation: [
    'Audit report generated (PDF, 14 pages) with appendices',
    'Compliance report exported with visualizations and trend analysis',
    'Final report compiled with executive summary, findings, and recommendations',
  ],
  notification: [
    'Notifications sent to 5 stakeholders via email',
    'Alert dispatched to audit team lead and compliance officer',
    'Summary notification sent to distribution list (8 recipients)',
  ],
  manual_review: [
    'Queued 3 high-dollar items for manual reviewer sign-off',
    'Review task created for senior auditor: 5 items pending verification',
    'Manual review checkpoint passed: all items within acceptable range',
  ],
};

function simulateStepResult(step: { id: string; name: string; type: string }): WorkflowRunResult {
  const outputs = STEP_TYPE_OUTPUTS[step.type] || ['Step completed successfully'];
  const output = outputs[Math.floor(Math.random() * outputs.length)];
  const statuses: Array<WorkflowRunResult['status']> = ['success', 'success', 'success', 'warning'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  return {
    stepId: step.id,
    stepName: step.name,
    status,
    output,
    duration_ms: Math.floor(Math.random() * 50000) + 2000,
    timestamp: new Date().toISOString(),
  };
}

export const AuditorWorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workflows, setWorkflows] = useState<AuditorWorkflow[]>(SEED_WORKFLOWS);
  const [runs, setRuns] = useState<WorkflowRun[]>(SEED_RUNS);

  const addWorkflow = useCallback(
    (workflow: Omit<AuditorWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'runCount'>) => {
      const now = new Date().toISOString();
      const newWorkflow: AuditorWorkflow = {
        ...workflow,
        id: `wf-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
        lastRunAt: null,
        runCount: 0,
      };
      setWorkflows((prev) => [...prev, newWorkflow]);
    },
    [],
  );

  const updateWorkflow = useCallback(
    (id: string, updates: Partial<Omit<AuditorWorkflow, 'id' | 'createdAt'>>) => {
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w,
        ),
      );
    },
    [],
  );

  const deleteWorkflow = useCallback((id: string) => {
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const toggleWorkflowStatus = useCallback((id: string) => {
    setWorkflows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const nextStatus: Record<string, AuditorWorkflow['status']> = {
          active: 'inactive',
          inactive: 'active',
          draft: 'active',
          archived: 'inactive',
        };
        return { ...w, status: nextStatus[w.status] || 'active', updatedAt: new Date().toISOString() };
      }),
    );
  }, []);

  const executeWorkflow = useCallback(
    async (id: string): Promise<WorkflowRun> => {
      const workflow = workflows.find((w) => w.id === id);
      if (!workflow) throw new Error('Workflow not found');

      const now = new Date().toISOString();
      const runId = `run-${Date.now()}`;

      // Create pending run
      const pendingRun: WorkflowRun = {
        id: runId,
        workflowId: id,
        status: 'running' as WorkflowRunStatus,
        triggeredBy: 'manual',
        startedAt: now,
        completedAt: null,
        results: [],
        summary: null,
      };
      setRuns((prev) => [pendingRun, ...prev]);

      // Simulate step-by-step execution
      const results: WorkflowRunResult[] = [];
      for (const step of workflow.steps) {
        await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 700));
        const result = simulateStepResult(step);
        results.push(result);
        setRuns((prev) =>
          prev.map((r) => (r.id === runId ? { ...r, results: [...results] } : r)),
        );
      }

      // Complete the run
      const completedRun: WorkflowRun = {
        ...pendingRun,
        status: 'completed',
        completedAt: new Date().toISOString(),
        results,
        summary: `Workflow "${workflow.name}" completed successfully. ${results.length} steps executed. ${results.filter((r) => r.status === 'warning').length} warnings.`,
      };

      setRuns((prev) => prev.map((r) => (r.id === runId ? completedRun : r)));
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === id
            ? { ...w, lastRunAt: completedRun.completedAt, runCount: w.runCount + 1, updatedAt: new Date().toISOString() }
            : w,
        ),
      );

      return completedRun;
    },
    [workflows],
  );

  const getWorkflowById = useCallback(
    (id: string) => workflows.find((w) => w.id === id),
    [workflows],
  );

  const getRunsForWorkflow = useCallback(
    (workflowId: string) => runs.filter((r) => r.workflowId === workflowId),
    [runs],
  );

  return (
    <AuditorWorkflowContext.Provider
      value={{
        workflows,
        runs,
        addWorkflow,
        updateWorkflow,
        deleteWorkflow,
        toggleWorkflowStatus,
        executeWorkflow,
        getWorkflowById,
        getRunsForWorkflow,
      }}
    >
      {children}
    </AuditorWorkflowContext.Provider>
  );
};

export const useAuditorWorkflowContext = () => useContext(AuditorWorkflowContext);
