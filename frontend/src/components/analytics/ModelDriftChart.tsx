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
  ReferenceArea,
} from 'recharts';

const AGENT_NAMES: Record<string, string> = {
  rules_engine: 'Rules Engine',
  data_validation: 'Data Validation',
  pension_poaching: 'Beneficiary Exploitation',
  claim_sharking: 'Claim Sharking',
  dbq_fraud: 'CMN Fraud',
  overlapping_claims: 'Overlapping Claims',
  medical_record: 'Medical Record',
  claim_discrepancy: 'Claim Discrepancy',
};

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

const WEEKS = [
  'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8',
  'W9', 'W10', 'W11', 'W12', 'W13', 'W14', 'W15', 'W16',
  'W17', 'W18', 'W19', 'W20', 'W21', 'W22', 'W23', 'W24',
];

interface DriftDataPoint {
  week: string;
  [key: string]: number | string;
}

function generateDriftData(): DriftDataPoint[] {
  const agentKeys = Object.keys(AGENT_NAMES);
  return WEEKS.map((week, idx) => {
    const point: DriftDataPoint = { week };
    agentKeys.forEach((key) => {
      // Simulate gradual drift for some agents
      let base = 97.5;
      if (key === 'pension_poaching' && idx > 16) {
        // Simulate drift starting at week 17
        base = 97.5 - (idx - 16) * 0.4;
      } else if (key === 'claim_sharking' && idx > 19) {
        base = 97.5 - (idx - 19) * 0.3;
      } else {
        base = 97.5 + Math.sin(idx * 0.3) * 0.5;
      }
      const jitter = (Math.random() - 0.5) * 0.8;
      point[key] = parseFloat(Math.max(93, Math.min(99.5, base + jitter)).toFixed(1));
    });
    return point;
  });
}

const data = generateDriftData();

const ModelDriftChart: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
        Model Drift Detection
      </Typography>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        24-week agent accuracy monitoring | Drift threshold: 95% | Alert zone highlighted
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: '#112E51' }}
            interval={2}
          />
          <YAxis
            domain={[92, 100]}
            tick={{ fontSize: 12, fill: '#112E51' }}
            tickFormatter={(v: number) => `${v}%`}
            label={{
              value: 'Accuracy (%)',
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
              fontSize: 11,
            }}
            formatter={(value: number) => [`${value}%`, '']}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
            iconType="line"
          />
          {/* Drift danger zone */}
          <ReferenceArea
            y1={92}
            y2={95}
            fill="#E31C3D"
            fillOpacity={0.06}
            label={{
              value: 'Drift Alert Zone',
              position: 'insideBottomRight',
              fill: '#E31C3D',
              fontSize: 10,
            }}
          />
          {/* Drift threshold */}
          <ReferenceLine
            y={95}
            stroke="#E31C3D"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: 'Drift Threshold: 95%',
              position: 'right',
              fill: '#E31C3D',
              fontSize: 10,
            }}
          />
          {Object.keys(AGENT_NAMES).map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={AGENT_NAMES[key]}
              stroke={AGENT_COLORS[key]}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ModelDriftChart;
