// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import DataObjectIcon from '@mui/icons-material/DataObject';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import apiClient from '../../services/apiClient';

interface EdiSample {
  filename: string;
  description: string;
  claim_type: string;
  is_pass: boolean;
  raw_data: string;
  parsed_data: Record<string, unknown>;
}

const EdiSampleCard: React.FC<{ sample: EdiSample }> = ({ sample }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        mb: 1.5,
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: '#205493' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DataObjectIcon sx={{ color: '#205493', fontSize: 20 }} />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={700}>
                {sample.filename}
              </Typography>
              <Chip
                label={sample.claim_type}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20 }}
              />
              {sample.is_pass ? (
                <Chip
                  label="Valid"
                  size="small"
                  sx={{
                    backgroundColor: '#E7F4E4',
                    color: '#2E8540',
                    fontWeight: 600,
                    fontSize: '0.6rem',
                    height: 18,
                  }}
                />
              ) : (
                <Chip
                  label="Anomaly"
                  size="small"
                  sx={{
                    backgroundColor: '#F9DEDE',
                    color: '#E31C3D',
                    fontWeight: 600,
                    fontSize: '0.6rem',
                    height: 18,
                  }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {sample.description}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <CardContent sx={{ pt: 0, pb: 2 }}>
          <Divider sx={{ mb: 1.5 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}
              >
                {sample.filename.endsWith('.ncpdp') ? 'Raw NCPDP Data' : 'Raw EDI Data'}
              </Typography>
              <Paper
                sx={{
                  backgroundColor: '#F5F6FA',
                  border: '1px solid #E0E0E0',
                  borderRadius: 1,
                  p: 1.5,
                  maxHeight: 320,
                  overflow: 'auto',
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                    color: '#333',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {sample.raw_data}
                </pre>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}
              >
                Parsed Output (Structured JSON)
              </Typography>
              <Paper
                sx={{
                  backgroundColor: '#FFF8F0',
                  border: '1px solid #E0E0E0',
                  borderRadius: 1,
                  p: 1.5,
                  maxHeight: 320,
                  overflow: 'auto',
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                    color: '#333',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {JSON.stringify(sample.parsed_data, null, 2)}
                </pre>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Collapse>
    </Card>
  );
};

const EvidencePanel: React.FC = () => {
  const [ediSamples, setEdiSamples] = useState<EdiSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const response = await apiClient.get('/normalization/samples');
        setEdiSamples(response.data.samples || []);
      } catch {
        setError('Unable to load raw evidence data.');
      } finally {
        setLoading(false);
      }
    };
    fetchSamples();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} sx={{ color: '#112E51' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error">
        {error}
      </Typography>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <StorageIcon sx={{ color: '#112E51', fontSize: 22 }} />
        <Typography variant="subtitle1" fontWeight={700} color="primary.dark">
          Raw Ingested Evidence
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ({ediSamples.length} documents)
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
        Browse the raw data ingested during the Data Ingestion pipeline. These documents include
        EDI 837P (Professional), 837I (Institutional), 837D (Dental), and NCPDP (Pharmacy) claim
        transactions. Click any item to view raw input alongside the parsed output.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {['837P', '837I', '837D', 'NCPDP'].map((fmt) => {
          const count = ediSamples.filter((s) => s.claim_type === fmt).length;
          return count > 0 ? (
            <Chip
              key={fmt}
              label={`${count} ${fmt}`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
            />
          ) : null;
        })}
      </Box>

      {ediSamples.map((sample) => (
        <EdiSampleCard key={sample.filename} sample={sample} />
      ))}
    </Box>
  );
};

export default EvidencePanel;
