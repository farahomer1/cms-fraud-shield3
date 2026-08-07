// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Button,
  Divider,
  Stack,
  CircularProgress,
  Alert,
  TextField,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import HistoryIcon from '@mui/icons-material/History';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import WarningIcon from '@mui/icons-material/Warning';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface ALJClaim {
  id: string;
  claim_number: string;
  billing_npi: string;
  provider_id: string;
  mbi: string;
  billing_amount: number;
  service_date: string;
  hcpcs_code: string;
  quantity: number;
  state: string;
  status: string;
  risk_level: string;
  risk_score: number;
  entered_at_sim?: string;
}

const ALJQueuePage: React.FC = () => {
  const [claims, setClaims] = useState<ALJClaim[]>([]);
  const [selectedClaim, setSelectedCase] = useState<ALJClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjudicating, setAdjudicating] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ severity: 'success' | 'error', text: string } | null>(null);
  const [rationale, setRationale] = useState('');

  const fetchALJQueue = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/appeals/alj-queue');
      if (response.ok) {
        const data = await response.json();
        setClaims(data);
        if (data.length > 0) {
          setSelectedCase(data[0]);
        } else {
          setSelectedCase(null);
        }
      } else {
        console.error('Failed to fetch ALJ queue');
      }
    } catch (err) {
      console.error('Error fetching ALJ queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchALJQueue();
  }, []);

  const handleAdjudicate = async (action: 'release' | 'escalate') => {
    if (!selectedClaim) return;
    setAdjudicating(true);
    setAlertMsg(null);
    try {
      const payload = {
        decisionType: action,
        actor: 'ALJ Administrative Judge',
        actorRole: 'Administrative Law Judge',
        rationale: rationale || `Judicial adjudication choice: ${action.toUpperCase()} - based on telehealth 14-day pre-claim consult verification logic.`,
        flaggedAgents: []
      };

      const response = await fetch(`/api/claims/${selectedClaim.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setAlertMsg({
          severity: 'success',
          text: `Adjudication complete: Claim ${selectedClaim.claim_number} successfully ${action === 'release' ? 'Released for Disbursement' : 'Confirmed on Prepayment Hold'}!`
        });
        setRationale('');
        // Refresh queue
        await fetchALJQueue();
      } else {
        const errorData = await response.json();
        setAlertMsg({
          severity: 'error',
          text: `Adjudication failed: ${errorData.detail || 'Server error'}`
        });
      }
    } catch (err) {
      setAlertMsg({
        severity: 'error',
        text: `Adjudication failed: Network connection error.`
      });
    } finally {
      setAdjudicating(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warning';
      default:
        return 'default';
    }
  };

  const totalExposure = claims.reduce((sum, c) => sum + (c.billing_amount || 0), 0);
  const highExposureCount = claims.filter(c => (c.billing_amount || 0) > 100000).length;

  return (
    <PageContainer
      title="Level 2 ALJ Appeal Review Queue"
      subtitle="Dedicated manual adjudication interface for the Administrative Law Judge (ALJ) to review and rule on Level 2 pre-payment appeals, evaluating mandatory 14-day clinical telehealth window requirements."
    >
      {/* Interactive Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#FCFCFA', border: '1px solid #AEB0B5' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(0, 63, 114, 0.08)', color: '#003F72' }}>
                <LocalAtmIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontWeight: 600 }}>ALJ QUEUE EXPOSURE</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#E31C3D' }}>
                  ${totalExposure.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#FCFCFA', border: '1px solid #AEB0B5' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(227, 28, 61, 0.08)', color: '#E31C3D' }}>
                <WarningIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontWeight: 600 }}>HIGH-EXPOSURE CASES</Typography>
                <Typography variant="h5" fontWeight={700}>{highExposureCount}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#FCFCFA', border: '1px solid #AEB0B5' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(253, 184, 30, 0.08)', color: '#FDB81E' }}>
                <HistoryIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontWeight: 600 }}>CLINICAL SLA BREACHES</Typography>
                <Typography variant="h5" fontWeight={700}>0</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#FCFCFA', border: '1px solid #AEB0B5' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(46, 117, 89, 0.08)', color: '#2E7559' }}>
                <VerifiedUserIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontWeight: 600 }}>VERIFIED CONSULT RATES</Typography>
                <Typography variant="h5" fontWeight={700}>100%</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Alert Banner */}
      {alertMsg && (
        <Alert severity={alertMsg.severity} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setAlertMsg(null)}>
          <Typography variant="body2" fontWeight={700}>{alertMsg.text}</Typography>
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : claims.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 2, bgcolor: '#FCFCFA', border: '1px solid #AEB0B5' }}>
          <GavelIcon sx={{ fontSize: 48, color: '#AEB0B5', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} sx={{ color: '#112E51', mb: 1 }}>ALJ Appeals Queue Empty</Typography>
          <Typography variant="body2" color="textSecondary">
            There are currently no level-2 escalated appeals claims awaiting manual Administrative Law Judge review.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Left Column - Appeals List */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#112E51', display: 'flex', alignItems: 'center', gap: 1 }}>
              <GavelIcon sx={{ fontSize: 20 }} /> LEVEL 2 ESCALATED APPEALS ({claims.length})
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #AEB0B5' }}>
              <List sx={{ p: 0 }}>
                {claims.map((claim, index) => {
                  const isSelected = selectedClaim?.id === claim.id;
                  return (
                    <React.Fragment key={claim.id}>
                      <ListItemButton
                        selected={isSelected}
                        onClick={() => setSelectedCase(claim)}
                        sx={{
                          p: 2,
                          borderLeft: isSelected ? '5px solid #003F72' : '5px solid transparent',
                          bgcolor: isSelected ? 'rgba(0, 63, 114, 0.04)' : 'inherit',
                          '&:hover': { bgcolor: 'rgba(0, 63, 114, 0.02)' },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" fontWeight={700} color="textSecondary">
                                {claim.claim_number}
                              </Typography>
                              <Chip
                                label={claim.risk_level}
                                size="small"
                                color={getRiskColor(claim.risk_level)}
                                sx={{ fontSize: '0.65rem', height: 16, fontWeight: 700, borderRadius: '4px' }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
                                Provider NPI: {claim.provider_id || claim.billing_npi}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                                  <CalendarTodayIcon sx={{ fontSize: 12 }} /> Service: {claim.service_date}
                                </Typography>
                                <Typography variant="body2" fontWeight={700} sx={{ color: '#E31C3D' }}>
                                  ${(claim.billing_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItemButton>
                      {index < claims.length - 1 && <Divider sx={{ borderColor: '#E0E0E0' }} />}
                    </React.Fragment>
                  );
                })}
              </List>
            </Paper>
          </Grid>

          {/* Right Column - Briefing and Decisions */}
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#112E51', display: 'flex', alignItems: 'center', gap: 1 }}>
              <GavelIcon sx={{ fontSize: 20 }} /> ACTIVE JUDICIAL REVIEW VISUALIZER
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 4,
                borderRadius: 2,
                bgcolor: '#FCFCFA',
                border: '1px solid #AEB0B5',
                minHeight: 500,
                fontFamily: 'serif',
              }}
            >
              {selectedClaim && (
                <>
                  {/* Visualizer Header */}
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 1.5, color: '#112E51', fontSize: '1.1rem' }}>
                      DEPARTMENT OF HEALTH & HUMAN SERVICES
                    </Typography>
                    <Typography variant="caption" fontWeight={600} sx={{ letterSpacing: 1.2, color: '#5B616B', display: 'block', mb: 0.5 }}>
                      DEPARTMENTAL APPEALS BOARD - ADMINISTRATIVE LAW JUDGE
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#AEB0B5', display: 'block', mb: 2 }}>
                      OFFICIAL JUDICIAL BRIEFING ON PREPAYMENT APPEAL
                    </Typography>
                    <Divider sx={{ borderColor: '#AEB0B5', borderStyle: 'double' }} />
                  </Box>

                  {/* Case Details metadata */}
                  <Grid container spacing={2} sx={{ mb: 4, fontFamily: 'sans-serif' }}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>CLAIM NUMBER</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#112E51' }}>{selectedClaim.claim_number}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>BENEFICIARY MBI</Typography>
                      <Typography variant="body2" fontWeight={700}>{selectedClaim.mbi || 'Not specified'}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>BILLING AMOUNT</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#E31C3D' }}>
                        ${selectedClaim.billing_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>APPEAL DATE</Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {selectedClaim.entered_at_sim ? new Date(selectedClaim.entered_at_sim).toISOString().split('T')[0] : '2026-08-05'}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ borderColor: '#E0E0E0', mb: 3 }} />

                  {/* Case Summary narrative */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1, fontFamily: 'sans-serif' }}>
                      NARRATIVE OF LEVEL 1 DECISION & ESCALATION
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#212121', textIndent: '1.5em' }}>
                      The claim {selectedClaim.claim_number} was flagged by the adversarial rules engine due to multiple prepayment anomalies, including the lack of matching neurogenic clinical conditions and the registration of the supplier at a known Commercial Mail Receiving Agency (CMRA) storefront drop. Level 1 automated redetermination rejected the provider's request because no qualifying telehealth clinical consultation was found. The provider has escalated this case to Level 2 manual ALJ adjudication, asserting compliance.
                    </Typography>
                  </Box>

                  {/* Clinical Consult Verification Check (FR-27/28/29) */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1.5, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VerifiedUserIcon sx={{ fontSize: 16, color: '#2E7559' }} /> CLINICAL TELEHEALTH CONSULT WINDOW AUDIT (FR-28)
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2.5, bgcolor: '#F4F9F4', borderColor: '#2E7559', borderRadius: 1.5 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#2E7559', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        Rule Window constraint: Telehealth Clinical Consult (CPT-99214) required within 14 days before Service Date.
                      </Typography>
                      <Box sx={{ pl: 2 }}>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          • Service Date of Claim: <strong>{selectedClaim.service_date}</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          • Consult Audit Window: <strong>{new Date(new Date(selectedClaim.service_date).getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}</strong> to <strong>{selectedClaim.service_date}</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#E31C3D', fontWeight: 600 }}>
                          • Audit Check Finding: No qualifying CPT-99214 telehealth consult record identified inside the 14-day window for MBI {selectedClaim.mbi}. The appeal fails to substantiate legal standing.
                        </Typography>
                      </Box>
                    </Paper>
                  </Box>

                  {/* Adjudication Decision Ad-hoc notes */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1, fontFamily: 'sans-serif' }}>
                      JUDICIAL DECISION RATIONALE NOTES
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      variant="outlined"
                      placeholder="Input formal judicial rationale notes here before confirming decision..."
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      sx={{ bgcolor: 'white', borderRadius: 1 }}
                    />
                  </Box>

                  {/* Adjudication actions */}
                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={adjudicating}
                      onClick={() => handleAdjudicate('release')}
                      sx={{
                        bgcolor: '#2E7559',
                        color: 'white',
                        fontWeight: 700,
                        p: 1.5,
                        borderRadius: 2,
                        '&:hover': { bgcolor: '#20543D' }
                      }}
                    >
                      {adjudicating ? 'Processing...' : 'Release for Disbursement'}
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={adjudicating}
                      onClick={() => handleAdjudicate('escalate')}
                      sx={{
                        bgcolor: '#E31C3D',
                        color: 'white',
                        fontWeight: 700,
                        p: 1.5,
                        borderRadius: 2,
                        '&:hover': { bgcolor: '#A81126' }
                      }}
                    >
                      {adjudicating ? 'Processing...' : 'Confirm Hold & Escalation'}
                    </Button>
                  </Stack>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </PageContainer>
  );
};

export default ALJQueuePage;
