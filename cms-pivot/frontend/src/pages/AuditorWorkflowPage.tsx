// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HistoryIcon from '@mui/icons-material/History';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SecurityIcon from '@mui/icons-material/Security';
import SearchIcon from '@mui/icons-material/Search';
import BugReportIcon from '@mui/icons-material/BugReport';
import BuildIcon from '@mui/icons-material/Build';
import StorageIcon from '@mui/icons-material/Storage';
import CloudIcon from '@mui/icons-material/Cloud';
import DataObjectIcon from '@mui/icons-material/DataObject';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import BadgeIcon from '@mui/icons-material/Badge';
import TableChartIcon from '@mui/icons-material/TableChart';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { PageContainer } from '../components/layout/PageContainer';
import { useAuditorWorkflowContext } from '../contexts/AuditorWorkflowContext';
import { formatTimestamp } from '../utils/formatters';
import type {
  AuditorWorkflow,
  WorkflowCategory,
  WorkflowRun,
  WorkflowRunResult,
  WorkflowStatus,
  WorkflowStep,
  WorkflowStepType,
} from '../types';

/* ─── Constants ─── */

const CATEGORY_META: Record<WorkflowCategory, { label: string; icon: React.ReactNode; color: string }> = {
  claims_audit: { label: 'Claims Audit', icon: <AssignmentIcon />, color: '#1565C0' },
  compliance_review: { label: 'Compliance Review', icon: <GavelIcon />, color: '#6A1B9A' },
  financial_audit: { label: 'Financial Audit', icon: <AccountBalanceIcon />, color: '#2E7D32' },
  performance_audit: { label: 'Performance Audit', icon: <TrendingUpIcon />, color: '#E65100' },
  fraud_investigation: { label: 'Fraud Investigation', icon: <BugReportIcon />, color: '#C62828' },
  provider_audit: { label: 'Provider Audit', icon: <SearchIcon />, color: '#00695C' },
  it_security_audit: { label: 'IT Security Audit', icon: <SecurityIcon />, color: '#37474F' },
  custom: { label: 'Custom', icon: <BuildIcon />, color: '#5B616B' },
};

const STATUS_COLORS: Record<WorkflowStatus, { bg: string; text: string }> = {
  active: { bg: '#E8F5E9', text: '#2E7D32' },
  inactive: { bg: '#E0E0E0', text: '#616161' },
  draft: { bg: '#FFF3E0', text: '#E65100' },
  archived: { bg: '#FFEBEE', text: '#C62828' },
};

const STATUS_LABELS: Record<WorkflowStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  draft: 'Draft',
  archived: 'Archived',
};

const RUN_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: '#E8F5E9', text: '#2E7D32' },
  running: { bg: '#E3F2FD', text: '#1565C0' },
  pending: { bg: '#FFF3E0', text: '#E65100' },
  failed: { bg: '#FFEBEE', text: '#C62828' },
  cancelled: { bg: '#E0E0E0', text: '#616161' },
};

const STEP_TYPE_META: Record<WorkflowStepType, { label: string; icon: React.ReactNode }> = {
  data_collection: { label: 'Data Collection', icon: <StorageIcon sx={{ fontSize: 18 }} /> },
  ai_analysis: { label: 'AI Analysis', icon: <BugReportIcon sx={{ fontSize: 18 }} /> },
  compliance_check: { label: 'Compliance Check', icon: <GavelIcon sx={{ fontSize: 18 }} /> },
  summarization: { label: 'Summarization', icon: <DescriptionIcon sx={{ fontSize: 18 }} /> },
  risk_scoring: { label: 'Risk Scoring', icon: <TrendingUpIcon sx={{ fontSize: 18 }} /> },
  report_generation: { label: 'Report Generation', icon: <AssignmentIcon sx={{ fontSize: 18 }} /> },
  notification: { label: 'Notification', icon: <ScheduleIcon sx={{ fontSize: 18 }} /> },
  manual_review: { label: 'Manual Review', icon: <VisibilityIcon sx={{ fontSize: 18 }} /> },
};

