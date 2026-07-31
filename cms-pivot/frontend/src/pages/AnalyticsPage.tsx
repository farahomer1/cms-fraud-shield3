// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
import { Grid, Paper, Typography, Box, Divider } from '@mui/material';
import { PageContainer } from '../components/layout/PageContainer';
import ChartFilters, { ChartFilterValues } from '../components/analytics/ChartFilters';

// Existing charts
import FraudTrendsChart from '../components/analytics/FraudTrendsChart';
import AgentEfficacyChart from '../components/analytics/AgentEfficacyChart';
import ProcessingSpeedGauge from '../components/analytics/ProcessingSpeedGauge';
import SavingsChart from '../components/analytics/SavingsChart';
import InsightCard from '../components/analytics/InsightCard';

// New RFI Section 6.4 Performance Metrics charts
import ROIChart from '../components/analytics/ROIChart';
import RecoupmentTracker from '../components/analytics/RecoupmentTracker';
import FalsePositiveChart from '../components/analytics/FalsePositiveChart';
import ComplianceScorecard from '../components/analytics/ComplianceScorecard';
import DataQualityChart from '../components/analytics/DataQualityChart';
import RulePerformanceChart from '../components/analytics/RulePerformanceChart';
import ModelDriftChart from '../components/analytics/ModelDriftChart';
import UtilizationHeatmap from '../components/analytics/UtilizationHeatmap';
import StateThroughputChart from '../components/analytics/StateThroughputChart';
import ClaimTypeBreakdown from '../components/analytics/ClaimTypeBreakdown';
import GeographicDistribution from '../components/analytics/GeographicDistribution';

// Case Officer Performance charts
import CaseOfficerClaimsChart from '../components/analytics/CaseOfficerClaimsChart';
import CaseOfficerFalsePositiveChart from '../components/analytics/CaseOfficerFalsePositiveChart';
import CaseOfficerTurnaroundChart from '../components/analytics/CaseOfficerTurnaroundChart';
import CaseOfficerRiskAccuracyChart from '../components/analytics/CaseOfficerRiskAccuracyChart';

const chartPaperSx = {
  p: 2.5,
  borderRadius: 2,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
};

const sectionHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  mt: 5,
  mb: 2,
};

const SectionHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <Grid item xs={12}>
    <Box sx={sectionHeaderSx}>
      <Box>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#112E51' }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#5B616B', mt: 0.5 }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>
    <Divider sx={{ borderColor: '#AEB0B5', mb: 1 }} />
  </Grid>
);

const AnalyticsPage: React.FC = () => {
  const [, setFilters] = useState<ChartFilterValues>({
    dateRange: 'this_month',
    agentType: '',
    riskLevel: '',
    provider: '',
  });

  const handleFilterChange = (newFilters: ChartFilterValues) => {
    setFilters(newFilters);
  };

  return (
    <PageContainer title="PIVOT Analytics & Reporting" subtitle="Performance metrics, fraud trends, and AI-driven insights aligned with RFI Section 6.4">
      <ChartFilters onFilterChange={handleFilterChange} />

      <Grid container spacing={3}>
        {/* ===== SECTION 1: Core Fraud Detection & AI Performance ===== */}
        <SectionHeader
          title="Core Fraud Detection & AI Performance"
          subtitle="AI/ML accuracy, agent efficacy, and fraud trend analysis (RFI: AI/ML Accuracy >= 95%)"
        />

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <FraudTrendsChart />
            <InsightCard chartType="fraud_trends" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <AgentEfficacyChart />
            <InsightCard chartType="agent_efficacy" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <FalsePositiveChart />
            <InsightCard chartType="false_positive" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <ModelDriftChart />
            <InsightCard chartType="model_drift" />
          </Paper>
        </Grid>

        {/* ===== SECTION 2: Financial Impact & ROI ===== */}
        <SectionHeader
          title="Financial Impact & ROI"
          subtitle="Return on investment, cost savings, and recoupment tracking (RFI: ROI >= 3:1 over 12 months, Recoupment >= 85%)"
        />

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <ROIChart />
            <InsightCard chartType="roi" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <SavingsChart />
            <InsightCard chartType="savings" />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <RecoupmentTracker />
            <InsightCard chartType="recoupment" />
          </Paper>
        </Grid>

        {/* ===== SECTION 3: Compliance & Data Quality ===== */}
        <SectionHeader
          title="Compliance & Data Quality"
          subtitle="Regulatory compliance scores and data quality dimensions (RFI: Compliance >= 95%, Data Quality >= 98%)"
        />

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <ComplianceScorecard />
            <InsightCard chartType="compliance" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <DataQualityChart />
            <InsightCard chartType="data_quality" />
          </Paper>
        </Grid>

        {/* ===== SECTION 4: Rule Engine & Processing ===== */}
        <SectionHeader
          title="Rule Engine & Processing"
          subtitle="Rule execution accuracy, processing throughput, and utilization (RFI: Rule Execution >= 98%, System Uptime >= 99.9%)"
        />

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <RulePerformanceChart />
            <InsightCard chartType="rule_performance" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <ProcessingSpeedGauge />
            <InsightCard chartType="processing_speed" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <UtilizationHeatmap />
            <InsightCard chartType="utilization" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <StateThroughputChart />
            <InsightCard chartType="state_throughput" />
          </Paper>
        </Grid>

        {/* ===== SECTION 5: Claim Distribution & Volume ===== */}
        <SectionHeader
          title="Claim Distribution & Volume"
          subtitle="Claim type breakdowns and geographic distribution across Medicare Administrative Contractors (MACs)"
        />

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <ClaimTypeBreakdown />
            <InsightCard chartType="claim_type_breakdown" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <GeographicDistribution />
            <InsightCard chartType="geographic_distribution" />
          </Paper>
        </Grid>

        {/* ===== SECTION 6: Case Officer Performance ===== */}
        <SectionHeader
          title="Case Officer Performance"
          subtitle="Individual case officer productivity, accuracy, and behavior analysis for performance management"
        />

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <CaseOfficerClaimsChart />
            <InsightCard chartType="officer_claims" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <CaseOfficerFalsePositiveChart />
            <InsightCard chartType="officer_false_positive" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <CaseOfficerTurnaroundChart />
            <InsightCard chartType="officer_turnaround" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={chartPaperSx}>
            <CaseOfficerRiskAccuracyChart />
            <InsightCard chartType="officer_denial_by_provider" />
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default AnalyticsPage;
