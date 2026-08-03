// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import StorageIcon from '@mui/icons-material/Storage';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import GavelIcon from '@mui/icons-material/Gavel';
import GroupsIcon from '@mui/icons-material/Groups';
import AltRouteIcon from '@mui/icons-material/AltRoute';

export interface PipelineNodeState {
  id: string;
  label: string;
  status: 'idle' | 'active' | 'success' | 'error';
}

interface PipelineAnimationProps {
  nodes: PipelineNodeState[];
  onNodeClick?: (nodeId: string) => void;
}

const NODE_ICONS: Record<string, React.ReactNode> = {
  normalization: <StorageIcon sx={{ fontSize: 28 }} />,
  warehouse: <WarehouseIcon sx={{ fontSize: 28 }} />,
  rules_engine: <GavelIcon sx={{ fontSize: 28 }} />,
  agent_army: <GroupsIcon sx={{ fontSize: 28 }} />,
  decision_routing: <AltRouteIcon sx={{ fontSize: 28 }} />,
};

export const NODE_DESCRIPTIONS: Record<string, string> = {
  normalization:
    'Parses and normalizes 837P, 837I, 837D, NCPDP transactions. Standardizes data structures, code sets, and field formats across all sources.',
  warehouse:
    'BigQuery-based data warehouse for claims storage with full audit trail. Maintains referential integrity across all integrated systems.',
  rules_engine:
    'Executes >1000 compliance rules including CMS edits, PPS logic, Medicare national coverage (NCD/LCD), and Fee Schedule rate validations in real-time.',
  agent_army: 'Multi-agent analysis system with 7 specialized fraud and compliance detection agents.',
  decision_routing:
    'Routes claims based on flag severity: High \u2192 automated rejection, Medium/Low \u2192 manual review queue.',
};

export const AGENT_ARMY_AGENTS = [
  { name: 'Rules Engine', description: 'Enforces statutory limits (LCD L33803) and billing integrity rules.' },
  { name: 'Threat Simulation "Trust Defender"', description: 'Monitors early-stage risk signals and anomalies in enrollment records.' },
  { name: 'Pre-Payment Claims Hold "Crush Fraud"', description: 'Intercepts high-risk billing and coordinates immediate prepay holds.' },
  { name: 'Enrollment Audit & Unmasking "System Resilience"', description: 'Uncovers complex shell company structures and shared address links.' },
  { name: 'Policy & Referral "Program Integrity Ops"', description: 'Compiles formal OIG/DOJ evidence packages and policy adjustment notes.' },
  { name: 'Overlapping Claims Check', description: 'Flags overlapping service dates or duplicate procedures.' },
  { name: 'Data Validation Integrity', description: 'Ensures NPI format compliance and diagnostic logic validation.' }
];

/**
 * Comprehensive RFI-aligned detail sections for each pipeline node,
 * mapping to CMS Sections 5.2.1-5.2.6 and 6.4 Performance Metrics.
 */
export interface NodeDetailSection {
  pwsRef: string;
  overview: string;
  capabilities: string[];
  metrics: { label: string; target: string }[];
  compliance: string[];
}

