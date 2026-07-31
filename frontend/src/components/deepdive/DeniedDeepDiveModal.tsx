// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import FlagIcon from '@mui/icons-material/Flag';
import GavelIcon from '@mui/icons-material/Gavel';
import PersonIcon from '@mui/icons-material/Person';
import { useUIContext } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/apiClient';
import RiskBadge from '../common/RiskBadge';
import ExecutiveSummary from './ExecutiveSummary';
import ExplainableAIPanel from './ExplainableAIPanel';
import ChatInterface from './ChatInterface';
import type { Claim } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

const DRAWER_WIDTH = '70vw';

const DeniedDeepDiveModal: React.FC = () => {
  const { activeModal, closeModal, showToast } = useUIContext();
  const { user } = useAuth();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAuditor = user?.role === 'Senior Investigator' || user?.role === 'Platform Administrator';
  const isOpen = activeModal?.type === 'deniedDeepDive';
  const claimId = activeModal?.type === 'deniedDeepDive' ? activeModal.claimId : null;

  // Flag for audit dialog state
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagNotes, setFlagNotes] = useState('');
  const [flagging, setFlagging] = useState(false);

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

  // Scroll to top when claim data loads
  useEffect(() => {
    if (claim && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [claim]);

  const handleFlagForAudit = useCallback(async () => {
    if (!claimId || flagging) return;
    try {
      setFlagging(true);
      // Post an audit flag for this denied claim
      await apiClient.post(`/claims/${claimId}/decide`, {
        decisionType: 'false_positive',
        actor: user?.name ?? 'Unknown',
        actorRole: user?.role ?? 'unknown',
        rationale: flagNotes || 'Flagged for further auditing by Auditor.',
      });
      showToast('Claim flagged for further auditing.', 'warning');
      setFlagDialogOpen(false);
      setFlagNotes('');
      closeModal();
    } catch (error) {
      console.error('Failed to flag claim for audit:', error);
      showToast('Failed to flag claim. Please try again.', 'error');
    } finally {
      setFlagging(false);
    }
  }, [claimId, flagging, flagNotes, user, showToast, closeModal]);

  return (
    <>
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={closeModal}
        PaperProps={{
          sx: {
            width: DRAWER_WIDTH,
            maxWidth: '100vw',
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
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" fontWeight={700}>
                      Claim {claim.claim_number}
                    </Typography>
                    <Chip
                      icon={<CancelIcon sx={{ fontSize: 14, color: '#E31C3D !important' }} />}
                      label="Denied"
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(227, 28, 61, 0.2)',
                        color: '#FF6B6B',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 22,
                      }}
                    />
                  </Stack>
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
                  {claim.veteran?.name_display ?? 'Unknown'}
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

            {/* Scrollable Content */}
            <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
              {/* Original Decision Notes */}
              {claim.decision && (
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    backgroundColor: '#FDE0DB',
                    borderRadius: 2,
                    border: '1px solid #FCBCB0',
                    borderLeft: '4px solid #E31C3D',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <GavelIcon sx={{ fontSize: 20, color: '#E31C3D' }} />
                    <Typography variant="subtitle2" fontWeight={700} color="#B91C1C">
                      Denial Decision
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <PersonIcon sx={{ fontSize: 16, color: '#5B616B' }} />
                    <Typography variant="caption" color="text.secondary">
                      Decided by <strong>{claim.decision.actor}</strong> ({claim.decision.actor_role})
                      {claim.decision.created_at && (
                        <> &middot; {formatDate(claim.decision.created_at)}</>
                      )}
                    </Typography>
                  </Stack>
                  {claim.decision.rationale ? (
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#4A4A4A' }}
                    >
                      {claim.decision.rationale}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontStyle="italic">
                      No notes provided.
                    </Typography>
                  )}
                </Box>
              )}

              <ExecutiveSummary claimId={claimId} />
              <ExplainableAIPanel claimId={claimId} />
              <ChatInterface claimId={claimId} />
            </Box>

            {/* Footer - Auditors see Flag for Audit button, MCRs see read-only notice */}
            <Box
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                px: 3,
                py: 2,
                backgroundColor: '#FAFAFA',
                flexShrink: 0,
              }}
            >
              {isAuditor ? (
                <Stack direction="row" spacing={2} justifyContent="center">
                  <Button
                    variant="contained"
                    startIcon={<FlagIcon />}
                    onClick={() => setFlagDialogOpen(true)}
                    sx={{
                      backgroundColor: '#F57C00',
                      '&:hover': { backgroundColor: '#E65100' },
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 3,
                    }}
                  >
                    Flag for Further Auditing
                  </Button>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Read-only view &mdash; This claim has already been denied.
                </Typography>
              )}
            </Box>
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

      {/* Flag for Audit Dialog */}
      <Dialog
        open={flagDialogOpen}
        onClose={() => setFlagDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: '#F57C00' }}>
          Flag Claim for Further Auditing
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will flag claim <strong>{claim?.claim_number}</strong> for further auditing review.
            Please provide notes explaining why this denied claim requires additional auditing.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Audit Notes"
            placeholder="Enter notes explaining why further auditing is needed..."
            value={flagNotes}
            onChange={(e) => setFlagNotes(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setFlagDialogOpen(false);
              setFlagNotes('');
            }}
            variant="outlined"
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleFlagForAudit}
            variant="contained"
            disabled={flagging || !flagNotes.trim()}
            startIcon={flagging ? <CircularProgress size={16} /> : <FlagIcon />}
            sx={{
              backgroundColor: '#F57C00',
              '&:hover': { backgroundColor: '#E65100' },
            }}
          >
            {flagging ? 'Flagging...' : 'Flag for Audit'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeniedDeepDiveModal;
