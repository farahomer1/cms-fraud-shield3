// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography } from '@mui/material';
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
  ReferenceLine,
} from 'recharts';

interface OfficerTurnaroundData {
  officer: string;
  avgDaysToDecision: number;
  avgDaysToRecoupment: number;
  claimsProcessed: number;
}

const data: OfficerTurnaroundData[] = [
  { officer: 'J. Martinez', avgDaysToDecision: 4.2, avgDaysToRecoupment: 18.5, claimsProcessed: 242 },
  { officer: 'R. Chen', avgDaysToDecision: 3.1, avgDaysToRecoupment: 14.2, claimsProcessed: 253 },
  { officer: 'S. Thompson', avgDaysToDecision: 6.8, avgDaysToRecoupment: 28.7, claimsProcessed: 242 },
  { officer: 'A. Williams', avgDaysToDecision: 3.9, avgDaysToRecoupment: 16.1, claimsProcessed: 242 },
  { officer: 'K. Patel', avgDaysToDecision: 5.3, avgDaysToRecoupment: 22.4, claimsProcessed: 238 },
  { officer: 'M. Johnson', avgDaysToDecision: 7.1, avgDaysToRecoupment: 31.2, claimsProcessed: 236 },
  { officer: 'D. Kim', avgDaysToDecision: 2.8, avgDaysToRecoupment: 12.8, claimsProcessed: 235 },
  { officer: 'L. Davis', avgDaysToDecision: 5.6, avgDaysToRecoupment: 24.3, claimsProcessed: 227 },
];

const SLA_DECISION_DAYS = 5;

const CaseOfficerTurnaroundChart: React.FC = () => {
  const avgDecision = (data.reduce((sum, d) => sum + d.avgDaysToDecision, 0) / data.length).toFixed(1);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Average Turnaround Time by Case Officer
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ color: Number(avgDecision) <= SLA_DECISION_DAYS ? '#2E8540' : '#E31C3D' }}
        >
          {avgDecision} days avg
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Decision time and recoupment initiation turnaround | SLA Target: &le; {SLA_DECISION_DAYS} days to decision
      </Typography>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="officer"
            tick={{ fontSize: 11, fill: '#112E51' }}
            angle={-30}
            textAnchor="end"
            height={70}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12, fill: '#112E51' }}
            label={{
              value: 'Days to Decision',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#112E51' },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: '#5B616B' }}
            label={{
              value: 'Days to Recoupment',
              angle: 90,
              position: 'insideRight',
              style: { fontSize: 12, fill: '#5B616B' },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #003F72',
              borderRadius: 4,
              fontSize: 13,
            }}
            formatter={(value: number, name: string) => [
              `${value} days`,
              name,
            ]}
          />
          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
          <ReferenceLine
            y={SLA_DECISION_DAYS}
            yAxisId="left"
            stroke="#E31C3D"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: `SLA: ${SLA_DECISION_DAYS}d`,
              position: 'right',
              fill: '#E31C3D',
              fontSize: 11,
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="avgDaysToDecision"
            name="Avg Days to Decision"
            fill="#003F72"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgDaysToRecoupment"
            name="Avg Days to Recoupment"
            stroke="#FDB81E"
            strokeWidth={2.5}
            dot={{ r: 5, fill: '#FDB81E', stroke: '#FFFFFF', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default CaseOfficerTurnaroundChart;
