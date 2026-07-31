// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getRecoupmentTrend, type RecoupmentTrendPoint } from '../../services/overpaymentService';
import { formatCurrency } from '../../utils/formatters';

const RecoupmentTrendChart: React.FC = () => {
  const [data, setData] = useState<RecoupmentTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getRecoupmentTrend()
      .then((points) => {
        if (!cancelled) {
          const mapped = points.map((p) => ({
            ...p,
            dateLabel: new Date(p.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
          }));
          setData(mapped);
        }
      })
      .catch((err) => {
        console.error('Failed to load recoupment trend:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress sx={{ color: '#003F72' }} />
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Typography color="text.secondary">No recoupment trend data available.</Typography>
      </Box>
    );
  }

  const totalRecouped = data.length > 0 ? data[data.length - 1].cumulative_amount : 0;

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
        Recoupment Trend
      </Typography>
      <Typography variant="h4" fontWeight={700} sx={{ color: '#2E8540', mb: 2 }}>
        {formatCurrency(totalRecouped)}
      </Typography>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="recoupmentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2E8540" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#2E8540" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: '#112E51' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#112E51' }}
            tickFormatter={(value: number) => {
              if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
              return `$${value}`;
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #2E8540',
              borderRadius: 4,
              fontSize: 13,
            }}
            formatter={(value: number) => [formatCurrency(value), 'Cumulative Recouped']}
          />
          <Area
            type="monotone"
            dataKey="cumulative_amount"
            stroke="#2E8540"
            strokeWidth={2}
            fill="url(#recoupmentGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default RecoupmentTrendChart;
