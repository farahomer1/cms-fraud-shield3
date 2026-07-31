// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PipelineAnimation, {
  PipelineNodeState,
  NODE_DESCRIPTIONS,
  NODE_DETAIL_SECTIONS,
  AGENT_ARMY_AGENTS,
} from './PipelineAnimation';
import StatusLog, { LogEvent } from './StatusLog';
import DataNormalizationPanel from './DataNormalizationPanel';
import NormalizationSamplesPanel from './NormalizationSamplesPanel';

interface ProcessingOverlayProps {
  open: boolean;
  progress: number;
  events: LogEvent[];
  pipelineNodes: PipelineNodeState[];
  isComplete: boolean;
  claimsProcessed?: number;
  totalClaims?: number;
  onComplete: () => void;
  onExit?: () => void;
}

const NODE_TITLES: Record<string, string> = {
  normalization: 'Normalization',
  warehouse: 'Data Warehouse',
  rules_engine: 'Rules Engine',
  agent_army: 'Agent Army',
  decision_routing: 'Decision Routing',
};

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  open,
  progress,
  events,
  pipelineNodes,
  isComplete,
  claimsProcessed = 0,
  totalClaims = 0,
  onComplete,
  onExit,
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Stay on the page when processing completes — no auto-redirect

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
  };

  const handleCloseNodeDialog = () => {
    setSelectedNode(null);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          overflow: 'auto',
        }}
      >
        {/* Progress Bar */}
        <Box sx={{ width: '100%', position: 'sticky', top: 0, zIndex: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: isComplete ? '#2E8540' : '#02BFE7',
                transition: 'transform 0.5s ease',
              },
            }}
          />
        </Box>

        {/* Exit Button - stop during processing, or exit when complete */}
        {onExit && (
          <Box
            sx={{
              position: 'fixed',
              top: 16,
              right: 24,
              zIndex: 10000,
            }}
          >
            {!isComplete ? (
              <Button
                variant="outlined"
                startIcon={<ExitToAppIcon />}
                onClick={onExit}
                sx={{
                  color: '#FFFFFF',
                  borderColor: '#E31C3D',
                  borderWidth: 2,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  letterSpacing: 0.5,
                  px: 2.5,
                  py: 1,
                  '&:hover': {
                    borderColor: '#E31C3D',
                    borderWidth: 2,
                    backgroundColor: 'rgba(227, 28, 61, 0.15)',
                  },
                }}
              >
                Exit & Stop Processing
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<ExitToAppIcon />}
                onClick={onExit}
                sx={{
                  backgroundColor: '#2E8540',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  letterSpacing: 0.5,
                  px: 3,
                  py: 1,
                  '&:hover': {
                    backgroundColor: '#236B33',
                  },
                }}
              >
                Exit
              </Button>
            )}
          </Box>
        )}

        {/* Content Container */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 1000,
            px: 4,
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {/* Title */}
          <Box sx={{ textAlign: 'center' }}>
            {!isComplete ? (
              <>
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      color: '#FFFFFF',
                      fontWeight: 700,
                      letterSpacing: 1,
                    }}
                  >
                    Processing Batch...
                  </Typography>
                </motion.div>
                <Typography
                  variant="body1"
                  sx={{ color: 'rgba(255,255,255,0.6)', mt: 1 }}
                >
                  {Math.round(progress)}% complete
                </Typography>
              </>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 72, color: '#2E8540' }} />
                  <Typography
                    variant="h4"
                    sx={{
                      color: '#FFFFFF',
                      fontWeight: 700,
                    }}
                  >
                    Batch Processing Complete
                  </Typography>
                  {claimsProcessed > 0 && (
                    <Typography
                      variant="h5"
                      sx={{ color: '#02BFE7', fontWeight: 700, fontFamily: '"Fira Code", monospace' }}
                    >
                      {claimsProcessed.toLocaleString()} claims processed
                    </Typography>
                  )}
                  <Typography
                    variant="body1"
                    sx={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    Batch processing finished.
                  </Typography>
                </Box>
              </motion.div>
            )}
          </Box>

          {/* Pipeline Animation */}
          <Box
            sx={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 1 }}
              >
                PROCESSING PIPELINE
              </Typography>
              {claimsProcessed > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#02BFE7',
                    fontFamily: '"Fira Code", monospace',
                    fontWeight: 600,
                    letterSpacing: 0.5,
                  }}
                >
                  {claimsProcessed.toLocaleString()} / {totalClaims.toLocaleString()} claims
                </Typography>
              )}
            </Box>
            <PipelineAnimation nodes={pipelineNodes} onNodeClick={handleNodeClick} />
          </Box>

          {/* Status Log */}
          <Box
            sx={{
              flexGrow: 1,
              minHeight: 0,
            }}
          >
            <Box sx={{ mb: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 1 }}
              >
                EVENT LOG
              </Typography>
            </Box>
            <StatusLog events={events} claimsProcessed={claimsProcessed} />
          </Box>
        </Box>

        {/* Node Detail Dialog — z-index above the processing overlay (9999) */}
        <Dialog
          open={selectedNode !== null}
          onClose={handleCloseNodeDialog}
          maxWidth="md"
          fullWidth
          sx={{ zIndex: 10001 }}
          PaperProps={{
            sx: {
              backgroundColor: '#112E51',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.15)',
              maxHeight: '85vh',
            },
          }}
        >
          {selectedNode && (() => {
            const detail = NODE_DETAIL_SECTIONS[selectedNode];
            return (
              <>
                <DialogTitle
                  sx={{
                    fontWeight: 700,
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  {NODE_TITLES[selectedNode] || selectedNode}
                  {(() => {
                    const nodeState = pipelineNodes.find((n) => n.id === selectedNode);
                    if (!nodeState) return null;
                    const statusColors: Record<string, string> = {
                      idle: '#CCCCCC',
                      active: '#02BFE7',
                      success: '#2E8540',
                      error: '#E31C3D',
                    };
                    const chipLabel = nodeState.status === 'error'
                      ? 'FLAGGED'
                      : nodeState.status.toUpperCase();
                    return (
                      <Chip
                        label={chipLabel}
                        size="small"
                        sx={{
                          backgroundColor: statusColors[nodeState.status] || '#CCCCCC',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    );
                  })()}
                  {detail && (
                    <Typography
                      variant="caption"
                      sx={{ ml: 'auto', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}
                    >
                      {detail.pwsRef}
                    </Typography>
                  )}
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5 }}>
                  {/* Overview */}
                  <Typography
                    variant="body2"
                    sx={{ color: 'rgba(255,255,255,0.85)', mb: 2, lineHeight: 1.7 }}
                  >
                    {detail ? detail.overview : NODE_DESCRIPTIONS[selectedNode]}
                  </Typography>

                  {/* Capabilities */}
                  {detail && (
                    <>
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', my: 2 }} />
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, letterSpacing: 0.5, mb: 1, color: '#02BFE7' }}
                      >
                        CAPABILITIES
                      </Typography>
                      <List dense disablePadding>
                        {detail.capabilities.map((cap, idx) => (
                          <ListItem key={idx} sx={{ px: 1.5, py: 0.4, alignItems: 'flex-start' }}>
                            <Typography
                              variant="caption"
                              sx={{ color: '#02BFE7', mr: 1, mt: 0.2, flexShrink: 0 }}
                            >
                              {'\u25B8'}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}
                            >
                              {cap}
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}

                  {/* Data Normalization — EDI/NCPDP Parsing & CMS-1500 Extraction */}
                  {selectedNode === 'normalization' && (
                    <>
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', my: 2 }} />
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, letterSpacing: 0.5, mb: 1.5, color: '#02BFE7' }}
                      >
                        DATA PROCESSING SAMPLES
                      </Typography>
                      <NormalizationSamplesPanel />
                    </>
                  )}

                  {/* Rules Engine — Fraud Detection Rules & Test Cases */}
                  {selectedNode === 'rules_engine' && (
                    <>
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', my: 2 }} />
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, letterSpacing: 0.5, mb: 1.5, color: '#02BFE7' }}
                      >
                        FRAUD DETECTION RULES & TEST CASES
                      </Typography>
                      <DataNormalizationPanel />
                    </>
                  )}

                  {/* Agent Army — Specialized Agents */}
                  {selectedNode === 'agent_army' && (
                    <>
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', my: 2 }} />
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, letterSpacing: 0.5, mb: 1, color: '#02BFE7' }}
                      >
                        SPECIALIZED AGENTS
                      </Typography>
                      <List dense disablePadding>
                        {AGENT_ARMY_AGENTS.map((agent, idx) => (
                          <ListItem
                            key={agent.name}
                            sx={{
                              px: 1.5,
                              py: 0.75,
                              borderRadius: 1,
                              backgroundColor:
                                idx % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                            }}
                          >
                            <ListItemText
                              primary={agent.name}
                              secondary={agent.description}
                              primaryTypographyProps={{
                                variant: 'body2',
                                fontWeight: 700,
                                color: '#FFFFFF',
                              }}
                              secondaryTypographyProps={{
                                variant: 'caption',
                                sx: { color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 },
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}

                  {/* Performance Metrics */}
                  {detail && (
                    <>
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', my: 2 }} />
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, letterSpacing: 0.5, mb: 1, color: '#2E8540' }}
                      >
                        RFI PERFORMANCE METRICS (Section 6.4)
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: 1,
                        }}
                      >
                        {detail.metrics.map((m) => (
                          <Box
                            key={m.label}
                            sx={{
                              px: 1.5,
                              py: 1,
                              borderRadius: 1,
                              backgroundColor: 'rgba(46, 133, 64, 0.1)',
                              border: '1px solid rgba(46, 133, 64, 0.25)',
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ color: 'rgba(255,255,255,0.55)', display: 'block' }}
                            >
                              {m.label}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: '#2E8540', fontWeight: 700 }}
                            >
                              {m.target}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}

                  {/* Compliance References */}
                  {detail && (
                    <>
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', my: 2 }} />
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, letterSpacing: 0.5, mb: 1, color: '#FFC107' }}
                      >
                        COMPLIANCE & REGULATORY
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {detail.compliance.map((c) => (
                          <Chip
                            key={c}
                            label={c}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: 'rgba(255, 193, 7, 0.35)',
                              color: 'rgba(255,255,255,0.7)',
                              fontSize: '0.7rem',
                              height: 26,
                            }}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', px: 3, py: 1.5 }}>
                  <Button
                    onClick={handleCloseNodeDialog}
                    sx={{
                      color: '#FFFFFF',
                      fontWeight: 600,
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                    }}
                  >
                    Close
                  </Button>
                </DialogActions>
              </>
            );
          })()}
        </Dialog>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProcessingOverlay;
