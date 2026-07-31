// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Collapse,
  Divider,
  Grid,
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SecurityIcon from '@mui/icons-material/Security';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';

// ── Agent Definitions (from sholtz_code) ──────────────────────────

interface AgentDefinition {
  id: string;
  name: string;
  shortName: string;
  pattern: string;
  description: string;
  logicFormula: string;
  testCases: TestCaseDefinition[];
}

interface TestCaseDefinition {
  id: string;
  label: string;
  format: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  isViolation: boolean;
}

// ── Test case data from sholtz_code ──────────────────────────

const TC_P_002_INPUT = {
  format: 'X12 EDI',
  metadata: { sender: 'SENDERID', receiver: 'VA_RECEIVER' },
  claim: {
    services: [{ proc_code: '99215', charge: '450.00', units: '1' }],
    attachments: [],
    billing_provider: 'VET CLINIC',
    patient_name: 'JAMES DOE',
    id: 'TC-P-002',
    total_charge: '450.00',
  },
};

const TC_P_002_OUTPUT = {
  agent_metadata: {
    agent_name: 'Upcoding and Complexity Inflation Agent (UCIA-01)',
    execution_time: '156ms',
  },
  determination: {
    flag: 'REVIEW_PAY',
    confidence_score: 0.94,
    risk_tier: 'Medium-High',
  },
  calculation_disclosure: {
    original_billed_amount: 450.0,
    payout_calculation: '$0.00',
    savings_realized: 450.0,
    logic_formula: 'Payment = (Work_RVU * GPCI_w + PE_RVU * GPCI_pe + MP_RVU * GPCI_mp) * CF',
  },
  logic_transparency_explainability: {
    finding: "Significant 'distribution drift' detected in provider billing patterns.",
    evidence_data: {
      provider_high_complexity_ratio: 0.9,
      peer_benchmark_avg: 0.3,
      diagnosis_code: 'R05.9',
    },
    reasoning:
      'Provider bills high-complexity codes at 90% of their total claims, compared to a specialty peer average of 30%.',
  },
  recommended_action: 'Flag for clinical peer review and RVU verification.',
};

const TC_P_003_INPUT = {
  format: 'X12 EDI',
  metadata: { sender: 'SENDERID', receiver: 'VA_RECEIVER' },
  claim: {
    services: [
      { proc_code: '11400', charge: '450.00', units: '1' },
      { proc_code: '12001:59', charge: '150.00', units: '1' },
    ],
    attachments: [],
    billing_provider: 'DERM CLINIC',
    patient_name: 'JAMES DOE',
    id: 'TC-P-003',
    total_charge: '600.00',
  },
};

const TC_P_003_OUTPUT = {
  agent_metadata: {
    agent_name: 'NCCI Bundle Validation Agent (NBVA-04)',
    execution_time: '118ms',
  },
  determination: { flag: 'STOP_PAY', confidence_score: 1.0, risk_tier: 'High' },
  calculation_disclosure: {
    original_billed_amount: 600.0,
    payout_calculation: '$450.00',
    savings_realized: 150.0,
    logic_formula: 'IF (Col_2_Code AND Col_1_Code PRESENT) THEN Result = Deny_Col_2',
  },
  logic_transparency_explainability: {
    finding: 'Unbundling detected for codes: 12001:59',
    evidence_data: {
      primary_codes_detected: ['11400'],
      denied_components: ['12001:59'],
      edit_source: 'CMS National Correct Coding Initiative (NCCI)',
    },
    reasoning:
      "The provider billed for components ['12001:59'] which are integral to the primary procedure ['11400'].",
  },
  recommended_action: 'Suspension of payment; unbundled procedural components detected.',
};

const TC_I_001_INPUT = {
  format: 'X12 EDI',
  metadata: { sender: 'HOSP_SENDER', receiver: 'VA_RECEIVER' },
  claim: {
    services: [{ proc_code: '0121', charge: '4500.00', units: '3' }],
    attachments: [],
    billing_provider: 'CITY HOSPITAL',
    id: 'TC-I-001',
    total_charge: '4500.00',
  },
};

