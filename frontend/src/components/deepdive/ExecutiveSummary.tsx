// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import apiClient from '../../services/apiClient';

interface ExecutiveSummaryProps {
  claimId: string;
}

interface SummaryResponse {
  summary: string;
}

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ claimId }) => {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<SummaryResponse>(
          `/claims/${claimId}/summary`
        );
        setSummary(response.data.summary);
      } catch (err) {
        console.error('Failed to fetch executive summary:', err);
        setError('Unable to load executive summary. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [claimId]);

  return (
    <Card
      variant="outlined"
      sx={{
        borderLeft: '4px solid #112E51',
        borderRadius: 2,
        mb: 3,
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <AutoAwesomeIcon sx={{ color: '#112E51', fontSize: 22 }} />
          <Typography variant="subtitle1" fontWeight={700} color="primary.dark">
            Executive Summary
          </Typography>
          <Typography
            variant="caption"
            sx={{
              backgroundColor: '#E1F3F8',
              color: '#205493',
              px: 1,
              py: 0.25,
              borderRadius: 1,
              fontWeight: 500,
            }}
          >
            AI Generated
          </Typography>
        </Stack>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={32} sx={{ color: '#112E51' }} />
          </Box>
        )}

        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}

        {!loading && !error && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.7, whiteSpace: 'pre-line' }}
          >
            {summary}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default ExecutiveSummary;
