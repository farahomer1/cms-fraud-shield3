// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LOGIN_ROLES, ROLE_DEFAULT_ROUTE } from '../utils/constants';

const LoginPage: React.FC = () => {
  const [name, setName] = useState('S. Jiang');
  const [role, setRole] = useState<string>('MCR');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    login(name, role);
    navigate(ROLE_DEFAULT_ROUTE[role] || '/dashboard');
  };

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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Payment Integrity Validation & Oversight Technology
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            p: 2,
            mb: 3,
            bgcolor: '#F1F1F1',
            borderRadius: 2,
          }}
        >
          <CreditCardIcon sx={{ fontSize: 40, color: '#003F72' }} />
          <Box textAlign="left">
            <Typography variant="caption" color="text.secondary">
              PIV / CAC
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              Smart Card Detected
            </Typography>
          </Box>
        </Box>

        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Role</InputLabel>
          <Select value={role} label="Role" onChange={(e) => setRole(e.target.value)}>
            {LOGIN_ROLES.map((r) => (
              <MenuItem key={r} value={r}>{r}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleLogin}
          sx={{ py: 1.5, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
        >
          Authenticate with PIV
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Centers for Medicare & Medicaid Services — Authorized Use Only
        </Typography>
      </Card>
    </Box>
  );
};

export default LoginPage;
