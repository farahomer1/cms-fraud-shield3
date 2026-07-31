// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography, LinearProgress, Grid } from '@mui/material';

interface CoverageMetric {
  label: string;
  value: number;
  total: number;
  color: string;
  description: string;
}

const metrics: CoverageMetric[] = [
  {
    label: 'Claims with Full Audit Trail',
    value: 1847,
    total: 1912,
    color: '#2E8540',
    description: 'Claims with complete decision + finding audit records',
  },
  {
    label: 'High-Risk Claims Reviewed',
    value: 389,
    total: 402,
    color: '#003F72',
    description: 'High-risk claims with at least one officer review logged',
  },
  {
    label: 'Decisions with Documentation',
    value: 578,
    total: 614,
    color: '#0071BC',
    description: 'Decision events that include supporting documentation references',
  },
  {
    label: 'System Events Acknowledged',
    value: 198,
    total: 212,
    color: '#FDB81E',
    description: 'Automated system events that have been reviewed by an officer',
  },
];

const AuditClaimCoverage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
        Audit Coverage Metrics
      </Typography>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Completeness of audit trail coverage across claim lifecycle
      </Typography>
      <Grid container spacing={2}>
        {metrics.map((metric) => {
          const pct = ((metric.value / metric.total) * 100).toFixed(1);
          return (
            <Grid item xs={12} sm={6} key={metric.label}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid #E0E0E0',
                  backgroundColor: '#FAFBFC',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ color: '#112E51', fontSize: 13 }}>
                    {metric.label}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ color: metric.color }}>
                    {pct}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Number(pct)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#E0E0E0',
                    mb: 0.5,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: metric.color,
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: '#5B616B' }}>
                  {metric.value.toLocaleString()} / {metric.total.toLocaleString()} — {metric.description}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default AuditClaimCoverage;