const TC_I_001_OUTPUT_VOLUME = {
  agent_metadata: {
    agent_name: 'Longitudinal Volume Validation Agent (LVVA-03)',
    execution_time: '165ms',
  },
  determination: { flag: 'STOP_PAY', confidence_score: 0.98, risk_tier: 'High' },
  calculation_disclosure: {
    original_billed_amount: 4500.0,
    payout_calculation: '$0.00',
    savings_realized: 4500.0,
    logic_formula: 'IF (Daily_Hours > 24 OR Velocity > Threshold) THEN Result = STOP_PAY',
  },
  logic_transparency_explainability: {
    finding: 'Pattern 3 Violation: Impossible Billing Volume.',
    evidence_data: {
      billable_hours_24h: 32.5,
      claims_per_minute: 1200,
      is_new_network_member: true,
    },
    reasoning:
      'Provider billed 32.5 hours of service in a 24-hour window, exceeding physical capacity.',
  },
  recommended_action:
    'Refer to VA OIG; immediate suspension of payments pending longitudinal audit.',
};

const TC_P_003_OUTPUT_MODIFIER = {
  agent_metadata: {
    agent_name: 'Modifier Intensity Validation Agent (MIVA-04)',
    execution_time: '142ms',
  },
  determination: { flag: 'STOP_PAY', confidence_score: 0.99, risk_tier: 'High' },
  calculation_disclosure: {
    original_billed_amount: 600.0,
    payout_calculation: '$0.00',
    savings_realized: 600.0,
    logic_formula: 'IF (Modifier_Intensity > Specialty_Norm) THEN Result = STOP_PAY',
  },
  logic_transparency_explainability: {
    finding: 'Abuse Pattern 4 Detected: Excessive use of Modifier 59.',
    evidence_data: {
      detected_modifiers: ['59'],
      provider_intensity_scores: { '59_intensity_score': 0.8, '25_intensity_score': 0.1, '22_intensity_score': 0.02 },
      specialty_benchmarks: { '59': 0.15, '25': 0.2, '22': 0.05 },
    },
    reasoning:
      'The provider uses Modifier 59 on 80% of claims, significantly exceeding the specialty norm of 15%.',
  },
  recommended_action:
    'Refer to OIG; systematic bypass of automated edits detected.',
};

const TC_D_002_INPUT = {
  format: 'X12 EDI',
  metadata: { sender: 'SENDERID', receiver: 'VA_RECEIVER' },
  claim: {
    services: [{ proc_code: 'AD:D0145', charge: '200.00', units: '1' }],
    attachments: [],
    billing_provider: 'VET DENTAL CENTER',
    patient_name: 'JAMES DOE',
    patient_gender: 'M',
    patient_age: 75,
    id: 'TC-D-002',
    total_charge: '200',
  },
};

const TC_MUE_INPUT = {
  format: 'X12 EDI',
  metadata: { sender: 'SENDERID', receiver: 'VA_RECEIVER' },
  claim: {
    services: [{ proc_code: 'AD:D1110', charge: '150.00', units: '1' }],
    attachments: [],
    billing_provider: 'VET DENTAL CENTER',
    patient_name: 'JAMES DOE',
    id: 'TC-MUE-D1110',
    total_charge: '150.00',
  },
};

