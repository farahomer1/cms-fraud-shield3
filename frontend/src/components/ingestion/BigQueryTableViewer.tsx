// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Chip,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import apiClient from '../../services/apiClient';

interface BigQueryTableViewerProps {
  batchId: string;
  tableName: string;
}

type RowData = Record<string, unknown>;

/**
 * Generates realistic demo/fallback data based on the table name.
 */
function generateDemoData(tableName: string): RowData[] {
  switch (tableName) {
    case 'claims':
      return [
        { claim_id: 'CLM-20240301-001', claim_number: 'CMS-2024-88431', beneficiary_name: 'James R. Patterson', provider_name: 'Midwest Medicare Care LLC', claim_type: 'medical', status: 'flagged', billing_amount: 14250.00, service_date: '2024-02-15', risk_level: 'high', diagnosis_codes: 'M54.5, G89.29' },
        { claim_id: 'CLM-20240301-002', claim_number: 'CMS-2024-88432', beneficiary_name: 'Maria T. Gonzalez', provider_name: 'Southeast Health Partners', claim_type: 'dme', status: 'approved', billing_amount: 3820.50, service_date: '2024-02-18', risk_level: 'low', diagnosis_codes: 'F43.10' },
        { claim_id: 'CLM-20240301-003', claim_number: 'CMS-2024-88433', beneficiary_name: 'Robert L. Washington', provider_name: 'National Medicare Services Inc', claim_type: 'medical', status: 'flagged', billing_amount: 28900.00, service_date: '2024-01-22', risk_level: 'high', diagnosis_codes: 'M79.3, R29.6' },
        { claim_id: 'CLM-20240301-004', claim_number: 'CMS-2024-88434', beneficiary_name: 'Susan K. Miller', provider_name: 'Pacific Coast Medical Group', claim_type: 'pharmacy', status: 'pending', billing_amount: 1540.00, service_date: '2024-03-01', risk_level: 'low', diagnosis_codes: 'K02.9' },
        { claim_id: 'CLM-20240301-005', claim_number: 'CMS-2024-88435', beneficiary_name: 'Thomas A. Chen', provider_name: 'Midwest Medicare Care LLC', claim_type: 'dme', status: 'flagged', billing_amount: 45200.00, service_date: '2024-02-10', risk_level: 'high', diagnosis_codes: 'F31.9, F41.1' },
        { claim_id: 'CLM-20240301-006', claim_number: 'CMS-2024-88436', beneficiary_name: 'Dorothy E. Brown', provider_name: 'Southeast Health Partners', claim_type: 'medical', status: 'approved', billing_amount: 7830.00, service_date: '2024-02-25', risk_level: 'medium', diagnosis_codes: 'J44.1' },
        { claim_id: 'CLM-20240301-007', claim_number: 'CMS-2024-88437', beneficiary_name: 'Michael D. Johnson', provider_name: 'Great Plains Medicare Clinic', claim_type: 'dme', status: 'processing', billing_amount: 5120.75, service_date: '2024-03-05', risk_level: 'medium', diagnosis_codes: 'G47.33, E11.9' },
      ];

    case 'agent_findings':
      return [
        { finding_id: 'FND-001', claim_number: 'CMS-2024-88431', agent_name: 'Threat Simulation "Trust Defender"', fraud_type: 'vulnerability_simulation', confidence_score: 0.94, recommendation: 'flag', evidence_summary: 'Inbound PECOS simulation flagged enrollment address matches with a high-risk mail-drop cluster.', processing_time_ms: 1240 },
        { finding_id: 'FND-002', claim_number: 'CMS-2024-88431', agent_name: 'Pre-Payment Claims Hold "Crush Fraud"', fraud_type: 'modifier_exploit', confidence_score: 0.87, recommendation: 'flag', evidence_summary: 'Prepayment audit flagged DME high-frequency burst billing pattern lacking the KX prior authorization modifier.', processing_time_ms: 890 },
        { finding_id: 'FND-003', claim_number: 'CMS-2024-88433', agent_name: 'Enrollment Audit & Unmasking "System Resilience"', fraud_type: 'unmask_shell_company', confidence_score: 0.91, recommendation: 'flag', evidence_summary: 'Ownership graph simulation identified multiple hidden shared-address links between clinics.', processing_time_ms: 1560 },
        { finding_id: 'FND-004', claim_number: 'CMS-2024-88435', agent_name: 'Overlapping Claims Check', fraud_type: 'overlapping_claims', confidence_score: 0.96, recommendation: 'flag', evidence_summary: 'Duplicate dme service dates across different providers; overlapping billing period detected.', processing_time_ms: 720 },
        { finding_id: 'FND-005', claim_number: 'CMS-2024-88432', agent_name: 'Rules Engine', fraud_type: 'none', confidence_score: 0.12, recommendation: 'pass', evidence_summary: 'All Medicare LCD/NCD rules passed successfully; billing within allowable thresholds.', processing_time_ms: 340 },
        { finding_id: 'FND-006', claim_number: 'CMS-2024-88436', agent_name: 'Data Validation Integrity', fraud_type: 'data_integrity', confidence_score: 0.62, recommendation: 'flag', evidence_summary: 'Field discrepancy: National Provider Identifier (NPI) structure validation mismatch.', processing_time_ms: 1100 },
      ];

    case 'decisions':
      return [
        { decision_id: 'DEC-001', claim_number: 'CMS-2024-88431', decision_type: 'denied', actor: 'Sarah Mitchell', actor_role: 'Senior Reviewer', rationale: 'Confirmed prepayment modifier exploit scheme; provider recommended for immediate suspension', savings_amount: 14250.00, created_at: '2024-03-05T14:22:00Z' },
        { decision_id: 'DEC-002', claim_number: 'CMS-2024-88432', decision_type: 'approved', actor: 'System Auto-Approve', actor_role: 'system', rationale: 'All automated agent checks and validations passed with low risk score', savings_amount: null, created_at: '2024-03-03T09:15:00Z' },
        { decision_id: 'DEC-003', claim_number: 'CMS-2024-88433', decision_type: 'denied', actor: 'Mark Rodriguez', actor_role: 'Claims Auditor', rationale: 'Enrollment unmasking confirmed shell company operator with deactivated NPI', savings_amount: 28900.00, created_at: '2024-03-06T11:45:00Z' },
        { decision_id: 'DEC-004', claim_number: 'CMS-2024-88436', decision_type: 'false_positive', actor: 'Sarah Mitchell', actor_role: 'Senior Reviewer', rationale: 'NPI structure warning resolved via updated NPPES registry entry', savings_amount: null, created_at: '2024-03-07T16:30:00Z' },
      ];

    case 'documents':
      return [
        { document_id: 'DOC-001', filename: 'claim_88431_837p.edi', file_type: 'edi_837p', file_size: 24576, parse_status: 'parsed', uploaded_at: '2024-03-01T08:00:00Z' },
        { document_id: 'DOC-002', filename: 'beneficiary_patterson_records.pdf', file_type: 'pdf', file_size: 1048576, parse_status: 'parsed', uploaded_at: '2024-03-01T08:00:00Z' },
        { document_id: 'DOC-003', filename: 'claim_88432_837p.edi', file_type: 'edi_837p', file_size: 18432, parse_status: 'parsed', uploaded_at: '2024-03-01T08:01:00Z' },
        { document_id: 'DOC-004', filename: 'gonzalez_cmn_form.pdf', file_type: 'pdf', file_size: 524288, parse_status: 'parsed', uploaded_at: '2024-03-01T08:01:00Z' },
        { document_id: 'DOC-005', filename: 'claim_88433_837i.edi', file_type: 'edi_837i', file_size: 32768, parse_status: 'parsed', uploaded_at: '2024-03-01T08:02:00Z' },
        { document_id: 'DOC-006', filename: 'washington_ehr_export.json', file_type: 'ehr', file_size: 2097152, parse_status: 'parsed', uploaded_at: '2024-03-01T08:02:00Z' },
        { document_id: 'DOC-007', filename: 'batch_manifest.pdf', file_type: 'pdf', file_size: 12288, parse_status: 'parsed', uploaded_at: '2024-03-01T08:00:00Z' },
      ];

    case "members":
      return [
        { beneficiary_id: 'BEN-001', name_display: 'James R. Patterson', ssn_last4: '4421', date_of_birth: '1968-07-14', vital_status: 'alive', medicare_part: 'Part B', risk_score: 1.2, enrollment_date: '2010-06-01' },
        { beneficiary_id: 'BEN-002', name_display: 'Maria T. Gonzalez', ssn_last4: '7783', date_of_birth: '1975-11-02', vital_status: 'alive', medicare_part: 'Part A', risk_score: 0.8, enrollment_date: '2015-03-15' },
        { beneficiary_id: 'BEN-003', name_display: 'Robert L. Washington', ssn_last4: '2259', date_of_birth: '1950-03-28', vital_status: 'alive', medicare_part: 'Part B', risk_score: 1.5, enrollment_date: '2005-01-10' },
        { beneficiary_id: 'BEN-004', name_display: 'Susan K. Miller', ssn_last4: '6614', date_of_birth: '1982-09-15', vital_status: 'alive', medicare_part: 'Part D', risk_score: 0.9, enrollment_date: '2018-08-01' },
        { beneficiary_id: 'BEN-005', name_display: 'Thomas A. Chen', ssn_last4: '3398', date_of_birth: '1945-12-01', vital_status: 'deceased', medicare_part: 'Part B', risk_score: 1.1, enrollment_date: '2000-04-20' },
        { beneficiary_id: 'BEN-006', name_display: 'Dorothy E. Brown', ssn_last4: '5547', date_of_birth: '1970-05-22', vital_status: 'alive', medicare_part: 'Part B', risk_score: 1.0, enrollment_date: '2012-10-01' },
      ];

    case 'providers':
      return [
        { provider_id: 'PRV-001', name: 'Midwest Medicare Care LLC', npi: '1234567890', provider_type: 'organization', specialty: 'General Practice', risk_score: 0.89, accreditation_status: 'suspended', total_claims: 847, flagged_claims: 312 },
        { provider_id: 'PRV-002', name: 'Southeast Health Partners', npi: '2345678901', provider_type: 'organization', specialty: 'Internal Medicine', risk_score: 0.23, accreditation_status: 'accredited', total_claims: 1204, flagged_claims: 18 },
        { provider_id: 'PRV-003', name: 'National Medicare Services Inc', npi: '3456789012', provider_type: 'organization', specialty: 'Durable Medical Equipment (DME)', risk_score: 0.76, accreditation_status: 'unaccredited', total_claims: 523, flagged_claims: 198 },
        { provider_id: 'PRV-004', name: 'Pacific Coast Medical Group', npi: '4567890123', provider_type: 'organization', specialty: 'Dental', risk_score: 0.15, accreditation_status: 'accredited', total_claims: 356, flagged_claims: 5 },
        { provider_id: 'PRV-005', name: 'Great Plains Medicare Clinic', npi: '5678901234', provider_type: 'organization', specialty: 'Multi-Specialty', risk_score: 0.31, accreditation_status: 'accredited', total_claims: 2145, flagged_claims: 42 },
      ];

    case 'audit_log':
      return [
        { log_id: 'AUD-001', timestamp: '2024-03-01T08:00:12Z', actor: 'System', actor_type: 'system', action_type: 'batch_event', claim_id: null, details: 'Batch ingestion started; 7 documents received' },
        { log_id: 'AUD-002', timestamp: '2024-03-01T08:05:34Z', actor: 'Rules Engine', actor_type: 'agent', action_type: 'finding', claim_id: 'CLM-20240301-001', details: 'Flagged: billing amount exceeds threshold ($14,250)' },
        { log_id: 'AUD-003', timestamp: '2024-03-01T08:06:12Z', actor: 'Threat Simulation "Trust Defender"', actor_type: 'agent', action_type: 'finding', claim_id: 'CLM-20240301-001', details: 'High confidence enrollment simulation anomaly detected (0.94)' },
        { log_id: 'AUD-004', timestamp: '2024-03-01T08:07:45Z', actor: 'Pre-Payment Claims Hold "Crush Fraud"', actor_type: 'agent', action_type: 'finding', claim_id: 'CLM-20240301-001', details: 'Prepayment modifier exploit hold triggered (0.87)' },
        { log_id: 'AUD-005', timestamp: '2024-03-03T09:15:00Z', actor: 'System Auto-Approve', actor_type: 'system', action_type: 'decision', claim_id: 'CLM-20240301-002', details: 'Auto-approved: all checks passed, low risk' },
        { log_id: 'AUD-006', timestamp: '2024-03-05T14:22:00Z', actor: 'Sarah Mitchell', actor_type: 'human', action_type: 'decision', claim_id: 'CLM-20240301-001', details: 'Denied: confirmed prepayment modifier exploit scheme' },
        { log_id: 'AUD-007', timestamp: '2024-03-06T11:45:00Z', actor: 'Mark Rodriguez', actor_type: 'human', action_type: 'decision', claim_id: 'CLM-20240301-003', details: 'Denied: PECOS enrollment shell company verification confirmed compromise' },
        { log_id: 'AUD-008', timestamp: '2024-03-07T16:30:00Z', actor: 'Sarah Mitchell', actor_type: 'human', action_type: 'decision', claim_id: 'CLM-20240301-006', details: 'False positive: NPI structure warning resolved via NPPES update' },
      ];

    default:
      return [];
  }
}

