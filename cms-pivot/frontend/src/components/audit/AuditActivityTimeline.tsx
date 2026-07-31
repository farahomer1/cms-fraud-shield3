// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TimelineData {
  date: string;
  decisions: number;
  findings: number;
  systemEvents: number;
  chatMessages: number;
}

const data: TimelineData[] = [
  { date: 'Jan 6', decisions: 42, findings: 28, systemEvents: 15, chatMessages: 67 },
  { date: 'Jan 7', decisions: 38, findings: 31, systemEvents: 12, chatMessages: 54 },
  { date: 'Jan 8', decisions: 51, findings: 35, systemEvents: 18, chatMessages: 72 },
  { date: 'Jan 9', decisions: 45, findings: 22, systemEvents: 9, chatMessages: 61 },
  { date: 'Jan 10', decisions: 33, findings: 19, systemEvents: 21, chatMessages: 48 },
  { date: 'Jan 13', decisions: 56, findings: 41, systemEvents: 14, chatMessages: 83 },
  { date: 'Jan 14', decisions: 49, findings: 37, systemEvents: 11, chatMessages: 75 },
  { date: 'Jan 15', decisions: 62, findings: 44, systemEvents: 16, chatMessages: 91 },
  { date: 'Jan 16', decisions: 41, findings: 29, systemEvents: 8, chatMessages: 58 },
  { date: 'Jan 17', decisions: 37, findings: 25, systemEvents: 13, chatMessages: 52 },
  { date: 'Jan 20', decisions: 58, findings: 39, systemEvents: 19, chatMessages: 87 },
  { date: 'Jan 21', decisions: 53, findings: 42, systemEvents: 10, chatMessages: 79 },
  { date: 'Jan 22', decisions: 47, findings: 33, systemEvents: 17, chatMessages: 63 },
  { date: 'Jan 23', decisions: 64, findings: 48, systemEvents: 22, chatMessages: 95 },
  { date: 'Jan 24', decisions: 39, findings: 26, systemEvents: 7, chatMessages: 45 },
];

const AuditActivityTimeline: React.FC = () => {
  const totalEvents = data.reduce(
    (sum, d) => sum + d.decisions + d.findings + d.systemEvents + d.chatMessages,
    0
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Audit Activity Timeline
        </Typography>
        <Typography variant="body2" sx={{ color: '#5B616B' }}>
          {totalEvents.toLocaleString()} events over 15 business days
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Daily volume of audit events by category — helps identify activity spikes and anomalies
      </Typography>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="auditColorDecisions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#003F72" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#003F72" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="auditColorFindings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E31C3D" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#E31C3D" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="auditColorChat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0071BC" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0071BC" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="auditColorSystem" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#AEB0B5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#AEB0B5" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#112E51' }} />
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
          <Area type="monotone" dataKey="decisions" name="Decisions" stroke="#003F72" fill="url(#auditColorDecisions)" strokeWidth={2} />
          <Area type="monotone" dataKey="findings" name="Findings" stroke="#E31C3D" fill="url(#auditColorFindings)" strokeWidth={2} />
          <Area type="monotone" dataKey="chatMessages" name="Chat Messages" stroke="#0071BC" fill="url(#auditColorChat)" strokeWidth={2} />
          <Area type="monotone" dataKey="systemEvents" name="System Events" stroke="#AEB0B5" fill="url(#auditColorSystem)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AuditActivityTimeline;
