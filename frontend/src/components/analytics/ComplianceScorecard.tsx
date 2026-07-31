// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography, Grid } from '@mui/material';

interface ComplianceMetric {
  name: string;
  score: number;
  target: number;
  color: string;
}

const metrics: ComplianceMetric[] = [
  { name: 'FISMA', score: 97, target: 95, color: '#003F72' },
  { name: 'HIPAA', score: 99, target: 95, color: '#02BFE7' },
  { name: 'FedRAMP', score: 96, target: 95, color: '#2E8540' },
  { name: 'Section 508', score: 94, target: 95, color: '#E59026' },
];

interface GaugeProps {
  metric: ComplianceMetric;
}

const RadialGauge: React.FC<GaugeProps> = ({ metric }) => {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(metric.score / 100, 1);
  const offset = circumference * (1 - percentage);
  const isPasssing = metric.score >= metric.target;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 1.5,
      }}
    >
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isPasssing ? metric.color : '#E31C3D'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ color: isPasssing ? metric.color : '#E31C3D', lineHeight: 1 }}
          >
            {metric.score}%
          </Typography>
        </Box>
      </Box>
      <Typography
        variant="subtitle2"
        fontWeight={600}
        sx={{ color: '#112E51', mt: 1 }}
      >
        {metric.name}
      </Typography>
      <Typography variant="caption" sx={{ color: '#5B616B' }}>
        Target: {metric.target}% |{' '}
        <span style={{ color: isPasssing ? '#2E8540' : '#E31C3D', fontWeight: 600 }}>
          {isPasssing ? 'PASSING' : 'BELOW TARGET'}
        </span>
      </Typography>
    </Box>
  );
};

const ComplianceScorecard: React.FC = () => {
  const overallScore = Math.round(
    metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length
  );
  const allPassing = metrics.every((m) => m.score >= m.target);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Compliance Scorecard
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ color: allPassing ? '#2E8540' : '#E59026' }}
        >
          {overallScore}%
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        RFI Compliance Audit Pass Rate Target: 95% |{' '}
        {allPassing ? 'All frameworks passing' : 'Remediation needed'}
      </Typography>
      <Grid container spacing={2} justifyContent="center">
        {metrics.map((metric) => (
          <Grid item xs={6} sm={3} key={metric.name}>
            <RadialGauge metric={metric} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ComplianceScorecard;