/**
 * Formats a cell value for display. Handles numbers, booleans, nulls, objects, and strings.
 */
function formatCellValue(value: unknown, columnKey: string): React.ReactNode {
  if (value === null || value === undefined) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
        --
      </Typography>
    );
  }

  // Render status/risk/recommendation as chips
  if (columnKey === 'status' || columnKey === 'risk_level' || columnKey === 'recommendation' || columnKey === 'decision_type' || columnKey === 'vital_status' || columnKey === 'parse_status' || columnKey === 'accreditation_status' || columnKey === 'actor_type') {
    const chipColorMap: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
      approved: 'success',
      pass: 'success',
      parsed: 'success',
      alive: 'success',
      accredited: 'success',
      low: 'success',
      denied: 'error',
      flag: 'error',
      flagged: 'error',
      high: 'error',
      error: 'error',
      suspended: 'error',
      deceased: 'error',
      medium: 'warning',
      pending: 'warning',
      processing: 'info',
      parsing: 'info',
      unaccredited: 'warning',
      false_positive: 'info',
      agent: 'info',
      human: 'default',
      system: 'default',
    };
    const strVal = String(value);
    return (
      <Chip
        label={strVal.replace(/_/g, ' ').toUpperCase()}
        color={chipColorMap[strVal] || 'default'}
        size="small"
        sx={{ fontWeight: 600, minWidth: 60 }}
      />
    );
  }

  // Format currency-like numbers
  if (columnKey.includes('amount') || columnKey.includes('billing')) {
    const num = Number(value);
    if (!isNaN(num)) {
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  // Format confidence scores as percentages
  if (columnKey.includes('confidence') || columnKey === 'risk_score') {
    const num = Number(value);
    if (!isNaN(num) && num >= 0 && num <= 1) {
      return `${(num * 100).toFixed(1)}%`;
    }
  }

  // Format file sizes
  if (columnKey === 'file_size') {
    const bytes = Number(value);
    if (!isNaN(bytes)) {
      if (bytes === 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const k = 1024;
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
      return `${size} ${units[i]}`;
    }
  }

  // Format processing time
  if (columnKey.includes('processing_time')) {
    return `${value} ms`;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Converts a column key to a human-readable header label.
 */
function formatColumnHeader(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bId\b/g, 'ID')
    .replace(/\bNpi\b/g, 'NPI')
    .replace(/\bSsn\b/g, 'SSN')
    .replace(/\bDbq\b/g, 'DBQ')
    .replace(/\bMs\b/g, 'ms');
}

const BigQueryTableViewer: React.FC<BigQueryTableViewerProps> = ({ batchId, tableName }) => {
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [usingDemoData, setUsingDemoData] = useState<boolean>(false);

  useEffect(() => {
    if (!batchId || !tableName) {
      setRows([]);
      return;
    }

    let cancelled = false;

    const fetchTableData = async () => {
      try {
        setLoading(true);
        setUsingDemoData(false);
        const response = await apiClient.get(`/batches/${batchId}/tables/${tableName}`);
        if (!cancelled) {
          const data = Array.isArray(response.data) ? response.data : response.data?.rows || [];
          setRows(data);
        }
      } catch {
        // API not available yet -- fall back to demo data
        if (!cancelled) {
          const demoData = generateDemoData(tableName);
          setRows(demoData);
          setUsingDemoData(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTableData();

    return () => {
      cancelled = true;
    };
  }, [batchId, tableName]);

  // Auto-detect columns from the first row of data
  const columns = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          py: 6,
          height: '100%',
          backgroundColor: '#FAFBFC',
          borderRadius: 1,
          border: '1px solid #E0E0E0',
        }}
      >
        <CircularProgress size={28} sx={{ color: '#003F72' }} />
        <Typography variant="body2" color="text.secondary">
          Loading {tableName.replace(/_/g, ' ')} data...
        </Typography>
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          py: 6,
          height: '100%',
          backgroundColor: '#FAFBFC',
          borderRadius: 1,
          border: '1px solid #E0E0E0',
        }}
      >
        <StorageIcon sx={{ fontSize: 40, color: '#B0BEC5' }} />
        <Typography variant="body1" color="text.secondary">
          No data available
        </Typography>
        <Typography variant="caption" color="text.disabled">
          The table "{tableName}" contains no rows for this batch.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {usingDemoData && (
        <Box
          sx={{
            px: 2,
            py: 0.75,
            backgroundColor: '#FFF3E0',
            borderRadius: '4px 4px 0 0',
            border: '1px solid #FFE0B2',
            borderBottom: 'none',
          }}
        >
          <Typography variant="caption" sx={{ color: '#E65100', fontWeight: 600 }}>
            Showing sample data -- BigQuery API endpoint not yet connected
          </Typography>
        </Box>
      )}
      <TableContainer
        component={Paper}
        sx={{
          flex: 1,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)',
          borderRadius: usingDemoData ? '0 0 4px 4px' : 1,
          overflow: 'auto',
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    fontWeight: 700,
                    backgroundColor: '#003F72',
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    fontSize: '0.75rem',
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                  }}
                >
                  {formatColumnHeader(col)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                hover
                sx={{
                  '&:nth-of-type(odd)': {
                    backgroundColor: 'rgba(0, 63, 114, 0.02)',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(0, 63, 114, 0.06)',
                  },
                }}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col}
                    sx={{
                      whiteSpace: 'nowrap',
                      maxWidth: 320,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {formatCellValue(row[col], col)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ mt: 0.5, px: 1 }}>
        <Typography variant="caption" color="text.disabled">
          {rows.length} row{rows.length !== 1 ? 's' : ''} &bull; {columns.length} column{columns.length !== 1 ? 's' : ''}
        </Typography>
      </Box>
    </Box>
  );
};

export default BigQueryTableViewer;
