// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ROIDataPoint {
  month: string;
  costSavings: number;
  systemCost: number;
  roiRatio: number;
}

const data: ROIDataPoint[] = [
  { month: 'Jan', costSavings: 1200000, systemCost: 850000, roiRatio: 1.41 },
  { month: 'Feb', costSavings: 1450000, systemCost: 820000, roiRatio: 1.77 },
  { month: 'Mar', costSavings: 1680000, systemCost: 810000, roiRatio: 2.07 },
  { month: 'Apr', costSavings: 1920000, systemCost: 795000, roiRatio: 2.42 },
  { month: 'May', costSavings: 2150000, systemCost: 780000, roiRatio: 2.76 },
  { month: 'Jun', costSavings: 2380000, systemCost: 770000, roiRatio: 3.09 },
  { month: 'Jul', costSavings: 2540000, systemCost: 760000, roiRatio: 3.34 },
  { month: 'Aug', costSavings: 2710000, systemCost: 755000, roiRatio: 3.59 },
  { month: 'Sep', costSavings: 2890000, systemCost: 750000, roiRatio: 3.85 },
  { month: 'Oct', costSavings: 3050000, systemCost: 745000, roiRatio: 4.09 },
  { month: 'Nov', costSavings: 3220000, systemCost: 740000, roiRatio: 4.35 },
  { month: 'Dec', costSavings: 3400000, systemCost: 735000, roiRatio: 4.63 },
];

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

const ROIChart: React.FC = () => {
  const currentROI = data[data.length - 1].roiRatio;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Return on Investment (ROI)
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ color: currentROI >= 3 ? '#2E8540' : '#E59026' }}
        >
          {currentROI.toFixed(1)}:1
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        RFI Target: 3:1 over 12 months | Current: {currentROI.toFixed(1)}:1
      </Typography>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#112E51' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12, fill: '#112E51' }}
            tickFormatter={formatCurrency}
            label={{
              value: 'Amount ($)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#112E51' },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: '#112E51' }}
            tickFormatter={(v: number) => `${v.toFixed(1)}x`}
            domain={[0, 5.5]}
            label={{
              value: 'ROI Ratio',
              angle: 90,
              position: 'insideRight',
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
            formatter={(value: number, name: string) => {
              if (name === 'ROI Ratio') return [`${value.toFixed(2)}:1`, name];
              return [formatCurrency(value), name];
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
          <Bar
            yAxisId="left"
            dataKey="costSavings"
            name="Cost Savings"
            fill="#003F72"
            radius={[2, 2, 0, 0]}
            barSize={28}
          />
          <Bar
            yAxisId="left"
            dataKey="systemCost"
            name="System Cost"
            fill="#AEB0B5"
            radius={[2, 2, 0, 0]}
            barSize={28}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="roiRatio"
            name="ROI Ratio"
            stroke="#2E8540"
            strokeWidth={3}
            dot={{ r: 4, fill: '#2E8540' }}
            activeDot={{ r: 6 }}
          />
          {/* Target line at 3:1 */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={() => 3}
            name="Target (3:1)"
            stroke="#E31C3D"
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={false}
            activeDot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <Box sx={{ mt: 3, p: 2, bgcolor: '#F8F9FA', borderRadius: 2, borderLeft: '5px solid #003F72' }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#003F72', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          🛡️ Trust Fund Protection ROI (Patrick Newbold's Slide 4 Scale)
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="caption" sx={{ color: '#5B616B', display: 'block' }}>CMS Annual Scale</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#112E51' }}>$1.7 Trillion</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" sx={{ color: '#5B616B', display: 'block' }}>Screening Target</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#2E8540' }}>+0.5% Improvement</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" sx={{ color: '#5B616B', display: 'block' }}>Annual Protected</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#2E8540' }}>$8.5 Billion / year</Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ROIChart;
