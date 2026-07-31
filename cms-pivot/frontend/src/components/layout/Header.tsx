// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { AppBar, Box, Button, Chip, Toolbar, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import ShieldIcon from '@mui/icons-material/Shield';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AccessibilityToolbar } from '../common/AccessibilityToolbar';
import { ROUTES } from '../../utils/constants';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    navigate(ROUTES.LOGIN);
  };

  return (
    <AppBar
      position="fixed"
      component="header"
      role="banner"
      aria-label="Site header"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'primary.dark' }}
    >
      <Toolbar>
        <ShieldIcon sx={{ mr: 1.5, fontSize: 28, color: '#FFD700' }} aria-hidden="true" />
        <Typography variant="h6" component="span" fontWeight="bold" sx={{ flexGrow: 0, mr: 1 }}>
          PIVOT
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.7, flexGrow: 1 }} aria-label="Payment Integrity Validation and Oversight Technology">
          Payment Integrity Validation &amp; Oversight Technology
        </Typography>

        {/* Accessibility controls */}
        <AccessibilityToolbar />

        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" aria-label={`Logged in as ${user.name}`}>
              {user.name}
            </Typography>
            <Chip
              label={user.role}
              size="small"
              aria-label={`Role: ${user.role}`}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }}
            />
            <Button
              color="inherit"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={handleSignOut}
              aria-label="Sign out of application"
            >
              Sign Out
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};
