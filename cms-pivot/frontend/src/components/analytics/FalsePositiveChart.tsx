// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface FalsePositiveDataPoint {
  quarter: string;
  rate: number;
  target: number;
}

const data: FalsePositiveDataPoint[] = [
  { quarter: 'Q1 2024', rate: 12.3, target: 5.0 },
  { quarter: 'Q2 2024', rate: 9.8, target: 5.0 },
  { quarter: 'Q3 2024', rate: 7.6, target: 5.0 },
  { quarter: 'Q4 2024', rate: 6.1, target: 5.0 },
  { quarter: 'Q1 2025', rate: 5.2, target: 5.0 },
  { quarter: 'Q2 2025', rate: 4.7, target: 5.0 },
  { quarter: 'Q3 2025', rate: 4.3, target: 5.0 },
  { quarter: 'Q4 2025', rate: 3.9, target: 5.0 },
];

const FalsePositiveChart: React.FC = () => {
  const currentRate = data[data.length - 1].rate;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          False Positive Rate
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ color: currentRate <= 5 ? '#2E8540' : '#E31C3D' }}
        >
          {currentRate}%
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        RFI Target: &le; 5% | Trending down from 12.3% to {currentRate}%
      </Typography>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="quarter"
            tick={{ fontSize: 12, fill: '#112E51' }}
          />
          <YAxis
            domain={[0, 15]}
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
            formatter={(value: number, name: string) => [`${value}%`, name]}
          />
          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
          <ReferenceLine
            y={5}
            stroke="#E31C3D"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: 'Target: 5%',
              position: 'right',
              fill: '#E31C3D',
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="rate"
            name="False Positive Rate"
            stroke="#003F72"
            strokeWidth={3}
            dot={{ r: 5, fill: '#003F72', stroke: '#FFFFFF', strokeWidth: 2 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default FalsePositiveChart;
