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
  Cell,
} from 'recharts';

interface RegionalData {
  center: string;
  claims: number;
  flaggedRate: number;
}

const data: RegionalData[] = [
  { center: 'Philadelphia, PA', claims: 42350, flaggedRate: 7.2 },
  { center: 'St. Paul, MN', claims: 38920, flaggedRate: 5.8 },
  { center: 'Roanoke, VA', claims: 35480, flaggedRate: 6.4 },
  { center: 'Atlanta, GA', claims: 33210, flaggedRate: 8.1 },
  { center: 'Milwaukee, WI', claims: 31780, flaggedRate: 5.5 },
  { center: 'San Diego, CA', claims: 29430, flaggedRate: 6.9 },
  { center: 'Nashville, TN', claims: 27650, flaggedRate: 7.8 },
  { center: 'Salt Lake City, UT', claims: 25890, flaggedRate: 5.2 },
  { center: 'Denver, CO', claims: 24120, flaggedRate: 6.1 },
  { center: 'Cleveland, OH', claims: 22340, flaggedRate: 7.4 },
];

const getBarColor = (flaggedRate: number): string => {
  if (flaggedRate >= 7.5) return '#E31C3D';
  if (flaggedRate >= 6.5) return '#E59026';
  return '#003F72';
};

const GeographicDistribution: React.FC = () => {
  const totalClaims = data.reduce((sum, d) => sum + d.claims, 0).toLocaleString();
  const avgFlaggedRate = (
    data.reduce((sum, d) => sum + d.flaggedRate, 0) / data.length
  ).toFixed(1);

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
        Geographic Distribution
      </Typography>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Top 10 Medicare Administrative Contractors (MACs) | {totalClaims} total claims | Avg flag rate: {avgFlaggedRate}%
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 60, left: 110, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#112E51' }}
            tickFormatter={(v: number) => {
              if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
              return `${v}`;
            }}
            label={{
              value: 'Claims Processed',
              position: 'insideBottom',
              offset: -2,
              style: { fontSize: 12, fill: '#112E51' },
            }}
          />
          <YAxis
            type="category"
            dataKey="center"
            tick={{ fontSize: 11, fill: '#112E51' }}
            width={105}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #003F72',
              borderRadius: 4,
              fontSize: 13,
            }}
            formatter={(value: number, _name: string, props: { payload?: RegionalData }) => [
              props.payload
                ? `${value.toLocaleString()} claims (${props.payload.flaggedRate}% flagged)`
                : value.toLocaleString(),
              'Volume',
            ]}
          />
          <Bar dataKey="claims" name="Claims Processed" radius={[0, 4, 4, 0]} barSize={22}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.flaggedRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: '#003F72', borderRadius: 1 }} />
          <Typography variant="caption" sx={{ color: '#5B616B' }}>&lt;6.5% flagged</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: '#E59026', borderRadius: 1 }} />
          <Typography variant="caption" sx={{ color: '#5B616B' }}>6.5-7.5% flagged</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, backgroundColor: '#E31C3D', borderRadius: 1 }} />
          <Typography variant="caption" sx={{ color: '#5B616B' }}>&gt;7.5% flagged</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default GeographicDistribution;
