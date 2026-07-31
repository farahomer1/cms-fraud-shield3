// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import vaTheme from './theme/vaTheme';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { GoogleAuthProvider } from './contexts/GoogleAuthContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { UIProvider } from './contexts/UIContext';
import { AgentProvider } from './contexts/AgentContext';
import { AuditorWorkflowProvider } from './contexts/AuditorWorkflowContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={vaTheme}>
      <CssBaseline />
      <AccessibilityProvider>
        <GoogleAuthProvider>
          <AuthProvider>
            <AppProvider>
              <UIProvider>
                <AgentProvider>
                  <AuditorWorkflowProvider>
                    <App />
                  </AuditorWorkflowProvider>
                </AgentProvider>
              </UIProvider>
            </AppProvider>
          </AuthProvider>
        </GoogleAuthProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  </React.StrictMode>
);
