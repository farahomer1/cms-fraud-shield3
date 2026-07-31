// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import apiClient from '../../services/apiClient';

interface SpeedData {
  current_speed: number;
  surge_capacity: number;
  unit: string;
}

const ProcessingSpeedGauge: React.FC = () => {
  const [data, setData] = useState<SpeedData>({
    current_speed: 16.2,
    surge_capacity: 32.4,
    unit: 'claims/sec',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/analytics/processing-speed');
        const raw = response.data;
        if (raw && typeof (raw.current_throughput ?? raw.current_speed) === 'number') {
          setData({
            current_speed: raw.current_throughput ?? raw.current_speed,
            surge_capacity: raw.surge_capacity || 32.4,
            unit: raw.unit || 'claims/sec',
          });
        }
      } catch {
        // Use default values
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

  const percentage = Math.min((data.current_speed / data.surge_capacity) * 100, 100);
  const gaugeWidth = 280;
  const gaugeHeight = 160;
  const strokeWidth = 24;
  const radius = (gaugeWidth - strokeWidth) / 2;
  const centerX = gaugeWidth / 2;
  const centerY = gaugeHeight - 10;

  const startAngle = Math.PI;
  const endAngle = 0;
  const currentAngle = startAngle - (percentage / 100) * Math.PI;

  const bgStartX = centerX + radius * Math.cos(startAngle);
  const bgStartY = centerY - radius * Math.sin(startAngle);
  const bgEndX = centerX + radius * Math.cos(endAngle);
  const bgEndY = centerY - radius * Math.sin(endAngle);

  const arcEndX = centerX + radius * Math.cos(currentAngle);
  const arcEndY = centerY - radius * Math.sin(currentAngle);
  const largeArcFlag = percentage > 50 ? 1 : 0;

  const bgPath = `M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 1 1 ${bgEndX} ${bgEndY}`;
  const valuePath = `M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${arcEndX} ${arcEndY}`;

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 2 }}>
        Processing Speed
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 280,
        }}
      >
        <svg
          width={gaugeWidth}
          height={gaugeHeight + 10}
          viewBox={`0 0 ${gaugeWidth} ${gaugeHeight + 10}`}
        >
          <path
            d={bgPath}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={valuePath}
            fill="none"
            stroke="#003F72"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <text
            x={centerX}
            y={centerY - 30}
            textAnchor="middle"
            fontSize="36"
            fontWeight="700"
            fill="#003F72"
          >
            {data.current_speed}
          </text>
          <text
            x={centerX}
            y={centerY - 6}
            textAnchor="middle"
            fontSize="14"
            fill="#5B616B"
          >
            {data.unit}
          </text>
        </svg>

        <Box
          sx={{
            mt: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box sx={{ width: 260 }}>
            <Box
              sx={{
                height: 8,
                backgroundColor: '#E0E0E0',
                borderRadius: 4,
                position: 'relative',
                overflow: 'visible',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${percentage}%`,
                  backgroundColor: '#003F72',
                  borderRadius: 4,
                  transition: 'width 1s ease-in-out',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: -4,
                  left: '100%',
                  transform: 'translateX(-2px)',
                  width: 3,
                  height: 16,
                  backgroundColor: '#E31C3D',
                  borderRadius: 1,
                }}
              />
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: '#5B616B', textAlign: 'center' }}>
            {data.surge_capacity} {data.unit} (200% Surge Capacity)
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ProcessingSpeedGauge;
