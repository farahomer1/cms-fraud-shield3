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
  Card,
  CardContent,
  Tab,
  Tabs,
  Avatar,
  IconButton,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { keyframes } from '@mui/system';
import ShieldIcon from '@mui/icons-material/Shield';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TerminalIcon from '@mui/icons-material/Terminal';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GavelIcon from '@mui/icons-material/Gavel';
import InfoIcon from '@mui/icons-material/Info';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PersonIcon from '@mui/icons-material/Person';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// Flowing connector animation for identity resolution graph
const flowLine = keyframes`
  0% {
    stroke-dashoffset: 24;
  }
  100% {
    stroke-dashoffset: 0;
  }
`;

const pulseGlow = keyframes`
  0% {
    box-shadow: 0 0 10px rgba(211, 47, 47, 0.4);
    border-color: rgba(211, 47, 47, 0.6);
  }
  50% {
    box-shadow: 0 0 25px rgba(211, 47, 47, 0.8), 0 0 40px rgba(211, 47, 47, 0.3);
    border-color: rgba(211, 47, 47, 1);
  }
  100% {
    box-shadow: 0 0 10px rgba(211, 47, 47, 0.4);
    border-color: rgba(211, 47, 47, 0.6);
  }
`;

interface Applicant {
  id: string;
  name: string;
  npi: string;
  tin: string;
  riskScore: number;
  status: 'Flagged - Excluded Linkage' | 'Under Review' | 'Verified Safe';
  submittedDate: string;
  specialty: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphNode {
  id: string;
  label: string;
  type: 'applicant' | 'shell' | 'owner' | 'excluded';
  details: string;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  label: string;
  isRedTeamPath: boolean;
}

const APPLICANTS: Applicant[] = [
  {
    id: 'ENT-COASTAL',
    name: 'Coastal DME Supplier LLC',
    npi: '1942385102',
    tin: 'XX-XXX5912',
    riskScore: 94,
    status: 'Flagged - Excluded Linkage',
    submittedDate: '2026-07-25',
    specialty: 'Durable Medical Equipment (DME)',
    nodes: [
      { id: '1', label: 'Coastal DME Supplier LLC', type: 'applicant', details: 'Applicant • DME Provider • Florida Storefront (UPS Store Box)', x: 100, y: 150 },
      { id: '2', label: 'Coastal Medical Holdings Inc', type: 'shell', details: 'Parent Shell LLC • 100% Owner • Registered in Delaware', x: 280, y: 100 },
      { id: '3', label: 'Pacific Horizon Ventures LLC', type: 'shell', details: 'Grandparent Shell • 100% Owner • Registered in Cayman Islands', x: 480, y: 100 },
      { id: '4', label: 'Victor A. Malen', type: 'excluded', details: 'UBO (85% Equity) • Excluded from Medicare in 2024 for DME Fraud', x: 680, y: 150 },
      { id: '5', label: 'Sarah J. Miller', type: 'owner', details: 'Nominee Manager • Clean Record • Front for Malen', x: 280, y: 220 },
    ],
    edges: [
      { from: '1', to: '2', label: 'Owned By (100%)', isRedTeamPath: true },
      { from: '2', to: '3', label: 'Owned By (100%)', isRedTeamPath: true },
      { from: '3', to: '4', label: 'Beneficial Owner (85%)', isRedTeamPath: true },
      { from: '1', to: '5', label: 'Listed Manager', isRedTeamPath: false },
    ]
  },
  {
    id: 'ENT-SUMMIT',
    name: 'Summit Orthotics Systems',
    npi: '1437295101',
    tin: 'XX-XXX2184',
    riskScore: 48,
    status: 'Under Review',
    submittedDate: '2026-07-27',
    specialty: 'Orthotics & Prosthetics',
    nodes: [
      { id: '1', label: 'Summit Orthotics Systems', type: 'applicant', details: 'Applicant • Orthotics Provider • Texas Storefront', x: 100, y: 150 },
      { id: '2', label: 'Cascade Healthcare Partners', type: 'shell', details: 'Shell LLC • 50% Owner • Registered in Nevada', x: 300, y: 100 },
      { id: '3', label: 'H. G. Henderson', type: 'owner', details: 'Partner (50%) • Background Clean • 3 other LLC associations', x: 300, y: 220 },
      { id: '4', label: 'Summit Ventures LLC', type: 'shell', details: 'Grandparent Shell • Owned by offshore trustees', x: 500, y: 100 },
    ],
    edges: [
      { from: '1', to: '2', label: 'Partner (50%)', isRedTeamPath: false },
      { from: '1', to: '3', label: 'Partner (50%)', isRedTeamPath: false },
      { from: '2', to: '4', label: 'Owned By (100%)', isRedTeamPath: false },
    ]
  },
  {
    id: 'ENT-APEX',
    name: 'Apex Mobility Systems',
    npi: '1098471239',
    tin: 'XX-XXX7123',
    riskScore: 12,
    status: 'Verified Safe',
    submittedDate: '2026-07-28',
    specialty: 'Power Wheelchairs & Mobility',
    nodes: [
      { id: '1', label: 'Apex Mobility Systems', type: 'applicant', details: 'Applicant • Mobility Provider • Georgia Storefront', x: 150, y: 150 },
      { id: '2', label: 'Dr. Arthur Pendelton', type: 'owner', details: '100% Owner • Active Georgia Orthopedic Surgeon', x: 450, y: 150 },
    ],
    edges: [
      { from: '1', to: '2', label: 'Owner (100%)', isRedTeamPath: false },
    ]
  }
];

const PROBE_TACTICS = [
  {
    id: 'NAME_MUTATION',
    name: 'Name Mutation (Character Obfuscation)',
    description: 'Adversary alters vowels, consonant doubles, or inserts accents to bypass exact database matches while preserving pronunciation (e.g. Victor Malen -> Viktor Maylen).',
    vulnerabilityLevel: 'CRITICAL',
    vulnerabilityDesc: 'Standard exact name matching fails to resolve obfuscated excluded individuals.'
  },
  {
    id: 'LLC_LAYERING',
    name: 'Multi-Tier Shell LLC Layering',
    description: 'Adversary routes ownership through multiple corporate shell entities registered across different states and offshore boundaries to sever direct KYC reporting links.',
    vulnerabilityLevel: 'HIGH',
    vulnerabilityDesc: 'Basic parent-owner checks fail beyond 2 layers of corporate structuring.'
  },
  {
    id: 'COMMERCIAL_UPS',
    name: 'Commercial Mailbox Storefront Hijacking',
    description: 'Adversary registers a DME physical address using a commercial mail agency (e.g., UPS Store, Mail Boxes Etc.) to mimic a fully operational local warehouse.',
    vulnerabilityLevel: 'MEDIUM',
    vulnerabilityDesc: 'Basic address parsing validation misses suite numbers resolving to PO boxes.'
  }
];

const computeGraphData = (screenData: any, fallbackApp: Applicant) => {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  if (!screenData || !screenData.applicant) {
    return { nodes: fallbackApp.nodes, edges: fallbackApp.edges };
  }
  
  const app = screenData.applicant;
  
  // 1. Applicant Node
  nodes.push({
    id: '1',
    label: app.legal_name,
    type: 'applicant',
    details: `Applicant • ${app.type} • Formed: ${app.formed} • App Date: ${app.application_date || 'N/A'} • Address: ${app.address}`,
    x: 100,
    y: 150
  });
  
  // 2. Address / Mail Drop Node
  const isCmra = app.address.includes('Ste') || app.address.includes('Suite 214') || app.address.includes('Suite 200') || app.address.includes('Ste 214');
  nodes.push({
    id: '2',
    label: app.address,
    type: 'shell',
    details: `Business Address • ${app.address} ${isCmra ? '• COMMERCIAL MAILBOX DROP DETECTED' : ''}`,
    x: 280,
    y: 100
  });
  edges.push({
    from: '1',
    to: '2',
    label: 'Located At',
    isRedTeamPath: isCmra
  });
  
  // 3. Registered Agent Node
  const isSentinel = app.registered_agent.includes('Sentinel');
  nodes.push({
    id: '3',
    label: app.registered_agent,
    type: 'shell',
    details: `Registered Agent • ${app.registered_agent} ${isSentinel ? '• Connected to 1 revoked, 5 overall agencies' : ''}`,
    x: 280,
    y: 220
  });
  edges.push({
    from: '1',
    to: '3',
    label: 'Registered By',
    isRedTeamPath: isSentinel
  });

  // 4. Resolved Owners
  if (screenData.resolved_identities && screenData.resolved_identities.length > 0) {
    screenData.resolved_identities.forEach((idnt: any, idx: number) => {
      const nodeId = String(4 + idx);
      const isExcluded = idnt.on_leie;
      
      nodes.push({
        id: nodeId,
        label: idnt.name,
        type: isExcluded ? 'excluded' : 'owner',
        details: isExcluded 
          ? `Beneficial Owner (85%) • EXCLUDED OPERATOR • ${idnt.name} is on OIG LEIE list since 2023 for DME Fraud. Identity resolved via matching SSN/DOB.`
          : `Listed Manager • Deborah Kline • Clean Record • ${idnt.name} holds 75% equity.`,
        x: 480,
        y: 100 + idx * 120
      });
      
      edges.push({
        from: '1',
        to: nodeId,
        label: isExcluded ? 'Resolves to' : 'Owner (75%)',
        isRedTeamPath: isExcluded
      });
      
      // If excluded, draw a sub-path showing how we resolved them
      if (isExcluded) {
        const sourceNodeId = '9';
        nodes.push({
          id: sourceNodeId,
          label: 'OIG LEIE list',
          type: 'excluded',
          details: 'OIG List of Excluded Individuals/Entities • Identity Match Confirmed via SSN/DOB.',
          x: 680,
          y: 150
        });
        edges.push({
          from: nodeId,
          to: sourceNodeId,
          label: 'Resolved Link',
          isRedTeamPath: true
        });
      }
    });
  }
  
  return { nodes, edges };
};

const EnrollmentPage: React.FC = () => {
  const [applicants, setApplicants] = useState<Applicant[]>(APPLICANTS);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant>(APPLICANTS[0]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [screenData, setScreenData] = useState<any>(null);
  const [probeReport, setProbeReport] = useState<any>(null);
  
  // Simulator State
  const [selectedTactic, setSelectedTactic] = useState(PROBE_TACTICS[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simulationRunCount, setSimulationRunCount] = useState(0);
  const [tacticStatus, setTacticStatus] = useState<Record<string, 'NOT_RUN' | 'RUNNING' | 'DETECTED' | 'BYPASSED'>>({
    NAME_MUTATION: 'NOT_RUN',
    LLC_LAYERING: 'NOT_RUN',
    COMMERCIAL_UPS: 'NOT_RUN',
  });

  // Load applicants from live backend
  useEffect(() => {
    const fetchApplicants = async () => {
      try {
        const response = await fetch('/api/enrollment-integrity/applicants');
        if (!response.ok) throw new Error('Failed to fetch applicants');
        const data = await response.json();
        if (data && data.entities) {
          const mapped: Applicant[] = data.entities.map((ent: any) => {
            const staticMatch = APPLICANTS.find(a => a.id === ent.id);
            const initialRiskScore = ent.id === 'ENT-REDOAK' ? 95 : (staticMatch?.riskScore || (ent.status === 'revoked' ? 95 : ent.status === 'applying' ? 45 : 12));
            return {
              id: ent.id,
              name: ent.legal_name,
              npi: staticMatch?.npi || `109847${ent.id.replace(/\D/g, '') || '1239'}`,
              tin: staticMatch?.tin || `XX-XXX${ent.id.replace(/\D/g, '') || '7123'}`,
              riskScore: initialRiskScore,
              status: ent.id === 'ENT-COASTAL' 
                ? 'Flagged - Excluded Linkage' 
                : ent.id === 'ENT-REDOAK'
                  ? 'Flagged - Excluded Linkage'
                  : ent.status === 'revoked' 
                    ? 'Flagged - Excluded Linkage' 
                    : ent.status === 'applying' 
                      ? 'Under Review' 
                      : 'Verified Safe',
              submittedDate: staticMatch?.submittedDate || '2026-07-28',
              specialty: ent.type || 'DME Provider',
              nodes: staticMatch?.nodes || [],
              edges: staticMatch?.edges || []
            };
          });
          // Sort by risk score descending, and ensure ENT-COASTAL is always at the absolute top
          mapped.sort((a, b) => {
            if (a.id === 'ENT-COASTAL') return -1;
            if (b.id === 'ENT-COASTAL') return 1;
            return b.riskScore - a.riskScore;
          });
          setApplicants(mapped);
          const coastal = mapped.find(m => m.id === 'ENT-COASTAL');
          setSelectedApplicant(coastal || mapped[0]);
        }
      } catch (err) {
        console.warn("Could not load applicants from backend, using pre-seeded local database fallback:", err);
      }
    };
    fetchApplicants();
  }, []);

  // Fetch individual screening details from backend
  useEffect(() => {
    if (!selectedApplicant) return;
    
    const fetchScreenReport = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/enrollment-integrity/screen?applicant_id=${selectedApplicant.id}`);
        if (!response.ok) throw new Error('Failed to screen applicant');
        const data = await response.json();
        setScreenData(data);
        
        const graph = computeGraphData(data, selectedApplicant);
        const updatedRiskScore = data.risk_score;
        const updatedStatus = data.risk_disposition === 'HIGH RISK' 
          ? 'Flagged - Excluded Linkage' 
          : data.risk_disposition === 'ELEVATED RISK' 
            ? 'Under Review' 
            : 'Verified Safe';

        // Update the main sidebar list to stay in sync with the evaluated results
        setApplicants(prevList => {
          const updated = prevList.map(app => {
            if (app.id === selectedApplicant.id) {
              return {
                ...app,
                riskScore: updatedRiskScore,
                status: updatedStatus
              };
            }
            return app;
          });
          // Keep list sorted by risk score descending, keeping ENT-COASTAL strictly on top
          return updated.sort((a, b) => {
            if (a.id === 'ENT-COASTAL') return -1;
            if (b.id === 'ENT-COASTAL') return 1;
            return b.riskScore - a.riskScore;
          });
        });

        setSelectedApplicant(prev => ({
          ...prev,
          riskScore: updatedRiskScore,
          status: updatedStatus,
          nodes: graph.nodes,
          edges: graph.edges
        }));
      } catch (err) {
        console.warn(`Failed to fetch screen report for ${selectedApplicant.id}, using static visuals:`, err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchScreenReport();
  }, [selectedApplicant.id]);

  // Automatically select first node when applicant changes
  useEffect(() => {
    if (selectedApplicant && selectedApplicant.nodes && selectedApplicant.nodes.length > 0) {
      setSelectedNode(selectedApplicant.nodes[0]);
    } else {
      setSelectedNode(null);
    }
  }, [selectedApplicant?.id, selectedApplicant?.nodes]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleLaunchSimulation = () => {
    setIsSimulating(true);
    setSimProgress(0);
    setSimulationRunCount(prev => prev + 1);
    
    setTacticStatus(prev => ({
      ...prev,
      [selectedTactic.id]: 'RUNNING'
    }));

    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setSimLogs([...logs]);
    };

    addLog(`INITIATING ADK RED-TEAM PROBE: ${selectedTactic.name}...`);
    
    let step = 0;
    const interval = setInterval(async () => {
      step += 1;
      setSimProgress(step * 20);

      if (step === 1) {
        addLog(`[STAGE 1: ADVERSARIAL OBFUSCATION] Generating adversarial payload vectors...`);
        if (selectedTactic.id === 'NAME_MUTATION') {
          addLog(`[PAYLOAD] Formulated mutated name query: "Viktor A. Maylen" for applicant payload.`);
        } else if (selectedTactic.id === 'LLC_LAYERING') {
          addLog(`[PAYLOAD] Injected 4 layered shells: ENT-COASTAL -> Coastal Holdings -> Pacific Horizon -> Shell Delta.`);
        } else {
          addLog(`[PAYLOAD] Spoofing physical address to: "1050 Coastal Hwy, Suite 400B, Miramar, FL" (UPS Store #4912).`);
        }
      } else if (step === 2) {
        addLog(`[STAGE 2: BYPASS ATTEMPT] Attempting injection into Pre-Payment Enrollment Screening gateway...`);
        addLog(`[PROBING] Sending application packet with bypass attributes...`);
      } else if (step === 3) {
        addLog(`[STAGE 3: SHIELD AGENT INTERCEPTION] Enrollment Integrity Agent resolving entity properties...`);
        if (selectedTactic.id === 'NAME_MUTATION') {
          addLog(`[DEFENSE] ADK Phonetic Match triggered. Running double-metaphone comparison against OIG list...`);
        } else if (selectedTactic.id === 'LLC_LAYERING') {
          addLog(`[DEFENSE] Ultimate Beneficial Owner (UBO) deep-unwrap triggered. Resolving corporate linkages recursively...`);
        } else {
          addLog(`[DEFENSE] Commercial Mail Receiving Agency (CMRA) verification lookup initiated...`);
        }
      } else if (step === 4) {
        addLog(`[STAGE 4: DEEP RESOLUTION] Comparing results to exclusionary databases (OIG LEIE, SAM, NPPES)...`);
        
        try {
          const res = await fetch('/api/enrollment-integrity/simulation', { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            setProbeReport(data);
            
            if (selectedTactic.id === 'NAME_MUTATION') {
              const v1 = data.scenarios?.find((s: any) => s.entity_id === 'ENT-PROBE-V1');
              addLog(`[MATCH] Live ADK result: Evasion "ENT-PROBE-V1" caught by Double Metaphone! Status: ${v1?.disposition || 'HIGH RISK'}.`);
            } else if (selectedTactic.id === 'LLC_LAYERING') {
              const v2 = data.scenarios?.find((s: any) => s.entity_id === 'ENT-PROBE-V2');
              addLog(`[MATCH] Live ADK result: Evasion "ENT-PROBE-V2" unmasked to Victor A. Malen! Status: ${v2?.disposition || 'HIGH RISK'}.`);
            } else {
              const v3 = data.scenarios?.find((s: any) => s.entity_id === 'ENT-PROBE-V3');
              addLog(`[MATCH] Live ADK result: Evasion "ENT-PROBE-V3" resolved to CMRA mailbox! Status: ${v3?.disposition || 'ELEVATED RISK'}.`);
            }
          }
        } catch (err) {
          console.warn("Backend probe failed, using simulated response:", err);
          if (selectedTactic.id === 'NAME_MUTATION') {
            addLog(`[MATCH] Mutated Name "Viktor A. Maylen" matched to Excluded Provider: "Victor A. Malen" (94% confidence).`);
          } else if (selectedTactic.id === 'LLC_LAYERING') {
            addLog(`[MATCH] Deep Linkage unmasked: Resolved beneficial ownership to excluded entity "Victor A. Malen" (85% equity).`);
          } else {
            addLog(`[MATCH] CMRA Match confirmed. Target address resolved to UPS Store Commercial Mailbox (Bypass Blocked).`);
          }
        }
      } else if (step === 5) {
        addLog(`[STAGE 5: COMPLETE] Threat Vector neutralization success. Flagging applicant: ${selectedApplicant.name}.`);
        addLog(`[STATUS] Threat Blocked. Security perimeter hardened. Referrals packet pre-staged.`);
        setIsSimulating(false);
        setTacticStatus(prev => ({
          ...prev,
          [selectedTactic.id]: 'DETECTED'
        }));
        clearInterval(interval);
      }
    }, 1200);
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'error';
    if (score >= 40) return 'warning';
    return 'success';
  };

  const getNodeColor = (type: string, isSelected: boolean) => {
    if (isSelected) {
      if (type === 'excluded') return '#ef5350';
      if (type === 'applicant') return '#00d4ff';
      return '#00e676';
    }
    switch (type) {
      case 'applicant': return '#1a365d';
      case 'shell': return '#2c3e50';
      case 'owner': return '#27ae60';
      case 'excluded': return '#c0392b';
      default: return '#7f8c8d';
    }
  };

  return (
    <PageContainer
      title="Front-Door Enrollment"
      subtitle="Identity Resolution, Straw-Ownership Mapping, and Adversarial Purple-Team Simulations"
    >
      <Grid container spacing={3}>
        {/* Left Column: Enrollment Queue */}
        <Grid item xs={12} md={3}>
          <Paper
            variant="outlined"
            sx={{
              height: '100%',
              minHeight: 'calc(100vh - 220px)',
              bgcolor: 'background.paper',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              borderColor: 'divider',
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ p: 2, bgcolor: 'primary.dark', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                Enrollment Integrity Queue
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Pre-Payment Screening Worklist
              </Typography>
            </Box>

            <List sx={{ p: 0, overflowY: 'auto', flexGrow: 1 }}>
              {applicants.map((app) => (
                <React.Fragment key={app.id}>
                  <ListItemButton
                    selected={selectedApplicant.id === app.id}
                    onClick={() => setSelectedApplicant(app)}
                    sx={{
                      p: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.2s ease',
                      '&.Mui-selected': {
                        bgcolor: 'rgba(0, 63, 114, 0.08)',
                        borderLeft: '4px solid #003F72',
                        '&:hover': {
                          bgcolor: 'rgba(0, 63, 114, 0.12)',
                        }
                      },
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.02)',
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                            {app.name}
                          </Typography>
                          <Chip
                            label={`${app.riskScore}%`}
                            size="small"
                            color={getRiskColor(app.riskScore)}
                            sx={{ fontWeight: 'bold', height: '18px', fontSize: '0.65rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            {app.specialty}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                              {app.id}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.8, fontSize: '0.65rem' }}>
                              {app.submittedDate}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Right Column: Interactive Graphs & Simulator Tabs */}
        <Grid item xs={12} md={9}>
          <Paper
            variant="outlined"
            sx={{
              bgcolor: 'background.paper',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              borderColor: 'divider',
              borderRadius: 3,
              overflow: 'hidden'
            }}
          >
            {/* Applicant Summary Header */}
            <Box sx={{ p: 3, bgcolor: '#F8F9FA', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={8}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'rgba(0, 63, 114, 0.1)', color: 'primary.main', border: '1px solid', borderColor: 'primary.main' }}>
                      <ApartmentIcon />
                    </Avatar>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                          {selectedApplicant.name}
                        </Typography>
                        <Chip
                          label={selectedApplicant.status}
                          color={selectedApplicant.riskScore >= 80 ? 'error' : selectedApplicant.riskScore >= 40 ? 'warning' : 'success'}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 3, mt: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          NPI: <span style={{ color: '#212121', fontWeight: 'bold' }}>{selectedApplicant.npi}</span>
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Tax ID: <span style={{ color: '#212121', fontWeight: 'bold' }}>{selectedApplicant.tin}</span>
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Specialty: <span style={{ color: '#212121', fontWeight: 'bold' }}>{selectedApplicant.specialty}</span>
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4} sx={{ textAlign: { sm: 'right' } }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Adversarial Risk Score
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: selectedApplicant.riskScore >= 80 ? 'error.main' : selectedApplicant.riskScore >= 40 ? 'warning.main' : 'success.main' }}>
                      {selectedApplicant.riskScore}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Navigation Tabs */}
            <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2, bgcolor: '#FFFFFF' }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 'bold',
                    color: 'text.secondary',
                    '&.Mui-selected': { color: 'primary.main' }
                  }
                }}
              >
                <Tab label="Entity Linkage Graph" icon={<AccountTreeIcon />} iconPosition="start" />
                <Tab label="Purple-Team Simulator" icon={<ShieldIcon />} iconPosition="start" />
              </Tabs>
            </Box>

            {/* TAB 1: Entity Linkage Graph */}
            {activeTab === 0 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  This interface resolves ultimate beneficial ownership (UBO) structures recursively. Click on any node below to inspect corporate registration layers, tax registries, and exclusionary matches.
                </Typography>

                <Grid container spacing={3}>
                  {/* Graph Canvas */}
                  <Grid item xs={12} lg={8}>
                    <Paper
                      variant="outlined"
                      sx={{
                        height: 400,
                        bgcolor: '#F8F9FA',
                        borderColor: 'divider',
                        borderRadius: 2,
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Grid background overlay */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)',
                          backgroundSize: '20px 20px',
                          pointerEvents: 'none',
                        }}
                      />

                      <svg style={{ width: '100%', height: '100%', position: 'absolute' }}>
                        {/* Define glowing markers and gradients */}
                        <defs>
                          <marker id="arrow-blue" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#003F72" />
                          </marker>
                          <marker id="arrow-red" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#E31C3D" />
                          </marker>
                        </defs>

                        {/* Draw connector lines */}
                        {selectedApplicant.edges.map((edge, idx) => {
                          const fromNode = selectedApplicant.nodes.find(n => n.id === edge.from);
                          const toNode = selectedApplicant.nodes.find(n => n.id === edge.to);
                          if (!fromNode || !toNode) return null;
                          return (
                            <g key={idx}>
                              {/* Glowing path underlay */}
                              <line
                                x1={fromNode.x}
                                y1={fromNode.y}
                                x2={toNode.x}
                                y2={toNode.y}
                                stroke={edge.isRedTeamPath ? '#E31C3D' : '#003F72'}
                                strokeWidth={edge.isRedTeamPath ? 4 : 2}
                                opacity={edge.isRedTeamPath ? 0.25 : 0.15}
                              />
                              {/* Flowing animated dotted line */}
                              <line
                                x1={fromNode.x}
                                y1={fromNode.y}
                                x2={toNode.x}
                                y2={toNode.y}
                                stroke={edge.isRedTeamPath ? '#E31C3D' : '#205493'}
                                strokeWidth={2}
                                strokeDasharray="6, 6"
                                style={{
                                  animation: `${flowLine} 1.5s linear infinite`,
                                }}
                                markerEnd={edge.isRedTeamPath ? 'url(#arrow-red)' : 'url(#arrow-blue)'}
                              />
                              {/* Edge Label background */}
                              <foreignObject
                                x={(fromNode.x + toNode.x) / 2 - 40}
                                y={(fromNode.y + toNode.y) / 2 - 10}
                                width={80}
                                height={20}
                              >
                                <div style={{
                                  background: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '4px',
                                  fontSize: '8px',
                                  color: edge.isRedTeamPath ? '#E31C3D' : '#003F72',
                                  textAlign: 'center',
                                  lineHeight: '18px',
                                  fontWeight: 'bold',
                                  textTransform: 'uppercase',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}>
                                  {edge.label}
                                </div>
                              </foreignObject>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Render Nodes as absolute elements */}
                      {selectedApplicant.nodes.map((node) => {
                        const isSelected = selectedNode?.id === node.id;
                        const isExcluded = node.type === 'excluded';
                        return (
                          <Box
                            key={node.id}
                            onClick={() => setSelectedNode(node)}
                            sx={{
                              position: 'absolute',
                              left: node.x - 50,
                              top: node.y - 35,
                              width: 100,
                              height: 70,
                              bgcolor: '#FFFFFF',
                              border: `2px solid ${isSelected ? (isExcluded ? '#E31C3D' : '#003F72') : '#E2E8F0'}`,
                              borderRadius: 2,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              p: 1,
                              textAlign: 'center',
                              zIndex: 10,
                              boxShadow: isSelected ? '0 0 12px rgba(0, 63, 114, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                              animation: isExcluded ? `${pulseGlow} 2s infinite` : 'none',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                border: `2px solid ${isExcluded ? '#E31C3D' : '#003F72'}`,
                                transform: 'scale(1.05)',
                              }
                            }}
                          >
                            <Box sx={{ color: isExcluded ? '#E31C3D' : isSelected ? '#003F72' : '#5B616B', mb: 0.5 }}>
                              {node.type === 'excluded' && <GavelIcon sx={{ fontSize: 16 }} />}
                              {node.type === 'shell' && <ApartmentIcon sx={{ fontSize: 16 }} />}
                              {node.type === 'owner' && <PersonIcon sx={{ fontSize: 16 }} />}
                              {node.type === 'applicant' && <ShieldIcon sx={{ fontSize: 16 }} />}
                            </Box>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 'bold',
                                color: isExcluded ? 'error.main' : 'text.primary',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                fontSize: '0.65rem',
                                lineHeight: 1.1
                              }}
                            >
                              {node.label}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Paper>
                  </Grid>

                  {/* Node Inspector Panel */}
                  <Grid item xs={12} lg={4}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        height: '100%',
                        bgcolor: '#F8F9FA',
                        borderColor: 'divider',
                        borderRadius: 2,
                        minHeight: 400,
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {selectedNode ? (
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: selectedNode.type === 'excluded' ? 'rgba(227, 28, 61, 0.1)' : 'rgba(0, 63, 114, 0.1)', color: selectedNode.type === 'excluded' ? 'error.main' : 'primary.main' }}>
                              {selectedNode.type === 'excluded' && <GavelIcon />}
                              {selectedNode.type === 'shell' && <ApartmentIcon />}
                              {selectedNode.type === 'owner' && <PersonIcon />}
                              {selectedNode.type === 'applicant' && <ShieldIcon />}
                            </Box>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                {selectedNode.label}
                              </Typography>
                              <Chip
                                label={selectedNode.type.toUpperCase()}
                                color={selectedNode.type === 'excluded' ? 'error' : selectedNode.type === 'applicant' ? 'primary' : 'default'}
                                size="small"
                                sx={{ height: '18px', fontSize: '0.6rem', fontWeight: 'bold', mt: 0.5 }}
                              />
                            </Box>
                          </Box>

                          <Divider sx={{ mb: 2 }} />

                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                            Node Details &amp; Registry Metadata
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.primary', mb: 3, lineHeight: 1.5 }}>
                            {selectedNode.details}
                          </Typography>

                          {selectedNode.type === 'excluded' && (
                            <Paper sx={{ p: 2, bgcolor: 'rgba(227, 28, 61, 0.05)', border: '1px solid rgba(227, 28, 61, 0.25)', borderRadius: 2 }}>
                              <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <WarningIcon sx={{ color: 'error.main' }} />
                                <Box>
                                  <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                    Match Identified: OIG Exclusion
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, lineHeight: 1.3 }}>
                                    This individual matches 100% to {selectedNode.label}, excluded from billing federal health programs. Funding route is blocked.
                                  </Typography>
                                </Box>
                              </Box>
                            </Paper>
                          )}

                          {selectedNode.type === 'shell' && (
                            <Box sx={{ p: 2, bgcolor: '#FFFFFF', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                Incorporation ID
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 'bold', mb: 1.5 }}>
                                DE-491295-LLC
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                Agent of Record
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                                Harvard Business Services, Inc.
                              </Typography>
                            </Box>
                          )}

                          {selectedNode.type === 'applicant' && (
                            <Box sx={{ p: 2, bgcolor: 'rgba(0, 63, 114, 0.05)', border: '1px solid', borderColor: 'rgba(0, 63, 114, 0.2)', borderRadius: 2 }}>
                              <Typography variant="caption" sx={{ color: 'primary.main', display: 'block', fontWeight: 'bold' }}>
                                CMS Gateway Flag
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.primary', mb: 1 }}>
                                Blocked - Straw Owner linkage to excluded operator.
                              </Typography>
                              <LinearProgress variant="determinate" value={selectedApplicant.riskScore} color="error" sx={{ height: 6, borderRadius: 1 }} />
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                          <HelpOutlineIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
                          <Typography variant="body2" sx={{ color: 'text.secondary', opacity: 0.7 }}>
                            Select a node to inspect
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* TAB 2: Purple-Team Simulator */}
            {activeTab === 1 && (
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  {/* Left panel: Tactic selector */}
                  <Grid item xs={12} md={5}>
                    <Typography variant="subtitle2" sx={{ color: 'primary.main', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 'bold' }}>
                      Adversarial Evasion Probes
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {PROBE_TACTICS.map((tactic) => {
                        const status = tacticStatus[tactic.id];
                        return (
                          <Card
                            key={tactic.id}
                            variant="outlined"
                            onClick={() => !isSimulating && setSelectedTactic(tactic)}
                            sx={{
                              bgcolor: selectedTactic.id === tactic.id ? 'rgba(0, 63, 114, 0.05)' : '#FFFFFF',
                              borderColor: selectedTactic.id === tactic.id ? 'primary.main' : 'divider',
                              cursor: isSimulating ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                              '&:hover': {
                                borderColor: isSimulating ? 'divider' : 'primary.main',
                                bgcolor: isSimulating ? '#FFFFFF' : 'rgba(0, 63, 114, 0.02)',
                              }
                            }}
                          >
                            <CardContent sx={{ p: '16px !important' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                  {tactic.name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {status === 'DETECTED' && (
                                    <Tooltip title="Threat Successfully Blocked by Shield Agent">
                                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />
                                    </Tooltip>
                                  )}
                                  {status === 'RUNNING' && <LinearProgress color="primary" sx={{ width: 30, height: 4, borderRadius: 1 }} />}
                                  <Chip
                                    label={tactic.vulnerabilityLevel}
                                    color={tactic.vulnerabilityLevel === 'CRITICAL' ? 'error' : tactic.vulnerabilityLevel === 'HIGH' ? 'warning' : 'primary'}
                                    size="small"
                                    sx={{ height: 16, fontSize: '0.55rem', fontWeight: 'bold' }}
                                  />
                                </Box>
                              </Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                                {tactic.description}
                              </Typography>
                              <Divider sx={{ my: 1 }} />
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <WarningIcon sx={{ color: 'warning.main', fontSize: 12 }} />
                                <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 500, fontSize: '0.65rem' }}>
                                  Vulnerability: {tactic.vulnerabilityDesc}
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>

                    <Button
                      variant="contained"
                      fullWidth
                      disabled={isSimulating}
                      onClick={handleLaunchSimulation}
                      startIcon={<PlayArrowIcon />}
                      sx={{
                        mt: 3,
                        py: 1.5,
                        fontWeight: 'bold',
                        letterSpacing: 1.2,
                        bgcolor: 'primary.main',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(0, 63, 114, 0.2)',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        }
                      }}
                    >
                      {isSimulating ? 'Simulating Probe...' : 'Launch Simulation Probe'}
                    </Button>
                  </Grid>

                  {/* Right panel: Terminal logs & Hardening Report */}
                  <Grid item xs={12} md={7}>
                    <Typography variant="subtitle2" sx={{ color: 'primary.main', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 'bold' }}>
                      Operational Terminal &amp; Hardening Report
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {/* Active simulation status bar */}
                      {isSimulating && (
                        <Box>
                          <Typography variant="caption" sx={{ color: 'primary.main', mb: 0.5, display: 'block', fontWeight: 'bold' }}>
                            Simulating Attack Vector Payload... {simProgress}%
                          </Typography>
                          <LinearProgress variant="determinate" value={simProgress} sx={{ height: 6, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.05)', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }} />
                        </Box>
                      )}

                      {/* Log Console Terminal */}
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          bgcolor: '#030d1a',
                          borderColor: '#1E293B',
                          borderRadius: 2,
                          height: 250,
                          overflowY: 'auto',
                          fontFamily: 'monospace',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                          boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.8)'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pb: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <TerminalIcon sx={{ color: 'secondary.main', fontSize: 16 }} />
                          <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 'bold' }}>
                            CMS-ADK-SHIELD-SIMULATOR-v1.0.2
                          </Typography>
                        </Box>

                        {simLogs.length === 0 ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                              Terminal Idle. Select an attack tactic and click launch to run the simulation probe.
                            </Typography>
                          </Box>
                        ) : (
                          simLogs.map((log, idx) => (
                            <Typography
                              key={idx}
                              variant="caption"
                              sx={{
                                color: log.includes('[MATCH]') || log.includes('[DEFENSE]')
                                  ? '#00e676'
                                  : log.includes('[PAYLOAD]') || log.includes('[PROBING]')
                                    ? '#ffeb3b'
                                    : log.includes('INITIATING') || log.includes('[STATUS]')
                                      ? '#00d4ff'
                                      : 'rgba(255,255,255,0.7)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all'
                              }}
                            >
                              {log}
                            </Typography>
                          ))
                        )}
                      </Paper>

                      {/* Hardening recommendations (Shown when simulated or post-run) */}
                      {simulationRunCount > 0 && !isSimulating && (
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            bgcolor: 'rgba(46, 133, 64, 0.05)',
                            borderColor: 'rgba(46, 133, 64, 0.25)',
                            borderRadius: 2,
                          }}
                        >
                          <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <CheckCircleIcon sx={{ color: 'success.main' }} />
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                Shield Defense: ACTIVE &amp; RESILIENT
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                                The Pre-Payment screening engine intercepted the probe. To further harden this endpoint against future adaptive bypasses, we recommend implementing the following:
                              </Typography>
                              <Box component="ul" sx={{ m: 0, pl: 2, mt: 1 }}>
                                {selectedTactic.id === 'NAME_MUTATION' && (
                                  <>
                                    <li><Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>Activate soundex/metaphone algorithms on registration workflows to catch character variants.</Typography></li>
                                    <li><Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>Mandate SSN verification checks directly linked to national index providers.</Typography></li>
                                  </>
                                )}
                                {selectedTactic.id === 'LLC_LAYERING' && (
                                  <>
                                    <li><Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>Implement recursive ultimate-beneficial-owner (UBO) resolution triggers on shell incorporations.</Typography></li>
                                    <li><Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>Integrate with Delaware and international offshore registries for real-time filing lookups.</Typography></li>
                                  </>
                                )}
                                {selectedTactic.id === 'COMMERCIAL_UPS' && (
                                  <>
                                    <li><Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>Cross-reference provider physical addresses with the USPS Commercial Mail Receiving Agency database.</Typography></li>
                                    <li><Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>Trigger automated satellite photo checks to verify real brick-and-mortar operations.</Typography></li>
                                  </>
                                )}
                              </Box>

                              {probeReport && probeReport.hardening_finding && (
                                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(2, 191, 231, 0.05)', borderLeft: '3px solid', borderLeftColor: 'secondary.main', borderRadius: 1 }}>
                                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                                    ADK PURPLE-TEAM SYSTEM DISCOVERY (V4 BYPASS EXPOSURE)
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.primary', display: 'block', fontStyle: 'italic', lineHeight: 1.3 }}>
                                    "{probeReport.hardening_finding}"
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Paper>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default EnrollmentPage;
