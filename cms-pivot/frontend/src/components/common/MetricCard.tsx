// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'flat';
}

const trendIcons: Record<string, React.ReactNode> = {
  up: <TrendingUpIcon sx={{ fontSize: 20, color: '#2E8540' }} />,
  down: <TrendingDownIcon sx={{ fontSize: 20, color: '#E31C3D' }} />,
  flat: <TrendingFlatIcon sx={{ fontSize: 20, color: '#FDB81E' }} />,
};

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, trend }) => {
  return (
    <Box
      sx={{
        backgroundColor: '#003F72',
        borderRadius: 2,
        px: 3,
        py: 2.5,
        minWidth: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: 'rgba(255,255,255,0.7)',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: '0.75rem',
        }}
      >
        {title}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="h4"
          sx={{
            color: '#FFFFFF',
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>
        {trend && trendIcons[trend]}
      </Box>

      {subtitle && (
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '0.7rem',
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default React.memo(MetricCard);
