// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  alpha,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Slider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FlagIcon from '@mui/icons-material/Flag';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import RuleIcon from '@mui/icons-material/Rule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import StorageIcon from '@mui/icons-material/Storage';
import CloudIcon from '@mui/icons-material/Cloud';
import DataObjectIcon from '@mui/icons-material/DataObject';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BadgeIcon from '@mui/icons-material/Badge';
import TableChartIcon from '@mui/icons-material/TableChart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TerminalIcon from '@mui/icons-material/Terminal';
import TuneIcon from '@mui/icons-material/Tune';
import SpeedIcon from '@mui/icons-material/Speed';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ScienceIcon from '@mui/icons-material/Science';
import { PageContainer } from '../components/layout/PageContainer';
import { useAgentContext } from '../contexts/AgentContext';
import { useAuth } from '../contexts/AuthContext';
import { useUIContext } from '../contexts/UIContext';
import { formatTimestamp } from '../utils/formatters';
import type { PipelineAgent } from '../types';

type AgentStatus = PipelineAgent['status'];
type AgentType = PipelineAgent['type'];

const STATUS_COLORS: Record<AgentStatus, { bg: string; text: string }> = {
  draft: { bg: '#E0E0E0', text: '#616161' },
  testing: { bg: '#FFF3E0', text: '#E65100' },
  production: { bg: '#E8F5E9', text: '#2E7D32' },
  disabled: { bg: '#FFEBEE', text: '#C62828' },
};

const STATUS_LABELS: Record<AgentStatus, string> = {
  draft: 'Draft',
  testing: 'Testing',
  production: 'Production',
  disabled: 'Disabled',
};

