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
  ENROLLMENT: '/enrollment-integrity',
  REFERRALS: '/nfed-referrals',
} as const;

/**
 * Role-based page access configuration.
 * Maps each role to the routes they can access.
 */
export const ROLE_ROUTES: Record<string, string[]> = {
  'Enrollment Analyst': [ROUTES.DASHBOARD, ROUTES.ENROLLMENT, ROUTES.VALIDATION, ROUTES.INGESTION],
  'Senior Investigator': [ROUTES.REFERRALS, ROUTES.FRAUD_RESEARCH, ROUTES.ANALYTICS, ROUTES.VALIDATION, ROUTES.INGESTION],
  'Platform Administrator': [
    ROUTES.DASHBOARD,
    ROUTES.FRAUD_RESEARCH,
    ROUTES.AGENT_MANAGEMENT,
    ROUTES.USER_MANAGEMENT,
    ROUTES.INGESTION,
  ],
  'Claims Auditor': [
    ROUTES.DASHBOARD,
    ROUTES.VALIDATION,
    ROUTES.AUDITOR_WORKFLOWS,
    ROUTES.AGENT_MANAGEMENT,
    ROUTES.AUDIT_LOG,
    ROUTES.INGESTION,
  ],
};

/** The default landing page for each role (first in their allowed routes). */
export const ROLE_DEFAULT_ROUTE: Record<string, string> = {
  'Enrollment Analyst': ROUTES.DASHBOARD,
  'Senior Investigator': ROUTES.REFERRALS,
  'Platform Administrator': ROUTES.FRAUD_RESEARCH,
  'Claims Auditor': ROUTES.VALIDATION,
};

/** Roles available for login selection. */
export const LOGIN_ROLES = [
  'Enrollment Analyst',
  'Claims Auditor',
  'Senior Investigator',
  'Platform Administrator',
] as const;

export const AGENT_NAMES: Record<string, string> = {
  rules_engine: 'Rules Engine',
  trust_defender: 'Threat Simulation "Trust Defender"',
  crush_fraud: 'Pre-Payment Claims Hold "Crush Fraud"',
  system_resilience: 'Enrollment Audit & Unmasking "System Resilience"',
  program_integrity_ops: 'Policy & Referral "Program Integrity Ops"',
  overlapping_claims: 'Overlapping Claims Check',
  data_validation: 'Data Validation Integrity',
};

export const RISK_COLORS: Record<string, string> = {
  high: '#E31C3D',
  medium: '#D97706',
  low: '#2E8540',
};
