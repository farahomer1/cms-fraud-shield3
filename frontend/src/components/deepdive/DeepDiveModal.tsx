// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useUIContext } from '../../contexts/UIContext';
import apiClient from '../../services/apiClient';
import RiskBadge from '../common/RiskBadge';
import ExecutiveSummary from './ExecutiveSummary';
import ExplainableAIPanel from './ExplainableAIPanel';
import ChatInterface from './ChatInterface';
import EvidencePanel from './EvidencePanel';
import DecisionBar from './DecisionBar';
import type { Claim } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

const DRAWER_WIDTH = '70vw';

const DeepDiveModal: React.FC = () => {
  const { activeModal, closeModal } = useUIContext();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isOpen = activeModal?.type === 'deepDive';
  const claimId = activeModal?.type === 'deepDive' ? activeModal.claimId : null;

  useEffect(() => {
    if (!claimId) {
      setClaim(null);
      return;
    }

    const fetchClaim = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<Claim>(`/claims/${claimId}`);
        setClaim(response.data);
      } catch (error) {
        console.error('Failed to fetch claim detail:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClaim();
  }, [claimId]);

  // Scroll to top when claim data loads or tab changes
  useEffect(() => {
    if (claim && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [claim, activeTab]);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(0);
    }
  }, [isOpen]);

  const handleDecisionMade = useCallback((_decisionType: 'approved' | 'denied') => {
    closeModal();
    // The DecisionBar dispatches a 'pivot-decision-made' custom event
    // which ValidationPage listens for to trigger table refreshes
  }, [closeModal]);

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={closeModal}
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
      PaperProps={{
        sx: {
          width: DRAWER_WIDTH,
          maxWidth: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      {loading && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <CircularProgress size={48} sx={{ color: '#112E51' }} />
        </Box>
      )}

      {!loading && claim && claimId && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Header */}
          <Box
            sx={{
              px: 3,
              py: 2,
              backgroundColor: '#112E51',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Claim {claim.claim_number}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Chip
                    label={claim.claim_type === 'dme' ? 'DME' : claim.claim_type.charAt(0).toUpperCase() + claim.claim_type.slice(1)}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                      fontWeight: 500,
                      fontSize: '0.7rem',
                      height: 22,
                    }}
                  />
                  {claim.risk_level && <RiskBadge level={claim.risk_level} />}
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {formatCurrency(claim.billing_amount)} &middot; Service Date: {formatDate(claim.service_date)}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
            <IconButton onClick={closeModal} sx={{ color: '#FFFFFF' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Claim Parties */}
          <Box
            sx={{
              px: 3,
              py: 1.5,
              backgroundColor: '#F1F1F1',
              display: 'flex',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Member
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {claim.beneficiary?.name_display ?? claim.veteran?.name_display ?? 'Unknown'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Provider
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {claim.provider?.name ?? 'Unknown'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Diagnosis Codes
              </Typography>
              <Typography variant="body2">
                {claim.diagnosis_codes.length > 0
                  ? claim.diagnosis_codes.join(', ')
                  : 'None'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Procedure Codes
              </Typography>
              <Typography variant="body2">
                {claim.procedure_codes.length > 0
                  ? claim.procedure_codes.join(', ')
                  : 'None'}
              </Typography>
            </Box>
          </Box>

          <Divider />

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                px: 3,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  minHeight: 44,
                },
                '& .Mui-selected': { color: '#112E51' },
                '& .MuiTabs-indicator': { backgroundColor: '#112E51' },
              }}
            >
              <Tab label="Analysis" />
              <Tab label="Evidence" />
            </Tabs>
          </Box>

          {/* Scrollable Content */}
          <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
            {activeTab === 0 && (
              <>
                <ExecutiveSummary claimId={claimId} />
                <ExplainableAIPanel claimId={claimId} />
                <ChatInterface claimId={claimId} />
              </>
            )}
            {activeTab === 1 && <EvidencePanel />}
          </Box>

          {/* Decision Bar */}
          <DecisionBar
            claimId={claimId}
            claimNumber={claim.claim_number}
            findings={claim.findings}
            onDecisionMade={handleDecisionMade}
          />
        </Box>
      )}

      {!loading && !claim && isOpen && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <Typography color="text.secondary">
            Unable to load claim details.
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default DeepDiveModal;
