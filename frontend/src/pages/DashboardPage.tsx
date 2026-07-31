// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import Grid from '@mui/material/Grid2';
import { PageContainer } from '../components/layout/PageContainer';
import MetricRow from '../components/dashboard/MetricRow';
import USTrafficMap from '../components/dashboard/USTrafficMap';
import AlertFeed from '../components/dashboard/AlertFeed';
import { CMSLogo } from '../components/common/CMSLogo';

const DashboardPage: React.FC = () => {
  return (
    <PageContainer
      title="Mission Control"
      subtitle="CMS Fraud Shield Red-Team Mission Control"
      action={<CMSLogo variant="light" height={60} />}
    >
      <Grid container spacing={3}>
        {/* Top row: Metric cards */}
        <Grid size={12}>
          <MetricRow />
        </Grid>

        {/* Middle row: Map + Alert Feed */}
        <Grid size={{ xs: 12, md: 8 }}>
          <USTrafficMap />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AlertFeed />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default DashboardPage;
