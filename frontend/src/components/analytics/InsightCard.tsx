// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Collapse,
  IconButton,
  Button,
  CircularProgress,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import apiClient from '../../services/apiClient';

interface InsightCardProps {
  chartType: string;
}

const InsightCard: React.FC<InsightCardProps> = ({ chartType }) => {
  const [expanded, setExpanded] = useState(false);
  const [insightText, setInsightText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setExpanded(true);
      setError(null);
      const response = await apiClient.get('/analytics/insights', {
        params: { chart_type: chartType },
      });
      const text = response.data?.insight || response.data?.text || response.data;
      setInsightText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    } catch {
      setError('Failed to generate insight. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = () => {
    if (!insightText && !expanded) {
      handleGenerate();
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mt: 'auto',
        pt: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          cursor: 'pointer',
          backgroundColor: '#F9FAFB',
          '&:hover': { backgroundColor: '#F3F4F6' },
        }}
        onClick={toggleExpand}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ fontSize: 18, color: '#003F72' }} />
          <Typography variant="body2" fontWeight={600} sx={{ color: '#112E51' }}>
            AI Insights
          </Typography>
        </Box>
        <IconButton size="small">
          {expanded ? (
            <ExpandLessIcon sx={{ fontSize: 20, color: '#5B616B' }} />
          ) : (
            <ExpandMoreIcon sx={{ fontSize: 20, color: '#5B616B' }} />
          )}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <CardContent
          sx={{
            borderLeft: '4px solid #003F72',
            ml: 0,
            py: 2,
          }}
        >
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={20} sx={{ color: '#003F72' }} />
              <Typography variant="body2" color="text.secondary">
                Generating insight...
              </Typography>
            </Box>
          )}

          {error && (
            <Box>
              <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                {error}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={handleGenerate}
                sx={{ textTransform: 'none' }}
              >
                Retry
              </Button>
            </Box>
          )}

          {!loading && !error && insightText && (
            <Typography
              variant="body2"
              sx={{ color: '#212121', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
            >
              {insightText}
            </Typography>
          )}

          {!loading && !error && !insightText && (
            <Button
              size="small"
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              onClick={handleGenerate}
              sx={{
                textTransform: 'none',
                backgroundColor: '#003F72',
                '&:hover': { backgroundColor: '#112E51' },
              }}
            >
              Generate Insight
            </Button>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default InsightCard;
