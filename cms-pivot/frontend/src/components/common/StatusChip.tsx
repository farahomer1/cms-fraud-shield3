// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Chip } from '@mui/material';

interface StatusChipProps {
  status: string;
}

const statusColorMap: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#E4E2E0', color: '#5B616B' },
  parsing: { bg: '#E1F3F8', color: '#02BFE7' },
  parsed: { bg: '#E1F3F8', color: '#02BFE7' },
  processing: { bg: '#E1F3F8', color: '#205493' },
  flagged: { bg: '#F9DEDE', color: '#E31C3D' },
  approved: { bg: '#E7F4E4', color: '#2E8540' },
  denied: { bg: '#F9DEDE', color: '#B51D09' },
};

const defaultColors = { bg: '#E4E2E0', color: '#5B616B' };

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const { bg, color } = statusColorMap[status] ?? defaultColors;

  return (
    <Chip
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      size="small"
      sx={{
        backgroundColor: bg,
        color,
        fontWeight: 600,
        fontSize: '0.75rem',
        height: 24,
        '& .MuiChip-label': {
          px: 1.5,
        },
      }}
    />
  );
};

export default React.memo(StatusChip);