export const NODE_DETAIL_SECTIONS: Record<string, NodeDetailSection> = {
  normalization: {
    pwsRef: 'CMS Section 5.2.1 \u2014 Data Ingest and Management',
    overview:
      'Ingests, parses, and normalizes healthcare claim transactions across all standard electronic formats. Converts raw EDI, NCPDP, and document-based submissions into a unified internal schema with full data provenance tracking.',
    capabilities: [
      'Parse 837P (Professional), 837I (Institutional), 837D (Dental) EDI transactions per HIPAA X12 standards',
      'Process NCPDP pharmacy claims and Medicare Part D transactions',
      'Extract structured data from PDF/scanned documents using OCR and NLP',
      'Validate field-level data quality: completeness, format, referential integrity',
      'Map ICD-10, CPT, HCPCS, NDC, and Medicare-specific code sets to canonical references',
      'Generate unique claim identifiers and link to beneficiary/provider master records',
      'Maintain full data lineage from source document to normalized record',
      'Support CMS quarterly code set updates and Medicare-specific modifier handling',
    ],
    metrics: [
      { label: 'Data Quality Score', target: '\u2265 98%' },
      { label: 'Parse Success Rate', target: '\u2265 99.5%' },
      { label: 'Processing Throughput', target: '< 30s per claim' },
    ],
    compliance: [
      'HIPAA X12 5010 transaction standards',
      '42 CFR Part 2 substance use disorder protections',
      'CMS Information Security (IS) Policy',
      'NIST SP 800-53 data integrity controls',
    ],
  },
  warehouse: {
    pwsRef: 'CMS Section 5.2.1 (Items 2\u20135) \u2014 Data Management & Architecture',
    overview:
      'Google BigQuery-powered data warehouse providing petabyte-scale storage, real-time analytics, and immutable audit trails. Supports the full claims lifecycle from ingestion through final disposition with columnar storage optimized for fraud pattern detection queries.',
    capabilities: [
      'Maintain comprehensive data dictionary with field definitions, sources, and valid ranges',
      'Implement data archiving and retention policies per CMS records management requirements',
      'Automated backup and disaster recovery with < 4hr RPO, < 8hr RTO',
      'Process and integrate CMS quarterly updates (code sets, fee schedules, edit modules)',
      'Maintain master indices: beneficiaries, providers, facilities, code references',
      'Support federated queries across Medicare Part A, Part B, and Part D domains',
      'Version-controlled schema migrations with zero-downtime deployments',
      'Row-level security and column masking for PII/PHI fields',
    ],
    metrics: [
      { label: 'System Uptime', target: '\u2265 99.9%' },
      { label: 'Query Response Time', target: '< 5 seconds (95th percentile)' },
      { label: 'Backup Frequency', target: 'Continuous replication' },
    ],
    compliance: [
      'FedRAMP High authorization baseline',
      'CMS Information Security and Privacy Group (ISPG) guidelines',
      'NIST SP 800-171 CUI protection',
      '36 CFR Part 1236 records management',
    ],
  },
  rules_engine: {
    pwsRef: 'CMS Section 5.2.2 \u2014 Rules Engine',
    overview:
      'High-performance rules engine executing over 1,000 configurable compliance rules in real-time. Applies CMS Correct Coding Initiative (CCI) edits, Prospective Payment System (PPS) logic, CMS Financial Policy guidelines, and fee schedule rate validations to every claim.',
    capabilities: [
      'Execute CMS National Correct Coding Initiative (NCCI) edits (Column 1/Column 2, MUEs)',
      'Apply Prospective Payment System (PPS) logic: DRG grouping, APC assignment, RUG-IV classification',
      'Validate against Medicare Physician Fee Schedule (MPFS) and DMEPOS fee schedule rates',
      'Enforce CMS Financial Policy rules including benefits eligibility and coverage verification',
      'Modifier validation: -25, -59, -76, -77, -XE, -XP, -XS, -XU and Medicare-specific modifiers',
      'Rule versioning with effective dates, 4-tier release process (dev \u2192 test \u2192 stage \u2192 prod)',
      'Automated rule conflict detection and resolution with priority-based ordering',
      'Support user-configurable rules via no-code rule builder interface',
      'Real-time rule performance monitoring with execution time tracking per rule',
    ],
    metrics: [
      { label: 'Rule Execution Accuracy', target: '\u2265 98%' },
      { label: 'Rules Maintained', target: '> 1,000 active rules' },
      { label: 'Rule Update Cycle', target: 'Within 48hrs of CMS release' },
      { label: 'Processing Speed', target: '< 2s per claim rule set' },
    ],
    compliance: [
      'CMS Change Request (CR) implementation timelines',
      'CMS Pub 100-08 Medicare Program Integrity Manual standards',
      'Medicare Claims Processing Manual (Pub 100-04)',
      'CFR Title 42 Public Health (CMS) regulations',
    ],
  },
  agent_army: {
    pwsRef: 'Medicare Payment Integrity \u2014 AI/ML Orchestration',
    overview:
      'Multi-agent AI/ML system with 7 specialized fraud and compliance detection agents. Uses supervised learning, anomaly detection, network analysis, and NLP to identify complex fraud patterns that evade traditional rules. Incorporates human-in-the-loop (HITL) feedback for continuous model improvement and provides explainable AI (xAI) evidence for every finding.',
    capabilities: [
      'Enforce statutory rules and billing quantity limits via the Rules Engine',
      'Monitor early enrollment risk signals via Threat Simulation "Trust Defender"',
      'Intercept high-risk billing and execute prepayment claims holds via "Crush Fraud"',
      'Resolve complex beneficial ownership links and PECOS registry unmasking via "System Resilience"',
      'Compile formal federal fraud evidence dossiers for DOJ/OIG referral via "Program Integrity Ops"',
      'Detect overlapping service dates and duplicate procedures via Overlapping Claims Check',
      'Validate inbound data format, NPI structure, and clinical coding via Data Validation Integrity',
      'Continuous model retraining using HITL reviewer feedback and outcome labels',
      'Explainable AI: generate human-readable evidence summaries for each finding',
      'Ensemble scoring: combine multiple agent signals into unified risk assessment',
    ],
    metrics: [
      { label: 'AI/ML Accuracy', target: '\u2265 95%' },
      { label: 'False Positive Rate', target: '\u2264 5%' },
      { label: 'Model Drift Detection', target: 'Monthly monitoring' },
      { label: 'HITL Feedback Loop', target: '\u003c 24hr label incorporation' },
    ],
    compliance: [
      'NIST AI Risk Management Framework (AI RMF)',
      'CMS HHS Trustworthy AI guidelines',
      'Executive Order 14110 Safe AI',
      'OMB M-24-10 AI governance and innovation',
    ],
  },
  decision_routing: {
    pwsRef: 'CMS Sections 5.2.4, 5.2.5, 5.2.6 \u2014 Flags, Recoupment \u0026 Audit',
    overview:
      'Intelligent routing engine that classifies claims by aggregate risk and directs them to appropriate workflows. High-risk claims receive automated denial recommendations, medium-risk route to senior human reviewers, and low-risk proceed through expedited approval. Integrates with overpayment/recoupment tracking and comprehensive audit logging.',
    capabilities: [
      'Tri-level severity routing: High \u2192 auto-deny recommendation, Medium \u2192 senior review, Low \u2192 expedited approval',
      'Configurable routing rules with threshold adjustment by claim type and provider risk tier',
      'Overpayment identification with automated recoupment demand letter generation',
      'Track recoupment lifecycle: identification \u2192 demand \u2192 appeal \u2192 collection \u2192 resolution',
      'Integration with CMS DCC and Treasury Offset Program (TOP)',
      'Comprehensive audit trail: every action, decision, access, and modification logged',
      'Support appeal workflows with evidence packaging and timeline tracking',
      'Generate compliance reports: OIG, GAO, Congressional inquiry responses',
      'Real-time dashboard metrics for queue depth, processing velocity, and aging analysis',
    ],
    metrics: [
      { label: 'Recoupment Rate', target: '\u2265 85%' },
      { label: 'ROI', target: '\u2265 3:1 over 12 months' },
      { label: 'Decision Turnaround', target: '< 48hrs for high-priority' },
      { label: 'Audit Completeness', target: '100% action logging' },
    ],
    compliance: [
      '42 CFR Part 401 debt collection regulations',
      'CMS Financial Management Manual (Chapter 4 debt collection)',
      'Privacy Act of 1974 (5 USC 552a)',
      'Federal Records Act audit requirements',
    ],
  },
};