/* ─── Data Sources (fake) ─── */
interface DataSource {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const DATA_SOURCES: DataSource[] = [
  { id: 'bigquery', name: 'BigQuery', description: 'VA Claims Data Warehouse', icon: <CloudIcon />, color: '#4285F4' },
  { id: 'va_claims_db', name: 'VA Claims DB', description: 'Primary claims processing database', icon: <StorageIcon />, color: '#112E51' },
  { id: 'medical_records', name: 'Medical Records API', description: 'VistA / Cerner EHR integration', icon: <LocalHospitalIcon />, color: '#E31C3D' },
  { id: 'vba_master', name: 'VBA Master Record', description: 'Veterans Benefits Administration master index', icon: <BadgeIcon />, color: '#2E8540' },
  { id: 'vbms', name: 'VBMS', description: 'Veterans Benefits Management System', icon: <AccountBalanceIcon />, color: '#8B6914' },
  { id: 'fee_schedule', name: 'Fee Schedule DB', description: 'CMS & VA fee schedule tables', icon: <TableChartIcon />, color: '#5B616B' },
  { id: 'npi_registry', name: 'NPI Registry', description: 'National Provider Identifier lookup', icon: <DataObjectIcon />, color: '#0071BC' },
  { id: 'document_store', name: 'Document Store', description: 'Scanned forms, DBQs, and supporting docs', icon: <DescriptionIcon />, color: '#CD2026' },
];

/* ─── AI model options (fake) ─── */
const AI_MODELS = [
  { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro', provider: 'Google', badge: 'Recommended' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', badge: '' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', badge: 'Fast' },
  { id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic', badge: '' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', badge: '' },
];

/* ─── Stepper steps ─── */
const STEPS = ['Agent Info', 'Data Sources', 'Agent Logic', 'Execution', 'Review'];

/* ─── Form state ─── */
interface AgentForm {
  name: string;
  description: string;
  type: AgentType;
  definition: string;
  status: AgentStatus;
  dataSources: string[];
  aiModel: string;
  temperature: number;
  maxTokens: number;
  executionMode: 'realtime' | 'batch';
  schedule: string;
  timeout: number;
  retries: number;
  scriptEnabled: boolean;
  preScript: string;
  postScript: string;
}

const EMPTY_FORM: AgentForm = {
  name: '',
  description: '',
  type: 'rule-based',
  definition: '',
  status: 'draft',
  dataSources: ['bigquery', 'va_claims_db'],
  aiModel: 'gemini-3.0-pro',
  temperature: 0.2,
  maxTokens: 4096,
  executionMode: 'realtime',
  schedule: '0 */6 * * *',
  timeout: 30,
  retries: 3,
  scriptEnabled: false,
  preScript: '# Pre-processing script\nimport pandas as pd\n\ndef preprocess(claim_data):\n    """Clean and normalize claim data before agent evaluation."""\n    df = pd.DataFrame(claim_data)\n    df[\'billing_amount\'] = df[\'billing_amount\'].astype(float)\n    df[\'service_date\'] = pd.to_datetime(df[\'service_date\'])\n    return df.to_dict(orient=\'records\')',
  postScript: '# Post-processing script\ndef postprocess(agent_result, claim_data):\n    """Enrich agent output with additional context."""\n    if agent_result[\'recommendation\'] == \'flag\':\n        agent_result[\'priority\'] = calculate_priority(\n            agent_result[\'confidence_score\'],\n            claim_data[\'billing_amount\']\n        )\n    return agent_result',
};

/* ─── Fake test run results ─── */
const FAKE_TEST_LINES = [
  { text: 'Initializing agent runtime environment...', delay: 400 },
  { text: 'Connecting to BigQuery (va-claims-prod)...', delay: 600 },
  { text: 'Connection established. Authenticating...', delay: 300 },
  { text: 'Loading VA Claims DB schema...', delay: 500 },
  { text: 'Fetching sample claims batch (n=25)...', delay: 800 },
  { text: 'Running pre-processing script...', delay: 400 },
  { text: 'Pre-processing complete. 25 claims normalized.', delay: 300 },
  { text: 'Executing agent logic against sample data...', delay: 1200 },
  { text: '  [Claim VA-2025-88421] confidence: 0.92 => FLAG', delay: 200 },
  { text: '  [Claim VA-2025-88422] confidence: 0.31 => PASS', delay: 150 },
  { text: '  [Claim VA-2025-88423] confidence: 0.87 => FLAG', delay: 150 },
  { text: '  [Claim VA-2025-88424] confidence: 0.12 => PASS', delay: 150 },
  { text: '  [Claim VA-2025-88425] confidence: 0.78 => FLAG', delay: 150 },
  { text: '  ... (20 more claims processed)', delay: 300 },
  { text: 'Running post-processing script...', delay: 400 },
  { text: 'Post-processing complete.', delay: 200 },
  { text: '', delay: 100 },
  { text: '--- Test Run Summary ---', delay: 300 },
  { text: 'Total claims evaluated: 25', delay: 100 },
  { text: 'Flagged: 8 (32.0%)', delay: 100 },
  { text: 'Passed: 17 (68.0%)', delay: 100 },
  { text: 'Avg confidence (flagged): 0.84', delay: 100 },
  { text: 'Avg processing time: 142ms/claim', delay: 100 },
  { text: 'Total execution time: 3.55s', delay: 100 },
  { text: '', delay: 50 },
  { text: 'Test run completed successfully.', delay: 200 },
];

const AgentManagementPage: React.FC = () => {
  const { agents, addAgent, updateAgent, deleteAgent, removeFlag, refreshFlags } = useAgentContext();
  const { user } = useAuth();
  const { openDeepDive } = useUIContext();
  const isAuditor = user?.role === 'Auditor';

  // Re-fetch flags from backend every time this page is mounted (navigated to)
  useEffect(() => {
    refreshFlags();
  }, [refreshFlags]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AgentForm>(EMPTY_FORM);
  const [activeStep, setActiveStep] = useState(0);

  // Test run
  const [testRunning, setTestRunning] = useState(false);
  const [testOutput, setTestOutput] = useState<string[]>([]);
  const [testProgress, setTestProgress] = useState(0);

  // Flags dialog
  const [flagsDialogAgent, setFlagsDialogAgent] = useState<PipelineAgent | null>(null);
  const [removingFlagId, setRemovingFlagId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredAgents = useMemo(() => {
    let result = [...agents];
    // Auditors can only see agents that have flags
    if (isAuditor) result = result.filter((a) => a.flags.length > 0);
    if (statusFilter !== 'all') result = result.filter((a) => a.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter((a) => a.type === typeFilter);
    return result;
  }, [agents, statusFilter, typeFilter, isAuditor]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setActiveStep(0);
    setTestOutput([]);
    setTestRunning(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = (agent: PipelineAgent) => {
    setEditingId(agent.id);
    setForm({
      ...EMPTY_FORM,
      name: agent.name,
      description: agent.description,
      type: agent.type,
      definition: agent.definition,
      status: agent.status,
    });
    setActiveStep(0);
    setTestOutput([]);
    setTestRunning(false);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setActiveStep(0);
    setTestOutput([]);
    setTestRunning(false);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.definition.trim()) return;
    if (editingId) {
      updateAgent(editingId, {
        name: form.name,
        description: form.description,
        type: form.type,
        definition: form.definition,
        status: form.status,
      });
    } else {
      addAgent({
        name: form.name,
        description: form.description,
        type: form.type,
        definition: form.definition,
        status: form.status,
      });
    }
    handleCloseDialog();
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      deleteAgent(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleStatusChange = (agentId: string, newStatus: AgentStatus) => {
    updateAgent(agentId, { status: newStatus });
  };

  const flagCount = (agent: PipelineAgent) => agent.flags.length;

  const handleRemoveFlag = async (agentId: string, flagId: string) => {
    setRemovingFlagId(flagId);
    const ok = await removeFlag(agentId, flagId);
    setRemovingFlagId(null);
    if (ok) {
      // Refresh the dialog agent reference so the table updates
      setFlagsDialogAgent((prev) =>
        prev ? { ...prev, flags: prev.flags.filter((f) => f.id !== flagId) } : null
      );
    }
  };

  const handleFlagClaimClick = (claimId: string) => {
    setFlagsDialogAgent(null);
    openDeepDive(claimId);
  };

  const updateForm = useCallback(<K extends keyof AgentForm>(key: K, value: AgentForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleDataSource = (id: string) => {
    setForm((prev) => ({
      ...prev,
      dataSources: prev.dataSources.includes(id)
        ? prev.dataSources.filter((d) => d !== id)
        : [...prev.dataSources, id],
    }));
  };

  /* ─── Fake test run ─── */
  const terminalRef = React.useRef<HTMLDivElement>(null);

  const runTest = useCallback(() => {
    setTestRunning(true);
    setTestOutput([]);
    setTestProgress(0);

    let i = 0;
    const total = FAKE_TEST_LINES.length;

    const next = () => {
      if (i >= total) {
        setTestRunning(false);
        setTestProgress(100);
        return;
      }
      const line = FAKE_TEST_LINES[i];
      setTestOutput((prev) => [...prev, line.text]);
      setTestProgress(Math.round(((i + 1) / total) * 100));
      i++;
      setTimeout(next, line.delay);
    };

    setTimeout(next, 300);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [testOutput]);

  const canAdvance = (): boolean => true;

  /* ─── Step renderers ─── */

  const renderStepInfo = () => (
    <Stack spacing={2.5}>
      <TextField
        fullWidth
        label="Agent Name"
        value={form.name}
        onChange={(e) => updateForm('name', e.target.value)}
        placeholder="e.g. Duplicate Billing Detector"
      />
      <TextField
        fullWidth
        label="Description"
        value={form.description}
        onChange={(e) => updateForm('description', e.target.value)}
        placeholder="Brief description of what this agent detects"
        multiline
        rows={2}
      />

      <Typography variant="subtitle2" fontWeight={700}>Agent Type</Typography>
      <Stack direction="row" spacing={2}>
        {([
          {
            value: 'rule-based' as AgentType,
            icon: <RuleIcon sx={{ fontSize: 32 }} />,
            label: 'Rule-Based',
            desc: 'Define detection logic using natural-language rules and configurable thresholds.',
          },
          {
            value: 'ai-based' as AgentType,
            icon: <SmartToyIcon sx={{ fontSize: 32 }} />,
            label: 'AI-Based',
            desc: 'Leverage LLM reasoning with a custom prompt to evaluate claims intelligently.',
          },
        ]).map((opt) => (
          <Card
            key={opt.value}
            variant="outlined"
            sx={{
              flex: 1,
              borderColor: form.type === opt.value ? '#112E51' : 'divider',
              borderWidth: form.type === opt.value ? 2 : 1,
              backgroundColor: form.type === opt.value ? alpha('#112E51', 0.04) : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <CardActionArea onClick={() => updateForm('type', opt.value)} sx={{ p: 2 }}>
              <Stack spacing={1} alignItems="center" textAlign="center">
                <Box sx={{ color: form.type === opt.value ? '#112E51' : '#5B616B' }}>{opt.icon}</Box>
                <Typography variant="subtitle2" fontWeight={700}>{opt.label}</Typography>
                <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
              </Stack>
            </CardActionArea>
          </Card>
        ))}
      </Stack>

      <FormControl fullWidth size="small">
        <InputLabel>Initial Status</InputLabel>
        <Select
          value={form.status}
          label="Initial Status"
          onChange={(e: SelectChangeEvent) => updateForm('status', e.target.value as AgentStatus)}
        >
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="testing">Testing</MenuItem>
          <MenuItem value="production">Production</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );

  const renderStepDataSources = () => (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Connect Data Sources
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Select the data sources this agent can query during claim evaluation. The agent will have read-only access.
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
        {DATA_SOURCES.map((ds) => {
          const selected = form.dataSources.includes(ds.id);
          return (
            <Card
              key={ds.id}
              variant="outlined"
              sx={{
                borderColor: selected ? ds.color : 'divider',
                borderWidth: selected ? 2 : 1,
                backgroundColor: selected ? alpha(ds.color, 0.04) : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <CardActionArea onClick={() => toggleDataSource(ds.id)} sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? alpha(ds.color, 0.12) : 'grey.100',
                      color: selected ? ds.color : '#9E9E9E',
                      transition: 'all 0.15s',
                    }}
                  >
                    {ds.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{ds.name}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{ds.description}</Typography>
                  </Box>
                  <Checkbox checked={selected} size="small" sx={{ p: 0 }} disableRipple />
                </Stack>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {form.dataSources.length} of {DATA_SOURCES.length} sources selected
      </Typography>
    </Stack>
  );

  const renderStepLogic = () => (
    <Stack spacing={2.5}>
      {form.type === 'ai-based' && (
        <>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Model Selection</Typography>
            <Typography variant="caption" color="text.secondary">
              Choose the LLM that will power this agent's reasoning.
            </Typography>
          </Box>
          <Stack spacing={1}>
            {AI_MODELS.map((model) => {
              const selected = form.aiModel === model.id;
              return (
                <Card
                  key={model.id}
                  variant="outlined"
                  sx={{
                    borderColor: selected ? '#112E51' : 'divider',
                    borderWidth: selected ? 2 : 1,
                    backgroundColor: selected ? alpha('#112E51', 0.04) : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => updateForm('aiModel', model.id)}
                >
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <SmartToyIcon sx={{ fontSize: 20, color: selected ? '#112E51' : '#9E9E9E' }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{model.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{model.provider}</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {model.badge && (
                          <Chip
                            label={model.badge}
                            size="small"
                            sx={{
                              fontSize: '0.65rem',
                              height: 20,
                              fontWeight: 600,
                              backgroundColor: model.badge === 'Recommended' ? '#E8F5E9' : model.badge === 'Fast' ? '#E3F2FD' : '#FFF3E0',
                              color: model.badge === 'Recommended' ? '#2E7D32' : model.badge === 'Fast' ? '#1565C0' : '#E65100',
                            }}
                          />
                        )}
                        {selected && <CheckCircleIcon sx={{ fontSize: 20, color: '#112E51' }} />}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>

          <Divider />

          <Stack direction="row" spacing={4}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <TuneIcon sx={{ fontSize: 16, color: '#5B616B' }} />
                <Typography variant="caption" fontWeight={600}>Temperature</Typography>
                <Chip label={form.temperature.toFixed(1)} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
              </Stack>
              <Slider
                value={form.temperature}
                onChange={(_, v) => updateForm('temperature', v as number)}
                min={0}
                max={1}
                step={0.1}
                marks={[{ value: 0, label: 'Precise' }, { value: 1, label: 'Creative' }]}
                sx={{ color: '#112E51' }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <SpeedIcon sx={{ fontSize: 16, color: '#5B616B' }} />
                <Typography variant="caption" fontWeight={600}>Max Tokens</Typography>
              </Stack>
              <Select
                fullWidth
                size="small"
                value={form.maxTokens.toString()}
                onChange={(e) => updateForm('maxTokens', parseInt(e.target.value))}
              >
                <MenuItem value="1024">1,024</MenuItem>
                <MenuItem value="2048">2,048</MenuItem>
                <MenuItem value="4096">4,096</MenuItem>
                <MenuItem value="8192">8,192</MenuItem>
                <MenuItem value="16384">16,384</MenuItem>
              </Select>
            </Box>
          </Stack>

          <Divider />
        </>
      )}

      <TextField
        fullWidth
        multiline
        rows={form.type === 'ai-based' ? 6 : 8}
        label={form.type === 'rule-based' ? 'Rule Definition' : 'System Prompt'}
        value={form.definition}
        onChange={(e) => updateForm('definition', e.target.value)}
        placeholder={
          form.type === 'rule-based'
            ? 'Define the rule in natural language.\n\ne.g. "Flag any claim where:\n  - billing amount exceeds $50,000, OR\n  - the service date is >365 days before submission, OR\n  - the provider risk score is above 7.5"'
            : 'Write the system prompt for the AI agent.\n\ne.g. "You are a VA claims fraud detection agent. Analyze the claim data and supporting documentation to determine if..."'
        }
        helperText={
          form.type === 'rule-based'
            ? 'Write the rule in plain English. Supports AND/OR conditions, thresholds, and comparisons.'
            : 'This prompt is sent as the system instruction to the selected model for each claim evaluation.'
        }
        sx={{
          '& .MuiOutlinedInput-root': {
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            backgroundColor: '#FAFAFA',
          },
        }}
      />
    </Stack>
  );

  const renderStepExecution = () => (
    <Stack spacing={3}>
      {/* Execution mode */}
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Execution Mode</Typography>
        <Stack direction="row" spacing={2}>
          {([
            { value: 'realtime', label: 'Real-Time', desc: 'Evaluate each claim as it enters the pipeline.', icon: <SpeedIcon /> },
            { value: 'batch', label: 'Batch', desc: 'Run on a schedule against queued claims.', icon: <ScheduleIcon /> },
          ] as const).map((mode) => (
            <Card
              key={mode.value}
              variant="outlined"
              sx={{
                flex: 1,
                borderColor: form.executionMode === mode.value ? '#112E51' : 'divider',
                borderWidth: form.executionMode === mode.value ? 2 : 1,
                backgroundColor: form.executionMode === mode.value ? alpha('#112E51', 0.04) : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <CardActionArea
                onClick={() => updateForm('executionMode', mode.value)}
                sx={{ p: 2 }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ color: form.executionMode === mode.value ? '#112E51' : '#9E9E9E' }}>
                    {mode.icon}
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{mode.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{mode.desc}</Typography>
                  </Box>
                </Stack>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Box>

      {/* Schedule (batch only) */}
      <Collapse in={form.executionMode === 'batch'}>
        <Box sx={{ p: 2, backgroundColor: '#F5F5F5', borderRadius: 1 }}>
          <Typography variant="caption" fontWeight={600} gutterBottom display="block">Cron Schedule</Typography>
          <TextField
            fullWidth
            size="small"
            value={form.schedule}
            onChange={(e) => updateForm('schedule', e.target.value)}
            placeholder="0 */6 * * *"
            sx={{ '& .MuiOutlinedInput-root': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            helperText="Standard cron expression. Default: every 6 hours."
          />
        </Box>
      </Collapse>

      <Divider />

      {/* Timeout / Retries */}
      <Stack direction="row" spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" fontWeight={600} gutterBottom display="block">Timeout (seconds)</Typography>
          <Slider
            value={form.timeout}
            onChange={(_, v) => updateForm('timeout', v as number)}
            min={5}
            max={120}
            step={5}
            valueLabelDisplay="auto"
            marks={[{ value: 5, label: '5s' }, { value: 60, label: '60s' }, { value: 120, label: '120s' }]}
            sx={{ color: '#112E51' }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" fontWeight={600} gutterBottom display="block">Max Retries</Typography>
          <Slider
            value={form.retries}
            onChange={(_, v) => updateForm('retries', v as number)}
            min={0}
            max={5}
            step={1}
            valueLabelDisplay="auto"
            marks={[{ value: 0, label: '0' }, { value: 3, label: '3' }, { value: 5, label: '5' }]}
            sx={{ color: '#112E51' }}
          />
        </Box>
      </Stack>

      <Divider />

      {/* Script hooks */}
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <TerminalIcon sx={{ fontSize: 18, color: '#5B616B' }} />
            <Typography variant="subtitle2" fontWeight={700}>Script Hooks</Typography>
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={form.scriptEnabled}
                onChange={(e) => updateForm('scriptEnabled', e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="caption">{form.scriptEnabled ? 'Enabled' : 'Disabled'}</Typography>}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Run custom Python scripts before and/or after agent evaluation.
        </Typography>
      </Box>

      <Collapse in={form.scriptEnabled}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" fontWeight={600} gutterBottom display="block">
              Pre-Processing Script
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={5}
              value={form.preScript}
              onChange={(e) => updateForm('preScript', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: '"Fira Code", "Cascadia Code", monospace',
                  fontSize: '0.8rem',
                  backgroundColor: '#1E1E1E',
                  color: '#D4D4D4',
                  lineHeight: 1.5,
                },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
              }}
            />
          </Box>
          <Box>
            <Typography variant="caption" fontWeight={600} gutterBottom display="block">
              Post-Processing Script
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={5}
              value={form.postScript}
              onChange={(e) => updateForm('postScript', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: '"Fira Code", "Cascadia Code", monospace',
                  fontSize: '0.8rem',
                  backgroundColor: '#1E1E1E',
                  color: '#D4D4D4',
                  lineHeight: 1.5,
                },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
              }}
            />
          </Box>
        </Stack>
      </Collapse>
    </Stack>
  );

  const renderStepReview = () => (
    <Stack spacing={2.5}>
      {/* Summary cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        {/* Agent info */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>Agent Info</Typography>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5 }}>{form.name || '(Unnamed)'}</Typography>
          <Typography variant="body2" color="text.secondary">{form.description || 'No description'}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip
              icon={form.type === 'rule-based' ? <RuleIcon sx={{ fontSize: 14 }} /> : <SmartToyIcon sx={{ fontSize: 14 }} />}
              label={form.type === 'rule-based' ? 'Rule-Based' : 'AI-Based'}
              size="small"
              variant="outlined"
            />
            <Chip
              label={STATUS_LABELS[form.status]}
              size="small"
              sx={{ backgroundColor: STATUS_COLORS[form.status].bg, color: STATUS_COLORS[form.status].text, fontWeight: 600 }}
            />
          </Stack>
        </Paper>

        {/* Data sources */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>Data Sources</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {form.dataSources.map((dsId) => {
              const ds = DATA_SOURCES.find((d) => d.id === dsId);
              return ds ? (
                <Chip key={dsId} label={ds.name} size="small" sx={{ fontSize: '0.7rem' }} />
              ) : null;
            })}
          </Stack>
        </Paper>

        {/* Model / Logic */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>
            {form.type === 'ai-based' ? 'Model & Config' : 'Rule Logic'}
          </Typography>
          {form.type === 'ai-based' ? (
            <>
              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                {AI_MODELS.find((m) => m.id === form.aiModel)?.name ?? form.aiModel}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Temperature: {form.temperature} &middot; Max Tokens: {form.maxTokens.toLocaleString()}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.8rem' }} noWrap>
              {form.definition.slice(0, 80)}{form.definition.length > 80 ? '...' : ''}
            </Typography>
          )}
        </Paper>

        {/* Execution */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>Execution</Typography>
          <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
            {form.executionMode === 'realtime' ? 'Real-Time' : 'Batch'}
            {form.executionMode === 'batch' && <Typography component="span" variant="caption" color="text.secondary"> ({form.schedule})</Typography>}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Timeout: {form.timeout}s &middot; Retries: {form.retries} &middot; Scripts: {form.scriptEnabled ? 'On' : 'Off'}
          </Typography>
        </Paper>
      </Box>

      {/* Definition preview */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>
          {form.type === 'rule-based' ? 'Rule Definition' : 'System Prompt'}
        </Typography>
        <Box
          sx={{
            mt: 1,
            p: 1.5,
            backgroundColor: '#F5F5F5',
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            maxHeight: 120,
            overflowY: 'auto',
          }}
        >
          {form.definition || '(empty)'}
        </Box>
      </Paper>

      <Divider />

      {/* Test Run */}
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <ScienceIcon sx={{ fontSize: 20, color: '#112E51' }} />
            <Typography variant="subtitle2" fontWeight={700}>Test Run</Typography>
          </Stack>
          <Button
            variant="outlined"
            size="small"
            startIcon={testRunning ? <CircularProgress size={14} /> : <PlayArrowIcon />}
            onClick={runTest}
            disabled={testRunning || !form.definition.trim()}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#112E51',
              color: '#112E51',
            }}
          >
            {testRunning ? 'Running...' : 'Run Test'}
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Execute the agent against a sample batch of 25 claims to validate configuration.
        </Typography>
      </Box>

      {(testOutput.length > 0 || testRunning) && (
        <Box>
          {testRunning && <LinearProgress variant="determinate" value={testProgress} sx={{ mb: 1, borderRadius: 1 }} />}
          <Box
            ref={terminalRef}
            sx={{
              backgroundColor: '#0D1117',
              color: '#C9D1D9',
              fontFamily: '"Fira Code", "Cascadia Code", "Courier New", monospace',
              fontSize: '0.75rem',
              lineHeight: 1.7,
              p: 2,
              borderRadius: 1,
              maxHeight: 240,
              overflowY: 'auto',
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-thumb': { backgroundColor: '#30363D', borderRadius: 3 },
            }}
          >
            {testOutput.map((line, idx) => (
              <Box key={idx} sx={{ minHeight: '1.3em' }}>
                {line.startsWith('---') || line.startsWith('Total') || line.startsWith('Flagged') || line.startsWith('Passed') || line.startsWith('Avg') || line.startsWith('Test run completed')
                  ? (
                    <Typography component="span" sx={{
                      fontFamily: 'inherit', fontSize: 'inherit',
                      color: line.includes('FLAG') ? '#F97583' : line.includes('PASS') ? '#85E89D' : line.startsWith('Test run completed') ? '#85E89D' : line.startsWith('---') ? '#79C0FF' : '#E1E4E8',
                      fontWeight: line.startsWith('---') || line.startsWith('Test run completed') ? 700 : 400,
                    }}>
                      {line}
                    </Typography>
                  )
                  : (
                    <Typography component="span" sx={{
                      fontFamily: 'inherit', fontSize: 'inherit',
                      color: line.includes('FLAG') ? '#F97583' : line.includes('PASS') ? '#85E89D' : line.includes('Error') ? '#F97583' : line.startsWith('  [') ? '#D2A8FF' : '#C9D1D9',
                    }}>
                      {line}
                    </Typography>
                  )
                }
              </Box>
            ))}
            {testRunning && (
              <Box component="span" sx={{ color: '#58A6FF' }}>
                {'> _'}
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Stack>
  );

  const stepContent = [renderStepInfo, renderStepDataSources, renderStepLogic, renderStepExecution, renderStepReview];

  /* ─── Main render ─── */
  return (
    <PageContainer
      title="Agent Management"
      subtitle={isAuditor ? 'Auditor view — Flagged agents only' : 'Create, configure, and manage fraud detection agents'}
      action={
        !isAuditor ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{
              backgroundColor: '#112E51',
              '&:hover': { backgroundColor: '#1A4480' },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Create Agent
          </Button>
        ) : undefined
      }
    >
      {/* Summary chips */}
      {isAuditor ? (
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Chip
            label={`${agents.filter((a) => a.flags.length > 0).length} Flagged Agents`}
            size="small"
            icon={<WarningAmberIcon sx={{ fontSize: 16 }} />}
            sx={{ backgroundColor: '#FFF3E0', color: '#E65100', fontWeight: 600 }}
          />
        </Stack>
      ) : (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Chip label={`${agents.length} Total`} size="small" sx={{ fontWeight: 600 }} />
            <Chip
              label={`${agents.filter((a) => a.status === 'production').length} Production`}
              size="small"
              sx={{ backgroundColor: STATUS_COLORS.production.bg, color: STATUS_COLORS.production.text, fontWeight: 600 }}
            />
            <Chip
              label={`${agents.filter((a) => a.status === 'testing').length} Testing`}
              size="small"
              sx={{ backgroundColor: STATUS_COLORS.testing.bg, color: STATUS_COLORS.testing.text, fontWeight: 600 }}
            />
            <Chip
              label={`${agents.filter((a) => a.flags.length > 0).length} Flagged`}
              size="small"
              icon={<WarningAmberIcon sx={{ fontSize: 16 }} />}
              sx={{ backgroundColor: '#FFF3E0', color: '#E65100', fontWeight: 600 }}
            />
          </Stack>

          {/* Filters */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="testing">Testing</MenuItem>
                <MenuItem value="production">Production</MenuItem>
                <MenuItem value="disabled">Disabled</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Agent Type</InputLabel>
              <Select value={typeFilter} label="Agent Type" onChange={(e: SelectChangeEvent) => setTypeFilter(e.target.value)}>
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="rule-based">Rule-Based</MenuItem>
                <MenuItem value="ai-based">AI-Based</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </>
      )}

      {/* Agents Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>Agent Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Flags</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Updated</TableCell>
              {!isAuditor && <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAgents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAuditor ? 6 : 7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No agents match the current filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredAgents.map((agent) => (
                <TableRow key={agent.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {agent.type === 'ai-based' ? (
                        <SmartToyIcon sx={{ fontSize: 18, color: '#5B616B' }} />
                      ) : (
                        <RuleIcon sx={{ fontSize: 18, color: '#5B616B' }} />
                      )}
                      <Typography variant="body2" fontWeight={600}>{agent.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip label={agent.type === 'rule-based' ? 'Rule-Based' : 'AI-Based'} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }} noWrap>{agent.description}</Typography>
                  </TableCell>
                  <TableCell>
                    {isAuditor ? (
                      <Chip
                        label={STATUS_LABELS[agent.status]}
                        size="small"
                        sx={{
                          backgroundColor: STATUS_COLORS[agent.status].bg,
                          color: STATUS_COLORS[agent.status].text,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      />
                    ) : (
                      <FormControl size="small" variant="standard" sx={{ minWidth: 110 }}>
                        <Select
                          value={agent.status}
                          onChange={(e: SelectChangeEvent) => handleStatusChange(agent.id, e.target.value as AgentStatus)}
                          disableUnderline
                          renderValue={(val) => (
                            <Chip
                              label={STATUS_LABELS[val as AgentStatus]}
                              size="small"
                              sx={{
                                backgroundColor: STATUS_COLORS[val as AgentStatus].bg,
                                color: STATUS_COLORS[val as AgentStatus].text,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                          )}
                        >
                          <MenuItem value="draft">Draft</MenuItem>
                          <MenuItem value="testing">Testing</MenuItem>
                          <MenuItem value="production">Production</MenuItem>
                          <MenuItem value="disabled">Disabled</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </TableCell>
                  <TableCell>
                    {flagCount(agent) > 0 ? (
                      <Tooltip
                        arrow
                        placement="left"
                        componentsProps={{
                          tooltip: {
                            sx: {
                              maxWidth: 380,
                              backgroundColor: '#FFF',
                              color: '#212121',
                              border: '1px solid #E0E0E0',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                              borderRadius: 1.5,
                              p: 0,
                            },
                          },
                          arrow: { sx: { color: '#FFF', '&::before': { border: '1px solid #E0E0E0' } } },
                        }}
                        title={
                          <Box sx={{ p: 2 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                              <FlagIcon sx={{ fontSize: 16, color: '#C62828' }} />
                              <Typography variant="subtitle2" fontWeight={700} color="#C62828">
                                {flagCount(agent)} Flag{flagCount(agent) !== 1 ? 's' : ''} for Review
                              </Typography>
                            </Stack>
                            <Stack spacing={1.5}>
                              {agent.flags.slice(0, 3).map((flag) => (
                                <Box
                                  key={flag.id}
                                  sx={{
                                    p: 1.5,
                                    backgroundColor: '#FFF8E1',
                                    borderRadius: 1,
                                    borderLeft: '3px solid #F57C00',
                                  }}
                                >
                                  <Typography variant="caption" fontWeight={700} color="#E65100" display="block">
                                    Claim {flag.claimNumber}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                                    {flag.notes.length > 100 ? `${flag.notes.slice(0, 100)}...` : flag.notes}
                                  </Typography>
                                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                    <Typography variant="caption" color="text.disabled">
                                      By {flag.flaggedBy}
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">
                                      {formatTimestamp(flag.timestamp)}
                                    </Typography>
                                  </Stack>
                                </Box>
                              ))}
                              {agent.flags.length > 3 && (
                                <Typography variant="caption" color="text.secondary" textAlign="center">
                                  +{agent.flags.length - 3} more — click to view all
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        }
                      >
                        <Chip
                          icon={<FlagIcon sx={{ fontSize: 14 }} />}
                          label={flagCount(agent)}
                          size="small"
                          onClick={() => setFlagsDialogAgent(agent)}
                          sx={{
                            backgroundColor: '#FFEBEE',
                            color: '#C62828',
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: '#FFCDD2' },
                          }}
                        />
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.disabled">--</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{formatTimestamp(agent.updatedAt)}</Typography>
                  </TableCell>
                  {!isAuditor && (
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenEdit(agent)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setDeleteConfirmId(agent.id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {isAuditor
          ? `${filteredAgents.length} flagged agent${filteredAgents.length !== 1 ? 's' : ''}`
          : `Showing ${filteredAgents.length} of ${agents.length} agents`}
      </Typography>

      {/* ═══════════ Create / Edit Agent — Multi-step Wizard ═══════════ */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, minHeight: 560 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#112E51', pb: 0 }}>
          {editingId ? 'Edit Agent' : 'Create New Agent'}
        </DialogTitle>

        {/* Stepper */}
        <Box sx={{ px: 3, pt: 2, pb: 1 }}>
          <Stepper activeStep={activeStep} alternativeLabel nonLinear>
            {STEPS.map((label, idx) => (
              <Step key={label} completed={idx < activeStep}>
                <StepLabel
                  onClick={() => setActiveStep(idx)}
                  sx={{
                    cursor: 'pointer',
                    '& .MuiStepLabel-label': { fontSize: '0.8rem', fontWeight: 600 },
                    '& .MuiStepIcon-root.Mui-active': { color: '#112E51' },
                    '& .MuiStepIcon-root.Mui-completed': { color: '#2E8540' },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Divider />

        <DialogContent sx={{ py: 2.5 }}>
          {stepContent[activeStep]()}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          <Button
            onClick={activeStep === 0 ? handleCloseDialog : () => setActiveStep((s) => s - 1)}
            variant="outlined"
            color="inherit"
            startIcon={activeStep > 0 ? <ArrowBackIcon /> : undefined}
          >
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </Button>

          {activeStep < STEPS.length - 1 ? (
            <Button
              onClick={() => setActiveStep((s) => s + 1)}
              variant="contained"
              disabled={!canAdvance()}
              endIcon={<ArrowForwardIcon />}
              sx={{ backgroundColor: '#112E51', '&:hover': { backgroundColor: '#1A4480' } }}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={!form.name.trim() || !form.definition.trim()}
              startIcon={<CheckCircleIcon />}
              sx={{ backgroundColor: '#2E8540', '&:hover': { backgroundColor: '#267236' } }}
            >
              {editingId ? 'Save Changes' : 'Create Agent'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ═══════════ Delete Confirmation Dialog ═══════════ */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#E31C3D' }}>Delete Agent</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Are you sure you want to delete this agent? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirmId(null)} variant="outlined" color="inherit">Cancel</Button>
          <Button onClick={handleDelete} variant="contained" sx={{ backgroundColor: '#E31C3D', '&:hover': { backgroundColor: '#C4192F' } }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ Flags Detail Dialog ═══════════ */}
      <Dialog
        open={!!flagsDialogAgent}
        onClose={() => setFlagsDialogAgent(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#C62828' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FlagIcon />
            <span>Flags for &ldquo;{flagsDialogAgent?.name}&rdquo;</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {flagsDialogAgent && flagsDialogAgent.flags.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Claim</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Flagged By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flagsDialogAgent.flags.map((flag) => (
                    <TableRow key={flag.id} hover>
                      <TableCell>
                        <Tooltip title="Open Deep Dive for this claim" arrow>
                          <Button
                            variant="text"
                            size="small"
                            endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleFlagClaimClick(flag.claimId)}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 700,
                              color: '#0071BC',
                              p: 0,
                              minWidth: 0,
                              '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' },
                            }}
                          >
                            {flag.claimNumber}
                          </Button>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{flag.flaggedBy}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 400 }}>{flag.notes}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{formatTimestamp(flag.timestamp)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Remove this flag" arrow>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={removingFlagId === flag.id}
                            onClick={() => handleRemoveFlag(flagsDialogAgent.id, flag.id)}
                          >
                            {removingFlagId === flag.id ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <RemoveCircleOutlineIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">No flags reported for this agent.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFlagsDialogAgent(null)} variant="outlined" color="inherit">Close</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AgentManagementPage;
