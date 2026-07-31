// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import { createTheme } from '@mui/material/styles';

const vaTheme = createTheme({
  palette: {
    primary: {
      main: '#003F72',
      dark: '#112E51',
      light: '#205493',
    },
    secondary: {
      main: '#02BFE7',
    },
    error: {
      main: '#E31C3D',
    },
    success: {
      main: '#2E8540',
    },
    warning: {
      main: '#FDB81E',
    },
    background: {
      default: '#F1F1F1',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#212121',
      secondary: '#5B616B',
    },
  },
  typography: {
    fontFamily: '"Source Sans 3", "Source Sans Pro", "Helvetica Neue", Helvetica, Arial, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)',
        },
      },
    },
    // Section 508: Ensure visible focus indicators on all interactive elements
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #FFD700',
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #FFD700',
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root:focus-within': {
            outline: '2px solid #003F72',
            outlineOffset: '1px',
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #FFD700',
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #FFD700',
            outlineOffset: '-2px',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #FFD700',
            outlineOffset: '2px',
          },
        },
      },
    },
  },
});

export default vaTheme;
