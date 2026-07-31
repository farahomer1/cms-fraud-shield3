// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

interface OfficerFPData {
  officer: string;
  falsePositiveRate: number;
  totalReviewed: number;
}

const data: OfficerFPData[] = [
  { officer: 'J. Martinez', falsePositiveRate: 3.2, totalReviewed: 242 },
  { officer: 'R. Chen', falsePositiveRate: 2.1, totalReviewed: 253 },
  { officer: 'S. Thompson', falsePositiveRate: 8.7, totalReviewed: 242 },
  { officer: 'A. Williams', falsePositiveRate: 4.1, totalReviewed: 242 },
  { officer: 'K. Patel', falsePositiveRate: 5.9, totalReviewed: 238 },
  { officer: 'M. Johnson', falsePositiveRate: 9.4, totalReviewed: 236 },
  { officer: 'D. Kim', falsePositiveRate: 1.8, totalReviewed: 235 },
  { officer: 'L. Davis', falsePositiveRate: 6.3, totalReviewed: 227 },
];

const TARGET_RATE = 5.0;

const CaseOfficerFalsePositiveChart: React.FC = () => {
  const avgRate = (data.reduce((sum, d) => sum + d.falsePositiveRate, 0) / data.length).toFixed(1);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          False Positive Rate by Case Officer
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ color: Number(avgRate) <= TARGET_RATE ? '#2E8540' : '#E31C3D' }}
        >
          {avgRate}% avg
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Percentage of flagged claims later determined to be legitimate | Target: &le; {TARGET_RATE}%
      </Typography>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="officer"
            tick={{ fontSize: 11, fill: '#112E51' }}
            angle={-30}
            textAnchor="end"
            height={70}
          />
          <YAxis
            domain={[0, 12]}
            tick={{ fontSize: 12, fill: '#112E51' }}
            tickFormatter={(v: number) => `${v}%`}
            label={{
              value: 'False Positive Rate (%)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#112E51' },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #003F72',
              borderRadius: 4,
              fontSize: 13,
            }}
            formatter={(value: number) => [`${value}%`, 'False Positive Rate']}
          />
          <ReferenceLine
            y={TARGET_RATE}
            stroke="#E31C3D"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: `Target: ${TARGET_RATE}%`,
              position: 'right',
              fill: '#E31C3D',
              fontSize: 11,
            }}
          />
          <Bar dataKey="falsePositiveRate" name="False Positive Rate" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.falsePositiveRate <= TARGET_RATE ? '#2E8540' : '#E31C3D'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default CaseOfficerFalsePositiveChart;
