// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Chip } from '@mui/material';
import { RISK_COLORS } from '../../utils/constants';

interface RiskBadgeProps {
  level: string;
}

const labelMap: Record<string, string> = {
  high: 'High Risk',
  medium: 'Medium Risk',
  low: 'Low Risk',
  critical: 'Critical Risk',
};

const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
  const l = level ? level.toLowerCase() : 'low';
  const normalized = l === 'critical' || l === 'high' ? 'high' : (l === 'medium' || l === 'warn' ? 'medium' : 'low');
  const backgroundColor = RISK_COLORS[normalized] ?? '#5B616B';
  const textColor = normalized === 'medium' ? '#212121' : '#FFFFFF';
  const label = l === 'critical' ? 'Critical Risk' : (labelMap[normalized] ?? 'Low Risk');

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor,
        color: textColor,
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 22,
        '& .MuiChip-label': {
          px: 1,
        },
      }}
    />
  );
};


export default React.memo(RiskBadge);
