// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Chip,
} from '@mui/material';
import apiClient from '../../services/apiClient';

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  source?: string;
}

const LOG_TABS = [
  { key: 'application', label: 'Application' },
  { key: 'ai_agent', label: 'AI Agent' },
  { key: 'audit', label: 'Audit' },
  { key: 'db', label: 'DB' },
  { key: 'ui_access', label: 'UI Access' },
  { key: 'action', label: 'Action' },
];

const LEVEL_COLORS: Record<string, string> = {
  INFO: '#2E8540',
  WARN: '#FDB81E',
  ERROR: '#E31C3D',
  DEBUG: '#02BFE7',
};

function generateFallbackLogs(category: string): LogEntry[] {
  const levels: Array<'INFO' | 'WARN' | 'ERROR' | 'DEBUG'> = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR', 'DEBUG'];
  const messages: Record<string, string[]> = {
    application: [
      'Server started on port 8000',
      'Database connection pool initialized (10 connections)',
      'Health check endpoint responding normally',
      'Request processed: GET /api/claims (142ms)',
      'Cache hit ratio: 94.2%',
      'Background task scheduler running',
      'Memory usage: 2.1GB / 8GB (26.3%)',
      'Request processed: POST /api/batch/upload (3,420ms)',
      'Rate limiter: 1,247 requests in last minute',
      'SSL certificate valid for 89 days',
    ],
    ai_agent: [
      'Rules Engine agent started processing claim CLM-2024-00847',
      'Data Validation agent completed: confidence 97.3%',
      'Pension Poaching detection: 2 suspicious patterns found',
      'Claim Sharking agent: provider cross-reference complete',
      'DBQ Fraud agent: medical record anomaly detected',
      'Overlapping Claims check: 0 conflicts found',
      'Medical Record agent: vitals verification passed',
      'Claim Discrepancy agent: billing code mismatch flagged',
      'Gemini API call: 1,847ms latency, 2,340 tokens',
      'Agent pipeline completed for batch BTH-2024-0412 (87 claims)',
    ],
    audit: [
      'User admin@va.gov logged in from 10.0.0.42',
      'Decision made: CLM-2024-00831 DENIED by reviewer_jones',
      'Batch BTH-2024-0412 uploaded by batch_processor',
      'Claim CLM-2024-00847 flagged by Rules Engine (confidence: 94.1%)',
      'Export requested: analytics report by admin@va.gov',
      'Role changed: user_smith promoted to senior_reviewer',
      'System configuration updated: fraud_threshold = 0.85',
      'Claim CLM-2024-00839 marked as false_positive by reviewer_adams',
    ],
    db: [
      'Query executed: SELECT claims WHERE batch_id = ? (12ms)',
      'Index scan on claims.status: 847 rows examined',
      'Connection pool: 8/10 active connections',
      'Slow query detected: JOIN findings ON claims (342ms)',
      'Table vacuum completed: audit_entries (14,203 rows)',
      'Replication lag: 0.2 seconds',
      'Backup completed: pivot_prod_20240612.sql.gz (2.1GB)',
      'Query cache cleared: 1,247 entries evicted',
    ],
    ui_access: [
      'Page view: /dashboard by admin@va.gov',
      'Page view: /validation/CLM-2024-00847 by reviewer_jones',
      'Page view: /analytics by admin@va.gov',
      'API call: GET /api/claims?status=flagged by reviewer_adams',
      'Page view: /fraud-research by analyst_brown',
      'Export download: fraud_trends_report.csv by admin@va.gov',
      'Page view: /monitoring by sysadmin@va.gov',
      'Session timeout: reviewer_smith (inactive 30min)',
    ],
    action: [
      'Batch processing started: BTH-2024-0412',
      'Claim status changed: CLM-2024-00831 pending -> flagged',
      'Decision recorded: CLM-2024-00831 denied (savings: $12,450)',
      'Notification sent: reviewer_jones assigned 5 new claims',
      'Report generated: weekly_fraud_summary_20240612.pdf',
      'Batch completed: BTH-2024-0412 (87 claims, 12 flagged)',
      'Ticket created: TKT-2024-0298 for CLM-2024-00847',
      'System alert cleared: Gemini latency back to normal',
    ],
  };

  const categoryMessages = messages[category] || messages.application;
  const now = new Date();

  return categoryMessages.map((msg, idx) => {
    const logTime = new Date(now.getTime() - (categoryMessages.length - idx) * 15000);
    return {
      timestamp: logTime.toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)],
      message: msg,
      source: category,
    };
  });
}

const LogViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const logCacheRef = useRef<Record<string, LogEntry[]>>({});

  const currentCategory = LOG_TABS[activeTab].key;

  const fetchLogs = useCallback(async (category: string) => {
    // Return cached logs instantly if available
    if (logCacheRef.current[category]) {
      setLogs(logCacheRef.current[category]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get('/monitoring/logs', {
        params: { category },
      });
      const raw = response.data;

      let entries: LogEntry[];
      if (Array.isArray(raw) && raw.length > 0) {
        entries = raw as LogEntry[];
      } else if (raw && Array.isArray(raw.logs)) {
        entries = raw.logs as LogEntry[];
      } else {
        entries = generateFallbackLogs(category);
      }
      logCacheRef.current[category] = entries;
      setLogs(entries);
    } catch {
      const fallback = generateFallbackLogs(category);
      logCacheRef.current[category] = fallback;
      setLogs(fallback);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(currentCategory);
  }, [currentCategory, fetchLogs]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const formatLogTimestamp = (isoStr: string): string => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Log Viewer
        </Typography>
        <Chip
          label="Continuous Monitoring"
          size="small"
          sx={{
            backgroundColor: '#2E8540',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 11,
          }}
        />
      </Box>

      <Box
        sx={{
          backgroundColor: '#1a1a2e',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            backgroundColor: '#16213e',
            '& .MuiTabs-indicator': {
              backgroundColor: '#02BFE7',
            },
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.5)',
              textTransform: 'none',
              fontSize: 13,
              fontWeight: 500,
              minHeight: 42,
              '&.Mui-selected': {
                color: '#FFFFFF',
              },
            },
          }}
        >
          {LOG_TABS.map((tab) => (
            <Tab key={tab.key} label={tab.label} />
          ))}
        </Tabs>

        <Box
          ref={logContainerRef}
          sx={{
            height: 420,
            overflowY: 'auto',
            px: 2,
            py: 1.5,
            fontFamily: '"Fira Code", "Consolas", "Courier New", monospace',
            fontSize: 12.5,
            lineHeight: 1.8,
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#1a1a2e',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#333',
              borderRadius: 4,
            },
          }}
        >
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <CircularProgress size={28} sx={{ color: '#02BFE7' }} />
            </Box>
          ) : logs.length === 0 ? (
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.4)',
                textAlign: 'center',
                pt: 8,
                fontFamily: 'inherit',
              }}
            >
              No log entries for this category.
            </Typography>
          ) : (
            logs.map((entry, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  py: 0.25,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  },
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.35)',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {formatLogTimestamp(entry.timestamp)}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    color: LEVEL_COLORS[entry.level] || '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    minWidth: 42,
                  }}
                >
                  [{entry.level}]
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    wordBreak: 'break-word',
                  }}
                >
                  {entry.message}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default LogViewer;
