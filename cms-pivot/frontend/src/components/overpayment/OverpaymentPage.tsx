// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
import { Box, Button, Chip, Grid, Paper, Stack, Tab, Tabs } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TableChartIcon from '@mui/icons-material/TableChart';
import InsightsIcon from '@mui/icons-material/Insights';
import { PageContainer } from '../layout/PageContainer';
import OverpaymentSummaryCards from './OverpaymentSummaryCards';
import OverpaymentTable from './OverpaymentTable';
import RecoupmentTrendChart from './RecoupmentTrendChart';
import RecoupmentAnalytics from './RecoupmentAnalytics';
import { exportOverpaymentsCsv } from '../../services/overpaymentService';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'identified', label: 'Identified' },
  { value: 'notified', label: 'Notified' },
  { value: 'in_recoupment', label: 'In Recoupment' },
  { value: 'recouped', label: 'Recouped' },
  { value: 'reconciled', label: 'Reconciled' },
];

const OverpaymentPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(0);

  const handleExport = async () => {
    try {
      const blob = await exportOverpaymentsCsv(statusFilter !== 'all' ? statusFilter : undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'overpayments.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  return (
    <PageContainer
      title="Overpayment Tracking"
      subtitle="Monitor overpayment identification, recoupment progress, and financial recovery"
      action={
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          sx={{ textTransform: 'none' }}
        >
          Export CSV
        </Button>
      }
    >
      {/* Summary Metric Cards */}
      <Box sx={{ mb: 3 }}>
        <OverpaymentSummaryCards />
      </Box>

      {/* Status Filter Chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {STATUS_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            onClick={() => setStatusFilter(opt.value)}
            variant={statusFilter === opt.value ? 'filled' : 'outlined'}
            color={statusFilter === opt.value ? 'primary' : 'default'}
            sx={{
              fontWeight: statusFilter === opt.value ? 700 : 500,
              cursor: 'pointer',
            }}
          />
        ))}
      </Stack>

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 44 },
            '& .Mui-selected': { color: '#003F72' },
            '& .MuiTabs-indicator': { backgroundColor: '#003F72' },
          }}
        >
          <Tab icon={<TableChartIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Tracking" />
          <Tab icon={<InsightsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Analytics & Pivots" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Recoupment Trend Chart */}
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <RecoupmentTrendChart />
            </Paper>
          </Grid>

          {/* Overpayment Table */}
          <Grid item xs={12}>
            <OverpaymentTable statusFilter={statusFilter} />
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <RecoupmentAnalytics statusFilter={statusFilter} />
      )}
    </PageContainer>
  );
};

export default OverpaymentPage;
