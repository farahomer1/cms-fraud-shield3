// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Chip, Stack, Tab, Tabs, Typography } from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { PageContainer } from '../components/layout/PageContainer';
import FlaggedClaimsTable from '../components/validation/FlaggedClaimsTable';
import ApprovedClaimsTable from '../components/validation/ApprovedClaimsTable';
import DeniedClaimsTable from '../components/validation/DeniedClaimsTable';
import DeepDiveModal from '../components/deepdive/DeepDiveModal';
import DeniedDeepDiveModal from '../components/deepdive/DeniedDeepDiveModal';
import { useAuth } from '../contexts/AuthContext';

const ValidationPage: React.FC = () => {
  const { user } = useAuth();
  const isAuditor = user?.role === 'Claims Auditor';

  const [activeTab, setActiveTab] = useState(isAuditor ? 2 : 0);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [deniedCount, setDeniedCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Listen for decision events from the DeepDive modal to refresh tables
  const handleDecisionEvent = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    window.addEventListener('pivot-decision-made', handleDecisionEvent);
    return () => {
      window.removeEventListener('pivot-decision-made', handleDecisionEvent);
    };
  }, [handleDecisionEvent]);

  return (
    <PageContainer
      title="Validation Queue"
      subtitle={isAuditor ? 'Auditor view — Denied payments only' : 'Review flagged claims and manage decisions'}
    >
      {/* Summary bar showing counts */}
      <Stack
        direction="row"
        spacing={3}
        alignItems="center"
        sx={{
          mb: 2,
          px: 2,
          py: 1.5,
          backgroundColor: '#F8F9FA',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {!isAuditor && (
          <>
            <Stack direction="row" spacing={1} alignItems="center">
              <FlagIcon sx={{ fontSize: 20, color: '#E31C3D' }} />
              <Typography variant="body2" fontWeight={600} color="text.secondary">
                Flagged Claims:
              </Typography>
              <Chip
                label={flaggedCount}
                size="small"
                sx={{
                  backgroundColor: '#FDE0DB',
                  color: '#E31C3D',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  height: 24,
                  minWidth: 32,
                }}
              />
            </Stack>
            <Typography variant="body2" color="text.disabled">|</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <CheckCircleIcon sx={{ fontSize: 20, color: '#2E8540' }} />
              <Typography variant="body2" fontWeight={600} color="text.secondary">
                Approved Claims:
              </Typography>
              <Chip
                label={approvedCount}
                size="small"
                sx={{
                  backgroundColor: '#E7F4E4',
                  color: '#2E8540',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  height: 24,
                  minWidth: 32,
                }}
              />
            </Stack>
            <Typography variant="body2" color="text.disabled">|</Typography>
          </>
        )}
        <Stack direction="row" spacing={1} alignItems="center">
          <CancelIcon sx={{ fontSize: 20, color: '#CD2026' }} />
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Denied Claims:
          </Typography>
          <Chip
            label={deniedCount}
            size="small"
            sx={{
              backgroundColor: '#FDE0DB',
              color: '#CD2026',
              fontWeight: 700,
              fontSize: '0.8rem',
              height: 24,
              minWidth: 32,
            }}
          />
        </Stack>
      </Stack>

      {isAuditor ? (
        /* Auditor: only Denied Claims, no tabs */
        <DeniedClaimsTable onCountChange={setDeniedCount} refreshTrigger={refreshKey} />
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  minHeight: 48,
                },
              }}
            >
              <Tab
                icon={<FlagIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Flagged Claims"
              />
              <Tab
                icon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Approved Claims"
              />
              <Tab
                icon={<CancelIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Denied Claims"
              />
            </Tabs>
          </Box>

          <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
            <FlaggedClaimsTable onCountChange={setFlaggedCount} refreshTrigger={refreshKey} />
          </Box>

          <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
            <ApprovedClaimsTable onCountChange={setApprovedCount} refreshTrigger={refreshKey} />
          </Box>

          <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
            <DeniedClaimsTable onCountChange={setDeniedCount} refreshTrigger={refreshKey} />
          </Box>
        </>
      )}

      <DeepDiveModal />
      <DeniedDeepDiveModal />
    </PageContainer>
  );
};

export default ValidationPage;
