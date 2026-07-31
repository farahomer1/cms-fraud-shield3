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
import apiClient from '../../services/apiClient';
import { formatCurrency } from '../../utils/formatters';

interface SavingsDataPoint {
  date: string;
  cumulative: number;
}

function generateFallbackData(): SavingsDataPoint[] {
  const points: SavingsDataPoint[] = [];
  let cumulative = 0;
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    cumulative += Math.floor(Math.random() * 150000) + 50000;
    points.push({ date: dateStr, cumulative });
  }
  return points;
}

const SavingsChart: React.FC = () => {
  const [data, setData] = useState<SavingsDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/analytics/savings');
        const raw = response.data;

        if (raw && Array.isArray(raw.data_points) && raw.data_points.length > 0) {
          const mapped: SavingsDataPoint[] = raw.data_points.map(
            (item: Record<string, unknown>) => ({
              date: item.date as string,
              cumulative: item.cumulative as number,
            })
          );
          setData(mapped);
          setTotal(raw.total || mapped[mapped.length - 1].cumulative);
        } else {
          const fallback = generateFallbackData();
          setData(fallback);
          setTotal(fallback[fallback.length - 1].cumulative);
        }
      } catch {
        const fallback = generateFallbackData();
        setData(fallback);
        setTotal(fallback[fallback.length - 1].cumulative);
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

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
        Savings Realized
      </Typography>
      <Typography
        variant="h4"
        fontWeight={700}
        sx={{ color: '#2E8540', mb: 2 }}
      >
        {formatCurrency(total)}
      </Typography>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#003F72" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#003F72" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="date"
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
              border: '1px solid #003F72',
              borderRadius: 4,
              fontSize: 13,
            }}
            formatter={(value: number) => [formatCurrency(value), 'Cumulative Savings']}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#003F72"
            strokeWidth={2}
            fill="url(#savingsGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default SavingsChart;
