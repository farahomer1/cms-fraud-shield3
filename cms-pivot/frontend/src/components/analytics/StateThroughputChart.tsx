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
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface StateData {
  state: string;
  processed: number;
  ingested: number;
}

const allStatesData: StateData[] = [
  { state: 'California', processed: 48320, ingested: 52140 },
  { state: 'Texas', processed: 41850, ingested: 45620 },
  { state: 'Florida', processed: 38740, ingested: 41930 },
  { state: 'New York', processed: 35210, ingested: 38470 },
  { state: 'Pennsylvania', processed: 29680, ingested: 32150 },
  { state: 'Illinois', processed: 24510, ingested: 26780 },
  { state: 'Ohio', processed: 22340, ingested: 24190 },
  { state: 'Georgia', processed: 20180, ingested: 21870 },
  { state: 'North Carolina', processed: 18920, ingested: 20540 },
  { state: 'Michigan', processed: 17450, ingested: 18960 },
];

// Top 5 states + aggregate "Other"
const top5 = allStatesData.slice(0, 5);
const otherProcessed = allStatesData.slice(5).reduce((sum, d) => sum + d.processed, 0);
const otherIngested = allStatesData.slice(5).reduce((sum, d) => sum + d.ingested, 0);

const data: StateData[] = [
  ...top5,
  { state: 'Other', processed: otherProcessed, ingested: otherIngested },
];

const StateThroughputChart: React.FC = () => {
  const totalProcessed = data.reduce((sum, d) => sum + d.processed, 0).toLocaleString();
  const totalIngested = data.reduce((sum, d) => sum + d.ingested, 0).toLocaleString();

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
        Claims Throughput by State
      </Typography>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Top 5 states + Other | Processed: {totalProcessed} | Ingested: {totalIngested}
      </Typography>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 40, left: 90, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#112E51' }}
            tickFormatter={(v: number) => {
              if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
              return `${v}`;
            }}
          />
          <YAxis
            type="category"
            dataKey="state"
            tick={{ fontSize: 11, fill: '#112E51' }}
            width={85}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #003F72',
              borderRadius: 4,
              fontSize: 13,
            }}
            formatter={(value: number) => value.toLocaleString()}
          />
          <Legend
            iconType="square"
            wrapperStyle={{ fontSize: 12, color: '#112E51' }}
          />
          <Bar
            dataKey="processed"
            name="Processed"
            fill="#003F72"
            radius={[0, 4, 4, 0]}
            barSize={14}
          />
          <Bar
            dataKey="ingested"
            name="Ingested"
            fill="#02BFE7"
            radius={[0, 4, 4, 0]}
            barSize={14}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default StateThroughputChart;