const TC_MUE_OUTPUT = {
  agent_metadata: {
    agent_name: 'MUE & Periodicity Validation Agent (MAA-05)',
    execution_time: '145ms',
  },
  determination: { flag: 'STOP_PAY', confidence_score: 1.0, risk_tier: 'High' },
  calculation_disclosure: {
    original_billed_amount: 150.0,
    payout_calculation: '$0.00',
    savings_realized: 150.0,
    logic_formula: 'IF (Units + History > Limit) THEN Result = STOP_PAY',
  },
  logic_transparency_explainability: {
    finding: 'Pattern 5 Violation: Annual Frequency Limit Exceeded for D1110.',
    evidence_data: { flagged_code: ['D1110'], prior_utilization_count: 2 },
    reasoning:
      'Veteran JAMES DOE has 2 prior cleanings; this claim exceeds the limit of 2 per year.',
  },
  recommended_action: 'Deny claim for benefit exhaustion; refer to periodicity schedule.',
};

const TC_I_004_INPUT = {
  format: 'X12 EDI',
  metadata: { sender: 'HOSP_SENDER', receiver: 'VA_RECEIVER' },
  claim: {
    services: [{ proc_code: '0121', charge: '12000.00', units: '1' }],
    attachments: [
      {
        evidence_type: 'Receipt/Invoice',
        transmission_method: 'Electronic',
        control_number: 'REC-HOSP-55',
      },
    ],
    billing_provider: 'CITY HOSPITAL',
    patient_name: 'MAX VETERAN',
    id: 'TC-I-004',
    total_charge: '12000.00',
  },
};

const TC_I_004_OUTPUT_SPECIALTY = {
  agent_metadata: {
    agent_name: 'Specialty Alignment Validation Agent (SAVA-07)',
    execution_time: '128ms',
  },
  determination: { flag: 'STOP_PAY', confidence_score: 0.98, risk_tier: 'High' },
  calculation_disclosure: {
    original_billed_amount: 12000.0,
    payout_calculation: '$0.00',
    savings_realized: 12000.0,
    logic_formula:
      'IF (Procedure_Code NOT IN Allowed_Specialty_Map) THEN Result = Flag_Violation',
  },
  logic_transparency_explainability: {
    finding: 'Scope of Practice Violation: Pattern 7 detected.',
    evidence_data: {
      provider_taxonomy: '2084P0800X',
      billed_codes: ['0121'],
      verification_source: 'NUCC Taxonomy Code Set',
    },
    reasoning:
      'The provider (Taxonomy: 2084P0800X) billed for procedure 0121, which is outside the authorized CPT mapping for their specialty.',
  },
  recommended_action:
    'Refer to Credentialing Office for scope of practice audit.',
};

const TC_P_004_INPUT = {
  format: 'X12 EDI',
  metadata: { sender: 'SENDERID', receiver: 'VA_RECEIVER' },
  claim: {
    services: [{ proc_code: 'HC:J3490', charge: '500.00', units: '50' }],
    attachments: [
      {
        evidence_type: 'Clinical Notes (PDF)',
        transmission_method: 'Electronic',
        control_number: 'AC-NOTES-99',
      },
    ],
    billing_provider: 'SPEC CLINIC',
    patient_name: 'JANE DOE',
    id: 'TC-P-004',
    total_charge: '500.00',
  },
};

const TC_P_004_OUTPUT = {
  agent_metadata: {
    agent_name: 'NOC Narrative Validation Agent (NNVA-08)',
    execution_time: '124ms',
  },
  determination: { flag: 'STOP_PAY', confidence_score: 0.96, risk_tier: 'High' },
  calculation_disclosure: {
    original_billed_amount: 500.0,
    payout_calculation: '$0.00',
    savings_realized: 500.0,
    logic_formula: 'IF (NOC_Code_Used AND True_Code_Exists) THEN Result = STOP_PAY',
  },
  logic_transparency_explainability: {
    finding: 'Pattern 8 Violation: Use of NOC code when True Code exists.',
    evidence_data: {
      detected_noc_codes: ['J3490'],
      narrative_provided: false,
      mapping_found: true,
    },
    reasoning:
      'Provider used NOC code J3490 for a service where a specific HCPCS code (J2182) is available in the CMS ASP file.',
  },
  recommended_action:
    'Deny claim for incorrect coding; request resubmission with specific HCPCS code.',
};

