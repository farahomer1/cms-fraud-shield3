// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { getOverpaymentDetail, type OverpaymentDetail as OverpaymentDetailType } from '../../services/overpaymentService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AGENT_NAMES } from '../../utils/constants';

interface OverpaymentDetailProps {
  overpaymentId: string;
}

const OverpaymentDetailView: React.FC<OverpaymentDetailProps> = ({ overpaymentId }) => {
  const [detail, setDetail] = useState<OverpaymentDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOverpaymentDetail(overpaymentId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        console.error('Failed to load overpayment detail:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [overpaymentId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} sx={{ color: '#003F72' }} />
      </Box>
    );
  }

  if (!detail) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        Unable to load overpayment details.
      </Typography>
    );
  }

  return (
    <Box sx={{ px: 2, py: 1.5, bgcolor: '#FAFAFA', borderRadius: 1 }}>
      {/* Agent Findings */}
      {detail.findings && detail.findings.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1 }}>
            Source Agent Findings
          </Typography>
          <Stack spacing={1}>
            {detail.findings.map((finding) => (
              <Box
                key={finding.id}
                sx={{
                  p: 1.5,
                  bgcolor: 'white',
                  borderRadius: 1,
                  border: '1px solid #E0E0E0',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Chip
                    label={AGENT_NAMES[finding.agent_name] ?? finding.agent_name}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 500, fontSize: '0.7rem', height: 22 }}
                  />
                  <Chip
                    label={`${finding.confidence_score}% confidence`}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 22,
                      bgcolor: finding.confidence_score >= 80 ? '#F9DEDE' : '#FFF8E1',
                      color: finding.confidence_score >= 80 ? '#E31C3D' : '#FDB81E',
                    }}
                  />
                  <Chip
                    label={finding.recommendation}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 22,
                      bgcolor: finding.recommendation === 'flag' ? '#F9DEDE' : '#E7F4E4',
                      color: finding.recommendation === 'flag' ? '#E31C3D' : '#2E8540',
                    }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  {finding.evidence_summary}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      <Divider sx={{ my: 1.5 }} />

      {/* Decision Details */}
      {detail.decision && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1 }}>
            Decision Details
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #E0E0E0' }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Decision:</strong> {detail.decision.decision_type.toUpperCase()}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Actor:</strong> {detail.decision.actor} ({detail.decision.actor_role})
            </Typography>
            {detail.decision.rationale && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Rationale:</strong> {detail.decision.rationale}
              </Typography>
            )}
            {detail.decision.savings_amount != null && (
              <Typography variant="body2">
                <strong>Savings:</strong> {formatCurrency(detail.decision.savings_amount)}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 1.5 }} />

      {/* Status Timeline */}
      {detail.timeline && detail.timeline.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1 }}>
            Status Timeline
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #E0E0E0' }}>
            <Stack spacing={1}>
              {detail.timeline.map((event, idx) => {
                const statusLabels: Record<string, string> = {
                  identified: 'Identified',
                  notified: 'Provider Notified',
                  in_recoupment: 'In Recoupment',
                  recouped: 'Recouped',
                  reconciled: 'Reconciled',
                };
                const isLast = idx === detail.timeline!.length - 1;
                return (
                  <Box key={event.status} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: event.completed ? '#2E8540' : '#AEB0B5',
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={isLast ? 700 : 400}
                      sx={{ minWidth: 130, color: isLast ? '#112E51' : '#5B616B' }}
                    >
                      {statusLabels[event.status] ?? event.status}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {formatDate(event.timestamp)}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 1.5 }} />

      {/* Claim Information */}
      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1 }}>
          Claim Information
        </Typography>
        <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #E0E0E0' }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Claim Number:</strong> {detail.claim_number}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Claim Type:</strong> {detail.claim_type}
          </Typography>
          {detail.service_date && (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Service Date:</strong> {formatDate(detail.service_date)}
            </Typography>
          )}
          {detail.claim_billing_amount != null && (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Original Billing:</strong> {formatCurrency(detail.claim_billing_amount)}
            </Typography>
          )}
          {detail.risk_level && (
            <Typography variant="body2">
              <strong>Risk Level:</strong> {detail.risk_level}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default OverpaymentDetailView;
