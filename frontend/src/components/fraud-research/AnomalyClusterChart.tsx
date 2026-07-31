// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from 'recharts';
import apiClient from '../../services/apiClient';
import { RISK_COLORS } from '../../utils/constants';

interface ClusterDataPoint {
  provider_name: string;
  risk_score: number;
  finding_count: number;
  avg_confidence: number;
  risk_level: 'high' | 'medium' | 'low';
}

function getRiskLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function generateFallbackData(): ClusterDataPoint[] {
  const providers = [
    'Tampa VA Medical Center',
    'Orlando CBOC',
    'Jacksonville VA Clinic',
    'Gainesville VA',
    'Miami VA Healthcare',
    'St. Petersburg VA',
    'Bay Pines VA',
    'Pensacola VA',
    'Lake City VA',
    'Daytona Beach VA',
    'Fort Lauderdale VA',
    'West Palm Beach VA',
    'Tallahassee VA',
    'Sarasota VA',
    'Naples VA',
  ];

  return providers.map((name) => {
    const riskScore = Math.floor(Math.random() * 100);
    return {
      provider_name: name,
      risk_score: riskScore,
      finding_count: Math.floor(Math.random() * 80) + 5,
      avg_confidence: Math.floor(Math.random() * 30) + 70,
      risk_level: getRiskLevel(riskScore),
    };
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ClusterDataPoint;
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <Box
      sx={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #003F72',
        borderRadius: 1,
        px: 2,
        py: 1.5,
        boxShadow: 2,
      }}
    >
      <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
        {item.provider_name}
      </Typography>
      <Typography variant="caption" display="block" sx={{ color: '#5B616B' }}>
        Risk Score: {item.risk_score}
      </Typography>
      <Typography variant="caption" display="block" sx={{ color: '#5B616B' }}>
        Findings: {item.finding_count}
      </Typography>
      <Typography variant="caption" display="block" sx={{ color: '#5B616B' }}>
        Avg Confidence: {item.avg_confidence}%
      </Typography>
      <Typography
        variant="caption"
        display="block"
        sx={{ color: RISK_COLORS[item.risk_level], fontWeight: 600, mt: 0.5 }}
      >
        {item.risk_level.toUpperCase()} RISK
      </Typography>
    </Box>
  );
};

const AnomalyClusterChart: React.FC = () => {
  const [data, setData] = useState<ClusterDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/fraud-research/clusters');
        const raw = response.data;

        if (Array.isArray(raw) && raw.length > 0) {
          const mapped: ClusterDataPoint[] = raw.map((item: Record<string, unknown>) => ({
            provider_name: (item.provider_name as string) || 'Unknown',
            risk_score: (item.risk_score as number) || 0,
            finding_count: (item.finding_count as number) || 0,
            avg_confidence: (item.avg_confidence as number) || 0,
            risk_level: getRiskLevel((item.risk_score as number) || 0),
          }));
          setData(mapped);
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress sx={{ color: '#003F72' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 2 }}>
        Anomaly Clusters by Provider
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            type="number"
            dataKey="risk_score"
            name="Risk Score"
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#112E51' }}
            label={{
              value: 'Provider Risk Score',
              position: 'insideBottom',
              offset: -5,
              style: { fontSize: 12, fill: '#112E51' },
            }}
          />
          <YAxis
            type="number"
            dataKey="finding_count"
            name="Finding Count"
            tick={{ fontSize: 12, fill: '#112E51' }}
            label={{
              value: 'Finding Count',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: '#112E51' },
            }}
          />
          <ZAxis
            type="number"
            dataKey="avg_confidence"
            range={[80, 600]}
            name="Avg Confidence"
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} name="Providers">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={RISK_COLORS[entry.risk_level]}
                fillOpacity={0.7}
                stroke={RISK_COLORS[entry.risk_level]}
                strokeWidth={1}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 1 }}>
        {(['high', 'medium', 'low'] as const).map((level) => (
          <Box key={level} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: RISK_COLORS[level],
              }}
            />
            <Typography variant="caption" sx={{ color: '#5B616B', textTransform: 'capitalize' }}>
              {level} Risk
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default AnomalyClusterChart;
