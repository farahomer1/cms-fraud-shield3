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

interface ResponseTimeData {
  week: string;
  avgResponseHrs: number;
  p95ResponseHrs: number;
  highRiskAvgHrs: number;
}

const data: ResponseTimeData[] = [
  { week: 'Week 1', avgResponseHrs: 4.2, p95ResponseHrs: 18.1, highRiskAvgHrs: 2.1 },
  { week: 'Week 2', avgResponseHrs: 3.8, p95ResponseHrs: 16.5, highRiskAvgHrs: 1.9 },
  { week: 'Week 3', avgResponseHrs: 4.5, p95ResponseHrs: 19.3, highRiskAvgHrs: 2.4 },
  { week: 'Week 4', avgResponseHrs: 3.6, p95ResponseHrs: 15.2, highRiskAvgHrs: 1.7 },
  { week: 'Week 5', avgResponseHrs: 3.9, p95ResponseHrs: 17.8, highRiskAvgHrs: 2.0 },
  { week: 'Week 6', avgResponseHrs: 3.4, p95ResponseHrs: 14.9, highRiskAvgHrs: 1.5 },
  { week: 'Week 7', avgResponseHrs: 3.2, p95ResponseHrs: 13.6, highRiskAvgHrs: 1.4 },
  { week: 'Week 8', avgResponseHrs: 3.1, p95ResponseHrs: 12.8, highRiskAvgHrs: 1.3 },
];

const SLA_TARGET_HRS = 4.0;

const AuditResponseTime: React.FC = () => {
  const currentAvg = data[data.length - 1].avgResponseHrs;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Audit Response Time Trends
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ color: currentAvg <= SLA_TARGET_HRS ? '#2E8540' : '#E31C3D' }}
        >
          {currentAvg}h avg
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Time from finding generation to first case officer action | SLA Target: &le; {SLA_TARGET_HRS}h
      </Typography>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#112E51' }} />
          <YAxis
            tick={{ fontSize: 12, fill: '#112E51' }}
            tickFormatter={(v: number) => `${v}h`}
            label={{
              value: 'Hours',
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
            formatter={(value: number, name: string) => [`${value}h`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine
            y={SLA_TARGET_HRS}
            stroke="#E31C3D"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: `SLA: ${SLA_TARGET_HRS}h`,
              position: 'right',
              fill: '#E31C3D',
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="avgResponseHrs"
            name="Avg Response Time"
            stroke="#003F72"
            strokeWidth={3}
            dot={{ r: 5, fill: '#003F72', stroke: '#FFFFFF', strokeWidth: 2 }}
            activeDot={{ r: 7 }}
          />
          <Line
            type="monotone"
            dataKey="p95ResponseHrs"
            name="P95 Response Time"
            stroke="#AEB0B5"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4, fill: '#AEB0B5' }}
          />
          <Line
            type="monotone"
            dataKey="highRiskAvgHrs"
            name="High-Risk Avg"
            stroke="#2E8540"
            strokeWidth={2.5}
            dot={{ r: 5, fill: '#2E8540', stroke: '#FFFFFF', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AuditResponseTime;
