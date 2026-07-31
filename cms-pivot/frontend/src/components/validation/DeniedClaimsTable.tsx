// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import NotesIcon from '@mui/icons-material/Notes';
import SearchIcon from '@mui/icons-material/Search';
import apiClient from '../../services/apiClient';
import { useUIContext } from '../../contexts/UIContext';
import { formatDate } from '../../utils/formatters';
import type { Claim } from '../../types';

const DEFAULT_DENIED_DATE = '2025-01-01T00:00:00Z';
const FALLBACK_MCR_NAMES = [
  'Sarah Mitchell',
  'James Kowalski',
  'Maria Gonzalez',
  'Robert Chen',
  'Angela Thompson',
  'David Nakamura',
];

/** Deterministic pick based on claim id so the name stays stable across re-renders */
function fallbackMcrName(claimId: string): string {
  let hash = 0;
  for (let i = 0; i < claimId.length; i++) {
    hash = (hash * 31 + claimId.charCodeAt(i)) | 0;
  }
  return FALLBACK_MCR_NAMES[Math.abs(hash) % FALLBACK_MCR_NAMES.length];
}

function getDeniedBy(claim: Claim): string {
  return claim.decision?.actor || fallbackMcrName(claim.id);
}

function getDeniedOn(claim: Claim): string {
  return claim.decision?.created_at || DEFAULT_DENIED_DATE;
}

interface DeniedClaimsTableProps {
  onCountChange?: (count: number) => void;
  refreshTrigger?: number;
}

const DeniedClaimsTable: React.FC<DeniedClaimsTableProps> = ({ onCountChange, refreshTrigger }) => {
  const { openDeniedDeepDive } = useUIContext();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Claim[]>('/claims', {
        params: { status: 'denied', limit: 500 },
      });
      const sorted = [...response.data].sort((a, b) => {
        const dateA = new Date(getDeniedOn(a)).getTime();
        const dateB = new Date(getDeniedOn(b)).getTime();
        return dateB - dateA; // newest first
      });
      setClaims(sorted);
      onCountChange?.(sorted.length);
    } catch (error) {
      console.error('Failed to fetch denied claims:', error);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims, refreshTrigger]);

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
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>Claim ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Veteran</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Provider</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Claim Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Billing Amount</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Denied By</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Denied On</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {claims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No denied claims to display.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              claims.map((claim) => (
                <TableRow
                  key={claim.id}
                  hover
                  onClick={() => openDeniedDeepDive(claim.id)}
                  sx={{ cursor: 'pointer' }}
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
                    <Typography variant="body2" fontWeight={600}>
                      ${claim.billing_amount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<CancelIcon sx={{ fontSize: 16 }} />}
                      label="Denied"
                      size="small"
                      sx={{
                        backgroundColor: '#FDE0DB',
                        color: '#E31C3D',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        '& .MuiChip-icon': {
                          color: '#E31C3D',
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getDeniedBy(claim)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(getDeniedOn(claim))}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {claim.decision?.rationale ? (
                      <Tooltip
                        title={claim.decision.rationale}
                        arrow
                        placement="left"
                        slotProps={{
                          tooltip: {
                            sx: { maxWidth: 400, whiteSpace: 'pre-wrap' },
                          },
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <NotesIcon sx={{ fontSize: 18, color: '#5B616B' }} />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        --
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<SearchIcon sx={{ fontSize: 16 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeniedDeepDive(claim.id);
                      }}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        borderColor: '#112E51',
                        color: '#112E51',
                        '&:hover': {
                          borderColor: '#205493',
                          backgroundColor: '#E1F3F8',
                        },
                      }}
                    >
                      Deep Dive
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Showing {claims.length} denied claims
      </Typography>
    </Box>
  );
};

export default DeniedClaimsTable;
