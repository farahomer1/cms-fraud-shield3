// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
import { Box, Button, Card, CircularProgress, Typography, Alert } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import { useNavigate } from 'react-router-dom';
import { useGoogleAuth } from '../contexts/GoogleAuthContext';
import { ROUTES } from '../utils/constants';

const GoogleAuthPage: React.FC = () => {
  const { googleSignIn, loading } = useGoogleAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await googleSignIn();
      navigate(ROUTES.LOGIN);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#112E51' }}>
        <CircularProgress sx={{ color: '#fff' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#112E51',
        background: 'linear-gradient(135deg, #112E51 0%, #003F72 100%)',
      }}
    >
      <Card sx={{ p: 5, maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <ShieldIcon sx={{ fontSize: 64, color: '#003F72', mb: 1 }} />
        <Typography variant="h4" fontWeight="bold" color="primary.dark" gutterBottom>
          PIVOT
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Payment Integrity Validation & Oversight Technology
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
          Sign in with your organizational Google account to continue.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          startIcon={
            signingIn ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            )
          }
          sx={{
            py: 1.5,
            bgcolor: '#fff',
            color: '#333',
            border: '1px solid #ddd',
            '&:hover': { bgcolor: '#f5f5f5' },
            textTransform: 'none',
            fontSize: '1rem',
          }}
        >
          {signingIn ? 'Signing in...' : 'Sign in with Google'}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
          Centers for Medicare & Medicaid Services — Authorized Use Only
        </Typography>
      </Card>
    </Box>
  );
};

export default GoogleAuthPage;
