// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Chip } from '@mui/material';
import { RISK_COLORS } from '../../utils/constants';

interface RiskBadgeProps {
  level: 'high' | 'medium' | 'low';
}

const labelMap: Record<RiskBadgeProps['level'], string> = {
  high: 'High Risk',
  medium: 'Medium Risk',
  low: 'Low Risk',
};

const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
  const backgroundColor = RISK_COLORS[level] ?? '#5B616B';
  const textColor = level === 'medium' ? '#212121' : '#FFFFFF';

  return (
    <Chip
      label={labelMap[level]}
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
