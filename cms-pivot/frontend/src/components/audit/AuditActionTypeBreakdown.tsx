// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ActionTypeData {
  name: string;
  value: number;
  color: string;
}

const data: ActionTypeData[] = [
  { name: 'Decision', value: 614, color: '#2E8540' },
  { name: 'Finding', value: 499, color: '#FDB81E' },
  { name: 'Chat', value: 930, color: '#0071BC' },
  { name: 'Batch Event', value: 187, color: '#003F72' },
  { name: 'Ticket', value: 142, color: '#8B5CF6' },
  { name: 'System', value: 212, color: '#AEB0B5' },
];

const RADIAN = Math.PI / 180;
const renderLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return percent > 0.06 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

const AuditActionTypeBreakdown: React.FC = () => {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Action Type Distribution
        </Typography>
        <Typography variant="body2" sx={{ color: '#5B616B' }}>
          {total.toLocaleString()} total events
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 1, display: 'block' }}>
        Proportion of audit trail entries by action category
      </Typography>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={renderLabel}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #003F72',
              borderRadius: 4,
              fontSize: 13,
            }}
            formatter={(value: number) => [`${value.toLocaleString()} events`, 'Count']}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) => {
              const item = data.find((d) => d.name === value);
              return `${value} (${item?.value.toLocaleString()})`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AuditActionTypeBreakdown;
