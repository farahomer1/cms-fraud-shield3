// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FlagIcon from '@mui/icons-material/Flag';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useUIContext } from '../../contexts/UIContext';
import { useAgentContext } from '../../contexts/AgentContext';
import FlywheelAnimation from '../common/FlywheelAnimation';
import type { AgentFinding } from '../../types';

interface DecisionBarProps {
  claimId: string;
  claimNumber?: string;
  findings?: AgentFinding[];
  onDecisionMade: (decisionType: 'approved' | 'denied') => void;
}

type DecisionType = 'approved' | 'denied';

const DecisionBar: React.FC<DecisionBarProps> = ({ claimId, claimNumber, findings, onDecisionMade }) => {
  const { user } = useAuth();
  const { showToast } = useUIContext();
  const { agents, flagAgent } = useAgentContext();

  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<DecisionType | null>(null);
  const [notes, setNotes] = useState('');
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFlywheel, setShowFlywheel] = useState(false);

  // Agent flagging state (shown on approval)
  const [selectedIncorrectAgents, setSelectedIncorrectAgents] = useState<string[]>([]);
  const [agentFlagNotes, setAgentFlagNotes] = useState('');

  const flaggingFindings = (findings ?? []).filter((f) => f.recommendation === 'flag');

  const openNotesDialog = (type: DecisionType) => {
    setPendingDecision(type);
    setNotes('');
    setSelectedIncorrectAgents([]);
    setAgentFlagNotes('');
    setNotesDialogOpen(true);
  };

  const handleGenerateNotes = useCallback(async () => {
    if (!pendingDecision || !claimId || generatingNotes) return;
    try {
      setGeneratingNotes(true);
      const response = await apiClient.post<{ notes: string }>(`/claims/${claimId}/generate-notes`, {
        decisionType: pendingDecision,
      });
      setNotes(response.data.notes);
    } catch (error) {
      console.error('Failed to generate notes:', error);
      showToast('Failed to generate notes. Please write them manually.', 'warning');
    } finally {
      setGeneratingNotes(false);
    }
  }, [pendingDecision, claimId, generatingNotes, showToast]);

  const closeNotesDialog = () => {
    setNotesDialogOpen(false);
    setPendingDecision(null);
    setNotes('');
    setSelectedIncorrectAgents([]);
    setAgentFlagNotes('');
  };

  const toggleAgentSelection = (agentName: string) => {
    setSelectedIncorrectAgents((prev) =>
      prev.includes(agentName)
        ? prev.filter((a) => a !== agentName)
        : [...prev, agentName]
    );
  };

  const handleSubmit = async () => {
    if (!pendingDecision || submitting) return;

    try {
      setSubmitting(true);
      setNotesDialogOpen(false);

      // Build flagged agents payload if approving with selected agents
      const flaggedAgents =
        pendingDecision === 'approved' && selectedIncorrectAgents.length > 0
          ? selectedIncorrectAgents.map((agentName) => ({
              agentName,
              notes:
                agentFlagNotes ||
                `Agent rule was incorrect for claim ${claimNumber ?? claimId}. Claim was approved despite flag.`,
            }))
          : undefined;

      await apiClient.post(`/claims/${claimId}/decide`, {
        decisionType: pendingDecision,
        actor: user?.name ?? 'Unknown',
        actorRole: user?.role ?? 'unknown',
        rationale: notes || null,
        flaggedAgents,
      });

      // Update local agent state and trigger refresh from backend
      if (pendingDecision === 'approved' && selectedIncorrectAgents.length > 0) {
        for (const agentName of selectedIncorrectAgents) {
          const matchedAgent = agents.find(
            (a) => a.name.toLowerCase().replace(/\s+/g, '_') === agentName ||
                   a.name.toLowerCase() === agentName.replace(/_/g, ' ')
          );
          if (matchedAgent) {
            flagAgent(matchedAgent.id, {
              claimId,
              claimNumber: claimNumber ?? claimId,
              flaggedBy: user?.name ?? 'Unknown',
              notes: agentFlagNotes || `Agent rule was incorrect for claim ${claimNumber ?? claimId}. Claim was approved despite flag.`,
            });
          }
        }
        showToast(
          `${selectedIncorrectAgents.length} agent(s) flagged for review on Agent Management.`,
          'warning'
        );
      }

      setShowFlywheel(true);

      const toastMessages: Record<DecisionType, string> = {
        approved: 'Claim approved and routed to payment.',
        denied: 'Claim denial confirmed.',
      };

      const toastSeverities: Record<DecisionType, 'success' | 'error'> = {
        approved: 'success',
        denied: 'error',
      };

      const decision = pendingDecision;

      setTimeout(() => {
        setShowFlywheel(false);
        showToast(toastMessages[decision], toastSeverities[decision]);
        onDecisionMade(decision);

        // Dispatch custom event so ValidationPage can refresh tables
        window.dispatchEvent(new CustomEvent('pivot-decision-made', {
          detail: { decisionType: decision, claimId },
        }));
      }, 2000);
    } catch (error) {
      console.error('Failed to submit decision:', error);
      showToast('Failed to submit decision. Please try again.', 'error');
      setShowFlywheel(false);
    } finally {
      setSubmitting(false);
      setPendingDecision(null);
    }
  };

  const dialogTitle = pendingDecision === 'approved' ? 'Approve Payment' : 'Confirm Denial';
  const dialogColor = pendingDecision === 'approved' ? '#2E8540' : '#E31C3D';

  return (
    <>
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2,
          backgroundColor: '#FAFAFA',
        }}
      >
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={() => openNotesDialog('approved')}
            disabled={submitting}
            sx={{
              backgroundColor: '#2E8540',
              '&:hover': { backgroundColor: '#267236' },
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
            }}
          >
            Approve Payment
          </Button>

          <Button
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={() => openNotesDialog('denied')}
            disabled={submitting}
            sx={{
              backgroundColor: '#E31C3D',
              '&:hover': { backgroundColor: '#C4192F' },
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
            }}
          >
            Confirm Denial
          </Button>
        </Stack>
      </Box>

      {/* Notes Dialog */}
      <Dialog
        open={notesDialogOpen}
        onClose={closeNotesDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: dialogColor }}>
          {dialogTitle}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {pendingDecision === 'approved'
              ? 'This will approve the claim and route it to the payment processing queue. Please review and edit the notes below.'
              : 'This will deny the claim. This action cannot be easily undone. Please review and edit the notes below.'}
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={5}
            label="Decision Notes"
            placeholder="Enter decision notes or click Generate Notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={generatingNotes}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
              },
            }}
          />

          <Button
            variant="outlined"
            size="small"
            startIcon={generatingNotes ? <CircularProgress size={14} /> : <AutoFixHighIcon />}
            onClick={handleGenerateNotes}
            disabled={generatingNotes}
            sx={{
              mt: 1,
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#5B616B',
              color: '#5B616B',
              '&:hover': {
                borderColor: '#323A45',
                backgroundColor: 'rgba(91, 97, 107, 0.04)',
              },
            }}
          >
            {generatingNotes ? 'Generating...' : 'Generate Notes'}
          </Button>

          {/* Agent Rule Flagging Section - only shown on Approve */}
          {pendingDecision === 'approved' && flaggingFindings.length > 0 && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                backgroundColor: '#FFF8E1',
                borderRadius: 1,
                border: '1px solid #FFE082',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <FlagIcon sx={{ fontSize: 18, color: '#F57C00' }} />
                <Typography variant="subtitle2" fontWeight={700} color="#E65100">
                  Flag Incorrect Agent Rules (Optional)
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                This claim was flagged by the agents below. If any of their rules were incorrect, select them to report the issue on Agent Management.
              </Typography>

              {flaggingFindings.map((finding) => {
                const displayName = finding.agent_name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <FormControlLabel
                    key={finding.agent_name}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedIncorrectAgents.includes(finding.agent_name)}
                        onChange={() => toggleAgentSelection(finding.agent_name)}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {displayName}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ({finding.fraud_type} &middot; {finding.confidence_score}% confidence)
                        </Typography>
                      </Typography>
                    }
                  />
                );
              })}

              {selectedIncorrectAgents.length > 0 && (
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  label="Flag Notes"
                  placeholder="Why is this agent rule incorrect? (optional)"
                  value={agentFlagNotes}
                  onChange={(e) => setAgentFlagNotes(e.target.value)}
                  sx={{ mt: 1.5 }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeNotesDialog} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={generatingNotes || !notes.trim()}
            sx={{
              backgroundColor: dialogColor,
              '&:hover': {
                backgroundColor: pendingDecision === 'approved' ? '#267236' : '#C4192F',
              },
            }}
          >
            {dialogTitle}
          </Button>
        </DialogActions>
      </Dialog>

      <FlywheelAnimation visible={showFlywheel} />
    </>
  );
};

export default DecisionBar;
