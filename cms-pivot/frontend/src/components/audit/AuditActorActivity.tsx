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

interface ActorData {
  actor: string;
  decisions: number;
  findings: number;
  chats: number;
  other: number;
}

const data: ActorData[] = [
  { actor: 'J. Martinez', decisions: 94, findings: 62, chats: 134, other: 28 },
  { actor: 'R. Chen', decisions: 107, findings: 71, chats: 147, other: 31 },
  { actor: 'S. Thompson', decisions: 78, findings: 48, chats: 96, other: 19 },
  { actor: 'A. Williams', decisions: 99, findings: 59, chats: 127, other: 25 },
  { actor: 'K. Patel', decisions: 86, findings: 52, chats: 110, other: 23 },
  { actor: 'M. Johnson', decisions: 67, findings: 44, chats: 89, other: 17 },
  { actor: 'PIVOT System', decisions: 0, findings: 163, chats: 0, other: 212 },
  { actor: 'Batch Processor', decisions: 83, findings: 0, chats: 0, other: 187 },
];

const AuditActorActivity: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
        Activity by Actor
      </Typography>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Audit trail event counts broken down by actor and action type
      </Typography>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 20, left: 85, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#112E51' }} />
          <YAxis
            type="category"
            dataKey="actor"
            tick={{ fontSize: 11, fill: '#112E51' }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #003F72',
              borderRadius: 4,
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="decisions" name="Decisions" stackId="a" fill="#2E8540" />
          <Bar dataKey="findings" name="Findings" stackId="a" fill="#FDB81E" />
          <Bar dataKey="chats" name="Chats" stackId="a" fill="#0071BC" />
          <Bar dataKey="other" name="Other" stackId="a" fill="#AEB0B5" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AuditActorActivity;
