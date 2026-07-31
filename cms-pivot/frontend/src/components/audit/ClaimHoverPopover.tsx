// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Box, Popover, Typography, Chip, Divider } from '@mui/material';

interface ClaimHoverPopoverProps {
  claimId: string;
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Deterministic hash: produces a positive integer from a string
// ---------------------------------------------------------------------------
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ---------------------------------------------------------------------------
// Synthetic data generators (all deterministic from claimId)
// ---------------------------------------------------------------------------
const STATUSES: Array<'flagged' | 'approved' | 'pending'> = ['flagged', 'approved', 'pending'];
const RISK_LEVELS: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
const CLAIM_TYPES: Array<'medical' | 'disability' | 'pension' | 'dental'> = [
  'medical',
  'disability',
  'pension',
  'dental',
];

const FIRST_NAMES = [
  'James', 'Maria', 'Robert', 'Patricia', 'Michael', 'Jennifer',
  'David', 'Linda', 'Richard', 'Susan', 'Thomas', 'Karen',
  'Charles', 'Nancy', 'Joseph', 'Lisa', 'Daniel', 'Betty',
  'Matthew', 'Sandra',
];

const LAST_NAMES = [
  'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson',
  'Martin', 'Lee',
];

const PROVIDER_NAMES = [
  'VA Medical Center - Dallas',
  'VA Medical Center - Tampa',
  'VA Health Clinic - Phoenix',
  'VA Community Care - Denver',
  'VA Medical Center - Seattle',
  'VA Health Clinic - Atlanta',
  'VA Medical Center - Minneapolis',
  'VA Community Care - Boston',
  'VA Medical Center - San Diego',
  'VA Health Clinic - Chicago',
];

const REVIEWER_FIRST = [
  'Emily', 'Sarah', 'Andrew', 'Jessica', 'Brian', 'Amanda',
  'Kevin', 'Michelle', 'Steven', 'Stephanie',
];

const REVIEWER_LAST = [
  'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner',
  'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards',
];

function pick<T>(arr: T[], hash: number, salt: number = 0): T {
  return arr[((hash + salt) >>> 0) % arr.length];
}

function syntheticName(hash: number, salt: number): string {
  return `${pick(FIRST_NAMES, hash, salt)} ${pick(LAST_NAMES, hash, salt + 7)}`;
}

function syntheticReviewer(hash: number): string {
  return `${pick(REVIEWER_FIRST, hash, 3)} ${pick(REVIEWER_LAST, hash, 11)}`;
}

function syntheticDate(hash: number, salt: number): string {
  const year = 2023 + (hash % 3);
  const month = ((hash + salt) % 12) + 1;
  const day = ((hash + salt * 3) % 28) + 1;
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
}

function syntheticTimestamp(hash: number): string {
  const year = 2024 + (hash % 2);
  const month = ((hash + 5) % 12) + 1;
  const day = ((hash + 13) % 28) + 1;
  const hour = (hash % 24);
  const min = ((hash + 17) % 60);
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function syntheticAmount(hash: number): string {
  const base = 500 + ((hash * 7) % 49500); // $500 - $50,000
  const cents = (hash % 100);
  return `$${base.toLocaleString('en-US')}.${String(cents).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Color maps for chips
// ---------------------------------------------------------------------------
const STATUS_CHIP_COLORS: Record<string, { bg: string; color: string }> = {
  flagged: { bg: '#F9DEDE', color: '#E31C3D' },
  approved: { bg: '#E7F4E4', color: '#2E8540' },
  pending: { bg: '#E4E2E0', color: '#5B616B' },
};

const RISK_CHIP_COLORS: Record<string, { bg: string; color: string }> = {
  high: { bg: '#F9DEDE', color: '#E31C3D' },
  medium: { bg: '#FFF1D2', color: '#946300' },
  low: { bg: '#E7F4E4', color: '#2E8540' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const ClaimHoverPopover: React.FC<ClaimHoverPopoverProps> = ({ claimId, children }) => {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (enterTimer.current) clearTimeout(enterTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    // Cancel any pending close
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    enterTimer.current = setTimeout(() => {
      setOpen(true);
    }, 200);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Cancel any pending open
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    leaveTimer.current = setTimeout(() => {
      setOpen(false);
    }, 100);
  }, []);

  // Deterministic data
  const h = hashCode(claimId);
  const status = pick(STATUSES, h, 0);
  const riskLevel = pick(RISK_LEVELS, h, 1);
  const claimType = pick(CLAIM_TYPES, h, 2);
  const assignedTo = syntheticReviewer(h);
  const veteranName = syntheticName(h, 20);
  const providerName = pick(PROVIDER_NAMES, h, 4);
  const billingAmount = syntheticAmount(h);
  const serviceDate = syntheticDate(h, 30);
  const lastUpdated = syntheticTimestamp(h);

  const statusColors = STATUS_CHIP_COLORS[status];
  const riskColors = RISK_CHIP_COLORS[riskLevel];

  return (
    <>
      <Box
        component="span"
        ref={anchorRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{ display: 'inline', cursor: 'pointer' }}
      >
        {children ?? claimId}
      </Box>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableRestoreFocus
        sx={{
          pointerEvents: 'none',
        }}
        slotProps={{
          paper: {
            onMouseEnter: handleMouseEnter,
            onMouseLeave: handleMouseLeave,
            sx: {
              pointerEvents: 'auto',
              maxWidth: 320,
              p: 2,
              border: '1px solid #D6D7D9',
              borderRadius: 1.5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              backgroundColor: '#FFFFFF',
            },
          },
        }}
      >
        {/* Claim ID Header */}
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: '#112E51', fontSize: 14, mb: 1 }}
        >
          {claimId}
        </Typography>

        <Divider sx={{ mb: 1.5 }} />

        {/* Status */}
        <Row label="Status">
          <Chip
            label={status.charAt(0).toUpperCase() + status.slice(1)}
            size="small"
            sx={{
              backgroundColor: statusColors.bg,
              color: statusColors.color,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
              '& .MuiChip-label': { px: 1 },
            }}
          />
        </Row>

        {/* Assigned To */}
        <Row label="Assigned To">
          <Typography variant="body2" sx={{ color: '#112E51', fontSize: 13 }}>
            {assignedTo}
          </Typography>
        </Row>

        {/* Risk Level */}
        <Row label="Risk Level">
          <Chip
            label={riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
            size="small"
            sx={{
              backgroundColor: riskColors.bg,
              color: riskColors.color,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
              '& .MuiChip-label': { px: 1 },
            }}
          />
        </Row>

        {/* Claim Type */}
        <Row label="Claim Type">
          <Typography variant="body2" sx={{ color: '#112E51', fontSize: 13, textTransform: 'capitalize' }}>
            {claimType}
          </Typography>
        </Row>

        {/* Veteran */}
        <Row label="Veteran">
          <Typography variant="body2" sx={{ color: '#112E51', fontSize: 13 }}>
            {veteranName}
          </Typography>
        </Row>

        {/* Provider */}
        <Row label="Provider">
          <Typography variant="body2" sx={{ color: '#112E51', fontSize: 13 }}>
            {providerName}
          </Typography>
        </Row>

        {/* Billing Amount */}
        <Row label="Billing Amount">
          <Typography variant="body2" sx={{ color: '#112E51', fontSize: 13, fontWeight: 600 }}>
            {billingAmount}
          </Typography>
        </Row>

        {/* Service Date */}
        <Row label="Service Date">
          <Typography variant="body2" sx={{ color: '#112E51', fontSize: 13 }}>
            {serviceDate}
          </Typography>
        </Row>

        {/* Last Updated */}
        <Row label="Last Updated">
          <Typography variant="body2" sx={{ color: '#5B616B', fontSize: 12 }}>
            {lastUpdated}
          </Typography>
        </Row>
      </Popover>
    </>
  );
};

// ---------------------------------------------------------------------------
// Helper layout component for label-value rows
// ---------------------------------------------------------------------------
interface RowProps {
  label: string;
  children: React.ReactNode;
}

const Row: React.FC<RowProps> = ({ label, children }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
    <Typography
      variant="caption"
      sx={{ color: '#5B616B', fontWeight: 600, fontSize: 12, mr: 1, whiteSpace: 'nowrap' }}
    >
      {label}
    </Typography>
    <Box sx={{ textAlign: 'right' }}>{children}</Box>
  </Box>
);

export default React.memo(ClaimHoverPopover);
