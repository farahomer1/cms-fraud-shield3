// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Typography } from '@mui/material';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = [
  '6am', '7am', '8am', '9am', '10am', '11am', '12pm',
  '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm',
];

// Generate realistic heatmap data: heavier on weekdays during business hours
function generateHeatmapData(): number[][] {
  return DAYS.map((_, dayIdx) => {
    return HOURS.map((_, hourIdx) => {
      const actualHour = hourIdx + 6; // starts at 6am
      const isWeekday = dayIdx < 5;
      const isBusinessHours = actualHour >= 8 && actualHour <= 17;
      const isPeakHours = actualHour >= 9 && actualHour <= 15;

      let base = 100;
      if (isWeekday && isPeakHours) {
        base = 800 + Math.floor(Math.random() * 400);
      } else if (isWeekday && isBusinessHours) {
        base = 500 + Math.floor(Math.random() * 300);
      } else if (isWeekday) {
        base = 100 + Math.floor(Math.random() * 200);
      } else {
        base = 50 + Math.floor(Math.random() * 100);
      }

      // Monday and Friday slightly less
      if (dayIdx === 0 || dayIdx === 4) {
        base = Math.floor(base * 0.9);
      }
      // Tuesday-Thursday peak
      if (dayIdx >= 1 && dayIdx <= 3 && isPeakHours) {
        base = Math.floor(base * 1.15);
      }

      return base;
    });
  });
}

const heatmapData = generateHeatmapData();
const maxValue = Math.max(...heatmapData.flat());

const getColor = (value: number): string => {
  const ratio = value / maxValue;
  if (ratio >= 0.8) return '#003F72';
  if (ratio >= 0.6) return '#1A6AA5';
  if (ratio >= 0.4) return '#4A9BD9';
  if (ratio >= 0.25) return '#89C4F4';
  if (ratio >= 0.1) return '#C5E1F5';
  return '#EDF4FC';
};

const UtilizationHeatmap: React.FC = () => {
  const peakDay = DAYS[heatmapData.reduce(
    (maxIdx, row, idx, arr) =>
      row.reduce((s, v) => s + v, 0) > arr[maxIdx].reduce((s, v) => s + v, 0) ? idx : maxIdx,
    0
  )];
  const totalClaims = heatmapData.flat().reduce((s, v) => s + v, 0).toLocaleString();

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
        Processing Utilization Heatmap
      </Typography>
      <Typography variant="caption" sx={{ color: '#5B616B', mb: 2, display: 'block' }}>
        Claims processed by day and hour | Peak day: {peakDay} | Weekly total: {totalClaims}
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 600 }}>
          {/* Header row */}
          <Box sx={{ display: 'flex', gap: '2px', ml: '50px' }}>
            {HOURS.map((hour) => (
              <Box
                key={hour}
                sx={{
                  width: 38,
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography variant="caption" sx={{ fontSize: 9, color: '#5B616B' }}>
                  {hour}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Data rows */}
          {DAYS.map((day, dayIdx) => (
            <Box key={day} sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Typography
                variant="caption"
                sx={{
                  width: 46,
                  textAlign: 'right',
                  pr: 0.5,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#112E51',
                  flexShrink: 0,
                }}
              >
                {day}
              </Typography>
              {heatmapData[dayIdx].map((value, hourIdx) => (
                <Box
                  key={`${dayIdx}-${hourIdx}`}
                  title={`${day} ${HOURS[hourIdx]}: ${value.toLocaleString()} claims`}
                  sx={{
                    width: 38,
                    height: 28,
                    backgroundColor: getColor(value),
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'default',
                    flexShrink: 0,
                    '&:hover': {
                      outline: '2px solid #003F72',
                      outlineOffset: -1,
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: 8,
                      color: value / maxValue >= 0.5 ? '#FFFFFF' : '#112E51',
                      fontWeight: 500,
                    }}
                  >
                    {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 2 }}>
        <Typography variant="caption" sx={{ color: '#5B616B', mr: 1, fontSize: 10 }}>Low</Typography>
        {['#EDF4FC', '#C5E1F5', '#89C4F4', '#4A9BD9', '#1A6AA5', '#003F72'].map((color) => (
          <Box
            key={color}
            sx={{
              width: 24,
              height: 14,
              backgroundColor: color,
              borderRadius: '2px',
            }}
          />
        ))}
        <Typography variant="caption" sx={{ color: '#5B616B', ml: 1, fontSize: 10 }}>High</Typography>
      </Box>
    </Box>
  );
};

export default UtilizationHeatmap;
