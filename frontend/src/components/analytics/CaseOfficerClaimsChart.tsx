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

interface CaseOfficerClaimData {
  officer: string;
  approved: number;
  denied: number;
  pending: number;
}

const data: CaseOfficerClaimData[] = [
  { officer: 'J. Martinez', approved: 187, denied: 43, pending: 12 },
  { officer: 'R. Chen', approved: 214, denied: 31, pending: 8 },
  { officer: 'S. Thompson', approved: 156, denied: 67, pending: 19 },
  { officer: 'A. Williams', approved: 198, denied: 38, pending: 6 },
  { officer: 'K. Patel', approved: 172, denied: 52, pending: 14 },
  { officer: 'M. Johnson', approved: 143, denied: 71, pending: 22 },
  { officer: 'D. Kim', approved: 201, denied: 29, pending: 5 },
  { officer: 'L. Davis', approved: 168, denied: 48, pending: 11 },
];

const CaseOfficerClaimsChart: React.FC = () => {
  const totalApproved = data.reduce((sum, d) => sum + d.approved, 0);
  const totalDenied = data.reduce((sum, d) => sum + d.denied, 0);
  const approvalRate = ((totalApproved / (totalApproved + totalDenied)) * 100).toFixed(1);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Claims Approved vs. Denied by Case Officer
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#2E8540' }}>
          {approvalRate}% approval
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Breakdown of claim disposition outcomes per case officer | Last 90 days
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
            tick={{ fontSize: 12, fill: '#112E51' }}
            label={{
              value: 'Claim Count',
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
          />
          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
          <Bar dataKey="approved" name="Approved" fill="#2E8540" stackId="a" radius={[0, 0, 0, 0]} />
          <Bar dataKey="denied" name="Denied" fill="#E31C3D" stackId="a" radius={[0, 0, 0, 0]} />
          <Bar dataKey="pending" name="Pending Review" fill="#FDB81E" stackId="a" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default CaseOfficerClaimsChart;