interface DataSourceOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const DATA_SOURCES: DataSourceOption[] = [
  { id: 'bigquery', name: 'BigQuery', description: 'VA Claims Data Warehouse', icon: <CloudIcon />, color: '#4285F4' },
  { id: 'va_claims_db', name: 'VA Claims DB', description: 'Primary claims processing database', icon: <StorageIcon />, color: '#112E51' },
  { id: 'medical_records', name: 'Medical Records API', description: 'VistA / Cerner EHR integration', icon: <LocalHospitalIcon />, color: '#E31C3D' },
  { id: 'vbms', name: 'VBMS', description: 'Veterans Benefits Management System', icon: <BadgeIcon />, color: '#8B6914' },
  { id: 'fee_schedule', name: 'Fee Schedule DB', description: 'CMS & VA fee schedule tables', icon: <TableChartIcon />, color: '#5B616B' },
  { id: 'npi_registry', name: 'NPI Registry', description: 'National Provider Identifier lookup', icon: <DataObjectIcon />, color: '#0071BC' },
  { id: 'document_store', name: 'Document Store', description: 'Scanned forms, DBQs, and supporting docs', icon: <DescriptionIcon />, color: '#CD2026' },
];

const WIZARD_STEPS = ['Workflow Info', 'Steps', 'Data Sources', 'Schedule', 'Review'];

/* ─── Form state ─── */
interface WorkflowForm {
  name: string;
  description: string;
  category: WorkflowCategory;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  dataSources: string[];
  scheduleEnabled: boolean;
  scheduleCron: string;
  scheduleTimezone: string;
  tags: string[];
  tagInput: string;
  createdBy: string;
}

const EMPTY_FORM: WorkflowForm = {
  name: '',
  description: '',
  category: 'claims_audit',
  status: 'draft',
  steps: [],
  dataSources: ['bigquery'],
  scheduleEnabled: false,
  scheduleCron: '0 6 * * 1',
  scheduleTimezone: 'America/New_York',
  tags: [],
  tagInput: '',
  createdBy: 'Current User',
};

const EMPTY_STEP: Omit<WorkflowStep, 'id' | 'order'> = {
  name: '',
  type: 'data_collection',
  description: '',
  config: {},
};

/* ─── Component ─── */

