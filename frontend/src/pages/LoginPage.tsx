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
import { keyframes } from '@mui/system';
import ShieldIcon from '@mui/icons-material/Shield';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LOGIN_ROLES, ROLE_DEFAULT_ROUTE } from '../utils/constants';

// Keyframe animations for high-end aesthetic
const rotateShield = keyframes`
  0% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(180deg);
  }
  100% {
    transform: rotateY(360deg);
  }
`;

const pulseGlow = keyframes`
  0% {
    filter: drop-shadow(0 0 5px rgba(0, 212, 255, 0.6));
  }
  50% {
    filter: drop-shadow(0 0 20px rgba(0, 212, 255, 0.9)) drop-shadow(0 0 35px rgba(0, 212, 255, 0.4));
  }
  100% {
    filter: drop-shadow(0 0 5px rgba(0, 212, 255, 0.6));
  }
`;

const gridScroll = keyframes`
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 0 40px;
  }
`;

const scanlineMove = keyframes`
  0% {
    top: -100%;
  }
  100% {
    top: 100%;
  }
`;

const LoginPage: React.FC = () => {
  const [name, setName] = useState('faomer');
  const [role, setRole] = useState<string>('Enrollment Analyst');
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
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#0a192f',
        // Layered cybersecurity background system
        background: 'radial-gradient(circle at 50% 50%, #172a45 0%, #020c1b 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'linear-gradient(rgba(0, 194, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 194, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          animation: `${gridScroll} 8s linear infinite`,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 0,
          right: 0,
          height: '10px',
          background: 'linear-gradient(to bottom, transparent, rgba(0, 194, 255, 0.15), transparent)',
          animation: `${scanlineMove} 6s linear infinite`,
          pointerEvents: 'none',
        }
      }}
    >
      {/* Decorative ambient glowing backdrops */}
      <Box
        sx={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 194, 255, 0.12) 0%, transparent 70%)',
          top: '15%',
          left: '15%',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 63, 114, 0.25) 0%, transparent 70%)',
          bottom: '10%',
          right: '15%',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      <Card
        sx={{
          p: 5,
          maxWidth: 440,
          width: '90%',
          textAlign: 'center',
          position: 'relative',
          borderRadius: 4,
          // Premium Glassmorphism styling
          background: 'rgba(10, 25, 47, 0.72)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0, 194, 255, 0.15)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 194, 255, 0.05)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'rgba(0, 194, 255, 0.3)',
            boxShadow: '0 25px 60px rgba(0, 194, 255, 0.1), 0 20px 50px rgba(0, 0, 0, 0.6)',
          }
        }}
      >
        {/* Animated Security Emblem */}
        <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
          <ShieldIcon
            sx={{
              fontSize: 70,
              color: '#00d4ff',
              animation: `${pulseGlow} 3s ease-in-out infinite`,
              '&:hover': {
                animation: `${rotateShield} 1.5s ease-in-out 1`,
              }
            }}
          />
          <LockIcon
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -40%)',
              fontSize: 22,
              color: '#0a192f',
            }}
          />
        </Box>

        <Typography variant="h4" fontWeight="bold" sx={{ color: '#ffffff', mb: 1, letterSpacing: 1.2 }}>
          CMS Fraud Shield
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 4, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' }}>
          Adversarial Modeling &amp; Red-Teaming Platform
        </Typography>

        {/* PIV Card detection sensor visualization */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            p: 2,
            mb: 4,
            bgcolor: 'rgba(0, 194, 255, 0.05)',
            border: '1px dashed rgba(0, 194, 255, 0.3)',
            borderRadius: 2,
            transition: 'background 0.3s ease',
            '&:hover': {
              bgcolor: 'rgba(0, 194, 255, 0.08)',
            }
          }}
        >
          <CreditCardIcon sx={{ fontSize: 36, color: '#00d4ff' }} />
          <Box textAlign="left">
            <Typography variant="caption" sx={{ color: '#00d4ff', textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 }}>
              PIV / CAC Security Gate
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ffffff' }}>
              Federal Credentials Loaded
            </Typography>
          </Box>
        </Box>

        {/* Name input */}
        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          variant="outlined"
          sx={{
            mb: 2,
            '& label': { color: 'rgba(255, 255, 255, 0.5)' },
            '& label.Mui-focused': { color: '#00d4ff' },
            '& .MuiOutlinedInput-root': {
              color: '#ffffff',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(0, 194, 255, 0.5)' },
              '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
              bgcolor: 'rgba(255, 255, 255, 0.03)',
            },
          }}
        />

        {/* Role dropdown */}
        <FormControl
          fullWidth
          sx={{
            mb: 4,
            '& label': { color: 'rgba(255, 255, 255, 0.5)' },
            '& label.Mui-focused': { color: '#00d4ff' },
            '& .MuiOutlinedInput-root': {
              color: '#ffffff',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(0, 194, 255, 0.5)' },
              '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
              bgcolor: 'rgba(255, 255, 255, 0.03)',
            },
            '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.5)' },
          }}
        >
          <InputLabel>Operational Role</InputLabel>
          <Select
            value={role}
            label="Operational Role"
            onChange={(e) => setRole(e.target.value)}
            MenuProps={{
              PaperProps: {
                sx: {
                  bgcolor: '#0a192f',
                  border: '1px solid rgba(0, 194, 255, 0.2)',
                  color: '#ffffff',
                  '& .MuiMenuItem-root': {
                    '&:hover': { bgcolor: 'rgba(0, 194, 255, 0.1)' },
                    '&.Mui-selected': { bgcolor: 'rgba(0, 194, 255, 0.2)' },
                    '&.Mui-selected:hover': { bgcolor: 'rgba(0, 194, 255, 0.25)' },
                  }
                }
              }
            }}
          >
            {LOGIN_ROLES.map((r) => (
              <MenuItem key={r} value={r}>{r}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Glowing authenticate button */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleLogin}
          sx={{
            py: 1.5,
            fontWeight: 'bold',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            bgcolor: '#00d4ff',
            color: '#020c1b',
            boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3)',
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: '#00b4d8',
              boxShadow: '0 6px 20px rgba(0, 212, 255, 0.5)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(1px)',
            }
          }}
        >
          Verify Smart Card
        </Button>

        <Typography variant="caption" sx={{ mt: 3, display: 'block', color: 'rgba(255, 255, 255, 0.45)', letterSpacing: 0.5 }}>
          Centers for Medicare &amp; Medicaid Services — SECURE GATEWAY
        </Typography>
      </Card>
    </Box>
  );
};

export default LoginPage;
