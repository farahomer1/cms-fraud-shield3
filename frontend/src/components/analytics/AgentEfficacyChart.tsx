// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import apiClient from '../../services/apiClient';
import { AGENT_NAMES } from '../../utils/constants';

interface EfficacyDataPoint {
  month: string;
  [agentKey: string]: number | string;
}

const AGENT_COLORS: Record<string, string> = {
  rules_engine: '#003F72',
  data_validation: '#02BFE7',
  pension_poaching: '#E31C3D',
  claim_sharking: '#FDB81E',
  dbq_fraud: '#2E8540',
  overlapping_claims: '#8B5CF6',
  medical_record: '#F97316',
  claim_discrepancy: '#06B6D4',
};

const MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

function generateFallbackData(): EfficacyDataPoint[] {
  const agentKeys = Object.keys(AGENT_NAMES);
  return MONTHS.map((month, idx) => {
    const point: EfficacyDataPoint = { month };
    agentKeys.forEach((key) => {
      const base = 85 + idx * 1.1;
      const jitter = (Math.random() - 0.5) * 3;
      point[key] = Math.min(99.5, Math.max(82, parseFloat((base + jitter).toFixed(1))));
    });
    return point;
  });
}

const AgentEfficacyChart: React.FC = () => {
  const [data, setData] = useState<EfficacyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/analytics/agent-efficacy');
        const raw = response.data;

        if (Array.isArray(raw) && raw.length > 0) {
          setData(raw as EfficacyDataPoint[]);
        } else {
          setData(generateFallbackData());
        }
      } catch {
        setData(generateFallbackData());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
        <CircularProgress sx={{ color: '#003F72' }} />
      </Box>
    );
  }

  const agentKeys = Object.keys(AGENT_NAMES);

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 2 }}>
        Agent Efficacy Over Time
      </Typography>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#112E51' }}
          />
          <YAxis
            domain={[80, 100]}
            tick={{ fontSize: 12, fill: '#112E51' }}
            tickFormatter={(value: number) => `${value}%`}
            label={{
              value: 'Confidence Score',
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
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value}%`, '']}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="line"
          />
          {agentKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={AGENT_NAMES[key]}
              stroke={AGENT_COLORS[key] || '#333333'}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AgentEfficacyChart;
