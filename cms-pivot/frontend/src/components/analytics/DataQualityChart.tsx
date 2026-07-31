// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface DataQualityDimension {
  dimension: string;
  current: number;
  target: number;
  fullMark: number;
}

const data: DataQualityDimension[] = [
  { dimension: 'Completeness', current: 98.2, target: 98, fullMark: 100 },
  { dimension: 'Accuracy', current: 99.1, target: 98, fullMark: 100 },
  { dimension: 'Consistency', current: 97.5, target: 98, fullMark: 100 },
  { dimension: 'Timeliness', current: 96.8, target: 98, fullMark: 100 },
  { dimension: 'Validity', current: 98.7, target: 98, fullMark: 100 },
  { dimension: 'Uniqueness', current: 99.4, target: 98, fullMark: 100 },
];

const DataQualityChart: React.FC = () => {
  const overallScore = (
    data.reduce((sum, d) => sum + d.current, 0) / data.length
  ).toFixed(1);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Data Quality Dimensions
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ color: parseFloat(overallScore) >= 98 ? '#2E8540' : '#E59026' }}
        >
          {overallScore}%
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        RFI Target: 98% across all dimensions | Overall: {overallScore}%
      </Typography>
      <ResponsiveContainer width="100%" height={380}>
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke="#E0E0E0" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 12, fill: '#112E51' }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[90, 100]}
            tick={{ fontSize: 10, fill: '#5B616B' }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #003F72',
              borderRadius: 4,
              fontSize: 13,
            }}
            formatter={(value: number, name: string) => [`${value}%`, name]}
          />
          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
          <Radar
            name="Target"
            dataKey="target"
            stroke="#E31C3D"
            fill="#E31C3D"
            fillOpacity={0.1}
            strokeDasharray="5 5"
            strokeWidth={2}
          />
          <Radar
            name="Current"
            dataKey="current"
            stroke="#003F72"
            fill="#003F72"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default DataQualityChart;
