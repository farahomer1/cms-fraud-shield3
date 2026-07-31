// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import { Box, Skeleton } from '@mui/material';
import MetricCard from '../common/MetricCard';
import { getDashboardMetrics, type DashboardMetrics } from '../../services/analyticsService';

const MetricRow: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getDashboardMetrics()
      .then((data) => {
        if (!cancelled) {
          setMetrics(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard metrics:', err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={200}
            height={100}
            sx={{ borderRadius: 2, bgcolor: 'rgba(0,63,114,0.08)' }}
          />
        ))}
      </Box>
    );
  }

  const flaggedClaims = metrics?.flagged_claims ?? 0;

  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      <MetricCard
        title="Claims Processed"
        value="7M+"
        subtitle="82M Annual Volume"
        trend="up"
      />
      <MetricCard
        title="Flagged Rate"
        value="1.3%"
        subtitle={`${flaggedClaims.toLocaleString()} claims flagged`}
        trend="down"
      />
      <MetricCard
        title="AI/ML Accuracy"
        value={'\u2265 95%'}
        subtitle="Model validation quarterly"
        trend="up"
      />
      <MetricCard
        title="False Positive Rate"
        value={'\u2264 5%'}
        subtitle="Target threshold"
        trend="down"
      />
      <MetricCard
        title="Recoupment Rate"
        value={'\u2265 85%'}
        subtitle="Overpayment recovery"
        trend="up"
      />
    </Box>
  );
};

export default MetricRow;
