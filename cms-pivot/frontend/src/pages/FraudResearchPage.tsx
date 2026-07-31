// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
import { Box, Tab, Tabs, Paper } from '@mui/material';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import TroubleshootIcon from '@mui/icons-material/Troubleshoot';
import HubIcon from '@mui/icons-material/Hub';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { PageContainer } from '../components/layout/PageContainer';
import FraudResearchSummaryBar from '../components/fraud-research/FraudResearchSummaryBar';
import XAIModelPanel from '../components/fraud-research/XAIModelPanel';
import ClusterAnalysisPanel from '../components/fraud-research/ClusterAnalysisPanel';
import AnomalyDetectionPanel from '../components/fraud-research/AnomalyDetectionPanel';
import NetworkAnalysisPanel from '../components/fraud-research/NetworkAnalysisPanel';
import GeminiAnalysisPanel from '../components/fraud-research/GeminiAnalysisPanel';
import PatternSearchInput from '../components/fraud-research/PatternSearchInput';

const FraudResearchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <PageContainer
      title="Fraud Research"
      subtitle="Proactive fraud discovery — identifying false negatives missed by the detection pipeline"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Summary Metrics Bar */}
        <FraudResearchSummaryBar />

        {/* Tab Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 48,
              },
            }}
          >
            <Tab icon={<ModelTrainingIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="XAI & Predictive Models" />
            <Tab icon={<BubbleChartIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Clustering" />
            <Tab icon={<TroubleshootIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Anomaly Detection" />
            <Tab icon={<HubIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Network Analysis" />
            <Tab icon={<PsychologyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="AI-Powered Research" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
          <XAIModelPanel />
        </Box>

        <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
          <ClusterAnalysisPanel />
        </Box>

        <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
          <AnomalyDetectionPanel />
        </Box>

        <Box sx={{ display: activeTab === 3 ? 'block' : 'none' }}>
          <NetworkAnalysisPanel />
        </Box>

        <Box sx={{ display: activeTab === 4 ? 'block' : 'none' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <GeminiAnalysisPanel />
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <PatternSearchInput />
            </Paper>
          </Box>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default FraudResearchPage;
