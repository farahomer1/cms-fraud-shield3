// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Link,
  Paper,
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { listOverpayments, type Overpayment } from '../../services/overpaymentService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useUIContext } from '../../contexts/UIContext';
import OverpaymentDetailView from './OverpaymentDetail';

type SortField = 'date_identified' | 'overpayment_amount' | 'provider_name' | 'recoupment_status';
type SortDirection = 'asc' | 'desc';

interface OverpaymentTableProps {
  statusFilter: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  identified: { bg: '#E4E2E0', color: '#5B616B' },
  notified: { bg: '#D6E8F5', color: '#003F72' },
  in_recoupment: { bg: '#FFF8E1', color: '#8B6914' },
  recouped: { bg: '#E7F4E4', color: '#2E8540' },
  reconciled: { bg: '#C8E6C9', color: '#1B5E20' },
};

const STATUS_LABELS: Record<string, string> = {
  identified: 'Identified',
  notified: 'Notified',
  in_recoupment: 'In Recoupment',
  recouped: 'Recouped',
  reconciled: 'Reconciled',
};

const OverpaymentRow: React.FC<{ row: Overpayment }> = ({ row }) => {
  const [open, setOpen] = useState(false);
  const { openDeepDive } = useUIContext();
  const statusStyle = STATUS_COLORS[row.recoupment_status] ?? STATUS_COLORS.identified;

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell sx={{ width: 40, p: 0.5 }}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Link
            component="button"
            variant="body2"
            fontWeight={600}
            onClick={(e) => {
              e.stopPropagation();
              openDeepDive(row.claim_id);
            }}
            sx={{ textDecoration: 'none', color: '#003F72', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          >
            {row.claim_number}
          </Link>
        </TableCell>
        <TableCell>{row.provider_name}</TableCell>
        <TableCell>{row.provider_npi}</TableCell>
        <TableCell align="right">{formatCurrency(row.original_billing_amount)}</TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight={600} color="error.main">
            {formatCurrency(row.overpayment_amount)}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={STATUS_LABELS[row.recoupment_status] ?? row.recoupment_status}
            size="small"
            sx={{
              backgroundColor: statusStyle.bg,
              color: statusStyle.color,
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 24,
            }}
          />
        </TableCell>
        <TableCell>{formatDate(row.date_identified)}</TableCell>
        <TableCell>{row.fms_paid_date ? formatDate(row.fms_paid_date) : '—'}</TableCell>
        <TableCell>{row.assigned_analyst.split('@')[0].replace('.', ' ')}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell sx={{ py: 0 }} colSpan={10}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <OverpaymentDetailView overpaymentId={row.id} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const OverpaymentTable: React.FC<OverpaymentTableProps> = ({ statusFilter }) => {
  const [overpayments, setOverpayments] = useState<Overpayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('date_identified');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number | undefined> = {};
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const data = await listOverpayments(params);
      setOverpayments(data);
    } catch (error) {
      console.error('Failed to fetch overpayments:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const statusOrder: Record<string, number> = {
    identified: 1,
    notified: 2,
    in_recoupment: 3,
    recouped: 4,
    reconciled: 5,
  };

  const sortedData = useMemo(() => {
    const sorted = [...overpayments];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date_identified':
          comparison = new Date(a.date_identified).getTime() - new Date(b.date_identified).getTime();
          break;
        case 'overpayment_amount':
          comparison = a.overpayment_amount - b.overpayment_amount;
          break;
        case 'provider_name':
          comparison = a.provider_name.localeCompare(b.provider_name);
          break;
        case 'recoupment_status':
          comparison = (statusOrder[a.recoupment_status] ?? 0) - (statusOrder[b.recoupment_status] ?? 0);
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });
    return sorted;
  }, [overpayments, sortField, sortDirection]);

  if (loading) {
    return (
      <Box>
        {Array.from({ length: 8 }).map((_, i) => (
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
              <TableCell sx={{ width: 40 }} />
              <TableCell sx={{ fontWeight: 700 }}>Claim ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <TableSortLabel
                  active={sortField === 'provider_name'}
                  direction={sortField === 'provider_name' ? sortDirection : 'asc'}
                  onClick={() => handleSort('provider_name')}
                >
                  Provider Name
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>NPI</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Original Amount</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                <TableSortLabel
                  active={sortField === 'overpayment_amount'}
                  direction={sortField === 'overpayment_amount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('overpayment_amount')}
                >
                  Overpayment
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <TableSortLabel
                  active={sortField === 'recoupment_status'}
                  direction={sortField === 'recoupment_status' ? sortDirection : 'asc'}
                  onClick={() => handleSort('recoupment_status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <TableSortLabel
                  active={sortField === 'date_identified'}
                  direction={sortField === 'date_identified' ? sortDirection : 'asc'}
                  onClick={() => handleSort('date_identified')}
                >
                  Date Identified
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>FMS Paid</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Analyst</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No overpayment records match the current filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row) => <OverpaymentRow key={row.id} row={row} />)
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Showing {sortedData.length} overpayment records
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Total: {formatCurrency(sortedData.reduce((sum, r) => sum + r.overpayment_amount, 0))}
        </Typography>
      </Stack>
    </Box>
  );
};

export default OverpaymentTable;
