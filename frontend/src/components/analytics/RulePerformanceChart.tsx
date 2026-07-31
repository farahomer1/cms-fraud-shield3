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
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface RuleData {
  rule: string;
  flagged: number;
  accuracy: number;
}

const data: RuleData[] = [
  { rule: 'Duplicate Billing', flagged: 4521, accuracy: 98.7 },
  { rule: 'Unbundling Detection', flagged: 3892, accuracy: 97.2 },
  { rule: 'Upcoding Check', flagged: 3456, accuracy: 96.8 },
  { rule: 'Ghost Patient', flagged: 2987, accuracy: 99.1 },
  { rule: 'Impossible Day', flagged: 2654, accuracy: 98.4 },
  { rule: 'Provider Exclusion', flagged: 2341, accuracy: 99.5 },
  { rule: 'Frequency Limit', flagged: 2108, accuracy: 97.9 },
  { rule: 'Place of Service', flagged: 1876, accuracy: 96.3 },
  { rule: 'Modifier Mismatch', flagged: 1654, accuracy: 95.8 },
  { rule: 'Timely Filing', flagged: 1432, accuracy: 98.2 },
  { rule: 'Auth Required', flagged: 1287, accuracy: 97.6 },
  { rule: 'Age/Gender Check', flagged: 1098, accuracy: 99.3 },
  { rule: 'NDC Validation', flagged: 987, accuracy: 96.1 },
  { rule: 'DRG Validation', flagged: 876, accuracy: 98.9 },
  { rule: 'Benefit Limit', flagged: 765, accuracy: 97.4 },
];

const getAccuracyColor = (accuracy: number): string => {
  if (accuracy >= 98) return '#2E8540';
  if (accuracy >= 96) return '#003F72';
  return '#E59026';
};

const RulePerformanceChart: React.FC = () => {
  const avgAccuracy = (
    data.reduce((sum, d) => sum + d.accuracy, 0) / data.length
  ).toFixed(1);
  const totalFlagged = data.reduce((sum, d) => sum + d.flagged, 0).toLocaleString();

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Rule Engine Performance
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#2E8540' }}>
          {avgAccuracy}%
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Top 15 rules by claims flagged | Avg accuracy: {avgAccuracy}% | Total flagged: {totalFlagged}
      </Typography>
      <ResponsiveContainer width="100%" height={480}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 80, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#112E51' }}
            label={{
              value: 'Claims Flagged',
              position: 'insideBottom',
              offset: -2,
              style: { fontSize: 12, fill: '#112E51' },
            }}
          />
          <YAxis
            type="category"
            dataKey="rule"
            tick={{ fontSize: 11, fill: '#112E51' }}
            width={115}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #003F72',
              borderRadius: 4,
              fontSize: 13,
            }}
            formatter={(value: number, name: string, props: { payload?: RuleData }) => {
              if (name === 'Claims Flagged' && props.payload) {
                return [
                  `${value.toLocaleString()} (${props.payload.accuracy}% accuracy)`,
                  name,
                ];
              }
              return [value.toLocaleString(), name];
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
          <Bar dataKey="flagged" name="Claims Flagged" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getAccuracyColor(entry.accuracy)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: '#2E8540', borderRadius: 1 }} />
          <Typography variant="caption" sx={{ color: '#5B616B' }}>98%+ accuracy</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: '#003F72', borderRadius: 1 }} />
          <Typography variant="caption" sx={{ color: '#5B616B' }}>96-98% accuracy</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: '#E59026', borderRadius: 1 }} />
          <Typography variant="caption" sx={{ color: '#5B616B' }}>&lt;96% accuracy</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default RulePerformanceChart;
