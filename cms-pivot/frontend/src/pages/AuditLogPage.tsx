// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState, useCallback } from 'react';
import { Grid, Paper, Typography, Box, Divider, TextField, Autocomplete } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageContainer } from '../components/layout/PageContainer';
import AuditLogTable from '../components/audit/AuditLogTable';
import AuditActivityTimeline from '../components/audit/AuditActivityTimeline';
import AuditActionTypeBreakdown from '../components/audit/AuditActionTypeBreakdown';
import AuditActorActivity from '../components/audit/AuditActorActivity';
import AuditClaimCoverage from '../components/audit/AuditClaimCoverage';
import AuditDecisionOutcomes from '../components/audit/AuditDecisionOutcomes';
import AuditResponseTime from '../components/audit/AuditResponseTime';
import AuditClaimDetail from '../components/audit/AuditClaimDetail';
import InsightCard from '../components/analytics/InsightCard';

// Synthetic claim IDs for the filter dropdown (deterministic list)
const SYNTHETIC_CLAIM_IDS = [
  'CLM-1001000001', 'CLM-1001000002', 'CLM-1001000003', 'CLM-1001000004',
  'CLM-1001000005', 'CLM-1001000006', 'CLM-1001000007', 'CLM-1001000008',
  'CLM-1001000009', 'CLM-1001000010', 'CLM-1001000011', 'CLM-1001000012',
  'CLM-1001000013', 'CLM-1001000014', 'CLM-1001000015', 'CLM-1001000016',
  'CLM-1001000017', 'CLM-1001000018', 'CLM-1001000019', 'CLM-1001000020',
  'CLM-1001000021', 'CLM-1001000022', 'CLM-1001000023', 'CLM-1001000024',
  'CLM-1001000025', 'CLM-1001000026', 'CLM-1001000027', 'CLM-1001000028',
  'CLM-1001000029', 'CLM-1001000030',
];

const chartPaperSx = {
  p: 2.5,
  borderRadius: 2,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
};

const AuditLogPage: React.FC = () => {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const handleClaimSelect = useCallback((_event: React.SyntheticEvent, value: string | null) => {
    setSelectedClaimId(value);
  }, []);

  return (
    <PageContainer title="Audit Log" subtitle="Complete audit trail of all platform activity">
      {/* Claim Filter */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <SearchIcon sx={{ color: '#003F72', fontSize: 22 }} />
        <Typography variant="subtitle2" sx={{ color: '#003F72', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Filter by Claim
        </Typography>
        <Autocomplete
          value={selectedClaimId}
          onChange={handleClaimSelect}
          options={SYNTHETIC_CLAIM_IDS}
          size="small"
          sx={{ minWidth: 280 }}
          renderInput={(params) => (
            <TextField {...params} label="Select Claim ID" placeholder="Type to search..." />
          )}
        />
        {selectedClaimId && (
          <Typography variant="body2" sx={{ color: '#5B616B' }}>
            Showing audit details for {selectedClaimId}
          </Typography>
        )}
      </Box>

      {/* Per-Claim Detail Section (shown when a claim is selected) */}
      {selectedClaimId && (
        <Box sx={{ mb: 4 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <AuditClaimDetail claimId={selectedClaimId} />
          </Paper>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Row 1: Timeline (full width) */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <AuditActivityTimeline />
            <InsightCard chartType="audit_activity_timeline" />
          </Paper>
        </Grid>

        {/* Row 2: Action Type Breakdown + Actor Activity */}
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <AuditActionTypeBreakdown />
            <InsightCard chartType="audit_action_type" />
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <AuditActorActivity />
            <InsightCard chartType="audit_actor_activity" />
          </Paper>
        </Grid>

        {/* Row 3: Decision Outcomes + Response Time */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <AuditDecisionOutcomes />
            <InsightCard chartType="audit_decision_outcomes" />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <AuditResponseTime />
            <InsightCard chartType="audit_response_time" />
          </Paper>
        </Grid>

        {/* Row 4: Audit Coverage Metrics (full width) */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <AuditClaimCoverage />
            <InsightCard chartType="audit_claim_coverage" />
          </Paper>
        </Grid>
      </Grid>

      {/* Divider before log table */}
      <Box sx={{ mt: 4, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#112E51' }}>
            Audit Log Entries
          </Typography>
          <Typography variant="body2" sx={{ color: '#5B616B' }}>
            Searchable, filterable event log
          </Typography>
        </Box>
        <Divider sx={{ borderColor: '#AEB0B5', mb: 2 }} />
      </Box>

      <AuditLogTable />
    </PageContainer>
  );
};

export default AuditLogPage;
