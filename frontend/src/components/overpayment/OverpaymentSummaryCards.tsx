// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import { Box, Skeleton } from '@mui/material';
import MetricCard from '../common/MetricCard';
import { getOverpaymentSummary, type OverpaymentSummary } from '../../services/overpaymentService';
import { formatCurrency } from '../../utils/formatters';

const OverpaymentSummaryCards: React.FC = () => {
  const [summary, setSummary] = useState<OverpaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getOverpaymentSummary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        console.error('Failed to load overpayment summary:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={220}
            height={100}
            sx={{ borderRadius: 2, bgcolor: 'rgba(0,63,114,0.08)' }}
          />
        ))}
      </Box>
    );
  }

  const totalCount = summary?.total_identified.count ?? 0;
  const totalAmount = summary?.total_identified.amount ?? 0;
  const inProgressCount = summary?.in_progress.count ?? 0;
  const inProgressAmount = summary?.in_progress.amount ?? 0;
  const recoupedCount = summary?.recouped.count ?? 0;
  const recoupedAmount = summary?.recouped.amount ?? 0;
  const recoveryRate = summary?.recovery_rate ?? 0;

  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      <MetricCard
        title="Total Identified"
        value={formatCurrency(totalAmount)}
        subtitle={`${totalCount} overpayments`}
        trend="up"
      />
      <MetricCard
        title="In Progress"
        value={formatCurrency(inProgressAmount)}
        subtitle={`${inProgressCount} pending recoupment`}
        trend="flat"
      />
      <MetricCard
        title="Recouped"
        value={formatCurrency(recoupedAmount)}
        subtitle={`${recoupedCount} successfully recovered`}
        trend="up"
      />
      <MetricCard
        title="Recovery Rate"
        value={`${recoveryRate}%`}
        subtitle="of identified amount recouped"
        trend={recoveryRate >= 85 ? 'up' : recoveryRate >= 50 ? 'flat' : 'down'}
      />
    </Box>
  );
};

export default OverpaymentSummaryCards;
