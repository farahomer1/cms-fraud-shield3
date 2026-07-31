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

interface DecisionData {
  week: string;
  approved: number;
  denied: number;
  escalated: number;
  returnedForInfo: number;
}

const data: DecisionData[] = [
  { week: 'Week 1', approved: 89, denied: 24, escalated: 8, returnedForInfo: 12 },
  { week: 'Week 2', approved: 94, denied: 27, escalated: 11, returnedForInfo: 9 },
  { week: 'Week 3', approved: 102, denied: 31, escalated: 6, returnedForInfo: 15 },
  { week: 'Week 4', approved: 87, denied: 22, escalated: 13, returnedForInfo: 11 },
  { week: 'Week 5', approved: 111, denied: 35, escalated: 9, returnedForInfo: 8 },
  { week: 'Week 6', approved: 96, denied: 29, escalated: 7, returnedForInfo: 14 },
  { week: 'Week 7', approved: 108, denied: 33, escalated: 10, returnedForInfo: 6 },
  { week: 'Week 8', approved: 103, denied: 28, escalated: 5, returnedForInfo: 10 },
];

const AuditDecisionOutcomes: React.FC = () => {
  const totalDecisions = data.reduce(
    (sum, d) => sum + d.approved + d.denied + d.escalated + d.returnedForInfo,
    0
  );
  const approvalRate = (
    (data.reduce((sum, d) => sum + d.approved, 0) / totalDecisions) * 100
  ).toFixed(1);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Decision Outcomes Over Time
        </Typography>
        <Typography variant="body2" sx={{ color: '#5B616B' }}>
          {approvalRate}% approval rate
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Weekly breakdown of claim decision outcomes across all case officers
      </Typography>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#112E51' }} />
          <YAxis tick={{ fontSize: 12, fill: '#112E51' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #003F72',
              borderRadius: 4,
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="approved" name="Approved" stackId="outcomes" fill="#2E8540" />
          <Bar dataKey="denied" name="Denied" stackId="outcomes" fill="#E31C3D" />
          <Bar dataKey="escalated" name="Escalated" stackId="outcomes" fill="#FDB81E" />
          <Bar dataKey="returnedForInfo" name="Returned for Info" stackId="outcomes" fill="#0071BC" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AuditDecisionOutcomes;
