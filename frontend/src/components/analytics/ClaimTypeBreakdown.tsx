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

interface ClaimTypeData {
  name: string;
  value: number;
  color: string;
}

const data: ClaimTypeData[] = [
  { name: 'Medical/Health', value: 145230, color: '#003F72' },
  { name: 'Disability Compensation', value: 98450, color: '#02BFE7' },
  { name: 'Pension', value: 42180, color: '#2E8540' },
  { name: 'Dental', value: 28760, color: '#FDB81E' },
  { name: 'Community Care', value: 35920, color: '#E59026' },
  { name: 'Mental Health', value: 52340, color: '#8B5CF6' },
  { name: 'Pharmacy', value: 67890, color: '#E31C3D' },
];

const total = data.reduce((sum, d) => sum + d.value, 0);

const RADIAN = Math.PI / 180;

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: LabelProps) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.06) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

const ClaimTypeBreakdown: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
        Claim Type Breakdown
      </Typography>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        {total.toLocaleString()} total claims processed across all categories
      </Typography>
      <ResponsiveContainer width="100%" height={380}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={130}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={renderCustomizedLabel}
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
            formatter={(value: number, name: string) => [
              `${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="circle"
            iconSize={10}
          />
          {/* Center text */}
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={22}
            fontWeight={700}
            fill="#112E51"
          >
            {(total / 1000).toFixed(0)}K
          </text>
          <text
            x="50%"
            y="54%"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fill="#5B616B"
          >
            Total Claims
          </text>
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ClaimTypeBreakdown;