function getNodeColor(status: PipelineNodeState['status']): string {
  switch (status) {
    case 'idle':
      return '#CCCCCC';
    case 'active':
      return '#003F72';
    case 'success':
      return '#2E8540';
    case 'error':
      return '#E31C3D';
    default:
      return '#CCCCCC';
  }
}

function getArrowColor(leftStatus: PipelineNodeState['status'], rightStatus: PipelineNodeState['status']): string {
  if (rightStatus === 'active' || rightStatus === 'success' || rightStatus === 'error') {
    return '#003F72';
  }
  if (leftStatus === 'success') {
    return '#2E8540';
  }
  return '#CCCCCC';
}

const pulseAnimation = {
  scale: [1, 1.08, 1],
  boxShadow: [
    '0 0 0 0 rgba(0, 63, 114, 0.4)',
    '0 0 0 12px rgba(0, 63, 114, 0)',
    '0 0 0 0 rgba(0, 63, 114, 0)',
  ],
};

function buildTooltipContent(nodeId: string): React.ReactNode {
  if (nodeId === 'agent_army') {
    return (
      <Box sx={{ p: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
          Agent Army — 8 Specialized Agents
        </Typography>
        {AGENT_ARMY_AGENTS.map((agent) => (
          <Box key={agent.name} sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {agent.name}:
            </Typography>{' '}
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              {agent.description}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="caption">{NODE_DESCRIPTIONS[nodeId] || ''}</Typography>
    </Box>
  );
}

const PipelineAnimation: React.FC<PipelineAnimationProps> = ({ nodes, onNodeClick }) => {
  const nodeWidth = 110;
  const nodeHeight = 90;
  const arrowLength = 50;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 3,
        px: 2,
        overflowX: 'auto',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {nodes.map((node, index) => {
          const color = getNodeColor(node.status);
          const isActive = node.status === 'active';
          const isLast = index === nodes.length - 1;

          return (
            <React.Fragment key={node.id}>
              {/* Node */}
              <Tooltip
                title={buildTooltipContent(node.id)}
                arrow
                placement="top"
                enterDelay={200}
                leaveDelay={100}
                slotProps={{
                  tooltip: {
                    sx: {
                      backgroundColor: 'rgba(17, 46, 81, 0.95)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      maxWidth: 340,
                      fontSize: '0.75rem',
                    },
                  },
                  arrow: {
                    sx: {
                      color: 'rgba(17, 46, 81, 0.95)',
                    },
                  },
                }}
              >
                <motion.div
                  animate={
                    isActive
                      ? pulseAnimation
                      : {
                          scale: 1,
                          boxShadow: '0 0 0 0 rgba(0,0,0,0)',
                        }
                  }
                  transition={
                    isActive
                      ? {
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }
                      : { duration: 0.3 }
                  }
                  onClick={() => onNodeClick?.(node.id)}
                  style={{
                    width: nodeWidth,
                    height: nodeHeight,
                    borderRadius: 8,
                    backgroundColor: color,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    flexShrink: 0,
                    transition: 'background-color 0.5s ease, filter 0.2s ease',
                    cursor: 'pointer',
                  }}
                  whileHover={{
                    filter: 'brightness(1.25)',
                    scale: isActive ? undefined : 1.05,
                  }}
                >
                  <Box sx={{ color: '#FFFFFF', display: 'flex' }}>
                    {NODE_ICONS[node.id] || <StorageIcon sx={{ fontSize: 28 }} />}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#FFFFFF',
                      fontWeight: 700,
                      textAlign: 'center',
                      lineHeight: 1.2,
                      px: 0.5,
                      fontSize: '0.65rem',
                    }}
                  >
                    {node.label}
                  </Typography>
                </motion.div>
              </Tooltip>

              {/* Arrow between nodes */}
              {!isLast && (
                <Box
                  sx={{
                    width: arrowLength,
                    height: 2,
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width={arrowLength}
                    height="20"
                    viewBox={`0 0 ${arrowLength} 20`}
                    style={{ position: 'absolute', top: -9 }}
                  >
                    {/* Animated line */}
                    <motion.line
                      x1="0"
                      y1="10"
                      x2={arrowLength - 10}
                      y2="10"
                      stroke={getArrowColor(node.status, nodes[index + 1].status)}
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                    {/* Arrowhead */}
                    <motion.polygon
                      points={`${arrowLength - 10},5 ${arrowLength},10 ${arrowLength - 10},15`}
                      fill={getArrowColor(node.status, nodes[index + 1].status)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
                    />
                    {/* Animated dot traveling along the arrow when transitioning */}
                    {(node.status === 'success' || node.status === 'active') &&
                      nodes[index + 1].status === 'active' && (
                        <motion.circle
                          cy="10"
                          r="3"
                          fill="#02BFE7"
                          initial={{ cx: 0 }}
                          animate={{ cx: arrowLength - 5 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                        />
                      )}
                  </svg>
                </Box>
              )}
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
};

export default PipelineAnimation;
