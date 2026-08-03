// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
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
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DownloadIcon from '@mui/icons-material/Download';
import GavelIcon from '@mui/icons-material/Gavel';
import ShieldIcon from '@mui/icons-material/Shield';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';

interface ReferralCase {
  id: string;
  title: string;
  target: string;
  location: string;
  loss: string;
  risk: 'critical' | 'high' | 'medium';
  status: 'draft' | 'approved' | 'submitted';
  dateCreated: string;
  type: string;
  summary: string;
  evidence: string[];
  entities: string[];
  recommendation: string;
}

const REFERRAL_CASES: ReferralCase[] = [
  {
    id: 'NFED-2026-001',
    title: 'Apex Durable Medical Supplies Coordinated Ring',
    target: 'Apex Durable Medical Supplies Inc. & Horizon Oxygen & Orthotics LLC',
    location: 'Miami, FL & Boston, MA',
    loss: '$1,215,800.00',
    risk: 'high',
    status: 'draft',
    dateCreated: '2026-07-28',
    type: 'Durable Medical Equipment (DME) Fraud Ring',
    summary: 'A coordinated billing network spanning Miami and Boston. The ring is leveraging automated claims submission portals to bulk-bill high-cost orthotic devices (knee braces, CPAP machines, and oxygen concentrators) on behalf of Medicare beneficiaries with zero record of corresponding physician specialist consultation visits.',
    evidence: [
      'Claims Edit Rule #714 Trigger: 6 core claims identified with missing pulmonology, sleep medicine, or orthopedic consultations.',
      'Trust Defender Anomaly Cluster: Coordinate submissions from commercial PO Box front addresses in high-intensity billing areas.',
      'Billing Spikes: Apex DME experienced a 450% billing increase inside a 14-day window for CPAP (E0601) and Knee Braces (L1833) at the exact cap limits ($1,499.00 and $799.00).',
    ],
    entities: [
      'Apex Durable Medical Supplies Inc. (NPI: 9876543210, Miami FL) - Suspended',
      'Horizon Oxygen & Orthotics LLC (NPI: 8765432109, Boston MA) - Under Review',
      'Coordinated beneficiary pool: 25 distinct beneficiaries targeted across Northeast and Southeast regions.',
    ],
    recommendation: 'Immediate referral to the DOJ National Fraud Enforcement Division (NFED) and FBI Healthcare Fraud Unit. Execute immediate payment hold on Apex Durable Medical Supplies Inc. and initiate site visit verification at the commercial mail storefronts.',
  },
  {
    id: 'NFED-2026-002',
    title: 'Malen Straw Owner Evasion Network',
    target: 'Coastal DME Supplier LLC, Summit Orthotics, & Apex Mobility Systems',
    location: 'Tampa, FL & Seattle, WA',
    loss: '$4,850,000.00',
    risk: 'critical',
    status: 'approved',
    dateCreated: '2026-07-20',
    type: 'Beneficial Owner Evasion (Excluded Operator)',
    summary: 'Noel\'s ADK Beneficial Ownership Engine unmasked a highly complex, multi-layered LLC network used to hide the identity of Victor A. Malen, an operator explicitly excluded from federal healthcare participation under OIG LEIE. The network routes straw owner stakes through recursive offshore layering in the Cayman Islands to obtain front-door CMS approvals.',
    evidence: [
      'Beneficial Ownership Resolution: ADK graph matching resolved entity ENT-COASTAL stakes back to Victor A. Malen (100% true control).',
      'Exclusionary Trigger Match: Multi-tier crosscheck with OIG LEIE and SAM.gov active exclusions.',
      'Straw Owner Mutation Evasion: Name mutated across corporate listings (Victor A. Malen -> Viktor A. Maylen) to evade deterministic screening checks.',
    ],
    entities: [
      'Coastal DME Supplier LLC (Applicant ID: ENT-COASTAL, Tampa FL)',
      'Summit Orthotics Systems Inc. (Parent LLC Wrapper, Cayman Islands)',
      'Victor A. Malen (Excluded Operator / True Controlling Interest)',
    ],
    recommendation: 'Recommend criminal prosecution under 42 U.S.C. § 1320a-7b for exclusion evasion and submission of fraudulent claims. Deny pending supplier applications and transfer ADK resolved ownership graph to FBI Chicago and Seattle Field Offices.',
  },
  {
    id: 'NFED-2026-003',
    title: 'Multi-MAC Overlapping Claims Ring',
    target: 'Northwest Care Partners & Western Medical Group',
    location: 'Seattle, WA & Portland, OR',
    loss: '$345,000.00',
    risk: 'medium',
    status: 'submitted',
    dateCreated: '2026-07-15',
    type: 'Overlapping Inpatient & DME Billings',
    summary: 'A geographic overlap ring submitting concurrent inpatient and outpatient DME service claims across separate Medicare Administrative Contractor (MAC) boundaries, designed to bypass localized single-MAC duplicate check audits.',
    evidence: [
      'Dual Jurisdiction Triggers: Overlapping claims submitted within 12 hours across MAC Region E and MAC Region F.',
      'Inpatient Double-Bill: DME wheelchair equipment billed while the beneficiaries were actively hospitalized in intensive care units.',
    ],
    entities: [
      'Northwest Care Partners (NPI: 7654321098, Seattle WA)',
      'Western Medical Group (NPI: 6543210987, Portland OR)',
    ],
    recommendation: 'Coordinate multi-MAC duplicate-check rule enforcement. Recoup overpayments and issue administrative warnings.',
  },
];

