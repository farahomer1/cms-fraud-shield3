// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { keyframes } from '@mui/system';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShieldIcon from '@mui/icons-material/Shield';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GavelIcon from '@mui/icons-material/Gavel';
import SecurityIcon from '@mui/icons-material/Security';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

// Keyframe animations for cyber-threat visualization
const scanline = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
`;

const pulseShield = keyframes`
  0% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(46, 133, 64, 0.4)); }
  50% { transform: scale(1.08); filter: drop-shadow(0 0 15px rgba(46, 133, 64, 0.8)); }
  100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(46, 133, 64, 0.4)); }
`;

const slideInClaim = keyframes`
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
`;

interface DMEScenario {
  id: string;
  name: string;
  hcpcs: string;
  icd10: string;
  billingAmount: number;
  specialistCode: string;
  specialty: string;
  ringSize: number;
  estLeakAnnual: string;
}

const DME_SCENARIOS: DMEScenario[] = [
  {
    id: 'catheter',
    name: 'The $400M Catheter Phantom Billing Syndicate',
    hcpcs: 'A4351 / A4352 (Urological Catheters)',
    icd10: 'N39.0 (Urinary Tract Infection)',
    billingAmount: 1500.00,
    specialistCode: 'LCD L33803 Standard Necessity Cap',
    specialty: 'Urologist / Clinical Nephrologist',
    ringSize: 15,
    estLeakAnnual: '$400,000,000.00',
  },
  {
    id: 'brace',
    name: 'Orthopedic Knee Brace Syndicate',
    hcpcs: 'L1833 / L1843 (Knee Orthoses)',
    icd10: 'M17.9 (Osteoarthritis of Knee)',
    billingAmount: 799.00,
    specialistCode: 'CPT-99214 + Ortho/Surgery consult',
    specialty: 'Orthopedic Surgeon / Physiatrist',
    ringSize: 240,
    estLeakAnnual: '$42,500,000.00',
  },
  {
    id: 'oxygen',
    name: 'COPD Oxygen Concentrator Monopoly',
    hcpcs: 'E1390 (Oxygen Concentrator)',
    icd10: 'J44.9 (COPD, Unspecified)',
    billingAmount: 2100.00,
    specialistCode: 'CPT-94060 + Pulmonology consult',
    specialty: 'Pulmonologist',
    ringSize: 185,
    estLeakAnnual: '$65,000,000.00',
  },
  {
    id: 'cpap',
    name: 'Sleep Apnea CPAP Backdoor Ring',
    hcpcs: 'E0601 (CPAP Device)',
    icd10: 'G47.33 (Obstructive Sleep Apnea)',
    billingAmount: 1499.00,
    specialistCode: 'CPT-95806 + Sleep Study consult',
    specialty: 'Sleep Medicine Specialist',
    ringSize: 320,
    estLeakAnnual: '$34,500,000.00',
  },
];

export const DMELoopholeSimulator: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('catheter');
  const [activeStep, setActiveTabStep] = useState<number>(0);
  const [simulationRunning, setSimulationRunning] = useState<boolean>(false);
  const [policyEnforced, setPolicyEnforced] = useState<boolean>(false);
  const [claimsProcessed, setClaimsProcessed] = useState<number>(0);
  const [claimsBlocked, setClaimsBlocked] = useState<number>(0);
  const [savingsGenerated, setSavingsGenerated] = useState<number>(0);
  const [animatedClaims, setAnimatedClaims] = useState<Array<{ id: string; status: 'leak' | 'blocked'; amount: number; time: string }>>([]);

  // Appeals Sandbox State Hooks
  const [appealClaim, setAppealClaim] = useState<string>('vance');
  const [appealStatus, setAppealStatus] = useState<'idle' | 'analyzing' | 'level1_released' | 'level2_held'>('idle');
  const [appealLogs, setAppealLogs] = useState<string[]>([]);

  const handleSimulateAppeal = async () => {
    setAppealStatus('analyzing');
    setAppealLogs([
      '[INIT] Intercepting appeal submission...',
      '[CHECK] Retrieving transaction details and pre-payment hold records...',
    ]);

    try {
      const claimId = appealClaim === 'vance' ? 'claim_vance_01' : 'claim_jackson_01';
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${apiBase}/api/appeals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: claimId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Appeal service error');
      }

      setAppealLogs((prev) => [
        ...prev,
        `[AUDIT] Assessing Level 1: Electronic Tele-Health & Clinical Consult Validation...`,
        `[LATENCY] Under-3-seconds SLA compliance: Latency measured at ${data.latency_ms} ms.`,
        `[RESULT] ${data.msg}`,
        data.released 
          ? `[STATUS] LEVEL-1 RELEASE: Pre-payment hold auto-released with $0.00 administrative cost. CLAIM DISBURSED.` 
          : `[STATUS] LEVEL-1 REJECTED. ESCALATED: Case routed to Level 2 ALJ manual review queue. MBI protective lock active.`,
      ]);

      if (data.released) {
        setAppealStatus('level1_released');
      } else {
        setAppealStatus('level2_held');
      }
    } catch (err: any) {
      setAppealLogs((prev) => [
        ...prev,
        `[ERROR] Failed to execute electronic appeal: ${err.message}`,
      ]);
      setAppealStatus('idle');
    }
  };

  const scenario = DME_SCENARIOS.find((s) => s.id === selectedScenario) || DME_SCENARIOS[0];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (simulationRunning) {
      interval = setInterval(() => {
        setClaimsProcessed((prev) => {
          const next = prev + 1;
          const currentClaimId = `CLM-SIM-${1000 + next}`;
          const claimStatus = policyEnforced ? 'blocked' : 'leak';

          if (policyEnforced) {
            setClaimsBlocked((b) => b + 1);
            setSavingsGenerated((s) => s + scenario.billingAmount);
          }

          setAnimatedClaims((prevClaims) => [
            {
              id: currentClaimId,
              status: claimStatus,
              amount: scenario.billingAmount,
              time: new Date().toLocaleTimeString(),
            },
            ...prevClaims.slice(0, 4),
          ]);

          return next;
        });
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [simulationRunning, policyEnforced, scenario]);

  const handleStartSimulation = () => {
    setSimulationRunning(true);
    setClaimsProcessed(0);
    setClaimsBlocked(0);
    setSavingsGenerated(0);
    setAnimatedClaims([]);
    setActiveTabStep(1);
  };

  const handleTogglePolicy = () => {
    setPolicyEnforced((prev) => !prev);
    if (!policyEnforced && activeStep === 2) {
      setActiveTabStep(3);
    }
  };

  const handleReset = () => {
    setSimulationRunning(false);
    setPolicyEnforced(false);
    setClaimsProcessed(0);
    setClaimsBlocked(0);
    setSavingsGenerated(0);
    setAnimatedClaims([]);
    setActiveTabStep(0);
  };

  return (
    <Card variant="outlined" sx={{ p: 1, borderRadius: 2, border: '1px solid rgba(0, 63, 114, 0.15)', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
      <CardContent>
        {/* Banner */}
        <Box
          sx={{
            p: 2.5,
            mb: 4,
            borderRadius: 1.5,
            background: 'linear-gradient(135deg, #003F72 0%, #112E51 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '300%',
              backgroundImage: 'linear-gradient(rgba(0, 194, 255, 0.08) 1px, transparent 1px)',
              backgroundSize: '100% 4px',
              animation: `${scanline} 12s linear infinite`,
              pointerEvents: 'none',
            }}
          />
          <Stack direction="row" alignItems="center" gap={2} sx={{ position: 'relative', zIndex: 1 }}>
            <SecurityIcon sx={{ fontSize: 36, color: '#02BFE7' }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                DME Loophole &amp; Red-Teaming Simulator
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                Interactive demonstration of missing claims edits exploitation, agent-based backdoor detection, and pre-payment policy enforcement.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Grid container spacing={3.5}>
          {/* Controls & Stepper */}
          <Grid item xs={12} md={7}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#FAFBFB', mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>
                1. Select Fraud Scenario to Model
              </Typography>
              <Stack direction="row" gap={2} alignItems="center" sx={{ mb: 3, mt: 1.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Target DME Asset Class</InputLabel>
                  <Select
                    value={selectedScenario}
                    label="Target DME Asset Class"
                    onChange={(e) => {
                      setSelectedScenario(e.target.value);
                      handleReset();
                    }}
                    disabled={simulationRunning}
                  >
                    {DME_SCENARIOS.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name} ({s.hcpcs})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleStartSimulation}
                  disabled={simulationRunning}
                  startIcon={<PlayArrowIcon />}
                  sx={{ py: 1, minWidth: 160 }}
                >
                  Model Scenario
                </Button>
                {simulationRunning && (
                  <Button variant="outlined" color="error" onClick={handleReset}>
                    Reset Demo
                  </Button>
                )}
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 2.5 }}>
                2. Live Pipeline Replication Stepper
              </Typography>

              <Stepper activeStep={activeStep} orientation="vertical" sx={{ '& .MuiStepContent-root': { borderLeft: '2px solid rgba(0, 63, 114, 0.15)' } }}>
                <Step>
                  <StepLabel>
                    <Typography fontWeight="bold" sx={{ color: activeStep === 0 ? 'text.primary' : 'text.secondary' }}>
                      Ready to Inject
                    </Typography>
                  </StepLabel>
                </Step>
                <Step>
                  <StepLabel error={!policyEnforced && activeStep === 1}>
                    <Typography fontWeight="bold" sx={{ color: activeStep === 1 ? 'error.main' : 'text.secondary' }}>
                      Exploit Triggered: Fake Physician Prescriptions
                    </Typography>
                  </StepLabel>
                  <Box sx={{ pl: 4, py: 1 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Bad actors forge certificates of medical necessity (CMN) for <strong>{scenario.name}</strong> to bypass standard claims intake engines.
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ p: 1, bgcolor: '#FFF5F5', color: '#E31C3D', borderRadius: 1, border: '1px solid rgba(227, 28, 61, 0.15)', mb: 2 }}>
                      {scenario.id === 'catheter' ? (
                        <>
                          <strong>Loophole Exploit:</strong> CMS standard claim edits are passing because they do not verify daily urological necessity caps (Rule R-01), check for sudden billing surges on dormant providers (Rule R-02), or track multi-state MBI velocity (Rule R-03).
                        </>
                      ) : (
                        <>
                          <strong>Loophole Exploit:</strong> CMS standard claim edits are passing because they do not verify if there is a corresponding specialty consultation code (<strong>{scenario.specialistCode}</strong>) billed in the past 90 days.
                        </>
                      )}
                    </Typography>
                    {activeStep === 1 && (
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => setActiveTabStep(2)}
                        sx={{ textTransform: 'none', fontWeight: 'bold' }}
                      >
                        Trigger Agent Loophole Search
                      </Button>
                    )}
                  </Box>
                </Step>
                <Step>
                  <StepLabel icon={<GavelIcon sx={{ color: activeStep === 2 ? '#D97706' : undefined }} />}>
                    <Typography fontWeight="bold" sx={{ color: activeStep === 2 ? '#D97706' : 'text.secondary' }}>
                      {scenario.id === 'catheter' ? 'Adversarial Agents Flag Rules R-01 to R-04' : 'Red-Teaming Agents Raise Alert & Propose Rule #714'}
                    </Typography>
                  </StepLabel>
                  <Box sx={{ pl: 4, py: 1 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {scenario.id === 'catheter' ? (
                        <>
                          Our ethical-adversary detection agents executed a pre-payment audit on incoming catheter batches. Agents flagged <strong>Rule R-02 (Dormant Supplier Spike)</strong> on newly purchased NPIs and caught <strong>Rule R-03 (MBI Velocity)</strong> across multiple states!
                        </>
                      ) : (
                        <>
                          Our adversarial detection agents executed a retrospective audit across raw medical history files and caught a <strong>98.4% anomaly index</strong>. No matching face-to-face orthopedic/pulmonary consultation exists for these claims!
                        </>
                      )}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ p: 1, bgcolor: '#FEF3C7', color: '#B45309', borderRadius: 1, border: '1px solid rgba(217, 119, 6, 0.25)', mb: 2 }}>
                      {scenario.id === 'catheter' ? (
                        <>
                          <strong>Agent Solution:</strong> Enforce the Composite Pre-Payment Ruleset (R-01, R-02, R-03, R-04) to block bad claims in real-time.
                        </>
                      ) : (
                        <>
                          <strong>Agent Solution:</strong> Enforce Rule #714. Lock down the loophole pre-payment.
                        </>
                      )}
                    </Typography>
                    {activeStep === 2 && (
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={handleTogglePolicy}
                        startIcon={<ShieldIcon />}
                        sx={{ bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' }, textTransform: 'none', fontWeight: 'bold' }}
                      >
                        {scenario.id === 'catheter' ? 'Enforce Pre-Payment Rules (R-01 to R-04)' : 'Enforce Pre-Payment Policy (Rule #714)'}
                      </Button>
                    )}
                  </Box>
                </Step>
                <Step>
                  <StepLabel icon={<CheckCircleIcon sx={{ color: '#2E8540' }} />}>
                    <Typography fontWeight="bold" sx={{ color: '#2E8540' }}>
                      CMS Trust Fund Protected!
                    </Typography>
                  </StepLabel>
                  <Box sx={{ pl: 4, py: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {scenario.id === 'catheter' ? (
                        <>
                          The Composite Ruleset claims-edit filter is now active! Any new claims violating urological LCD caps (R-01), dormant spikes (R-02), or multi-state velocity (R-03) are instantly held. Agent 3 suspends bad NPIs in PECOS, and Agent 4 briefs the FBI & DOJ.
                        </>
                      ) : (
                        <>
                          Rule #714 claims-edit filter is now active at the pre-payment processing gate! Any new claims submitted without an authentic <strong>{scenario.specialty}</strong> consultation are instantly caught and blocked prior to disbursement.
                        </>
                      )}
                    </Typography>
                  </Box>
                </Step>
              </Stepper>
            </Paper>
          </Grid>

          {/* Interactive Visualizations & Live Stream */}
          <Grid item xs={12} md={5}>
            {/* Live Counter Panel */}
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
                bgcolor: '#FFFFFF',
                border: '1px solid rgba(0, 63, 114, 0.15)',
                mb: 3,
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
                Sandbox Stream Metrics
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1.5 }}>
                <Grid item xs={6}>
                  <Box sx={{ p: 2, bgcolor: '#F8F9FA', borderRadius: 1.5, border: '1px solid #ECEEEF' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="600">
                      Total Modeled Submissions
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main" sx={{ mt: 0.5 }}>
                      {claimsProcessed}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ p: 2, bgcolor: policyEnforced ? '#F0FDF4' : '#FFF5F5', borderRadius: 1.5, border: policyEnforced ? '1px solid rgba(46, 133, 64, 0.2)' : '1px solid rgba(227, 28, 61, 0.2)', transition: 'all 0.3s ease' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="600">
                      Claims Blocked / Intercepted
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color={policyEnforced ? 'success.main' : 'error.main'} sx={{ mt: 0.5 }}>
                      {claimsBlocked}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {policyEnforced && (
                <Box
                  sx={{
                    mt: 2.5,
                    p: 2,
                    bgcolor: 'rgba(46, 133, 64, 0.08)',
                    borderRadius: 1.5,
                    border: '1px solid rgba(46, 133, 64, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    animation: `${slideInClaim} 0.5s ease`,
                  }}
                >
                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <AttachMoneyIcon sx={{ color: '#2E8540', fontSize: 28 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">
                        Pre-Payment Protected Savings
                      </Typography>
                      <Typography variant="h5" fontWeight="bold" color="success.main">
                        ${savingsGenerated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Stack>
                  <TrendingDownIcon sx={{ color: '#2E8540', fontSize: 32, opacity: 0.7 }} />
                </Box>
              )}
            </Paper>

            {/* Live Streaming Log Visualizer */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: '#0B132B',
                color: '#4AF626',
                fontFamily: 'Courier New, monospace',
                fontSize: '0.8rem',
                minHeight: 280,
                position: 'relative',
              }}
            >
              <Box sx={{ borderBottom: '1px solid rgba(74, 246, 38, 0.2)', pb: 1, mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#4AF626', fontWeight: 'bold', fontFamily: 'inherit' }}>
                  Live Pre-Payment Ingestion Feed
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: simulationRunning ? '#4AF626' : '#9E9E9E', animation: simulationRunning ? `${pulseShield} 1.5s infinite` : 'none' }} />
                  <Typography variant="caption" sx={{ color: simulationRunning ? '#4AF626' : '#9E9E9E', fontFamily: 'inherit' }}>
                    {simulationRunning ? 'RECEIVING' : 'IDLE'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ minHeight: 180, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {!simulationRunning ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'rgba(74, 246, 38, 0.4)' }}>
                    [ Awaiting Scenario Modeling Initiation ]
                  </Box>
                ) : animatedClaims.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'rgba(74, 246, 38, 0.4)' }}>
                    <CircularProgress size={20} sx={{ color: '#4AF626', mr: 1.5 }} />
                    Injecting synthetic bad actor transaction streams...
                  </Box>
                ) : (
                  animatedClaims.map((c) => (
                    <Box
                      key={c.id}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        bgcolor: c.status === 'blocked' ? 'rgba(227, 28, 61, 0.15)' : 'rgba(74, 246, 38, 0.08)',
                        borderLeft: c.status === 'blocked' ? '3px solid #E31C3D' : '3px solid #4AF626',
                        animation: `${slideInClaim} 0.3s ease`,
                        color: c.status === 'blocked' ? '#E31C3D' : '#4AF626',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'inherit', display: 'block' }}>
                          {c.id} &middot; HCPCS {scenario.hcpcs.split(' ')[0]}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'inherit', opacity: 0.8 }}>
                          Amount: ${c.amount.toFixed(2)} &middot; {c.time}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {c.status === 'blocked' ? (
                          <>
                            <ErrorOutlineIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'inherit' }}>
                              {scenario.id === 'catheter' ? 'HELD (R-01/02/03)' : 'REJECTED (RULE-714)'}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon sx={{ fontSize: 14, color: '#4AF626' }} />
                            <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'inherit', color: '#4AF626' }}>
                              DISBURSED
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Policy Rules Matrix */}
        {scenario.id === 'catheter' && (
          <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#003F72', mb: 1 }}>
              Policy-Backed Ruleset & Simple Scoring Math (LCD L33803)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              The core CMS Fraud Shield engine implements a transparent, discrete scoring system to evaluate claims. Each violated pass/fail rule triggers exactly <strong>+1 Rule Hit</strong>. Accumulating 1 hit lands the claim in the <strong>Auditor Review Queue</strong>, while 2 or more corroborating hits trigger an <strong>Instant Pre-Payment Hold</strong>.
            </Typography>

            {/* Simple Scoring Guide Card */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1.5, bgcolor: '#F8F9FA', borderColor: 'rgba(0, 63, 114, 0.1)' }}>
              <Grid container spacing={2} justifyContent="space-around" alignItems="center">
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#2E8540' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>0 RULE HITS (SCORE 0.00)</Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ color: '#112E51' }}>Disburse to HIGLAS</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FDB81E' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>1 RULE HIT (SCORE 0.70)</Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ color: '#112E51' }}>Auditor Review Range</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#E31C3D' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>&ge;2 RULE HITS (SCORE 0.95)</Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ color: '#112E51' }}>Instant Pre-Payment Hold</Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            <Grid container spacing={2}>
              {[
                { id: 'R-01', name: 'Quantity Cap Exceeded', src: 'CMS LCD L33803', desc: 'Billed units > 30 per 30-day period (or billed amount > $1,500/mo) across NPIs.', wt: '+1 Rule Hit', action: 'Queue for Review' },
                { id: 'R-02', name: 'Dormant Supplier Burst', src: '2023–24 Shell Co anomalies', desc: 'Historical claims < $5,000 in prior 180 days, followed by rolling 14-day claims > $100,000.', wt: '+1 Rule Hit', action: 'Flag & Suspend NPI' },
                { id: 'R-03', name: 'MBI Velocity Anomaly', src: 'Multi-state identity theft logs', desc: 'Single MBI billed by >=3 distinct NPIs across >=2 state lines within rolling 48-hour window.', wt: '+1 Rule Hit', action: 'Lock MBI & Prepay Hold' },
                { id: 'R-04', name: 'High-Risk PECOS Enrollment', src: 'CMS PIM Audits', desc: 'NPI registered address matches CMRA commercial mailbox and ownership change within 90 days.', wt: '+1 Rule Hit', action: 'Add +1 Rule Hit' }
              ].map((r) => (
                <Grid item xs={12} sm={6} md={3} key={r.id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#F0F4F8',
                      borderColor: 'rgba(0, 63, 114, 0.15)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
                    }}
                  >
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Chip label={r.id} size="small" sx={{ bgcolor: '#003F72', color: 'white', fontWeight: 'bold', borderRadius: 1 }} />
                        <Typography variant="caption" fontWeight="bold" sx={{ color: '#003F72' }}>
                          {r.wt}
                        </Typography>
                      </Stack>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#112E51', mb: 0.5 }}>
                        {r.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
                        Source: {r.src}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                        {r.desc}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 1.5, borderTop: '1px solid rgba(0, 63, 114, 0.1)', pt: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#2E8540' }}>
                        Action: {r.action}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* Two-Tier Pre-Payment Appeals Panel */}
            <Divider sx={{ my: 4 }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#003F72', mb: 1 }}>
              Two-Tier Pre-Payment Appeal & False-Positive Tolerance Panel
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              In real-world operations, legitimate patients (e.g., severe neurogenic bladder) might exceed clinical caps. This sandbox models how our automated <strong>Level 1 Tele-Health Verification</strong> distinguishes legitimate appeals from fraud rings instantly with zero manual friction, maintaining a <strong>false-positive care-friction rate of &lt;1.5%</strong> (fewer than 1.5% of legitimate claims held or queued).
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={5}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%', bgcolor: '#FFFFFF', border: '1px solid rgba(0, 63, 114, 0.15)' }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 2 }}>
                    Appeal Simulation Controls
                  </Typography>

                  <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
                    <InputLabel>Select Held Claim to Appeal</InputLabel>
                    <Select
                      value={appealClaim}
                      label="Select Held Claim to Appeal"
                      onChange={(e) => {
                        setAppealClaim(e.target.value);
                        setAppealStatus('idle');
                        setAppealLogs([]);
                      }}
                    >
                      <MenuItem value="vance">
                        CLM-1001000224 - Eleanor Vance (Legitimate Patient: 45 catheters)
                      </MenuItem>
                      <MenuItem value="jackson">
                        CLM-1001000023 - William Jackson (Apex Syndicate: 1,500 catheters)
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSimulateAppeal}
                    disabled={appealStatus === 'analyzing'}
                    sx={{
                      bgcolor: '#003F72',
                      color: 'white',
                      fontWeight: 'bold',
                      textTransform: 'none',
                      py: 1,
                      '&:hover': { bgcolor: '#112E51' },
                    }}
                  >
                    {appealStatus === 'analyzing' ? 'Running Electronic Audit...' : 'Simulate Electronic Appeal'}
                  </Button>

                  <Box sx={{ mt: 3, p: 2, bgcolor: '#F8F9FA', borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                    <Typography variant="caption" fontWeight="bold" sx={{ color: '#003F72', display: 'block', mb: 1 }}>
                      OPERATIONAL ADVANTAGE
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                      <strong>Level 1 (Auto-Release)</strong> bypasses the standard 120-day CMS appeals backlog, clearing genuine patient needs in under 3 seconds using structured CPT-99214 telehealth consult cross-checks.
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={7}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: '#0B132B',
                    color: '#4AF626',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '0.8rem',
                    minHeight: 280,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Box sx={{ borderBottom: '1px solid rgba(74, 246, 38, 0.2)', pb: 1, mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#4AF626', fontWeight: 'bold', fontFamily: 'inherit' }}>
                        Appeal Verification Logs
                      </Typography>
                      {appealStatus === 'analyzing' && (
                        <CircularProgress size={12} sx={{ color: '#4AF626' }} />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {appealLogs.length === 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'rgba(74, 246, 38, 0.4)' }}>
                          [ Select a claim and run simulation to initiate automatic appeals auditing ]
                        </Box>
                      ) : (
                        appealLogs.map((log, idx) => (
                          <Typography key={idx} variant="caption" sx={{ fontFamily: 'inherit', display: 'block' }}>
                            {log}
                          </Typography>
                        ))
                      )}
                    </Box>
                  </Box>

                  {appealStatus !== 'idle' && appealStatus !== 'analyzing' && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: appealStatus === 'level1_released' ? 'rgba(46, 133, 64, 0.15)' : 'rgba(74, 246, 38, 0.08)',
                        border: appealStatus === 'level1_released' ? '1px solid rgba(46, 133, 64, 0.3)' : '1px solid rgba(227, 28, 61, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      {appealStatus === 'level1_released' ? (
                        <>
                          <CheckCircleIcon sx={{ color: '#4AF626', fontSize: 20 }} />
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#4AF626', display: 'block', fontFamily: 'inherit' }}>
                              LEVEL 1: AUTO-RELEASE PASSED
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#A3F5B0', fontFamily: 'inherit' }}>
                              Claim CLM-1001000224 released & disbursed.
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <>
                          <ErrorOutlineIcon sx={{ color: '#FF7D7D', fontSize: 20 }} />
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#FF7D7D', display: 'block', fontFamily: 'inherit' }}>
                              LEVEL 1 FAILED &rarr; ROUTED TO LEVEL 2 ALJ
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#FFC8C8', fontFamily: 'inherit' }}>
                              Claim remains HELD pending 120-day manual dispute.
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