const TC_D_002_OUTPUT_DEMO = {
  agent_metadata: {
    agent_name: 'Demographic Validation Agent (DVA-11)',
  },
  determination: { flag: 'STOP_PAY', confidence_score: 1.0, risk_tier: 'High' },
  logic_transparency_explainability: {
    finding: 'Violation: Age exceeds limit for D0145.',
    evidence_data: { gender: 'M', age: 75, flagged_codes: ['D0145'] },
    reasoning: 'Pediatric code D0145 billed for a 75-year-old patient.',
  },
};

const TC_N_002_INPUT = {
  format: 'NCPDP Pharmacy',
  claim: {
    id: 'ID      20',
    billing_provider: 'Pharmacy Provider',
    services: [{ proc_code: 'BRAND', charge: '45000.00', units: '1' }],
    total_charge: '45000.00',
  },
};

const TC_N_002_OUTPUT = {
  agent_metadata: {
    agent_name: 'Nomenclature Shift Validation Agent (NSVA-12)',
  },
  determination: { flag: 'STOP_PAY', confidence_score: 0.92, risk_tier: 'High' },
  calculation_disclosure: {
    original_billed_amount: 45000.0,
    payout_calculation: '$0.00',
    logic_formula:
      'IF (Current_Code == Risky_Shift AND Shift_Velocity > 50%) THEN Result = STOP_PAY',
  },
  logic_transparency_explainability: {
    finding: 'Pattern 12 Violation: Tactical Nomenclature Shifting Detected.',
    evidence_data: {
      detected_shift_code: ['BRAND'],
      current_shift_velocity: 0.7,
    },
    reasoning:
      'Provider has shifted to BRAND for the Cataract/Ocular/Pharmacy pool. Current Shift Velocity (0.7) exceeds the 50% threshold.',
  },
};

// ── Agent definitions registry ──────────────────────────

