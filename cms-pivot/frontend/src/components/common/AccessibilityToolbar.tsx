// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, IconButton, Tooltip, Divider, Typography } from '@mui/material';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ContrastIcon from '@mui/icons-material/Contrast';
import { useAccessibility } from '../../contexts/AccessibilityContext';

export const AccessibilityToolbar: React.FC = () => {
  const { fontSize, highContrast, increaseFontSize, decreaseFontSize, resetFontSize, toggleHighContrast } =
    useAccessibility();

  return (
    <Box
      role="toolbar"
      aria-label="Accessibility controls"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.25,
        mr: 2,
        borderRight: '1px solid rgba(255,255,255,0.2)',
        pr: 2,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: 'rgba(255,255,255,0.7)', mr: 0.5, fontSize: '0.7rem', whiteSpace: 'nowrap' }}
        aria-hidden="true"
      >
        Aa
      </Typography>

      <Tooltip title="Decrease text size">
        <span>
          <IconButton
            size="small"
            color="inherit"
            onClick={decreaseFontSize}
            disabled={fontSize <= 80}
            aria-label={`Decrease text size. Current size: ${fontSize}%`}
            sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' } }}
          >
            <TextDecreaseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Reset text size">
        <IconButton
          size="small"
          color="inherit"
          onClick={resetFontSize}
          aria-label={`Reset text size to default. Current size: ${fontSize}%`}
          sx={{ color: 'white' }}
        >
          <TextFieldsIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Increase text size">
        <span>
          <IconButton
            size="small"
            color="inherit"
            onClick={increaseFontSize}
            disabled={fontSize >= 150}
            aria-label={`Increase text size. Current size: ${fontSize}%`}
            sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' } }}
          >
            <TextIncreaseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: 'rgba(255,255,255,0.2)' }} />

      <Tooltip title={highContrast ? 'Disable high contrast' : 'Enable high contrast'}>
        <IconButton
          size="small"
          color="inherit"
          onClick={toggleHighContrast}
          aria-label={highContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'}
          aria-pressed={highContrast}
          sx={{
            color: highContrast ? '#FFD700' : 'white',
          }}
        >
          <ContrastIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
