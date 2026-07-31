// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useUIContext } from '../../contexts/UIContext';

const ToastNotification: React.FC = () => {
  const { toastQueue, dismissToast } = useUIContext();

  if (toastQueue.length === 0) {
    return null;
  }

  const currentToast = toastQueue[0];

  return (
    <Snackbar
      open
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      onClose={() => dismissToast(currentToast.id)}
      autoHideDuration={5000}
    >
      <Alert
        onClose={() => dismissToast(currentToast.id)}
        severity={currentToast.severity}
        variant="filled"
        sx={{
          width: '100%',
          minWidth: 300,
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        {currentToast.message}
      </Alert>
    </Snackbar>
  );
};

export default ToastNotification;