const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: 'a01',
    name: 'Upcoding and Complexity Inflation Agent (UCIA-01)',
    shortName: 'Upcoding Detection',
    pattern: 'Pattern 1',
    description:
      'Detects E/M code complexity inflation and clinical incongruity. Compares provider billing patterns against peer benchmarks, checking for distribution drift >30% and diagnosis-procedure mismatches.',
    logicFormula:
      'Payment = (Work_RVU * GPCI_w + PE_RVU * GPCI_pe + MP_RVU * GPCI_mp) * CF',
    testCases: [
      {
        id: 'tc-p-002',
        label: 'TC-P-002: E/M Upcoding (99215)',
        format: '837P Professional',
        input: TC_P_002_INPUT,
        output: TC_P_002_OUTPUT,
        isViolation: true,
      },
    ],
  },
  {
    id: 'a02',
    name: 'NCCI Bundle Validation Agent (NBVA-04)',
    shortName: 'Unbundling Detection',
    pattern: 'Pattern 2',
    description:
      'Detects NCCI Procedure-to-Procedure (PTP) bundle violations. Identifies when providers bill separately for procedures that should be bundled under a single comprehensive code.',
    logicFormula: 'IF (Col_2_Code AND Col_1_Code PRESENT) THEN Result = Deny_Col_2',
    testCases: [
      {
        id: 'tc-p-003',
        label: 'TC-P-003: Unbundling (11400 + 12001:59)',
        format: '837P Professional',
        input: TC_P_003_INPUT,
        output: TC_P_003_OUTPUT,
        isViolation: true,
      },
    ],
  },
  {
    id: 'a03',
    name: 'Longitudinal Volume Validation Agent (LVVA-03)',
    shortName: 'Volume Outlier',
    pattern: 'Pattern 3',
    description:
      'Detects physically impossible billing volumes and robotic upload activity. Flags providers billing >24 hours in a 24-hour window or submitting >500 claims per minute.',
    logicFormula:
      'IF (Daily_Hours > 24 OR Velocity > Threshold) THEN Result = STOP_PAY',
    testCases: [
      {
        id: 'tc-i-001',
        label: 'TC-I-001: Volume Outlier (32.5h in 24h)',
        format: '837I Institutional',
        input: TC_I_001_INPUT,
        output: TC_I_001_OUTPUT_VOLUME,
        isViolation: true,
      },
    ],
  },
  {
    id: 'a04',
    name: 'Modifier Intensity Validation Agent (MIVA-04)',
    shortName: 'Modifier Abuse',
    pattern: 'Pattern 4',
    description:
      'Detects overuse of modifiers (59, 25, 22) to bypass automated edits. Compares provider modifier intensity scores against specialty norms.',
    logicFormula:
      'IF (Modifier_Intensity > Specialty_Norm) THEN Result = STOP_PAY',
    testCases: [
      {
        id: 'tc-p-003-mod',
        label: 'TC-P-003: Modifier 59 Abuse (80% vs 15% norm)',
        format: '837P Professional',
        input: TC_P_003_INPUT,
        output: TC_P_003_OUTPUT_MODIFIER,
        isViolation: true,
      },
    ],
  },
  {
    id: 'a05',
    name: 'MUE & Periodicity Validation Agent (MAA-05)',
    shortName: 'MUE Adjudication',
    pattern: 'Pattern 5',
    description:
      'Enforces Medically Unlikely Edits (MUEs) and frequency limits. Tracks veteran utilization history and applies MAI-based summation logic.',
    logicFormula: 'IF (Units + History > Limit) THEN Result = STOP_PAY',
    testCases: [
      {
        id: 'tc-mue-d1110',
        label: 'MUE: Dental Frequency Limit (D1110, 3rd cleaning)',
        format: '837D Dental',
        input: TC_MUE_INPUT,
        output: TC_MUE_OUTPUT,
        isViolation: true,
      },
    ],
  },
  {
    id: 'a07',
    name: 'Specialty Alignment Validation Agent (SAVA-07)',
    shortName: 'Specialty Alignment',
    pattern: 'Pattern 7',
    description:
      'Validates procedures against provider specialty using NUCC Taxonomy codes. Flags billing outside authorized CPT scope of practice.',
    logicFormula:
      'IF (Procedure_Code NOT IN Allowed_Specialty_Map) THEN Result = Flag_Violation',
    testCases: [
      {
        id: 'tc-i-004',
        label: 'TC-I-004: Scope Violation (0121 by Psychiatry)',
        format: '837I Institutional',
        input: TC_I_004_INPUT,
        output: TC_I_004_OUTPUT_SPECIALTY,
        isViolation: true,
      },
    ],
  },
  {
    id: 'a08',
    name: 'NOC Narrative Validation Agent (NNVA-08)',
    shortName: 'NOC Validation',
    pattern: 'Pattern 8',
    description:
      'Detects abuse of "Not Otherwise Classified" codes when specific HCPCS/CPT codes are available. Validates narrative descriptions in SV101-7.',
    logicFormula:
      'IF (NOC_Code_Used AND True_Code_Exists) THEN Result = STOP_PAY',
    testCases: [
      {
        id: 'tc-p-004',
        label: 'TC-P-004: NOC Abuse (J3490 vs J2182)',
        format: '837P Professional',
        input: TC_P_004_INPUT,
        output: TC_P_004_OUTPUT,
        isViolation: true,
      },
    ],
  },
  {
    id: 'a11',
    name: 'Demographic Validation Agent (DVA-11)',
    shortName: 'Demographic Validation',
    pattern: 'Pattern 11',
    description:
      'Checks gender/age-procedure consistency. Detects biological and developmental inconsistencies with transgender bypass mechanism (Modifier KX / Condition Code 45).',
    logicFormula:
      'IF (Gender/Age Mismatch AND No Bypass) THEN Result = STOP_PAY',
    testCases: [
      {
        id: 'tc-d-002-demo',
        label: 'TC-D-002: Age Violation (D0145 for 75yo)',
        format: '837D Dental',
        input: TC_D_002_INPUT,
        output: TC_D_002_OUTPUT_DEMO,
        isViolation: true,
      },
    ],
  },
  {
    id: 'a12',
    name: 'Nomenclature Shift Validation Agent (NSVA-12)',
    shortName: 'Nomenclature Shift',
    pattern: 'Pattern 12',
    description:
      'Monitors tactical code-switching and product switching to evade audits. Tracks shift velocity from standard to high-risk code alternatives.',
    logicFormula:
      'IF (Current_Code == Risky_Shift AND Shift_Velocity > 50%) THEN Result = STOP_PAY',
    testCases: [
      {
        id: 'tc-n-002',
        label: 'TC-N-002: Product Switching (BRAND $45k)',
        format: 'NCPDP Pharmacy',
        input: TC_N_002_INPUT,
        output: TC_N_002_OUTPUT,
        isViolation: true,
      },
    ],
  },
];

