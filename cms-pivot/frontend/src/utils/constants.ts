// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  INGESTION: '/ingestion',
  VALIDATION: '/validation',
  ANALYTICS: '/analytics',
  FRAUD_RESEARCH: '/fraud-research',
  AUDIT_LOG: '/audit-log',
  MONITORING: '/monitoring',
  RECOUPMENT: '/recoupment',
  AGENT_MANAGEMENT: '/agent-management',
  AUDITOR_WORKFLOWS: '/auditor-workflows',
  USER_MANAGEMENT: '/user-management',
} as const;

/**
 * Role-based page access configuration.
 * Maps each role to the routes they can access.
 */
export const ROLE_ROUTES: Record<string, string[]> = {
  MCR: [ROUTES.DASHBOARD, ROUTES.INGESTION, ROUTES.VALIDATION],
  Supervisor: [ROUTES.ANALYTICS, ROUTES.FRAUD_RESEARCH, ROUTES.RECOUPMENT],
  Auditor: [ROUTES.VALIDATION, ROUTES.AGENT_MANAGEMENT, ROUTES.AUDIT_LOG, ROUTES.AUDITOR_WORKFLOWS],
  Administrator: [ROUTES.FRAUD_RESEARCH, ROUTES.AGENT_MANAGEMENT, ROUTES.USER_MANAGEMENT, ROUTES.MONITORING],
  'Organization Admin': [
    ROUTES.DASHBOARD,
    ROUTES.INGESTION,
    ROUTES.VALIDATION,
    ROUTES.ANALYTICS,
    ROUTES.FRAUD_RESEARCH,
    ROUTES.RECOUPMENT,
    ROUTES.AUDIT_LOG,
    ROUTES.AGENT_MANAGEMENT,
    ROUTES.AUDITOR_WORKFLOWS,
    ROUTES.USER_MANAGEMENT,
    ROUTES.MONITORING,
  ],
};

/** The default landing page for each role (first in their allowed routes). */
export const ROLE_DEFAULT_ROUTE: Record<string, string> = {
  MCR: ROUTES.DASHBOARD,
  Supervisor: ROUTES.ANALYTICS,
  Auditor: ROUTES.VALIDATION,
  Administrator: ROUTES.FRAUD_RESEARCH,
  'Organization Admin': ROUTES.DASHBOARD,
};

/** Roles available for login selection. */
export const LOGIN_ROLES = ['MCR', 'Supervisor', 'Auditor', 'Administrator', 'Organization Admin'] as const;

export const AGENT_NAMES: Record<string, string> = {
  rules_engine: 'Rules Engine',
  data_validation: 'Data Validation',
  pension_poaching: 'Beneficiary Exploitation',
  claim_sharking: 'Provider Exploitation Check',
  dbq_fraud: 'Clinical Assessment Integrity Check',
  overlapping_claims: 'Overlapping Claims',
  medical_record: 'Medical Record Check',
  claim_discrepancy: 'Claim Discrepancy',
};

export const RISK_COLORS: Record<string, string> = {
  high: '#E31C3D',
  medium: '#FDB81E',
  low: '#2E8540',
};
