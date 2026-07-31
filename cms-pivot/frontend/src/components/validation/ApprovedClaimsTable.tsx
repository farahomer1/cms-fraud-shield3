// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NotesIcon from '@mui/icons-material/Notes';
import apiClient from '../../services/apiClient';
import type { Claim } from '../../types';

interface ApprovedClaimsTableProps {
  onCountChange?: (count: number) => void;
  refreshTrigger?: number;
}

const ApprovedClaimsTable: React.FC<ApprovedClaimsTableProps> = ({ onCountChange, refreshTrigger }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Claim[]>('/claims', {
        params: { status: 'approved', limit: 500 },
      });
      setClaims(response.data);
      onCountChange?.(response.data.length);
    } catch (error) {
      console.error('Failed to fetch approved claims:', error);
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
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {claims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No approved claims to display.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              claims.map((claim) => (
                <TableRow key={claim.id} hover>
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
                    <Chip
                      icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
                      label="Routed to Payment"
                      size="small"
                      sx={{
                        backgroundColor: '#E7F4E4',
                        color: '#2E8540',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        '& .MuiChip-icon': {
                          color: '#2E8540',
                        },
                      }}
                    />
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
                        <IconButton size="small">
                          <NotesIcon sx={{ fontSize: 18, color: '#5B616B' }} />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        --
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Showing {claims.length} approved claims
      </Typography>
    </Box>
  );
};

export default ApprovedClaimsTable;
