// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Chip } from '@mui/material';
import { AGENT_NAMES } from '../../utils/constants';

interface AgentBadgeProps {
  agentName: string;
}

const AgentBadge: React.FC<AgentBadgeProps> = ({ agentName }) => {
  const displayName = AGENT_NAMES[agentName] ?? agentName;

  return (
    <Chip
      label={displayName}
      size="small"
      color="primary"
      variant="outlined"
      sx={{
        fontWeight: 500,
        fontSize: '0.7rem',
        height: 22,
        '& .MuiChip-label': {
          px: 1,
        },
      }}
    />
  );
};

export default React.memo(AgentBadge);