// ── JSON Viewer sub-component ──────────────────────────

const JsonViewer: React.FC<{ data: Record<string, unknown>; title: string; bgColor: string }> = ({
  data,
  title,
  bgColor,
}) => (
  <Box sx={{ flex: 1, minWidth: 0 }}>
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        color: '#FFFFFF',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        display: 'block',
        mb: 0.5,
      }}
    >
      {title}
    </Typography>
    <Paper
      sx={{
        backgroundColor: bgColor,
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 1,
        p: 1.5,
        maxHeight: 360,
        overflow: 'auto',
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: 3,
        },
      }}
    >
      <pre
        style={{
          margin: 0,
          fontSize: 11,
          fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </Paper>
  </Box>
);

// ── Side-by-side comparison modal ──────────────────────────

const ComparisonView: React.FC<{
  testCase: TestCaseDefinition;
  onClose: () => void;
}> = ({ testCase, onClose }) => (
  <Box
    sx={{
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 2,
      border: '1px solid rgba(255,255,255,0.15)',
      p: 2,
      mb: 2,
    }}
  >
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CompareArrowsIcon sx={{ color: '#02BFE7', fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
          {testCase.label}
        </Typography>
        <Chip
          label={testCase.format}
          size="small"
          sx={{
            backgroundColor: 'rgba(2, 191, 231, 0.15)',
            color: '#02BFE7',
            fontSize: '0.65rem',
            height: 22,
          }}
        />
      </Box>
      <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>

    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <JsonViewer data={testCase.input} title="Original Input (Raw Claim)" bgColor="rgba(17, 46, 81, 0.8)" />
      </Grid>
      <Grid item xs={12} md={6}>
        <JsonViewer data={testCase.output} title="Parsed Agent Output" bgColor="rgba(46, 20, 20, 0.6)" />
      </Grid>
    </Grid>
  </Box>
);

// ── Agent Card ──────────────────────────

const AgentCard: React.FC<{ agent: AgentDefinition }> = ({ agent }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeComparison, setActiveComparison] = useState<string | null>(null);

  return (
    <Card
      sx={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 2,
        mb: 1.5,
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: 'rgba(2, 191, 231, 0.3)' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SecurityIcon sx={{ color: '#02BFE7', fontSize: 20 }} />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                {agent.shortName}
              </Typography>
              <Chip
                label={agent.pattern}
                size="small"
                sx={{
                  backgroundColor: 'rgba(2, 191, 231, 0.15)',
                  color: '#02BFE7',
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  height: 20,
                }}
              />
              <Chip
                label={`${agent.testCases.length} case${agent.testCases.length > 1 ? 's' : ''}`}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.6rem',
                  height: 20,
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>
              {agent.name}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.4)' }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <CardContent sx={{ pt: 0, pb: 2 }}>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 1.5 }} />

          {/* Description */}
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mb: 1, lineHeight: 1.6 }}
          >
            {agent.description}
          </Typography>

          {/* Logic Formula */}
          <Box
            sx={{
              backgroundColor: 'rgba(2, 191, 231, 0.08)',
              border: '1px solid rgba(2, 191, 231, 0.2)',
              borderRadius: 1,
              px: 1.5,
              py: 0.75,
              mb: 1.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: '#02BFE7',
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: '0.7rem',
              }}
            >
              {agent.logicFormula}
            </Typography>
          </Box>

          {/* Test Cases */}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              display: 'block',
              mb: 1,
            }}
          >
            Test Cases
          </Typography>

          {agent.testCases.map((tc) => (
            <Box key={tc.id}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 0.75,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tc.isViolation ? (
                    <WarningAmberIcon sx={{ color: '#E31C3D', fontSize: 16 }} />
                  ) : (
                    <CheckCircleOutlineIcon sx={{ color: '#2E8540', fontSize: 16 }} />
                  )}
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                    {tc.label}
                  </Typography>
                  <Chip
                    label={tc.isViolation ? 'VIOLATION' : 'PASS'}
                    size="small"
                    sx={{
                      backgroundColor: tc.isViolation
                        ? 'rgba(227, 28, 61, 0.15)'
                        : 'rgba(46, 133, 64, 0.15)',
                      color: tc.isViolation ? '#E31C3D' : '#2E8540',
                      fontWeight: 700,
                      fontSize: '0.6rem',
                      height: 18,
                    }}
                  />
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CompareArrowsIcon sx={{ fontSize: 14 }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveComparison(activeComparison === tc.id ? null : tc.id);
                  }}
                  sx={{
                    color: activeComparison === tc.id ? '#112E51' : '#02BFE7',
                    borderColor: activeComparison === tc.id ? '#02BFE7' : 'rgba(2, 191, 231, 0.4)',
                    backgroundColor: activeComparison === tc.id ? '#02BFE7' : 'transparent',
                    textTransform: 'none',
                    fontSize: '0.7rem',
                    py: 0.25,
                    px: 1,
                    '&:hover': {
                      borderColor: '#02BFE7',
                      backgroundColor: activeComparison === tc.id
                        ? '#02BFE7'
                        : 'rgba(2, 191, 231, 0.08)',
                    },
                  }}
                >
                  {activeComparison === tc.id ? 'Hide' : 'Compare'}
                </Button>
              </Box>

              {activeComparison === tc.id && (
                <ComparisonView
                  testCase={tc}
                  onClose={() => setActiveComparison(null)}
                />
              )}
            </Box>
          ))}
        </CardContent>
      </Collapse>
    </Card>
  );
};

