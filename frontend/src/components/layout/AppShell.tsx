// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import { Box, Toolbar, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const AppShell: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Skip navigation link — Section 508 requirement */}
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          zIndex: 9999,
        }}
        onFocus={(e) => {
          e.currentTarget.style.position = 'fixed';
          e.currentTarget.style.left = '50%';
          e.currentTarget.style.top = '8px';
          e.currentTarget.style.transform = 'translateX(-50%)';
          e.currentTarget.style.width = 'auto';
          e.currentTarget.style.height = 'auto';
          e.currentTarget.style.overflow = 'visible';
          e.currentTarget.style.padding = '8px 24px';
          e.currentTarget.style.background = '#112E51';
          e.currentTarget.style.color = '#FFFFFF';
          e.currentTarget.style.fontWeight = '700';
          e.currentTarget.style.fontSize = '1rem';
          e.currentTarget.style.borderRadius = '4px';
          e.currentTarget.style.textDecoration = 'none';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.position = 'absolute';
          e.currentTarget.style.left = '-9999px';
          e.currentTarget.style.width = '1px';
          e.currentTarget.style.height = '1px';
          e.currentTarget.style.overflow = 'hidden';
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.padding = '0';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        Skip to main content
      </a>

      <Header />
      <Sidebar />

      <Box
        component="main"
        id="main-content"
        role="main"
        aria-label="Main content"
        tabIndex={-1}
        sx={{ flexGrow: 1, bgcolor: 'background.default', overflow: 'hidden', outline: 'none' }}
      >
        <Toolbar />
        <Box sx={{ p: 1, pl: 5, pb: 5 }}>
          <Outlet />
        </Box>
        <Box
          component="footer"
          role="contentinfo"
          aria-label="Page footer"
          sx={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            left: 240,
            py: 0.5,
            textAlign: 'center',
            backgroundColor: 'background.default',
            zIndex: 1,
          }}
        >
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
            &copy; 2026 Google Proprietary
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
