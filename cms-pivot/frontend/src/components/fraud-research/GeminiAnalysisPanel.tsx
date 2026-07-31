// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  CircularProgress,
  Button,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RefreshIcon from '@mui/icons-material/Refresh';
import apiClient from '../../services/apiClient';

const GeminiAnalysisPanel: React.FC = () => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/fraud-research/analyze');
      const raw = response.data;
      const text = raw?.analysis || raw?.text || raw;
      setAnalysis(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    } catch {
      setError('Failed to load Gemini analysis. The API may be unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: '#003F72',
        borderWidth: 2,
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 1.5,
          backgroundColor: '#F0F6FC',
          borderBottom: '1px solid #E0E0E0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PsychologyIcon sx={{ color: '#003F72', fontSize: 24 }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#112E51' }}>
            Gemini AI Analysis
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={fetchAnalysis}
          disabled={loading}
          sx={{
            textTransform: 'none',
            color: '#003F72',
          }}
        >
          Refresh
        </Button>
      </Box>

      <CardContent sx={{ px: 2.5, py: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
            <CircularProgress size={24} sx={{ color: '#003F72' }} />
            <Typography variant="body2" color="text.secondary">
              Generating Gemini analysis...
            </Typography>
          </Box>
        )}

        {error && !loading && (
          <Box>
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              {error}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={fetchAnalysis}
              sx={{ textTransform: 'none' }}
            >
              Retry
            </Button>
          </Box>
        )}

        {!loading && !error && analysis && (
          <Typography
            variant="body2"
            sx={{
              color: '#212121',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
            }}
          >
            {analysis}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default GeminiAnalysisPanel;