const NFEDReferralsPage: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<ReferralCase>(REFERRAL_CASES[0]);
  const [compileState, setCompileState] = useState<'idle' | 'gathering' | 'compiling' | 'exporting' | 'complete'>('idle');
  const [compileProgress, setCompileStateMessage] = useState('');

  const getRiskChipColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleExportBrief = () => {
    setCompileState('gathering');
    setCompileStateMessage('Gathering evidentiary databases and claims logs...');

    setTimeout(() => {
      setCompileState('compiling');
      setCompileStateMessage('Compiling ADK Beneficial Ownership resolved linkage networks...');
      
      setTimeout(() => {
        setCompileState('exporting');
        setCompileStateMessage('Merging files into consolidated investigative brief (DOJ/NFED Standard-V4)...');
        
        setTimeout(() => {
          setCompileState('complete');
          setCompileStateMessage('Brief compiled successfully!');
          
          // Generate the file content
          const briefText = `
================================================================================
OFFICIAL INVESTIGATIVE REFERRAL BRIEF - CONFIDENTIAL
SUBMITTED TO: DEPARTMENT OF JUSTICE - NATIONAL FRAUD ENFORCEMENT DIVISION (NFED)
CO-ROUTED TO: FEDERAL BUREAU OF INVESTIGATION (FBI) - HEALTHCARE FRAUD UNIT
================================================================================
CASE ID: ${selectedCase.id}
DATE GENERATED: ${new Date().toISOString().split('T')[0]}
CASE PRIORITY: ${selectedCase.risk.toUpperCase()}
FRAUD CLASSIFICATION: ${selectedCase.type}
ESTIMATED TRUST FUND LOSS: ${selectedCase.loss}

TARGET ENTITIES:
--------------------------------------------------------------------------------
${selectedCase.target}
LOCATION: ${selectedCase.location}

NARRATIVE INSIGHT & SUMMARY:
--------------------------------------------------------------------------------
${selectedCase.summary}

EVIDENTIARY TRACES & RED-TEAM FINDINGS:
--------------------------------------------------------------------------------
${selectedCase.evidence.map((item, index) => `${index + 1}. ${item}`).join('\n')}

RESOLVED COORDINATED TARGETS & ENTITIES:
--------------------------------------------------------------------------------
${selectedCase.entities.map((item, index) => `${index + 1}. ${item}`).join('\n')}

PROACTIVE RECOMMENDATIONS & RECOVERY DISPOSITION:
--------------------------------------------------------------------------------
${selectedCase.recommendation}

================================================================================
END OF BRIEF - SYSTEM SHIELD TRACE ID: AGY-SHIELD-2026-X9
================================================================================
`;
          // Trigger the browser text download
          const blob = new Blob([briefText], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Investigative_Brief_${selectedCase.id}.txt`;
          link.click();
          URL.revokeObjectURL(url);
          
          setTimeout(() => {
            setCompileState('idle');
          }, 3000);
        }, 1500);
      }, 1500);
    }, 1500);
  };

  return (
    <PageContainer
      title="Federal Law Enforcement Referrals"
      subtitle="Automated, high-fidelity investigative referrals mapping red-team evidence to the FBI and DOJ National Fraud Enforcement Division (NFED)."
    >
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Left Column - Referral Cases Queue */}
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: '#112E51', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon sx={{ fontSize: 20 }} /> ACTIVE REFERRAL QUEUE ({REFERRAL_CASES.length})
          </Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <List sx={{ p: 0 }}>
              {REFERRAL_CASES.map((item, index) => {
                const isSelected = selectedCase.id === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => setSelectedCase(item)}
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
                              {item.id}
                            </Typography>
                            <Chip
                              label={item.risk.toUpperCase()}
                              size="small"
                              color={getRiskChipColor(item.risk)}
                              sx={{ fontSize: '0.65rem', height: 16, fontWeight: 700, borderRadius: '4px' }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
                              {item.title}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                                <LocationOnIcon sx={{ fontSize: 12 }} /> {item.location}
                              </Typography>
                              <Typography variant="caption" fontWeight={700} sx={{ color: '#E31C3D' }}>
                                {item.loss}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItemButton>
                    {index < REFERRAL_CASES.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>
        </Grid>

        {/* Right Column - Official Briefing Viewer */}
        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', display: 'flex', alignItems: 'center', gap: 1 }}>
              <GavelIcon sx={{ fontSize: 20 }} /> DOJ / FBI HEALTHCARE FRAUD BRIEFING VISUALIZER
            </Typography>
            {compileState === 'idle' ? (
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                size="small"
                onClick={handleExportBrief}
                sx={{
                  bgcolor: '#003F72',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#002A54' },
                }}
              >
                Compile & Export Brief
              </Button>
            ) : (
              <Button variant="outlined" disabled size="small" startIcon={<CircularProgress size={16} sx={{ mr: 1 }} />}>
                Compiling...
              </Button>
            )}
          </Box>

          {/* Dynamic Compilation Progress Bar */}
          {compileState !== 'idle' && (
            <Alert
              severity={compileState === 'complete' ? 'success' : 'info'}
              sx={{ mb: 2, borderRadius: 2 }}
            >
              <Typography variant="body2" fontWeight={700}>
                {compileProgress}
              </Typography>
            </Alert>
          )}

          <Paper
            variant="outlined"
            sx={{
              p: 4,
              borderRadius: 2,
              bgcolor: '#FCFCFA',
              border: '1px solid #AEB0B5',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.02)',
              minHeight: 500,
              fontFamily: 'serif',
            }}
          >
            {/* Briefing Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 1.5, color: '#112E51', fontSize: '1.1rem' }}>
                UNITED STATES DEPARTMENT OF JUSTICE
              </Typography>
              <Typography variant="caption" fontWeight={600} sx={{ letterSpacing: 1.2, color: '#5B616B', display: 'block', mb: 0.5 }}>
                NATIONAL FRAUD ENFORCEMENT DIVISION (NFED)
              </Typography>
              <Typography variant="caption" sx={{ color: '#AEB0B5', display: 'block', mb: 2 }}>
                FEDERAL RECORD OF COORDINATED HEALTHCARE FRAUD PROBE
              </Typography>
              <Divider sx={{ borderColor: '#AEB0B5', borderStyle: 'double' }} />
            </Box>

            {/* Metadata Section */}
            <Grid container spacing={2} sx={{ mb: 3, fontFamily: 'sans-serif' }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>CASE REFERENCE</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#112E51' }}>{selectedCase.id}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>DATE GENERATED</Typography>
                <Typography variant="body2" fontWeight={700}>{selectedCase.dateCreated}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>FRAUD CLASSIFICATION</Typography>
                <Typography variant="body2" fontWeight={700}>{selectedCase.type}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>EST. TRUST FUND OUTFLOW</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#E31C3D' }}>{selectedCase.loss}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ borderColor: '#E0E0E0', mb: 3 }} />

            {/* Target Details */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ fontSize: 16 }} /> TARGET COMPONENT AND NPIs
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#212121', fontStyle: 'italic', pl: 2, borderLeft: '3px solid #AEB0B5' }}>
                {selectedCase.target}
              </Typography>
            </Box>

            {/* Narrative Summary */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShieldIcon sx={{ fontSize: 16 }} /> NARRATIVE SUMMARY OF INVESTIGATION
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#212121', textIndent: '1.5em' }}>
                {selectedCase.summary}
              </Typography>
            </Box>

            {/* Evidentiary Traces */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1, fontFamily: 'sans-serif' }}>
                EVIDENTIARY TRACES & SYSTEM FINDINGS
              </Typography>
              <List sx={{ pl: 2, py: 0 }}>
                {selectedCase.evidence.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '8px', fontSize: '0.875rem', lineHeight: 1.5, color: '#212121' }}>
                    {item}
                  </li>
                ))}
              </List>
            </Box>

            {/* Coordinated Entities */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1, fontFamily: 'sans-serif' }}>
                RESOLVED ENTITIES AND SUBSIDIARIES
              </Typography>
              <List sx={{ pl: 2, py: 0 }}>
                {selectedCase.entities.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '6px', fontSize: '0.875rem', color: '#212121' }}>
                    {item}
                  </li>
                ))}
              </List>
            </Box>

            {/* Recommendations */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1, fontFamily: 'sans-serif' }}>
                PROACTIVE RECOMMENDATION & RECOVERY HOLD
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#FFFDF6', borderColor: '#FDB81E', borderRadius: 1.5 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#212121', fontFamily: 'serif' }}>
                  {selectedCase.recommendation}
                </Typography>
              </Paper>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default NFEDReferralsPage;
