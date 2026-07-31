// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Backdrop, Box, CircularProgress, Typography } from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ open, message }) => {
  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(17, 46, 81, 0.65)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <CircularProgress
        size={48}
        thickness={4}
        sx={{ color: '#02BFE7' }}
      />
      {message && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
            {message}
          </Typography>
        </Box>
      )}
    </Backdrop>
  );
};

export default LoadingOverlay;
