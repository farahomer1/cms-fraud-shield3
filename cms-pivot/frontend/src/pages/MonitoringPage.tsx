// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box } from '@mui/material';
import { PageContainer } from '../components/layout/PageContainer';
import HealthMetricCards from '../components/monitoring/HealthMetricCards';
import LogViewer from '../components/monitoring/LogViewer';

const MonitoringPage: React.FC = () => {
  return (
    <PageContainer
      title="System Monitoring"
      subtitle="Continuous Monitoring -- health metrics and log streams"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <HealthMetricCards />
        <LogViewer />
      </Box>
    </PageContainer>
  );
};

export default MonitoringPage;