const AuditorWorkflowPage: React.FC = () => {
  const {
    workflows,
    runs,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflowStatus,
    executeWorkflow,
    getRunsForWorkflow,
  } = useAuditorWorkflowContext();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkflowForm>(EMPTY_FORM);
  const [activeStep, setActiveStep] = useState(0);

  // Step editor
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);
  const [stepForm, setStepForm] = useState<Omit<WorkflowStep, 'id' | 'order'>>(EMPTY_STEP);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Run results dialog
  const [viewRunDialogOpen, setViewRunDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);

  // Run history dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyWorkflowId, setHistoryWorkflowId] = useState<string | null>(null);

  // Execution state
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredWorkflows = useMemo(() => {
    let result = [...workflows];
    if (statusFilter !== 'all') result = result.filter((w) => w.status === statusFilter);
    if (categoryFilter !== 'all') result = result.filter((w) => w.category === categoryFilter);
    return result;
  }, [workflows, statusFilter, categoryFilter]);

  /* ─── Dialog handlers ─── */

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setActiveStep(0);
    setDialogOpen(true);
  };

  const handleOpenEdit = (workflow: AuditorWorkflow) => {
    setEditingId(workflow.id);
    setForm({
      name: workflow.name,
      description: workflow.description,
      category: workflow.category,
      status: workflow.status,
      steps: [...workflow.steps],
      dataSources: [...workflow.dataSources],
      scheduleEnabled: workflow.schedule.enabled,
      scheduleCron: workflow.schedule.cron,
      scheduleTimezone: workflow.schedule.timezone,
      tags: [...workflow.tags],
      tagInput: '',
      createdBy: workflow.createdBy,
    });
    setActiveStep(0);
    setDialogOpen(true);
  };

  const handleDuplicate = (workflow: AuditorWorkflow) => {
    setEditingId(null);
    setForm({
      name: `${workflow.name} (Copy)`,
      description: workflow.description,
      category: workflow.category,
      status: 'draft',
      steps: workflow.steps.map((s, i) => ({ ...s, id: `s${i + 1}-${Date.now()}` })),
      dataSources: [...workflow.dataSources],
      scheduleEnabled: false,
      scheduleCron: workflow.schedule.cron,
      scheduleTimezone: workflow.schedule.timezone,
      tags: [...workflow.tags],
      tagInput: '',
      createdBy: 'Current User',
    });
    setActiveStep(0);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setActiveStep(0);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const workflowData = {
      name: form.name,
      description: form.description,
      category: form.category,
      status: form.status,
      steps: form.steps,
      schedule: {
        enabled: form.scheduleEnabled,
        cron: form.scheduleCron,
        timezone: form.scheduleTimezone,
        nextRun: form.scheduleEnabled ? new Date(Date.now() + 86400000).toISOString() : null,
        lastRun: null,
      },
      dataSources: form.dataSources,
      createdBy: form.createdBy,
      tags: form.tags,
    };

    if (editingId) {
      updateWorkflow(editingId, workflowData);
    } else {
      addWorkflow(workflowData as Omit<AuditorWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'runCount'>);
    }
    handleCloseDialog();
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      deleteWorkflow(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  /* ─── Execution ─── */

  const handleExecute = async (workflowId: string) => {
    setExecutingIds((prev) => new Set(prev).add(workflowId));
    try {
      const run = await executeWorkflow(workflowId);
      setSelectedRun(run);
      setViewRunDialogOpen(true);
    } finally {
      setExecutingIds((prev) => {
        const next = new Set(prev);
        next.delete(workflowId);
        return next;
      });
    }
  };

  /* ─── Step management ─── */

  const handleOpenAddStep = () => {
    setEditingStepIdx(null);
    setStepForm(EMPTY_STEP);
    setStepDialogOpen(true);
  };

  const handleOpenEditStep = (idx: number) => {
    const step = form.steps[idx];
    setEditingStepIdx(idx);
    setStepForm({ name: step.name, type: step.type, description: step.description, config: step.config });
    setStepDialogOpen(true);
  };

  const handleSaveStep = () => {
    if (!stepForm.name.trim()) return;
    setForm((prev) => {
      const steps = [...prev.steps];
      if (editingStepIdx !== null) {
        steps[editingStepIdx] = { ...steps[editingStepIdx], ...stepForm };
      } else {
        steps.push({
          ...stepForm,
          id: `s${steps.length + 1}-${Date.now()}`,
          order: steps.length + 1,
        });
      }
      return { ...prev, steps };
    });
    setStepDialogOpen(false);
  };

  const handleDeleteStep = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })),
    }));
  };

  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    setForm((prev) => {
      const steps = [...prev.steps];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= steps.length) return prev;
      [steps[idx], steps[targetIdx]] = [steps[targetIdx], steps[idx]];
      return { ...prev, steps: steps.map((s, i) => ({ ...s, order: i + 1 })) };
    });
  };

  /* ─── Tags ─── */
  const handleAddTag = () => {
    const tag = form.tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag], tagInput: '' }));
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const toggleDataSource = (id: string) => {
    setForm((prev) => ({
      ...prev,
      dataSources: prev.dataSources.includes(id)
        ? prev.dataSources.filter((d) => d !== id)
        : [...prev.dataSources, id],
    }));
  };

  const updateForm = useCallback(<K extends keyof WorkflowForm>(key: K, value: WorkflowForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* ─── View run history ─── */
  const handleOpenHistory = (workflowId: string) => {
    setHistoryWorkflowId(workflowId);
    setHistoryDialogOpen(true);
  };

  const handleViewRun = (run: WorkflowRun) => {
    setSelectedRun(run);
    setHistoryDialogOpen(false);
    setViewRunDialogOpen(true);
  };

  /* ─── Wizard step renderers ─── */

  const renderStepInfo = () => (
    <Stack spacing={2.5}>
      <TextField
        fullWidth
        label="Workflow Name"
        value={form.name}
        onChange={(e) => updateForm('name', e.target.value)}
        placeholder="e.g. Claims Compliance Audit"
      />
      <TextField
        fullWidth
        label="Description"
        value={form.description}
        onChange={(e) => updateForm('description', e.target.value)}
        placeholder="Describe the purpose and scope of this audit workflow"
        multiline
        rows={3}
      />

      <Typography variant="subtitle2" fontWeight={700}>Audit Category</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
        {(Object.entries(CATEGORY_META) as [WorkflowCategory, typeof CATEGORY_META[WorkflowCategory]][]).map(
          ([value, meta]) => (
            <Card
              key={value}
              variant="outlined"
              sx={{
                borderColor: form.category === value ? meta.color : 'divider',
                borderWidth: form.category === value ? 2 : 1,
                backgroundColor: form.category === value ? alpha(meta.color, 0.04) : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <CardActionArea onClick={() => updateForm('category', value)} sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ color: form.category === value ? meta.color : '#9E9E9E' }}>{meta.icon}</Box>
                  <Typography variant="body2" fontWeight={600}>{meta.label}</Typography>
                </Stack>
              </CardActionArea>
            </Card>
          ),
        )}
      </Box>

      <FormControl fullWidth size="small">
        <InputLabel>Initial Status</InputLabel>
        <Select
          value={form.status}
          label="Initial Status"
          onChange={(e: SelectChangeEvent) => updateForm('status', e.target.value as WorkflowStatus)}
        >
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        size="small"
        label="Created By"
        value={form.createdBy}
        onChange={(e) => updateForm('createdBy', e.target.value)}
      />

      {/* Tags */}
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Tags</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {form.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" onDelete={() => handleRemoveTag(tag)} />
          ))}
          <TextField
            size="small"
            placeholder="Add tag..."
            value={form.tagInput}
            onChange={(e) => updateForm('tagInput', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
            sx={{ width: 140 }}
          />
          <Button size="small" onClick={handleAddTag} disabled={!form.tagInput.trim()}>Add</Button>
        </Stack>
      </Box>
    </Stack>
  );

  const renderStepSteps = () => (
    <Stack spacing={2}>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>Workflow Steps</Typography>
            <Typography variant="caption" color="text.secondary">
              Define the sequence of steps this audit workflow will execute.
            </Typography>
          </Box>
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleOpenAddStep}
            sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#112E51', color: '#112E51' }}>
            Add Step
          </Button>
        </Stack>
      </Box>

      {form.steps.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
          <Typography color="text.secondary">No steps defined yet. Add steps to build your audit workflow.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {form.steps.map((step, idx) => (
            <Paper key={step.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Chip label={idx + 1} size="small" sx={{ width: 28, height: 28, fontWeight: 700, backgroundColor: '#112E51', color: 'white' }} />
                <Box sx={{ color: '#5B616B' }}>{STEP_TYPE_META[step.type]?.icon}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>{step.name}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={STEP_TYPE_META[step.type]?.label || step.type} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                    <Typography variant="caption" color="text.secondary" noWrap>{step.description}</Typography>
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.25}>
                  <IconButton size="small" onClick={() => handleMoveStep(idx, 'up')} disabled={idx === 0}>
                    <ArrowBackIcon sx={{ fontSize: 16, transform: 'rotate(90deg)' }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleMoveStep(idx, 'down')} disabled={idx === form.steps.length - 1}>
                    <ArrowForwardIcon sx={{ fontSize: 16, transform: 'rotate(90deg)' }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleOpenEditStep(idx)}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                  <IconButton size="small" onClick={() => handleDeleteStep(idx)} color="error"><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );

  const renderStepDataSources = () => (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Connect Data Sources</Typography>
        <Typography variant="caption" color="text.secondary">
          Select the data sources this workflow can query during audit execution.
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
                      width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
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

  const renderStepSchedule = () => (
    <Stack spacing={3}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <ScheduleIcon sx={{ fontSize: 20, color: '#112E51' }} />
            <Typography variant="subtitle2" fontWeight={700}>Schedule</Typography>
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={form.scheduleEnabled}
                onChange={(e) => updateForm('scheduleEnabled', e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="caption">{form.scheduleEnabled ? 'Enabled' : 'Disabled'}</Typography>}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Schedule this workflow to run automatically on a recurring basis.
        </Typography>
      </Box>

      <Collapse in={form.scheduleEnabled}>
        <Stack spacing={2} sx={{ p: 2, backgroundColor: '#F5F5F5', borderRadius: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Cron Expression"
            value={form.scheduleCron}
            onChange={(e) => updateForm('scheduleCron', e.target.value)}
            placeholder="0 6 * * 1"
            sx={{ '& .MuiOutlinedInput-root': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            helperText="Standard cron. Examples: 0 6 * * 1 (Mon 6am), 0 2 1 * * (1st of month 2am)"
          />
          <FormControl fullWidth size="small">
            <InputLabel>Timezone</InputLabel>
            <Select
              value={form.scheduleTimezone}
              label="Timezone"
              onChange={(e: SelectChangeEvent) => updateForm('scheduleTimezone', e.target.value)}
            >
              <MenuItem value="America/New_York">Eastern (ET)</MenuItem>
              <MenuItem value="America/Chicago">Central (CT)</MenuItem>
              <MenuItem value="America/Denver">Mountain (MT)</MenuItem>
              <MenuItem value="America/Los_Angeles">Pacific (PT)</MenuItem>
              <MenuItem value="UTC">UTC</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Collapse>

      <Divider />

      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Manual Execution</Typography>
        <Typography variant="caption" color="text.secondary">
          This workflow can always be triggered manually regardless of schedule settings. Use the play button on the workflow table to run on demand.
        </Typography>
      </Box>
    </Stack>
  );

  const renderStepReview = () => (
    <Stack spacing={2.5}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>Workflow Info</Typography>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 0.5 }}>{form.name || '(Unnamed)'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{form.description || 'No description'}</Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              icon={<>{CATEGORY_META[form.category]?.icon}</>}
              label={CATEGORY_META[form.category]?.label}
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

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>Steps ({form.steps.length})</Typography>
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {form.steps.slice(0, 5).map((step, idx) => (
              <Stack key={step.id} direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" fontWeight={700} sx={{ width: 16 }}>{idx + 1}.</Typography>
                <Typography variant="caption">{step.name}</Typography>
              </Stack>
            ))}
            {form.steps.length > 5 && (
              <Typography variant="caption" color="text.secondary">+{form.steps.length - 5} more steps</Typography>
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>Data Sources</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {form.dataSources.map((dsId) => {
              const ds = DATA_SOURCES.find((d) => d.id === dsId);
              return ds ? <Chip key={dsId} label={ds.name} size="small" sx={{ fontSize: '0.7rem' }} /> : null;
            })}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>Schedule</Typography>
          <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
            {form.scheduleEnabled ? 'Scheduled' : 'Manual Only'}
          </Typography>
          {form.scheduleEnabled && (
            <Typography variant="caption" color="text.secondary">
              Cron: {form.scheduleCron} ({form.scheduleTimezone})
            </Typography>
          )}
        </Paper>
      </Box>

      {form.tags.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {form.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Stack>
      )}
    </Stack>
  );

  const stepContent = [renderStepInfo, renderStepSteps, renderStepDataSources, renderStepSchedule, renderStepReview];

  /* ─── Result status icon ─── */
  const getResultIcon = (status: WorkflowRunResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircleIcon sx={{ fontSize: 18, color: '#2E7D32' }} />;
      case 'warning': return <WarningAmberIcon sx={{ fontSize: 18, color: '#E65100' }} />;
      case 'error': return <ErrorOutlineIcon sx={{ fontSize: 18, color: '#C62828' }} />;
      case 'skipped': return <StopIcon sx={{ fontSize: 18, color: '#9E9E9E' }} />;
    }
  };

  /* ─── Main render ─── */
  return (
    <PageContainer
      title="Auditor Workflows"
      subtitle="Create, configure, schedule, and execute audit workflows for VA payment integrity"
      action={
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
          Create Workflow
        </Button>
      }
    >
      {/* Summary chips */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Chip label={`${workflows.length} Total`} size="small" sx={{ fontWeight: 600 }} />
        <Chip
          label={`${workflows.filter((w) => w.status === 'active').length} Active`}
          size="small"
          sx={{ backgroundColor: STATUS_COLORS.active.bg, color: STATUS_COLORS.active.text, fontWeight: 600 }}
        />
        <Chip
          label={`${workflows.filter((w) => w.schedule.enabled).length} Scheduled`}
          size="small"
          icon={<ScheduleIcon sx={{ fontSize: 16 }} />}
          sx={{ backgroundColor: '#E3F2FD', color: '#1565C0', fontWeight: 600 }}
        />
        <Chip
          label={`${runs.filter((r) => r.status === 'completed').length} Completed Runs`}
          size="small"
          icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
          sx={{ backgroundColor: '#E8F5E9', color: '#2E7D32', fontWeight: 600 }}
        />
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}>
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Category</InputLabel>
          <Select value={categoryFilter} label="Category" onChange={(e: SelectChangeEvent) => setCategoryFilter(e.target.value)}>
            <MenuItem value="all">All Categories</MenuItem>
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <MenuItem key={key} value={key}>{meta.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Workflows Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>Workflow</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Steps</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Schedule</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Runs</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Last Run</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredWorkflows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No workflows match the current filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredWorkflows.map((workflow) => {
                const catMeta = CATEGORY_META[workflow.category];
                const isExecuting = executingIds.has(workflow.id);
                return (
                  <TableRow key={workflow.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ color: catMeta.color }}>{catMeta.icon}</Box>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{workflow.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 260 }} noWrap>
                            {workflow.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={catMeta.label} size="small" variant="outlined"
                        sx={{ fontSize: '0.7rem', borderColor: catMeta.color, color: catMeta.color }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={workflow.steps.length} size="small" sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[workflow.status]}
                        size="small"
                        sx={{
                          backgroundColor: STATUS_COLORS[workflow.status].bg,
                          color: STATUS_COLORS[workflow.status].text,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {workflow.schedule.enabled ? (
                        <Tooltip title={`Cron: ${workflow.schedule.cron}`}>
                          <Chip icon={<ScheduleIcon sx={{ fontSize: 14 }} />} label="Scheduled" size="small"
                            sx={{ fontSize: '0.7rem', backgroundColor: '#E3F2FD', color: '#1565C0' }} />
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.disabled">Manual</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{workflow.runCount}</Typography>
                    </TableCell>
                    <TableCell>
                      {workflow.lastRunAt ? (
                        <Typography variant="caption" color="text.secondary">{formatTimestamp(workflow.lastRunAt)}</Typography>
                      ) : (
                        <Typography variant="caption" color="text.disabled">Never</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.25} justifyContent="center">
                        <Tooltip title={isExecuting ? 'Running...' : 'Execute'}>
                          <span>
                            <IconButton size="small" onClick={() => handleExecute(workflow.id)}
                              disabled={isExecuting || workflow.status === 'archived'}
                              sx={{ color: '#2E7D32' }}>
                              {isExecuting ? <CircularProgress size={16} /> : <PlayArrowIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={workflow.status === 'active' ? 'Deactivate' : 'Activate'}>
                          <IconButton size="small" onClick={() => toggleWorkflowStatus(workflow.id)}
                            sx={{ color: workflow.status === 'active' ? '#E65100' : '#2E7D32' }}>
                            <PowerSettingsNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Run History">
                          <IconButton size="small" onClick={() => handleOpenHistory(workflow.id)}>
                            <HistoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenEdit(workflow)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Duplicate">
                          <IconButton size="small" onClick={() => handleDuplicate(workflow)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setDeleteConfirmId(workflow.id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Showing {filteredWorkflows.length} of {workflows.length} workflows
      </Typography>

      {/* ═══════════ Create / Edit Workflow — Multi-step Wizard ═══════════ */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 2, minHeight: 560 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#112E51', pb: 0 }}>
          {editingId ? 'Edit Workflow' : 'Create New Audit Workflow'}
        </DialogTitle>

        <Box sx={{ px: 3, pt: 2, pb: 1 }}>
          <Stepper activeStep={activeStep} alternativeLabel nonLinear>
            {WIZARD_STEPS.map((label, idx) => (
              <Step key={label} completed={idx < activeStep}>
                <StepLabel onClick={() => setActiveStep(idx)}
                  sx={{
                    cursor: 'pointer',
                    '& .MuiStepLabel-label': { fontSize: '0.8rem', fontWeight: 600 },
                    '& .MuiStepIcon-root.Mui-active': { color: '#112E51' },
                    '& .MuiStepIcon-root.Mui-completed': { color: '#2E8540' },
                  }}>
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
            variant="outlined" color="inherit"
            startIcon={activeStep > 0 ? <ArrowBackIcon /> : undefined}>
            {activeStep === 0 ? 'Cancel' : 'Back'}
          </Button>

          {activeStep < WIZARD_STEPS.length - 1 ? (
            <Button onClick={() => setActiveStep((s) => s + 1)} variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{ backgroundColor: '#112E51', '&:hover': { backgroundColor: '#1A4480' } }}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSave} variant="contained" disabled={!form.name.trim()}
              startIcon={<CheckCircleIcon />}
              sx={{ backgroundColor: '#2E8540', '&:hover': { backgroundColor: '#267236' } }}>
              {editingId ? 'Save Changes' : 'Create Workflow'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ═══════════ Step Editor Dialog ═══════════ */}
      <Dialog open={stepDialogOpen} onClose={() => setStepDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#112E51' }}>
          {editingStepIdx !== null ? 'Edit Step' : 'Add Step'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="Step Name" value={stepForm.name}
              onChange={(e) => setStepForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Collect Claims Data" />
            <FormControl fullWidth size="small">
              <InputLabel>Step Type</InputLabel>
              <Select value={stepForm.type} label="Step Type"
                onChange={(e: SelectChangeEvent) => setStepForm((prev) => ({ ...prev, type: e.target.value as WorkflowStepType }))}>
                {Object.entries(STEP_TYPE_META).map(([key, meta]) => (
                  <MenuItem key={key} value={key}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {meta.icon}
                      <span>{meta.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth label="Description" multiline rows={3} value={stepForm.description}
              onChange={(e) => setStepForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this step does" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStepDialogOpen(false)} variant="outlined" color="inherit">Cancel</Button>
          <Button onClick={handleSaveStep} variant="contained" disabled={!stepForm.name.trim()}
            sx={{ backgroundColor: '#112E51', '&:hover': { backgroundColor: '#1A4480' } }}>
            {editingStepIdx !== null ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ Delete Confirmation Dialog ═══════════ */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#E31C3D' }}>Delete Workflow</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete this workflow? This action cannot be undone. All run history will also be removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirmId(null)} variant="outlined" color="inherit">Cancel</Button>
          <Button onClick={handleDelete} variant="contained"
            sx={{ backgroundColor: '#E31C3D', '&:hover': { backgroundColor: '#C4192F' } }}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ View Run Results Dialog ═══════════ */}
      <Dialog open={viewRunDialogOpen} onClose={() => setViewRunDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#112E51' }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <AssignmentIcon />
              <span>Workflow Run Results</span>
            </Stack>
            {selectedRun && (
              <Chip
                label={selectedRun.status}
                size="small"
                sx={{
                  backgroundColor: RUN_STATUS_COLORS[selectedRun.status]?.bg,
                  color: RUN_STATUS_COLORS[selectedRun.status]?.text,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedRun && (
            <Stack spacing={2}>
              {/* Run metadata */}
              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Triggered By</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>{selectedRun.triggeredBy}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Started</Typography>
                  <Typography variant="body2">{formatTimestamp(selectedRun.startedAt)}</Typography>
                </Box>
                {selectedRun.completedAt && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Completed</Typography>
                    <Typography variant="body2">{formatTimestamp(selectedRun.completedAt)}</Typography>
                  </Box>
                )}
              </Stack>

              {/* Summary */}
              {selectedRun.summary && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, backgroundColor: '#F8F9FA' }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>Summary</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{selectedRun.summary}</Typography>
                </Paper>
              )}

              {/* Step results */}
              <Typography variant="subtitle2" fontWeight={700}>Step Results</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Step</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Output</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 90 }}>Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedRun.results.map((result, idx) => (
                      <TableRow key={result.stepId}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{result.stepName}</Typography>
                        </TableCell>
                        <TableCell>{getResultIcon(result.status)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>{result.output}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {(result.duration_ms / 1000).toFixed(1)}s
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Running indicator */}
              {selectedRun.status === 'running' && (
                <Box>
                  <LinearProgress sx={{ borderRadius: 1 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    Executing step {selectedRun.results.length + 1}...
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewRunDialogOpen(false)} variant="outlined" color="inherit">Close</Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ Run History Dialog ═══════════ */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#112E51' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <HistoryIcon />
            <span>Run History</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {historyWorkflowId && (() => {
            const wfRuns = getRunsForWorkflow(historyWorkflowId);
            if (wfRuns.length === 0) {
              return <Typography variant="body2" color="text.secondary">No runs recorded for this workflow.</Typography>;
            }
            return (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Run ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Triggered By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Started</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Steps</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">View</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {wfRuns.map((run) => (
                      <TableRow key={run.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{run.id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={run.status}
                            size="small"
                            sx={{
                              backgroundColor: RUN_STATUS_COLORS[run.status]?.bg,
                              color: RUN_STATUS_COLORS[run.status]?.text,
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{run.triggeredBy}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{formatTimestamp(run.startedAt)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {run.results.length} ({run.results.filter((r) => r.status === 'warning').length} warnings)
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => handleViewRun(run)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setHistoryDialogOpen(false)} variant="outlined" color="inherit">Close</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AuditorWorkflowPage;
