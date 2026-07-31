// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import PatternIcon from '@mui/icons-material/Pattern';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

interface MetricItem {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

const metrics: MetricItem[] = [
  {
    label: 'Active Models',
    value: '6',
    icon: <ModelTrainingIcon />,
    color: '#003F72',
    trend: '+2 this month',
  },
  {
    label: 'Undetected Patterns',
    value: '23',
    icon: <PatternIcon />,
    color: '#E31C3D',
    trend: '7 new this week',
  },
  {
    label: 'Under Investigation',
    value: '156',
    icon: <FindInPageIcon />,
    color: '#FDB81E',
    trend: '34 high priority',
  },
  {
    label: 'Estimated Missed Fraud',
    value: '$2.3M',
    icon: <AttachMoneyIcon />,
    color: '#E31C3D',
    trend: '+$420K this quarter',
  },
  {
    label: 'Clusters Identified',
    value: '8',
    icon: <BubbleChartIcon />,
    color: '#205493',
    trend: '3 high-risk',
  },
  {
    label: 'Model Accuracy',
    value: '94.2%',
    icon: <TrendingUpIcon />,
    color: '#2E8540',
    trend: '+1.3% from baseline',
  },
];

const FraudResearchSummaryBar: React.FC = () => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        backgroundColor: '#F8F9FA',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" spacing={2} justifyContent="space-between" flexWrap="wrap">
        {metrics.map((metric) => (
          <Box
            key={metric.label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flex: '1 1 auto',
              minWidth: 160,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 1.5,
                backgroundColor: `${metric.color}14`,
                color: metric.color,
                '& .MuiSvgIcon-root': { fontSize: 22 },
              }}
            >
              {metric.icon}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: metric.color, lineHeight: 1.2 }}>
                {metric.value}
              </Typography>
              <Typography variant="caption" sx={{ color: '#5B616B', fontWeight: 600, lineHeight: 1 }}>
                {metric.label}
              </Typography>
              {metric.trend && (
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ color: '#8D9297', fontSize: '0.65rem', lineHeight: 1.3, mt: 0.25 }}
                >
                  {metric.trend}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

export default FraudResearchSummaryBar;
