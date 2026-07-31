// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import FlagIcon from '@mui/icons-material/Flag';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { AGENT_NAMES } from '../../utils/constants';
import { formatPercent } from '../../utils/formatters';
import type { AgentFinding } from '../../types';

interface AgentFindingCardProps {
  finding: AgentFinding;
}

const getConfidenceColor = (score: number): string => {
  if (score >= 80) return '#E31C3D';
  if (score >= 50) return '#FDB81E';
  return '#2E8540';
};

const AgentFindingCard: React.FC<AgentFindingCardProps> = ({ finding }) => {
  const isFlagged = finding.recommendation === 'flag';
  const confidenceColor = getConfidenceColor(finding.confidence_score);
  const displayName = AGENT_NAMES[finding.agent_name] ?? finding.agent_name;

  return (
    <Accordion
      defaultExpanded={isFlagged}
      variant="outlined"
      sx={{
        borderRadius: '8px !important',
        mb: 1.5,
        '&:before': { display: 'none' },
        borderLeftColor: isFlagged ? '#E31C3D' : '#2E8540',
        borderLeftWidth: 3,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 } }}
      >
        <SmartToyIcon sx={{ color: '#205493', fontSize: 20 }} />
        <Typography variant="subtitle2" fontWeight={700} sx={{ flexGrow: 1 }}>
          {displayName}
        </Typography>
        <Chip
          label={finding.fraud_type}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.7rem', height: 22, mr: 1 }}
        />
        <Typography variant="caption" fontWeight={600} sx={{ mr: 1, color: confidenceColor }}>
          {formatPercent(finding.confidence_score)}
        </Typography>
        {isFlagged ? (
          <Chip
            icon={<FlagIcon sx={{ fontSize: 14 }} />}
            label="Flag"
            size="small"
            sx={{
              backgroundColor: '#F9DEDE',
              color: '#E31C3D',
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
              '& .MuiChip-icon': { color: '#E31C3D' },
            }}
          />
        ) : (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
            label="Pass"
            size="small"
            sx={{
              backgroundColor: '#E7F4E4',
              color: '#2E8540',
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
              '& .MuiChip-icon': { color: '#2E8540' },
            }}
          />
        )}
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Confidence Score
            </Typography>
            <Typography variant="caption" fontWeight={700} sx={{ color: confidenceColor }}>
              {formatPercent(finding.confidence_score)}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={finding.confidence_score}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor: confidenceColor,
                borderRadius: 4,
              },
            }}
          />
        </Box>

        {finding.flagged_data_points.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Flagged Data Points
            </Typography>
            <List dense disablePadding>
              {finding.flagged_data_points.map((point, index) => (
                <ListItem key={index} disablePadding sx={{ py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <FiberManualRecordIcon sx={{ fontSize: 6, color: '#E31C3D' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={point}
                    primaryTypographyProps={{ variant: 'body2', fontSize: '0.8rem' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {finding.evidence_summary && (
          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Evidence Summary
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.6, fontSize: '0.8rem' }}
            >
              {finding.evidence_summary}
            </Typography>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default AgentFindingCard;
