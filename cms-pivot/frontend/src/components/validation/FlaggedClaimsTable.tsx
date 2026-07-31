// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import apiClient from '../../services/apiClient';
import { useUIContext } from '../../contexts/UIContext';
import { AGENT_NAMES } from '../../utils/constants';
import { formatPercent } from '../../utils/formatters';
import RiskBadge from '../common/RiskBadge';
import AgentBadge from '../common/AgentBadge';
import type { Claim, AgentFinding } from '../../types';

type SortField = 'risk_level' | 'confidence' | 'provider';
type SortDirection = 'asc' | 'desc';

const riskOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };

interface FlaggedClaimsTableProps {
  onCountChange?: (count: number) => void;
  refreshTrigger?: number;
}

const FlaggedClaimsTable: React.FC<FlaggedClaimsTableProps> = ({ onCountChange, refreshTrigger }) => {
  const { openDeepDive } = useUIContext();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('risk_level');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Claim[]>('/claims', {
        params: { status: 'flagged', limit: 500 },
      });
      setClaims(response.data);
      onCountChange?.(response.data.length);
    } catch (error) {
      console.error('Failed to fetch flagged claims:', error);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims, refreshTrigger]);

  const getHighestConfidence = (findings?: AgentFinding[]): number => {
    if (!findings || findings.length === 0) return 0;
    return Math.max(...findings.map((f) => f.confidence_score));
  };

  const getFlaggingAgents = (findings?: AgentFinding[]): string[] => {
    if (!findings || findings.length === 0) return [];
    return findings
      .filter((f) => f.recommendation === 'flag')
      .map((f) => f.agent_name);
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...claims];

    if (riskFilter !== 'all') {
      result = result.filter((c) => c.risk_level === riskFilter);
    }

    if (agentFilter !== 'all') {
      result = result.filter((c) =>
        c.findings?.some(
          (f) => f.agent_name === agentFilter && f.recommendation === 'flag'
        )
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'risk_level':
          comparison =
            (riskOrder[a.risk_level ?? ''] ?? 0) -
            (riskOrder[b.risk_level ?? ''] ?? 0);
          break;
        case 'confidence':
          comparison =
            getHighestConfidence(a.findings) - getHighestConfidence(b.findings);
          break;
        case 'provider':
          comparison = (a.provider?.name ?? '').localeCompare(
            b.provider?.name ?? ''
          );
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [claims, riskFilter, agentFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRiskFilterChange = (event: SelectChangeEvent) => {
    setRiskFilter(event.target.value);
  };

  const handleAgentFilterChange = (event: SelectChangeEvent) => {
    setAgentFilter(event.target.value);
  };

  if (loading) {
    return (
      <Box>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Risk Level</InputLabel>
          <Select
            value={riskFilter}
            label="Risk Level"
            onChange={handleRiskFilterChange}
          >
            <MenuItem value="all">All Levels</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Flagging Agent</InputLabel>
          <Select
            value={agentFilter}
            label="Flagging Agent"
            onChange={handleAgentFilterChange}
          >
            <MenuItem value="all">All Agents</MenuItem>
            {Object.entries(AGENT_NAMES).map(([key, name]) => (
              <MenuItem key={key} value={key}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>Claim ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Veteran</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <TableSortLabel
                  active={sortField === 'provider'}
                  direction={sortField === 'provider' ? sortDirection : 'asc'}
                  onClick={() => handleSort('provider')}
                >
                  Provider
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Claim Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Flagging Agents</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <TableSortLabel
                  active={sortField === 'confidence'}
                  direction={sortField === 'confidence' ? sortDirection : 'asc'}
                  onClick={() => handleSort('confidence')}
                >
                  Confidence %
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <TableSortLabel
                  active={sortField === 'risk_level'}
                  direction={sortField === 'risk_level' ? sortDirection : 'asc'}
                  onClick={() => handleSort('risk_level')}
                >
                  Risk Level
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No flagged claims match the current filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSorted.map((claim) => {
                const flaggingAgents = getFlaggingAgents(claim.findings);
                const highestConf = getHighestConfidence(claim.findings);

                return (
                  <TableRow
                    key={claim.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => openDeepDive(claim.id)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {claim.claim_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {claim.veteran?.name_display ?? 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {claim.provider?.name ?? 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={claim.claim_type.charAt(0).toUpperCase() + claim.claim_type.slice(1)}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {flaggingAgents.map((agent) => (
                          <AgentBadge key={agent} agentName={agent} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={
                          highestConf >= 80
                            ? 'error.main'
                            : highestConf >= 50
                            ? 'warning.main'
                            : 'text.primary'
                        }
                      >
                        {formatPercent(highestConf)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {claim.risk_level ? (
                        <RiskBadge level={claim.risk_level} />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          --
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<OpenInNewIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeepDive(claim.id);
                        }}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Deep Dive
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Showing {filteredAndSorted.length} of {claims.length} flagged claims
      </Typography>
    </Box>
  );
};

export default FlaggedClaimsTable;
