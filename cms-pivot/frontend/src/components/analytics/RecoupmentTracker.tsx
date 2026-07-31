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
} from 'recharts';

interface RecoupmentDataPoint {
  month: string;
  identified: number;
  notified: number;
  collected: number;
  pending: number;
}

const data: RecoupmentDataPoint[] = [
  { month: 'Jan', identified: 4200000, notified: 3800000, collected: 3200000, pending: 600000 },
  { month: 'Feb', identified: 3900000, notified: 3600000, collected: 3100000, pending: 500000 },
  { month: 'Mar', identified: 4500000, notified: 4100000, collected: 3600000, pending: 500000 },
  { month: 'Apr', identified: 4800000, notified: 4400000, collected: 3900000, pending: 500000 },
  { month: 'May', identified: 5100000, notified: 4700000, collected: 4200000, pending: 500000 },
  { month: 'Jun', identified: 5400000, notified: 5000000, collected: 4500000, pending: 500000 },
  { month: 'Jul', identified: 5200000, notified: 4900000, collected: 4400000, pending: 500000 },
  { month: 'Aug', identified: 5600000, notified: 5200000, collected: 4700000, pending: 500000 },
  { month: 'Sep', identified: 5800000, notified: 5500000, collected: 5000000, pending: 500000 },
  { month: 'Oct', identified: 6100000, notified: 5800000, collected: 5300000, pending: 500000 },
  { month: 'Nov', identified: 6300000, notified: 6000000, collected: 5500000, pending: 500000 },
  { month: 'Dec', identified: 6500000, notified: 6200000, collected: 5700000, pending: 500000 },
];

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

const RecoupmentTracker: React.FC = () => {
  const totalIdentified = data.reduce((sum, d) => sum + d.identified, 0);
  const totalCollected = data.reduce((sum, d) => sum + d.collected, 0);
  const realizationRate = ((totalCollected / totalIdentified) * 100).toFixed(1);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Recoupment Tracker
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ color: parseFloat(realizationRate) >= 85 ? '#2E8540' : '#E59026' }}
        >
          {realizationRate}%
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Realization Rate Target: 85% | Collected: {formatCurrency(totalCollected)} of {formatCurrency(totalIdentified)} identified
      </Typography>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#112E51' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#112E51' }}
            tickFormatter={formatCurrency}
            label={{
              value: 'Amount ($)',
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
            formatter={(value: number) => [formatCurrency(value)]}
          />
          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
          <Bar
            dataKey="collected"
            name="Collected"
            stackId="recoup"
            fill="#2E8540"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="pending"
            name="Pending"
            stackId="recoup"
            fill="#FDB81E"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="notified"
            name="Notified"
            fill="#02BFE7"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="identified"
            name="Identified"
            fill="#003F72"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default RecoupmentTracker;