// ── Main Panel ──────────────────────────

const DataNormalizationPanel: React.FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="body2"
          sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, mb: 1.5 }}
        >
          The Data Normalization stage parses and validates claims through 9 specialized fraud
          detection agents. Each agent applies pattern-specific logic to identify anomalies,
          violations, and suspicious billing activity. Click on any agent below to explore its
          detection logic and test case results.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Chip
            label={`${AGENT_DEFINITIONS.length} Detection Agents`}
            size="small"
            sx={{
              backgroundColor: 'rgba(2, 191, 231, 0.15)',
              color: '#02BFE7',
              fontWeight: 600,
            }}
          />
          <Chip
            label={`${AGENT_DEFINITIONS.reduce((acc, a) => acc + a.testCases.length, 0)} Test Cases`}
            size="small"
            sx={{
              backgroundColor: 'rgba(46, 133, 64, 0.15)',
              color: '#2E8540',
              fontWeight: 600,
            }}
          />
          <Chip
            label="Patterns 1-12"
            size="small"
            sx={{
              backgroundColor: 'rgba(227, 28, 61, 0.12)',
              color: '#E31C3D',
              fontWeight: 600,
            }}
          />
        </Box>
      </Box>

      {AGENT_DEFINITIONS.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </Box>
  );
};

export default DataNormalizationPanel;
