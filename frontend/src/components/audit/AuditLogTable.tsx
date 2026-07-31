// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Collapse,
  Button,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import apiClient from '../../services/apiClient';
import { formatTimestamp } from '../../utils/formatters';
import { AuditEntry } from '../../types';
import ClaimHoverPopover from './ClaimHoverPopover';

const ACTION_TYPE_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'finding', label: 'Finding' },
  { value: 'decision', label: 'Decision' },
  { value: 'chat', label: 'Chat' },
  { value: 'batch_event', label: 'Batch Event' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'system', label: 'System (Login/Logout)' },
];

const ACTION_CHIP_COLORS: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default' | 'primary' | 'secondary'> = {
  finding: 'warning',
  decision: 'success',
  chat: 'info',
  batch_event: 'primary',
  ticket: 'secondary',
  system: 'default',
};

interface AuditRowProps {
  entry: AuditEntry;
}

const AuditRow: React.FC<AuditRowProps> = ({ entry }) => {
  const [open, setOpen] = useState(false);

  const summaryText = entry.details
    ? JSON.stringify(entry.details).slice(0, 50) + (JSON.stringify(entry.details).length > 50 ? '...' : '')
    : '--';

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#F0F6FC' } }}
        onClick={() => setOpen(!open)}
      >
        <TableCell sx={{ width: 40, p: 0.5 }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {open ? (
              <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
            ) : (
              <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>
          {formatTimestamp(entry.timestamp)}
        </TableCell>
        <TableCell sx={{ fontSize: 13 }}>
          {entry.actor}
        </TableCell>
        <TableCell>
          <Chip
            label={entry.action_type}
            size="small"
            color={ACTION_CHIP_COLORS[entry.action_type] || 'default'}
            sx={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}
          />
        </TableCell>
        <TableCell sx={{ fontSize: 13 }} onClick={(e) => e.stopPropagation()}>
          {entry.claim_id ? (
            <ClaimHoverPopover claimId={entry.claim_id}>
              <Typography
                variant="body2"
                component="span"
                sx={{
                  color: '#003F72',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {entry.claim_id}
              </Typography>
            </ClaimHoverPopover>
          ) : (
            '--'
          )}
        </TableCell>
        <TableCell sx={{ fontSize: 12, color: '#5B616B', maxWidth: 200 }}>
          {summaryText}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 2 }}>
              <Typography variant="caption" fontWeight={600} sx={{ color: '#5B616B', mb: 1, display: 'block' }}>
                Full Details
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5, color: '#112E51' }}>
                Actor: <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>{entry.actor}</Typography>
                {' '}
                <Chip label={entry.actor_type} size="small" sx={{ fontSize: 10, height: 20, ml: 0.5 }} />
              </Typography>
              {entry.claim_id && (
                <Typography variant="body2" sx={{ mb: 0.5, color: '#112E51' }}>
                  Claim ID: <Typography component="span" variant="body2" sx={{ fontWeight: 600, color: '#003F72' }}>{entry.claim_id}</Typography>
                </Typography>
              )}
              {entry.confidence_score !== null && (
                <Typography variant="body2" sx={{ mb: 0.5, color: '#112E51' }}>
                  Confidence Score: {entry.confidence_score}%
                </Typography>
              )}
              {entry.details && typeof entry.details === 'object' && 'role' in entry.details && (
                <Typography variant="body2" sx={{ mb: 0.5, color: '#112E51' }}>
                  Role: <Chip label={String(entry.details.role)} size="small" color="primary" sx={{ fontSize: 10, height: 20 }} />
                </Typography>
              )}
              <Box
                component="pre"
                sx={{
                  backgroundColor: '#1a1a2e',
                  color: '#E0E0E0',
                  p: 2,
                  borderRadius: 1,
                  fontSize: 12,
                  fontFamily: '"Fira Code", "Consolas", monospace',
                  overflow: 'auto',
                  maxHeight: 300,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {JSON.stringify(entry.details, null, 2)}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const AuditLogTable: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [filterActor, setFilterActor] = useState('');
  const [filterActionType, setFilterActionType] = useState('');
  const [filterClaimId, setFilterClaimId] = useState('');

  const PAGE_SIZE = 25;

  const fetchEntries = useCallback(async (newOffset: number, append: boolean) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset: newOffset,
      };
      if (filterActor.trim()) params.actor = filterActor.trim();
      if (filterActionType) params.action_type = filterActionType;
      if (filterClaimId.trim()) params.claim_id = filterClaimId.trim();

      const response = await apiClient.get('/audit-log', { params });
      const raw = response.data;

      let newEntries: AuditEntry[] = [];
      if (Array.isArray(raw)) {
        newEntries = raw;
      } else if (raw && Array.isArray(raw.entries)) {
        newEntries = raw.entries;
      } else if (raw && Array.isArray(raw.data)) {
        newEntries = raw.data;
      }

      if (append) {
        setEntries((prev) => [...prev, ...newEntries]);
      } else {
        setEntries(newEntries);
      }

      setHasMore(newEntries.length >= PAGE_SIZE);
      setOffset(newOffset + newEntries.length);
    } catch {
      setError('Failed to load audit log entries.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterActor, filterActionType, filterClaimId]);

  useEffect(() => {
    setOffset(0);
    fetchEntries(0, false);
  }, [fetchEntries]);

  const handleLoadMore = () => {
    fetchEntries(offset, true);
  };

  const handleActionTypeChange = (event: SelectChangeEvent<string>) => {
    setFilterActionType(event.target.value);
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <TextField
          size="small"
          label="Filter by Actor"
          value={filterActor}
          onChange={(e) => setFilterActor(e.target.value)}
          sx={{ minWidth: 180 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="action-type-filter-label">Action Type</InputLabel>
          <Select
            labelId="action-type-filter-label"
            value={filterActionType}
            label="Action Type"
            onChange={handleActionTypeChange}
          >
            {ACTION_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Filter by Claim ID"
          value={filterClaimId}
          onChange={(e) => setFilterClaimId(e.target.value)}
          sx={{ minWidth: 180 }}
        />
      </Stack>

      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: '#003F72' }} />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F0F6FC' }}>
                  <TableCell sx={{ width: 40 }} />
                  <TableCell sx={{ fontWeight: 700, color: '#112E51', fontSize: 13 }}>
                    Timestamp
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#112E51', fontSize: 13 }}>
                    Actor
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#112E51', fontSize: 13 }}>
                    Action Type
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#112E51', fontSize: 13 }}>
                    Claim ID
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#112E51', fontSize: 13 }}>
                    Summary
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#5B616B' }}>
                      No audit log entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <AuditRow key={entry.id} entry={entry} />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {hasMore && entries.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={loadingMore}
                startIcon={loadingMore ? <CircularProgress size={16} /> : undefined}
                sx={{
                  textTransform: 'none',
                  color: '#003F72',
                  borderColor: '#003F72',
                }}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default AuditLogTable;
