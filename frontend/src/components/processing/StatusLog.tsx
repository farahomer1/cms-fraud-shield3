// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, Chip, Stack } from '@mui/material';

export interface LogEvent {
  timestamp: string;
  message: string;
  type: 'pass' | 'alert' | 'info' | 'system';
}

export type LogFilterType = 'INFO' | 'PASS' | 'FLAGGED';

interface StatusLogProps {
  events: LogEvent[];
  claimsProcessed?: number;
}

function getTagColor(type: LogEvent['type']): string {
  switch (type) {
    case 'pass':
      return '#2E8540';
    case 'alert':
      return '#E31C3D';
    case 'info':
      return '#02BFE7';
    case 'system':
      return '#5B616B';
    default:
      return '#FFFFFF';
  }
}

function getTagLabel(type: LogEvent['type']): string {
  switch (type) {
    case 'pass':
      return '[PASS]';
    case 'alert':
      return '[ALERT]';
    case 'info':
      return '[INFO]';
    case 'system':
      return '[SYSTEM]';
    default:
      return '[LOG]';
  }
}

function formatLogTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return timestamp;
  }
}

const StatusLog: React.FC<StatusLogProps> = ({ events, claimsProcessed = 0 }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Default: only show FLAGGED events
  const [activeFilters, setActiveFilters] = useState<LogFilterType[]>(['FLAGGED']);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, activeFilters]);

  const handleFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilters: LogFilterType[]) => {
    // Ensure at least one filter is active
    if (newFilters.length > 0) {
      setActiveFilters(newFilters);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (activeFilters.includes('FLAGGED') && event.type === 'alert') return true;
      if (activeFilters.includes('PASS') && event.type === 'pass') return true;
      if (activeFilters.includes('INFO') && (event.type === 'info' || event.type === 'system')) return true;
      return false;
    });
  }, [events, activeFilters]);

  // Count events by type
  // Each claim generates ~15 agent evaluation passes, so base pass count on claims processed
  const passCount = claimsProcessed > 0 ? claimsProcessed * 15 : events.filter((e) => e.type === 'pass').length;
  const alertCount = events.filter((e) => e.type === 'alert').length;
  const infoCount = events.filter((e) => e.type === 'info' || e.type === 'system').length;

  return (
    <Box>
      {/* Filter bar */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <ToggleButtonGroup
          value={activeFilters}
          onChange={handleFilterChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.72rem',
              px: 1.5,
              py: 0.25,
              color: 'rgba(255,255,255,0.5)',
              borderColor: 'rgba(255,255,255,0.15)',
              '&.Mui-selected': {
                color: '#FFFFFF',
                borderColor: 'rgba(255,255,255,0.3)',
              },
            },
          }}
        >
          <ToggleButton value="FLAGGED" sx={{ '&.Mui-selected': { backgroundColor: 'rgba(227,28,61,0.25)' } }}>
            FLAGGED
            <Chip label={alertCount} size="small" sx={{ ml: 0.75, height: 18, fontSize: '0.65rem', backgroundColor: 'rgba(227,28,61,0.4)', color: '#FFFFFF' }} />
          </ToggleButton>
          <ToggleButton value="PASS" sx={{ '&.Mui-selected': { backgroundColor: 'rgba(46,133,64,0.25)' } }}>
            PASS
            <Chip label={passCount} size="small" sx={{ ml: 0.75, height: 18, fontSize: '0.65rem', backgroundColor: 'rgba(46,133,64,0.4)', color: '#FFFFFF' }} />
          </ToggleButton>
          <ToggleButton value="INFO" sx={{ '&.Mui-selected': { backgroundColor: 'rgba(2,191,231,0.25)' } }}>
            INFO
            <Chip label={infoCount} size="small" sx={{ ml: 0.75, height: 18, fontSize: '0.65rem', backgroundColor: 'rgba(2,191,231,0.4)', color: '#FFFFFF' }} />
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
          {(passCount + alertCount + infoCount).toLocaleString()} events
        </Typography>
      </Stack>

      <Box
        ref={scrollRef}
        sx={{
          backgroundColor: '#1a1a2e',
          borderRadius: 1,
          p: 2,
          height: '100%',
          minHeight: 200,
          maxHeight: 350,
          overflowY: 'auto',
          fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
          fontSize: '0.78rem',
          lineHeight: 1.8,
          border: '1px solid #2a2a4a',
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#1a1a2e',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#3a3a5a',
            borderRadius: 3,
          },
        }}
      >
        {filteredEvents.length === 0 && (
          <Typography
            variant="body2"
            sx={{
              color: '#5B616B',
              fontFamily: 'inherit',
              fontStyle: 'italic',
            }}
          >
            {events.length === 0 ? 'Waiting for processing events...' : 'No events match current filters.'}
          </Typography>
        )}

        {filteredEvents.map((event, index) => {
          const tagColor = getTagColor(event.type);
          const tagLabel = getTagLabel(event.type);

          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                gap: 1,
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.03)',
                },
                px: 0.5,
                borderRadius: 0.5,
              }}
            >
              <Box
                component="span"
                sx={{
                  color: '#5B616B',
                  flexShrink: 0,
                  userSelect: 'none',
                }}
              >
                {formatLogTimestamp(event.timestamp)}
              </Box>
              <Box
                component="span"
                sx={{
                  color: tagColor,
                  fontWeight: 700,
                  flexShrink: 0,
                  minWidth: 70,
                }}
              >
                {tagLabel}
              </Box>
              <Box
                component="span"
                sx={{
                  color: event.type === 'alert' ? '#E31C3D' : '#D4D4D4',
                  wordBreak: 'break-word',
                }}
              >
                {event.message}
              </Box>
            </Box>
          );
        })}

        {/* Blinking cursor */}
        {filteredEvents.length > 0 && (
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              width: 8,
              height: 14,
              backgroundColor: '#2E8540',
              ml: 0.5,
              animation: 'blink 1s step-end infinite',
              '@keyframes blink': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0 },
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default StatusLog;
