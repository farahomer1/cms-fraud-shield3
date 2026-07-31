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

interface OfficerDenialsByProvider {
  officer: string;
  'Pinnacle Health Systems': number;
  'Gulf Coast Medical Group': number;
  'Patriot Wellness Clinics': number;
  'Sunrise Rehabilitation Corp': number;
  'NovaCare Diagnostics': number;
  Other: number;
}

// Synthetic data: denials broken down by provider per officer.
// S. Thompson and M. Johnson have suspiciously high denial counts
// against specific providers compared to peers, suggesting potential bias.
const data: OfficerDenialsByProvider[] = [
  { officer: 'J. Martinez', 'Pinnacle Health Systems': 6, 'Gulf Coast Medical Group': 8, 'Patriot Wellness Clinics': 5, 'Sunrise Rehabilitation Corp': 7, 'NovaCare Diagnostics': 4, Other: 13 },
  { officer: 'R. Chen', 'Pinnacle Health Systems': 4, 'Gulf Coast Medical Group': 5, 'Patriot Wellness Clinics': 3, 'Sunrise Rehabilitation Corp': 6, 'NovaCare Diagnostics': 3, Other: 10 },
  { officer: 'S. Thompson', 'Pinnacle Health Systems': 5, 'Gulf Coast Medical Group': 28, 'Patriot Wellness Clinics': 4, 'Sunrise Rehabilitation Corp': 7, 'NovaCare Diagnostics': 6, Other: 17 },
  { officer: 'A. Williams', 'Pinnacle Health Systems': 5, 'Gulf Coast Medical Group': 7, 'Patriot Wellness Clinics': 4, 'Sunrise Rehabilitation Corp': 6, 'NovaCare Diagnostics': 5, Other: 11 },
  { officer: 'K. Patel', 'Pinnacle Health Systems': 7, 'Gulf Coast Medical Group': 9, 'Patriot Wellness Clinics': 6, 'Sunrise Rehabilitation Corp': 8, 'NovaCare Diagnostics': 5, Other: 17 },
  { officer: 'M. Johnson', 'Pinnacle Health Systems': 22, 'Gulf Coast Medical Group': 9, 'Patriot Wellness Clinics': 7, 'Sunrise Rehabilitation Corp': 8, 'NovaCare Diagnostics': 6, Other: 19 },
  { officer: 'D. Kim', 'Pinnacle Health Systems': 3, 'Gulf Coast Medical Group': 5, 'Patriot Wellness Clinics': 4, 'Sunrise Rehabilitation Corp': 5, 'NovaCare Diagnostics': 3, Other: 9 },
  { officer: 'L. Davis', 'Pinnacle Health Systems': 6, 'Gulf Coast Medical Group': 8, 'Patriot Wellness Clinics': 5, 'Sunrise Rehabilitation Corp': 7, 'NovaCare Diagnostics': 6, Other: 16 },
];

const PROVIDER_COLORS: Record<string, string> = {
  'Pinnacle Health Systems': '#003F72',
  'Gulf Coast Medical Group': '#E31C3D',
  'Patriot Wellness Clinics': '#2E8540',
  'Sunrise Rehabilitation Corp': '#FDB81E',
  'NovaCare Diagnostics': '#0071BC',
  Other: '#AEB0B5',
};

const PROVIDERS = Object.keys(PROVIDER_COLORS);

const CaseOfficerRiskAccuracyChart: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
        Denied Claims by Provider per Officer
      </Typography>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Identifies potential officer bias — disproportionate denials against a specific provider may warrant review
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
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
              value: 'Denied Claims',
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
          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
          {PROVIDERS.map((provider, i) => (
            <Bar
              key={provider}
              dataKey={provider}
              name={provider}
              stackId="denials"
              fill={PROVIDER_COLORS[provider]}
              radius={i === PROVIDERS.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default CaseOfficerRiskAccuracyChart;
